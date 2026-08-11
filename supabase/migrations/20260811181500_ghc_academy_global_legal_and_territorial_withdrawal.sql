alter table public.academy_orders
  add column if not exists country_code text not null default 'ZZ',
  add column if not exists legal_regime_code text not null default 'GLOBAL_GHC14_LOCAL_RIGHTS';

alter table public.academy_orders drop constraint if exists academy_orders_country_code_check;
alter table public.academy_orders add constraint academy_orders_country_code_check check (country_code ~ '^[A-Z]{2}$');

update public.academy_commercial_policies
set legal_version='GHC_ACADEMY_GLOBAL_2026_08', updated_at=now()
where status='active' and policy_code='GHC_ACADEMY_DEFAULT_2026_08';

create or replace function private.ghc_academy_territorial_rule(p_country_code text)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare v_country text:=upper(coalesce(nullif(trim(p_country_code),''),'ZZ'));
begin
  if v_country in ('AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO') then
    return jsonb_build_object('country_code',v_country,'regime_code','EEA_DIGITAL_14','ghc_days',14,'auto_digital_waiver_allowed',true,'withdrawal_anchor','contract','mapped',true);
  elsif v_country='GB' then return jsonb_build_object('country_code',v_country,'regime_code','UK_DIGITAL_14','ghc_days',14,'auto_digital_waiver_allowed',true,'withdrawal_anchor','contract','mapped',true);
  elsif v_country='AR' then return jsonb_build_object('country_code',v_country,'regime_code','AR_REVOCATION_10_PLUS_GHC14','ghc_days',14,'auto_digital_waiver_allowed',false,'withdrawal_anchor','access','mapped',true);
  elsif v_country='BR' then return jsonb_build_object('country_code',v_country,'regime_code','BR_ARREPENDIMENTO_7_PLUS_GHC14','ghc_days',14,'auto_digital_waiver_allowed',false,'withdrawal_anchor','access','mapped',true);
  elsif v_country='CO' then return jsonb_build_object('country_code',v_country,'regime_code','CO_RETRACTO_5B_PLUS_GHC14','ghc_days',14,'auto_digital_waiver_allowed',false,'withdrawal_anchor','access','mapped',true);
  elsif v_country='MX' then return jsonb_build_object('country_code',v_country,'regime_code','MX_REVOCACION_5B_PLUS_GHC14','ghc_days',14,'auto_digital_waiver_allowed',false,'withdrawal_anchor','access','mapped',true);
  elsif v_country='CL' then return jsonb_build_object('country_code',v_country,'regime_code','CL_RETRACTO_10_PLUS_GHC14','ghc_days',14,'auto_digital_waiver_allowed',false,'withdrawal_anchor','access','mapped',true);
  elsif v_country='PE' then return jsonb_build_object('country_code',v_country,'regime_code','PE_GHC14_MANDATORY_RIGHTS','ghc_days',14,'auto_digital_waiver_allowed',false,'withdrawal_anchor','access','mapped',true);
  else return jsonb_build_object('country_code',v_country,'regime_code','GLOBAL_GHC14_LOCAL_RIGHTS','ghc_days',14,'auto_digital_waiver_allowed',false,'withdrawal_anchor','access','mapped',false);
  end if;
end; $$;
revoke execute on function private.ghc_academy_territorial_rule(text) from public,anon,authenticated;

drop function if exists public.ghc_student_prepare_academy_order(uuid,integer,boolean,boolean,text,boolean,boolean,text,text,text);
create or replace function public.ghc_student_prepare_academy_order(
  p_course_id uuid,p_installment_count integer,p_start_now boolean,p_withdrawal_loss_ack boolean,p_country_code text,p_customer_type text,
  p_terms_accepted boolean,p_privacy_accepted boolean,p_terms_version text,p_privacy_version text
) returns jsonb language plpgsql security definer set search_path='public','private','auth' as $$
declare
  v_uid uuid:=auth.uid(); v_course public.courses; v_policy public.academy_commercial_policies; v_settings public.academy_course_commercial_settings;
  v_delivery text; v_price integer; v_limit integer; v_email text; v_order public.academy_orders; v_n integer; v_amount integer;
  v_installments jsonb; v_confirmation_text text; v_country text:=upper(coalesce(nullif(trim(p_country_code),''),'ZZ')); v_rule jsonb;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  if v_country !~ '^[A-Z]{2}$' then raise exception 'País de residencia no válido.'; end if;
  if not coalesce(p_terms_accepted,false) or not coalesce(p_privacy_accepted,false) then raise exception 'Debes aceptar las condiciones y la política de privacidad.'; end if;
  if coalesce(p_customer_type,'consumer') not in ('consumer','professional_business') then raise exception 'Tipo de cliente no válido.'; end if;
  select * into v_course from public.courses where id=p_course_id and status='published';
  if v_course.id is null then raise exception 'El curso no está disponible para matrícula.'; end if;
  select * into v_policy from public.academy_commercial_policies where status='active' and effective_from<=now() and (effective_to is null or effective_to>now()) order by effective_from desc limit 1;
  if v_policy.id is null then raise exception 'No hay política comercial activa.'; end if;
  select * into v_settings from public.academy_course_commercial_settings where course_id=v_course.id;
  v_delivery:=coalesce(v_settings.delivery_type,'digital_content'); v_rule:=private.ghc_academy_territorial_rule(v_country);
  if coalesce(p_start_now,false) and v_delivery in ('digital_content','hybrid') and not coalesce(p_withdrawal_loss_ack,false) then raise exception 'Para comenzar ahora el contenido digital debes reconocer expresamente que la consecuencia sobre el desistimiento dependerá de la ley aplicable en tu país.'; end if;
  v_price:=round(coalesce(v_course.price,0)*100)::integer; v_limit:=private.ghc_resolve_installment_limit(v_course.id,v_policy.id);
  if p_installment_count<1 or p_installment_count>v_limit then raise exception 'Ese número de pagos no está disponible para este curso.'; end if;
  select lower(email) into v_email from auth.users where id=v_uid;
  insert into public.academy_orders(user_id,course_id,email_normalized,country_code,legal_regime_code,customer_type,policy_id,payment_mode,installment_count,currency,base_total_cents,financing_fee_cents,payable_total_cents,status,provider,immediate_start,withdrawal_ends_at,withdrawal_waived_at,access_start_at,terms_version,privacy_version,legal_version,metadata)
  values(v_uid,v_course.id,v_email,v_country,v_rule->>'regime_code',coalesce(p_customer_type,'consumer'),v_policy.id,case when p_installment_count=1 then 'single' else 'merchant_installments' end,p_installment_count,v_policy.currency,v_price,0,v_price,'awaiting_payment','unassigned',coalesce(p_start_now,false),null,null,null,coalesce(nullif(trim(p_terms_version),''),v_policy.legal_version),coalesce(nullif(trim(p_privacy_version),''),v_policy.legal_version),v_policy.legal_version,jsonb_build_object('delivery_type',v_delivery,'installment_limit_at_purchase',v_limit,'territorial_rule',v_rule)) returning * into v_order;
  for v_n in 1..p_installment_count loop
    v_amount:=(v_price/p_installment_count)+case when v_n<=(v_price%p_installment_count) then 1 else 0 end;
    insert into public.academy_installments(order_id,installment_no,amount_cents,due_at) values(v_order.id,v_n,v_amount,now()+make_interval(days=>v_policy.installment_interval_days*(v_n-1)));
  end loop;
  insert into public.academy_legal_acceptances(order_id,user_id,acceptance_type,version,evidence)
  values(v_order.id,v_uid,'terms',v_order.terms_version,jsonb_build_object('accepted_in','academy_checkout','explicit',true,'country_code',v_country,'regime_code',v_order.legal_regime_code)),(v_order.id,v_uid,'privacy',v_order.privacy_version,jsonb_build_object('accepted_in','academy_checkout','explicit',true,'country_code',v_country));
  if coalesce(p_start_now,false) and v_delivery in ('digital_content','hybrid') then
    insert into public.academy_legal_acceptances(order_id,user_id,acceptance_type,version,evidence)
    values(v_order.id,v_uid,'digital_content_start_request',v_order.legal_version,jsonb_build_object('explicit',true,'delivery_type',v_delivery,'label','Quiero comenzar ahora','country_code',v_country)),(v_order.id,v_uid,'withdrawal_loss_ack',v_order.legal_version,jsonb_build_object('explicit',true,'scope','digital_content','delivery_type',v_delivery,'country_code',v_country,'auto_effect_only_if_local_law_allows',true));
  end if;
  if coalesce(p_start_now,false) and v_delivery in ('service','hybrid') then insert into public.academy_legal_acceptances(order_id,user_id,acceptance_type,version,evidence) values(v_order.id,v_uid,'service_start_request',v_order.legal_version,jsonb_build_object('explicit',true,'delivery_type',v_delivery,'label','Quiero comenzar ahora','country_code',v_country)); end if;
  select coalesce(jsonb_agg(jsonb_build_object('installment_no',i.installment_no,'amount_cents',i.amount_cents,'due_at',i.due_at) order by i.installment_no),'[]'::jsonb) into v_installments from public.academy_installments i where i.order_id=v_order.id;
  v_confirmation_text:=format('Confirmación de matrícula GHC Academy. Curso: %s. Precio total: %s céntimos %s. Modalidad: %s pago(s). País declarado: %s. Régimen registrado: %s. Inicio inmediato solicitado: %s. Versión legal: %s.',v_course.title,v_price,v_policy.currency,p_installment_count,v_country,v_order.legal_regime_code,case when p_start_now then 'sí' else 'no' end,v_order.legal_version);
  insert into public.academy_contract_confirmations(order_id,user_id,confirmation_type,legal_version,rendered_text,snapshot) values(v_order.id,v_uid,'order_confirmation',v_order.legal_version,v_confirmation_text,jsonb_build_object('order_reference',v_order.order_reference,'course_id',v_course.id,'course_title',v_course.title,'country_code',v_country,'legal_regime_code',v_order.legal_regime_code,'territorial_rule',v_rule,'currency',v_policy.currency,'total_cents',v_price,'financing_fee_cents',0,'installments',v_installments,'customer_type',v_order.customer_type,'delivery_type',v_delivery,'immediate_start',v_order.immediate_start,'withdrawal_loss_ack',coalesce(p_withdrawal_loss_ack,false),'terms_version',v_order.terms_version,'privacy_version',v_order.privacy_version,'legal_version',v_order.legal_version));
  insert into public.academy_notifications(order_id,audience,user_id,recipient_email,template_key,subject,body,dedupe_key,metadata) values(v_order.id,'student',v_uid,v_email,'order_confirmation','Confirmación de tu matrícula en GHC Academy',v_confirmation_text,format('order:%s:confirmation',v_order.id),jsonb_build_object('contract_confirmation',true,'country_code',v_country,'legal_regime_code',v_order.legal_regime_code)) on conflict(dedupe_key) do nothing;
  insert into public.academy_commercial_events(order_id,event_type,actor_type,actor_user_id,message,payload) values(v_order.id,'order_prepared','student',v_uid,'Pedido Academy preparado',jsonb_build_object('installments',p_installment_count,'start_now',p_start_now,'withdrawal_loss_ack',p_withdrawal_loss_ack,'total_cents',v_price,'delivery_type',v_delivery,'installment_limit',v_limit,'country_code',v_country,'territorial_rule',v_rule));
  return jsonb_build_object('order_id',v_order.id,'order_reference',v_order.order_reference,'status',v_order.status,'total_cents',v_price,'installment_count',p_installment_count,'start_now',p_start_now,'country_code',v_country,'legal_regime_code',v_order.legal_regime_code,'territorial_rule',v_rule,'access_start_at',v_order.access_start_at,'delivery_type',v_delivery,'provider_connected',false,'contract_confirmation_created',true);
end; $$;
revoke execute on function public.ghc_student_prepare_academy_order(uuid,integer,boolean,boolean,text,text,boolean,boolean,text,text) from public,anon;
grant execute on function public.ghc_student_prepare_academy_order(uuid,integer,boolean,boolean,text,text,boolean,boolean,text,text) to authenticated;
revoke execute on function public.ghc_student_prepare_academy_order(uuid,integer,boolean,boolean,text,boolean,boolean,text,text) from authenticated,anon,public;

create or replace function public.ghc_start_academy_withdrawal_clock_on_first_payment()
returns trigger language plpgsql security definer set search_path='public','private' as $$
declare v_order public.academy_orders; v_anchor timestamptz; v_access_start timestamptz; v_withdraw_end timestamptz; v_rule jsonb; v_days integer; v_has_loss_ack boolean:=false; v_auto_waiver boolean:=false;
begin
  if new.status='paid' and (old.status is distinct from 'paid' or old.paid_at is distinct from new.paid_at) then
    select * into v_order from public.academy_orders where id=new.order_id for update;
    if v_order.id is not null and v_order.withdrawal_ends_at is null then
      v_anchor:=coalesce(new.paid_at,now()); v_rule:=private.ghc_academy_territorial_rule(v_order.country_code); v_days:=coalesce((v_rule->>'ghc_days')::integer,14);
      select exists(select 1 from public.academy_legal_acceptances a where a.order_id=v_order.id and a.acceptance_type='withdrawal_loss_ack' and a.accepted=true) into v_has_loss_ack;
      v_auto_waiver:=coalesce((v_rule->>'auto_digital_waiver_allowed')::boolean,false);
      v_access_start:=case when v_order.immediate_start then v_anchor else v_anchor+make_interval(days=>v_days) end;
      v_withdraw_end:=case when v_rule->>'withdrawal_anchor'='access' then v_access_start+make_interval(days=>v_days) else v_anchor+make_interval(days=>v_days) end;
      update public.academy_orders set legal_regime_code=v_rule->>'regime_code',withdrawal_ends_at=v_withdraw_end,withdrawal_waived_at=case when v_order.immediate_start and v_has_loss_ack and v_auto_waiver then v_anchor else null end,access_start_at=v_access_start,updated_at=now() where id=v_order.id;
      insert into public.academy_commercial_events(order_id,event_type,actor_type,message,payload) values(v_order.id,'withdrawal_clock_started',case when new.provider='manual' then 'admin' else 'provider' end,'Plazo de desistimiento/retracto y acceso calculado con regla territorial',jsonb_build_object('first_paid_at',v_anchor,'country_code',v_order.country_code,'territorial_rule',v_rule,'access_start_at',v_access_start,'withdrawal_ends_at',v_withdraw_end,'withdrawal_loss_ack',v_has_loss_ack,'automatic_waiver_applied',v_order.immediate_start and v_has_loss_ack and v_auto_waiver));
    end if;
  end if;
  return new;
end; $$;
revoke execute on function public.ghc_start_academy_withdrawal_clock_on_first_payment() from public,anon,authenticated;

create or replace function private.ghc_academy_withdrawal_state(p_order_id uuid,p_at timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path='public','private' as $$
declare v_order public.academy_orders; v_delivery text; v_start_accept boolean:=false; v_loss_accept boolean:=false; v_within boolean:=false; v_available boolean:=false; v_manual boolean:=false; v_reason text; v_rule jsonb; v_auto_waiver boolean:=false; v_mapped boolean:=false;
begin
  select * into v_order from public.academy_orders where id=p_order_id; if v_order.id is null then raise exception 'Pedido Academy no encontrado.'; end if;
  select coalesce(s.delivery_type,'digital_content') into v_delivery from public.courses c left join public.academy_course_commercial_settings s on s.course_id=c.id where c.id=v_order.course_id; v_delivery:=coalesce(v_delivery,'digital_content');
  v_rule:=private.ghc_academy_territorial_rule(v_order.country_code); v_auto_waiver:=coalesce((v_rule->>'auto_digital_waiver_allowed')::boolean,false); v_mapped:=coalesce((v_rule->>'mapped')::boolean,false); v_within:=v_order.withdrawal_ends_at is not null and p_at<=v_order.withdrawal_ends_at;
  select exists(select 1 from public.academy_legal_acceptances a where a.order_id=v_order.id and a.acceptance_type='digital_content_start_request' and a.accepted=true) into v_start_accept;
  select exists(select 1 from public.academy_legal_acceptances a where a.order_id=v_order.id and a.acceptance_type='withdrawal_loss_ack' and a.accepted=true) into v_loss_accept;
  if v_order.customer_type<>'consumer' then v_manual:=true; v_reason:='Compra profesional/empresa: requiere revisión del régimen contractual aplicable.';
  elsif v_delivery='digital_content' then
    if v_order.immediate_start and v_start_accept and v_loss_accept and v_auto_waiver then v_available:=false; v_reason:='El régimen territorial registrado permite aplicar automáticamente la excepción por inicio inmediato de contenido digital y consta la doble aceptación exigida.';
    elsif v_within then v_available:=true; v_reason:='La política GHC de 14 días o el periodo territorial registrado sigue abierto.';
    elsif not v_mapped then v_manual:=true; v_reason:='La política GHC de 14 días ha finalizado, pero el territorio no está mapeado para denegar automáticamente derechos imperativos locales.';
    else v_available:=false; v_reason:='El periodo ordinario aplicable registrado ha finalizado; otros derechos imperativos permanecen intactos.'; end if;
  elsif v_delivery in ('service','hybrid') then
    if v_within then v_manual:=true; v_reason:='Producto con prestación de servicios: revisar la parte efectivamente prestada y la norma territorial.';
    elsif not v_mapped then v_manual:=true; v_reason:='Territorio no mapeado: revisar derechos locales antes de denegar.';
    else v_available:=false; v_reason:='El plazo ordinario registrado ha finalizado; otras causas legales se revisan por separado.'; end if;
  end if;
  return jsonb_build_object('order_id',v_order.id,'country_code',v_order.country_code,'legal_regime_code',v_order.legal_regime_code,'territorial_rule',v_rule,'delivery_type',v_delivery,'customer_type',v_order.customer_type,'withdrawal_ends_at',v_order.withdrawal_ends_at,'within_withdrawal_window',v_within,'immediate_start',v_order.immediate_start,'digital_start_request',v_start_accept,'withdrawal_loss_ack',v_loss_accept,'ordinary_withdrawal_available',v_available,'manual_review_required',v_manual,'reason',v_reason,'mandatory_rights_unaffected',true);
end; $$;
revoke execute on function private.ghc_academy_withdrawal_state(uuid,timestamptz) from public,anon,authenticated;
