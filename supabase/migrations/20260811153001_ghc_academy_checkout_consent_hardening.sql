create table if not exists public.academy_contract_confirmations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.academy_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  confirmation_type text not null default 'order_confirmation' check (confirmation_type in ('order_confirmation','withdrawal_confirmation','amendment_confirmation')),
  legal_version text not null,
  rendered_text text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(order_id,confirmation_type)
);

alter table public.academy_contract_confirmations enable row level security;
revoke all on public.academy_contract_confirmations from public,anon,authenticated;

drop function if exists public.ghc_student_prepare_academy_order(uuid,integer,boolean,text,boolean,boolean,text,text);

create or replace function public.ghc_student_prepare_academy_order(
  p_course_id uuid,
  p_installment_count integer,
  p_start_now boolean,
  p_withdrawal_loss_ack boolean,
  p_customer_type text,
  p_terms_accepted boolean,
  p_privacy_accepted boolean,
  p_terms_version text,
  p_privacy_version text
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
  v_installments jsonb;
  v_confirmation_text text;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  if not coalesce(p_terms_accepted,false) or not coalesce(p_privacy_accepted,false) then
    raise exception 'Debes aceptar las condiciones y la política de privacidad.';
  end if;
  if coalesce(p_customer_type,'consumer') not in ('consumer','professional_business') then
    raise exception 'Tipo de cliente no válido.';
  end if;

  select * into v_course from public.courses where id=p_course_id and status='published';
  if v_course.id is null then raise exception 'El curso no está disponible para matrícula.'; end if;
  select * into v_policy from public.academy_commercial_policies
    where status='active' and effective_from<=now() and (effective_to is null or effective_to>now())
    order by effective_from desc limit 1;
  if v_policy.id is null then raise exception 'No hay política comercial activa.'; end if;
  select * into v_settings from public.academy_course_commercial_settings where course_id=v_course.id;
  v_delivery:=coalesce(v_settings.delivery_type,'digital_content');

  if coalesce(p_start_now,false) and v_delivery in ('digital_content','hybrid') and not coalesce(p_withdrawal_loss_ack,false) then
    raise exception 'Para comenzar ahora el contenido digital debes reconocer expresamente la consecuencia sobre el derecho de desistimiento ordinario.';
  end if;

  v_price:=round(coalesce(v_course.price,0)*100)::integer;
  v_limit:=private.ghc_resolve_installment_limit(v_course.id,v_policy.id);
  if p_installment_count<1 or p_installment_count>v_limit then
    raise exception 'Ese número de pagos no está disponible para este curso.';
  end if;
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
    coalesce(nullif(trim(p_terms_version),''),v_policy.legal_version),
    coalesce(nullif(trim(p_privacy_version),''),v_policy.legal_version),
    v_policy.legal_version,
    jsonb_build_object('delivery_type',v_delivery,'installment_limit_at_purchase',v_limit)
  ) returning * into v_order;

  for v_n in 1..p_installment_count loop
    v_amount:=(v_price/p_installment_count)+case when v_n<=(v_price%p_installment_count) then 1 else 0 end;
    insert into public.academy_installments(order_id,installment_no,amount_cents,due_at)
    values(v_order.id,v_n,v_amount,now()+make_interval(days=>v_policy.installment_interval_days*(v_n-1)));
  end loop;

  insert into public.academy_legal_acceptances(order_id,user_id,acceptance_type,version,evidence)
  values(v_order.id,v_uid,'terms',v_order.terms_version,jsonb_build_object('accepted_in','academy_checkout','explicit',true)),
        (v_order.id,v_uid,'privacy',v_order.privacy_version,jsonb_build_object('accepted_in','academy_checkout','explicit',true));

  if coalesce(p_start_now,false) and v_delivery in ('digital_content','hybrid') then
    insert into public.academy_legal_acceptances(order_id,user_id,acceptance_type,version,evidence)
    values(v_order.id,v_uid,'digital_content_start_request',v_order.legal_version,jsonb_build_object('explicit',true,'delivery_type',v_delivery,'label','Quiero comenzar ahora')),
          (v_order.id,v_uid,'withdrawal_loss_ack',v_order.legal_version,jsonb_build_object('explicit',true,'scope','digital_content','delivery_type',v_delivery));
  end if;
  if coalesce(p_start_now,false) and v_delivery in ('service','hybrid') then
    insert into public.academy_legal_acceptances(order_id,user_id,acceptance_type,version,evidence)
    values(v_order.id,v_uid,'service_start_request',v_order.legal_version,jsonb_build_object('explicit',true,'delivery_type',v_delivery,'label','Quiero comenzar ahora'));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'installment_no',i.installment_no,'amount_cents',i.amount_cents,'due_at',i.due_at
  ) order by i.installment_no),'[]'::jsonb) into v_installments
  from public.academy_installments i where i.order_id=v_order.id;

  v_confirmation_text:=format(
    'Confirmación de matrícula GHC Academy. Curso: %s. Precio total: %s céntimos %s. Modalidad: %s pago(s). Inicio inmediato solicitado: %s. Tipo de entrega: %s. Versión legal: %s.',
    v_course.title,v_price,v_policy.currency,p_installment_count,case when p_start_now then 'sí' else 'no' end,v_delivery,v_order.legal_version
  );

  insert into public.academy_contract_confirmations(order_id,user_id,confirmation_type,legal_version,rendered_text,snapshot)
  values(v_order.id,v_uid,'order_confirmation',v_order.legal_version,v_confirmation_text,jsonb_build_object(
    'order_reference',v_order.order_reference,'course_id',v_course.id,'course_title',v_course.title,
    'currency',v_policy.currency,'total_cents',v_price,'financing_fee_cents',0,'installments',v_installments,
    'customer_type',v_order.customer_type,'delivery_type',v_delivery,'immediate_start',v_order.immediate_start,
    'withdrawal_ends_at',v_order.withdrawal_ends_at,'withdrawal_loss_ack',coalesce(p_withdrawal_loss_ack,false),
    'terms_version',v_order.terms_version,'privacy_version',v_order.privacy_version,'legal_version',v_order.legal_version
  ));

  insert into public.academy_notifications(order_id,audience,user_id,recipient_email,template_key,subject,body,dedupe_key,metadata)
  values(v_order.id,'student',v_uid,v_email,'order_confirmation','Confirmación de tu matrícula en GHC Academy',
    v_confirmation_text,format('order:%s:confirmation',v_order.id),jsonb_build_object('contract_confirmation',true))
  on conflict(dedupe_key) do nothing;

  insert into public.academy_commercial_events(order_id,event_type,actor_type,actor_user_id,message,payload)
  values(v_order.id,'order_prepared','student',v_uid,'Pedido Academy preparado',jsonb_build_object(
    'installments',p_installment_count,'start_now',p_start_now,'withdrawal_loss_ack',p_withdrawal_loss_ack,
    'total_cents',v_price,'delivery_type',v_delivery,'installment_limit',v_limit
  ));

  return jsonb_build_object(
    'order_id',v_order.id,'order_reference',v_order.order_reference,'status',v_order.status,'total_cents',v_price,
    'installment_count',p_installment_count,'start_now',p_start_now,'access_start_at',v_order.access_start_at,
    'delivery_type',v_delivery,'provider_connected',false,'contract_confirmation_created',true
  );
end;
$$;

create or replace function public.ghc_student_get_academy_contract_confirmation(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare v_uid uuid:=auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  select to_jsonb(c) into v_result from public.academy_contract_confirmations c
  where c.order_id=p_order_id and c.user_id=v_uid and c.confirmation_type='order_confirmation' limit 1;
  if v_result is null then raise exception 'Confirmación no disponible.'; end if;
  return v_result;
end;
$$;

revoke execute on function public.ghc_student_prepare_academy_order(uuid,integer,boolean,boolean,text,boolean,boolean,text,text) from public,anon;
grant execute on function public.ghc_student_prepare_academy_order(uuid,integer,boolean,boolean,text,boolean,boolean,text,text) to authenticated;
revoke execute on function public.ghc_student_get_academy_contract_confirmation(uuid) from public,anon;
grant execute on function public.ghc_student_get_academy_contract_confirmation(uuid) to authenticated;
