create or replace function private.ghc_resolve_installment_limit(p_course_id uuid,p_policy_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_price integer;
  v_policy public.academy_commercial_policies;
  v_settings public.academy_course_commercial_settings;
  v_limit integer;
begin
  select round(coalesce(c.price,0)*100)::integer into v_price from public.courses c where c.id=p_course_id;
  if v_price is null then raise exception 'Curso no encontrado.'; end if;
  select * into v_policy from public.academy_commercial_policies where id=p_policy_id;
  if v_policy.id is null then raise exception 'Política comercial no encontrada.'; end if;
  select * into v_settings from public.academy_course_commercial_settings where course_id=p_course_id;
  if v_settings.course_id is not null and not v_settings.installment_enabled then return 1; end if;
  v_limit:=case
    when v_price<v_policy.installment_min_cents then 1
    when v_price<v_policy.three_payment_min_cents then 2
    when v_price<v_policy.four_payment_min_cents then 3
    else 4
  end;
  v_limit:=least(v_limit,v_policy.max_installments);
  if v_settings.max_installments_override is not null then v_limit:=least(v_limit,v_settings.max_installments_override); end if;
  return greatest(1,least(4,v_limit));
end;
$$;

create or replace function public.ghc_public_get_course_payment_options(p_course_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path='public','private'
as $$
declare
  v_course public.courses;
  v_policy public.academy_commercial_policies;
  v_settings public.academy_course_commercial_settings;
  v_price integer;
  v_max integer;
  v_plans jsonb:='[]'::jsonb;
  v_count integer;
  v_amounts jsonb;
  v_delivery text;
begin
  select * into v_course from public.courses where slug=p_course_slug and status='published' limit 1;
  if v_course.id is null then return jsonb_build_object('available',false); end if;
  select * into v_policy from public.academy_commercial_policies where status='active' and effective_from<=now() and (effective_to is null or effective_to>now()) order by effective_from desc limit 1;
  if v_policy.id is null then raise exception 'No hay política comercial activa.'; end if;
  select * into v_settings from public.academy_course_commercial_settings where course_id=v_course.id;
  v_delivery:=coalesce(v_settings.delivery_type,'digital_content');
  v_price:=round(coalesce(v_course.price,0)*100)::integer;
  v_max:=private.ghc_resolve_installment_limit(v_course.id,v_policy.id);
  for v_count in 1..v_max loop
    select coalesce(jsonb_agg(amount order by n),'[]'::jsonb) into v_amounts
    from (select n,(v_price/v_count)+case when n<=(v_price%v_count) then 1 else 0 end amount from generate_series(1,v_count)n)s;
    v_plans:=v_plans||jsonb_build_array(jsonb_build_object(
      'installment_count',v_count,
      'payment_mode',case when v_count=1 then 'single' else 'merchant_installments' end,
      'total_cents',v_price,
      'total_display_cents',v_price,
      'financing_fee_cents',0,
      'installment_amounts_cents',v_amounts,
      'interval_days',case when v_count=1 then null else v_policy.installment_interval_days end
    ));
  end loop;
  return jsonb_build_object(
    'available',true,'course_id',v_course.id,'course_slug',v_course.slug,'course_title',v_course.title,
    'currency',v_policy.currency,'base_price_cents',v_price,'plans',v_plans,'max_installments',v_max,
    'installment_enabled',v_max>1,'delivery_type',v_delivery,
    'immediate_start_available',true,'withdrawal_days',v_policy.withdrawal_days,
    'merchant_financing_fee_mode',v_policy.merchant_consumer_fee_mode,
    'external_financing_enabled',v_policy.external_financing_enabled,'legal_version',v_policy.legal_version,
    'display_rule','Mostrar importe final y cuotas exactas; no presentar un porcentaje de recargo cuando el coste sea cero.'
  );
end;
$$;

create or replace function public.ghc_student_prepare_academy_order(
  p_course_id uuid,p_installment_count integer,p_start_now boolean,p_customer_type text,
  p_terms_accepted boolean,p_privacy_accepted boolean,p_terms_version text,p_privacy_version text
)
returns jsonb
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare
  v_uid uuid:=auth.uid();
  v_course public.courses;
  v_policy public.academy_commercial_policies;
  v_settings public.academy_course_commercial_settings;
  v_delivery text;
  v_price integer;
  v_limit integer;
  v_email text;
  v_order public.academy_orders;
  v_n integer;
  v_amount integer;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  if not coalesce(p_terms_accepted,false) or not coalesce(p_privacy_accepted,false) then raise exception 'Debes aceptar las condiciones y la política de privacidad.'; end if;
  if coalesce(p_customer_type,'consumer') not in ('consumer','professional_business') then raise exception 'Tipo de cliente no válido.'; end if;
  select * into v_course from public.courses where id=p_course_id and status='published';
  if v_course.id is null then raise exception 'El curso no está disponible para matrícula.'; end if;
  select * into v_policy from public.academy_commercial_policies where status='active' and effective_from<=now() and (effective_to is null or effective_to>now()) order by effective_from desc limit 1;
  if v_policy.id is null then raise exception 'No hay política comercial activa.'; end if;
  select * into v_settings from public.academy_course_commercial_settings where course_id=v_course.id;
  v_delivery:=coalesce(v_settings.delivery_type,'digital_content');
  v_price:=round(coalesce(v_course.price,0)*100)::integer;
  v_limit:=private.ghc_resolve_installment_limit(v_course.id,v_policy.id);
  if p_installment_count<1 or p_installment_count>v_limit then raise exception 'Ese número de pagos no está disponible para este curso.'; end if;
  select lower(email) into v_email from auth.users where id=v_uid;
  insert into public.academy_orders(
    user_id,course_id,email_normalized,customer_type,policy_id,payment_mode,installment_count,currency,
    base_total_cents,financing_fee_cents,payable_total_cents,status,provider,immediate_start,
    withdrawal_ends_at,withdrawal_waived_at,access_start_at,terms_version,privacy_version,legal_version,metadata
  ) values(
    v_uid,v_course.id,v_email,coalesce(p_customer_type,'consumer'),v_policy.id,
    case when p_installment_count=1 then 'single' else 'merchant_installments' end,p_installment_count,v_policy.currency,
    v_price,0,v_price,'awaiting_payment','unassigned',coalesce(p_start_now,false),
    now()+make_interval(days=>v_policy.withdrawal_days),
    case when coalesce(p_start_now,false) and v_delivery in ('digital_content','hybrid') then now() else null end,
    case when coalesce(p_start_now,false) then now() else now()+make_interval(days=>v_policy.withdrawal_days) end,
    coalesce(nullif(trim(p_terms_version),''),v_policy.legal_version),coalesce(nullif(trim(p_privacy_version),''),v_policy.legal_version),v_policy.legal_version,
    jsonb_build_object('delivery_type',v_delivery,'installment_limit_at_purchase',v_limit)
  ) returning * into v_order;
  for v_n in 1..p_installment_count loop
    v_amount:=(v_price/p_installment_count)+case when v_n<=(v_price%p_installment_count) then 1 else 0 end;
    insert into public.academy_installments(order_id,installment_no,amount_cents,due_at)
    values(v_order.id,v_n,v_amount,now()+make_interval(days=>v_policy.installment_interval_days*(v_n-1)));
  end loop;
  insert into public.academy_legal_acceptances(order_id,user_id,acceptance_type,version,evidence)
  values(v_order.id,v_uid,'terms',v_order.terms_version,jsonb_build_object('accepted_in','academy_checkout')),
        (v_order.id,v_uid,'privacy',v_order.privacy_version,jsonb_build_object('accepted_in','academy_checkout'));
  if coalesce(p_start_now,false) and v_delivery in ('digital_content','hybrid') then
    insert into public.academy_legal_acceptances(order_id,user_id,acceptance_type,version,evidence)
    values(v_order.id,v_uid,'digital_content_start_request',v_order.legal_version,jsonb_build_object('explicit',true,'delivery_type',v_delivery)),
          (v_order.id,v_uid,'withdrawal_loss_ack',v_order.legal_version,jsonb_build_object('explicit',true,'scope','digital_content','delivery_type',v_delivery));
  end if;
  if coalesce(p_start_now,false) and v_delivery in ('service','hybrid') then
    insert into public.academy_legal_acceptances(order_id,user_id,acceptance_type,version,evidence)
    values(v_order.id,v_uid,'service_start_request',v_order.legal_version,jsonb_build_object('explicit',true,'delivery_type',v_delivery));
  end if;
  insert into public.academy_commercial_events(order_id,event_type,actor_type,actor_user_id,message,payload)
  values(v_order.id,'order_prepared','student',v_uid,'Pedido Academy preparado',jsonb_build_object('installments',p_installment_count,'start_now',p_start_now,'total_cents',v_price,'delivery_type',v_delivery,'installment_limit',v_limit));
  return jsonb_build_object('order_id',v_order.id,'order_reference',v_order.order_reference,'status',v_order.status,'total_cents',v_price,'installment_count',p_installment_count,'start_now',p_start_now,'access_start_at',v_order.access_start_at,'delivery_type',v_delivery,'provider_connected',false);
end;
$$;

revoke execute on function private.ghc_resolve_installment_limit(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.ghc_public_get_course_payment_options(text) from public;
grant execute on function public.ghc_public_get_course_payment_options(text) to anon,authenticated;
revoke execute on function public.ghc_student_prepare_academy_order(uuid,integer,boolean,text,boolean,boolean,text,text) from public,anon;
grant execute on function public.ghc_student_prepare_academy_order(uuid,integer,boolean,text,boolean,boolean,text,text) to authenticated;
