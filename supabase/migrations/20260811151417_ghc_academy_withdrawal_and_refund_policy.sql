create table if not exists public.academy_course_commercial_settings (
  course_id uuid primary key references public.courses(id) on delete cascade,
  delivery_type text not null default 'digital_content' check (delivery_type in ('digital_content','service','hybrid')),
  installment_enabled boolean not null default true,
  max_installments_override smallint check (max_installments_override between 1 and 4),
  withdrawal_mode text not null default 'statutory' check (withdrawal_mode in ('statutory','manual_review')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academy_refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.academy_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  reason_type text not null check (reason_type in ('withdrawal','nonconformity','duplicate_charge','billing_error','goodwill','other')),
  reason_text text,
  eligibility text not null check (eligibility in ('eligible','not_eligible','manual_review')),
  status text not null default 'submitted' check (status in ('submitted','approved_pending_provider','approved','rejected','cancelled')),
  requested_amount_cents integer,
  decision_reason text,
  decided_by uuid,
  decided_at timestamptz,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.academy_course_commercial_settings enable row level security;
alter table public.academy_refund_requests enable row level security;
revoke all on public.academy_course_commercial_settings from public,anon,authenticated;
revoke all on public.academy_refund_requests from public,anon,authenticated;

create or replace function private.ghc_academy_withdrawal_state(p_order_id uuid, p_at timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_order public.academy_orders;
  v_delivery text;
  v_start_accept boolean:=false;
  v_loss_accept boolean:=false;
  v_within boolean:=false;
  v_available boolean:=false;
  v_manual boolean:=false;
  v_reason text;
begin
  select * into v_order from public.academy_orders where id=p_order_id;
  if v_order.id is null then raise exception 'Pedido Academy no encontrado.'; end if;
  select coalesce(s.delivery_type,'digital_content') into v_delivery
  from public.courses c left join public.academy_course_commercial_settings s on s.course_id=c.id
  where c.id=v_order.course_id;
  v_delivery:=coalesce(v_delivery,'digital_content');
  v_within:=v_order.withdrawal_ends_at is not null and p_at<=v_order.withdrawal_ends_at;
  select exists(select 1 from public.academy_legal_acceptances a where a.order_id=v_order.id and a.acceptance_type='digital_content_start_request' and a.accepted=true) into v_start_accept;
  select exists(select 1 from public.academy_legal_acceptances a where a.order_id=v_order.id and a.acceptance_type='withdrawal_loss_ack' and a.accepted=true) into v_loss_accept;

  if v_order.customer_type<>'consumer' then
    v_available:=false;
    v_manual:=true;
    v_reason:='Compra identificada como profesional/empresa: revisar el régimen contractual aplicable antes de tramitar un desistimiento de consumidor.';
  elsif v_delivery='digital_content' then
    if v_order.immediate_start and v_start_accept and v_loss_accept then
      v_available:=false;
      v_reason:='El contenido digital comenzó de forma inmediata con solicitud expresa y reconocimiento de la pérdida del derecho de desistimiento ordinario.';
    elsif v_within then
      v_available:=true;
      v_reason:='El plazo ordinario de desistimiento sigue abierto y no consta una renuncia válida por inicio inmediato de contenido digital.';
    else
      v_available:=false;
      v_reason:='El plazo ordinario de desistimiento ha finalizado.';
    end if;
  elsif v_delivery in ('service','hybrid') then
    if v_within then
      v_manual:=true;
      v_reason:='Producto con prestación de servicios: el desistimiento y, en su caso, el importe proporcional deben revisarse según la parte efectivamente prestada.';
    else
      v_available:=false;
      v_reason:='El plazo ordinario de desistimiento ha finalizado; cualquier otra causa legal de reembolso debe revisarse por separado.';
    end if;
  end if;

  return jsonb_build_object(
    'order_id',v_order.id,'delivery_type',v_delivery,'customer_type',v_order.customer_type,
    'withdrawal_ends_at',v_order.withdrawal_ends_at,'within_withdrawal_window',v_within,
    'immediate_start',v_order.immediate_start,'digital_start_request',v_start_accept,'withdrawal_loss_ack',v_loss_accept,
    'ordinary_withdrawal_available',v_available,'manual_review_required',v_manual,'reason',v_reason,
    'mandatory_rights_unaffected',true
  );
end;
$$;

create or replace function public.ghc_student_get_academy_withdrawal_status(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path='public','private'
as $$
declare v_uid uuid:=auth.uid(); v_owner uuid;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  select user_id into v_owner from public.academy_orders where id=p_order_id;
  if v_owner is null or v_owner<>v_uid then raise exception 'Pedido no disponible.'; end if;
  return private.ghc_academy_withdrawal_state(p_order_id,now());
end;
$$;

create or replace function public.ghc_student_request_academy_refund(p_order_id uuid,p_reason_type text,p_reason_text text default null)
returns jsonb
language plpgsql
security definer
set search_path='public','private'
as $$
declare
  v_uid uuid:=auth.uid();
  v_order public.academy_orders;
  v_state jsonb;
  v_eligibility text;
  v_request public.academy_refund_requests;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  select * into v_order from public.academy_orders where id=p_order_id and user_id=v_uid;
  if v_order.id is null then raise exception 'Pedido no disponible.'; end if;
  if p_reason_type not in ('withdrawal','nonconformity','duplicate_charge','billing_error','other') then raise exception 'Motivo de solicitud no válido.'; end if;
  if p_reason_type='withdrawal' then
    v_state:=private.ghc_academy_withdrawal_state(v_order.id,now());
    if coalesce((v_state->>'ordinary_withdrawal_available')::boolean,false) then v_eligibility:='eligible';
    elsif coalesce((v_state->>'manual_review_required')::boolean,false) then v_eligibility:='manual_review';
    else v_eligibility:='not_eligible'; end if;
  else
    v_state:=jsonb_build_object('mandatory_rights_unaffected',true,'reason','La solicitud invoca una causa distinta del desistimiento ordinario y requiere revisión.');
    v_eligibility:='manual_review';
  end if;
  insert into public.academy_refund_requests(order_id,user_id,reason_type,reason_text,eligibility,metadata)
  values(v_order.id,v_uid,p_reason_type,p_reason_text,v_eligibility,jsonb_build_object('eligibility_snapshot',v_state)) returning * into v_request;
  insert into public.academy_commercial_events(order_id,event_type,actor_type,actor_user_id,message,payload)
  values(v_order.id,'refund_requested','student',v_uid,'Solicitud de reembolso registrada',jsonb_build_object('refund_request_id',v_request.id,'reason_type',p_reason_type,'eligibility',v_eligibility));
  insert into public.academy_notifications(order_id,audience,template_key,subject,body,dedupe_key,metadata)
  values(v_order.id,'admin','refund_request_admin','Nueva solicitud de reembolso Academy',
    format('El pedido %s tiene una solicitud de reembolso. Clasificación automática: %s. Requiere decisión administrativa antes de ejecutar cualquier devolución.',v_order.order_reference,v_eligibility),
    format('refund:%s:admin',v_request.id),jsonb_build_object('refund_request_id',v_request.id,'eligibility',v_eligibility)) on conflict(dedupe_key) do nothing;
  return jsonb_build_object('refund_request_id',v_request.id,'eligibility',v_eligibility,'provider_refund_executed',false,'withdrawal_state',v_state);
end;
$$;

create or replace function public.ghc_admin_decide_academy_refund(p_refund_request_id uuid,p_approve boolean,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare v_r public.academy_refund_requests; v_o public.academy_orders;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  select * into v_r from public.academy_refund_requests where id=p_refund_request_id for update;
  if v_r.id is null then raise exception 'Solicitud no encontrada.'; end if;
  if v_r.status not in ('submitted','approved_pending_provider') then raise exception 'La solicitud ya está resuelta.'; end if;
  select * into v_o from public.academy_orders where id=v_r.order_id;
  update public.academy_refund_requests set
    status=case when p_approve then 'approved_pending_provider' else 'rejected' end,
    decision_reason=p_reason,decided_by=auth.uid(),decided_at=now(),updated_at=now()
  where id=v_r.id;
  if p_approve then
    update public.academy_orders set collection_paused=true,updated_at=now() where id=v_o.id;
  end if;
  insert into public.academy_commercial_events(order_id,event_type,actor_type,actor_user_id,message,payload)
  values(v_o.id,case when p_approve then 'refund_approved_pending_provider' else 'refund_rejected' end,'admin',auth.uid(),p_reason,jsonb_build_object('refund_request_id',v_r.id,'provider_connected',false));
  insert into public.academy_notifications(order_id,audience,user_id,recipient_email,template_key,subject,body,dedupe_key,metadata)
  values(v_o.id,'student',v_o.user_id,v_o.email_normalized,
    case when p_approve then 'refund_approved' else 'refund_rejected' end,
    case when p_approve then 'Tu solicitud de reembolso ha sido aprobada' else 'Resolución de tu solicitud de reembolso' end,
    case when p_approve then 'Tu solicitud ha sido aprobada. La devolución quedará pendiente de ejecución por el proveedor de pago cuando esté conectado.' else coalesce(p_reason,'La solicitud no ha sido aprobada tras su revisión.') end,
    format('refund:%s:student-decision',v_r.id),jsonb_build_object('approved',p_approve)) on conflict(dedupe_key) do nothing;
  return jsonb_build_object('refund_request_id',v_r.id,'approved',p_approve,'provider_refund_executed',false,'collection_paused',p_approve);
end;
$$;

create or replace function public.ghc_admin_set_course_commercial_settings(p_course_id uuid,p_delivery_type text,p_installment_enabled boolean,p_max_installments_override integer,p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  if p_delivery_type not in ('digital_content','service','hybrid') then raise exception 'Tipo de entrega no válido.'; end if;
  if p_max_installments_override is not null and (p_max_installments_override<1 or p_max_installments_override>4) then raise exception 'Máximo de pagos no válido.'; end if;
  insert into public.academy_course_commercial_settings(course_id,delivery_type,installment_enabled,max_installments_override,notes)
  values(p_course_id,p_delivery_type,coalesce(p_installment_enabled,true),p_max_installments_override,p_notes)
  on conflict(course_id) do update set delivery_type=excluded.delivery_type,installment_enabled=excluded.installment_enabled,max_installments_override=excluded.max_installments_override,notes=excluded.notes,updated_at=now();
  return jsonb_build_object('course_id',p_course_id,'delivery_type',p_delivery_type,'installment_enabled',p_installment_enabled,'max_installments_override',p_max_installments_override);
end;
$$;

grant execute on function public.ghc_public_get_course_payment_options(text) to authenticated;

revoke execute on function private.ghc_academy_withdrawal_state(uuid,timestamptz) from public,anon,authenticated;
revoke execute on function public.ghc_student_get_academy_withdrawal_status(uuid) from public,anon;
grant execute on function public.ghc_student_get_academy_withdrawal_status(uuid) to authenticated;
revoke execute on function public.ghc_student_request_academy_refund(uuid,text,text) from public,anon;
grant execute on function public.ghc_student_request_academy_refund(uuid,text,text) to authenticated;
revoke execute on function public.ghc_admin_decide_academy_refund(uuid,boolean,text) from public,anon;
grant execute on function public.ghc_admin_decide_academy_refund(uuid,boolean,text) to authenticated;
revoke execute on function public.ghc_admin_set_course_commercial_settings(uuid,text,boolean,integer,text) from public,anon;
grant execute on function public.ghc_admin_set_course_commercial_settings(uuid,text,boolean,integer,text) to authenticated;
