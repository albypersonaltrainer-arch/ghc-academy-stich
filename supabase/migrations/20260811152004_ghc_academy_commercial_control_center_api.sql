create or replace function public.ghc_admin_get_academy_commercial_policy()
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare v_policy public.academy_commercial_policies;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  select * into v_policy from public.academy_commercial_policies where status='active' and effective_from<=now() and (effective_to is null or effective_to>now()) order by effective_from desc limit 1;
  if v_policy.id is null then return null; end if;
  return to_jsonb(v_policy);
end;
$$;

create or replace function public.ghc_student_get_my_academy_orders()
returns jsonb
language plpgsql
stable
security definer
set search_path='public','private'
as $$
declare v_uid uuid:=auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',o.id,'order_reference',o.order_reference,'course_id',o.course_id,'course_title',c.title,'course_slug',c.slug,
    'payment_mode',o.payment_mode,'installment_count',o.installment_count,'currency',o.currency,'base_total_cents',o.base_total_cents,
    'financing_fee_cents',o.financing_fee_cents,'payable_total_cents',o.payable_total_cents,'status',o.status,'provider',o.provider,
    'immediate_start',o.immediate_start,'withdrawal_ends_at',o.withdrawal_ends_at,'access_start_at',o.access_start_at,'fully_paid_at',o.fully_paid_at,
    'collection_paused',o.collection_paused,'created_at',o.created_at,
    'installments',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'installment_no',i.installment_no,'amount_cents',i.amount_cents,'due_at',i.due_at,'status',i.status,'paid_at',i.paid_at) order by i.installment_no) from public.academy_installments i where i.order_id=o.id),'[]'::jsonb),
    'access',(select jsonb_build_object('status',ca.status,'max_module_order',ca.commercial_max_module_order,'fully_paid',ca.commercial_fully_paid,'manual_override',ca.commercial_manual_override) from public.course_access ca where ca.user_id=o.user_id and ca.course_id=o.course_id limit 1),
    'withdrawal',private.ghc_academy_withdrawal_state(o.id,now())
  ) order by o.created_at desc),'[]'::jsonb) into v_result
  from public.academy_orders o join public.courses c on c.id=o.course_id where o.user_id=v_uid;
  return v_result;
end;
$$;

create or replace function public.ghc_admin_get_academy_order_detail(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path='public','private'
as $$
declare v_o public.academy_orders; v_result jsonb;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  select * into v_o from public.academy_orders where id=p_order_id;
  if v_o.id is null then raise exception 'Pedido no encontrado.'; end if;
  select jsonb_build_object(
    'order',to_jsonb(v_o),
    'course',(select jsonb_build_object('id',c.id,'title',c.title,'slug',c.slug,'status',c.status,'price',c.price) from public.courses c where c.id=v_o.course_id),
    'installments',coalesce((select jsonb_agg(to_jsonb(i) order by i.installment_no) from public.academy_installments i where i.order_id=v_o.id),'[]'::jsonb),
    'access',(select to_jsonb(ca) from public.course_access ca where ca.user_id=v_o.user_id and ca.course_id=v_o.course_id limit 1),
    'legal_acceptances',coalesce((select jsonb_agg(to_jsonb(a) order by a.accepted_at) from public.academy_legal_acceptances a where a.order_id=v_o.id),'[]'::jsonb),
    'withdrawal',private.ghc_academy_withdrawal_state(v_o.id,now()),
    'refund_requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from public.academy_refund_requests r where r.order_id=v_o.id),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from public.academy_commercial_events e where e.order_id=v_o.id),'[]'::jsonb),
    'notifications',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from public.academy_notifications n where n.order_id=v_o.id),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.ghc_admin_list_academy_refund_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'order_id',r.order_id,'order_reference',o.order_reference,'user_id',r.user_id,'email',o.email_normalized,'course_id',o.course_id,'course_title',c.title,
    'reason_type',r.reason_type,'reason_text',r.reason_text,'eligibility',r.eligibility,'status',r.status,'requested_amount_cents',r.requested_amount_cents,
    'decision_reason',r.decision_reason,'decided_at',r.decided_at,'created_at',r.created_at
  ) order by r.created_at desc),'[]'::jsonb) into v_result
  from public.academy_refund_requests r join public.academy_orders o on o.id=r.order_id join public.courses c on c.id=o.course_id;
  return v_result;
end;
$$;

create or replace function public.ghc_admin_pause_academy_collection(p_order_id uuid,p_paused boolean,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare v_o public.academy_orders;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  update public.academy_orders set collection_paused=coalesce(p_paused,false),updated_at=now() where id=p_order_id returning * into v_o;
  if v_o.id is null then raise exception 'Pedido no encontrado.'; end if;
  insert into public.academy_commercial_events(order_id,event_type,actor_type,actor_user_id,message,payload)
  values(v_o.id,case when p_paused then 'collection_paused' else 'collection_resumed' end,'admin',auth.uid(),coalesce(p_reason,case when p_paused then 'Cobros pausados manualmente' else 'Cobros reanudados manualmente' end),jsonb_build_object('paused',p_paused));
  return jsonb_build_object('order_id',v_o.id,'collection_paused',v_o.collection_paused);
end;
$$;

create or replace function public.ghc_admin_reactivate_academy_order(p_order_id uuid,p_first_due_in_days integer,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path='public','private'
as $$
declare
  v_o public.academy_orders;
  v_policy public.academy_commercial_policies;
  v_first_unpaid integer;
  v_changed integer;
  v_result jsonb;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  if p_first_due_in_days<0 or p_first_due_in_days>60 then raise exception 'El nuevo primer vencimiento debe quedar entre hoy y 60 días.'; end if;
  select * into v_o from public.academy_orders where id=p_order_id for update;
  if v_o.id is null then raise exception 'Pedido no encontrado.'; end if;
  if v_o.status<>'cancelled' then raise exception 'Solo se puede reabrir un plan cancelado.'; end if;
  select * into v_policy from public.academy_commercial_policies where id=v_o.policy_id;
  select min(installment_no) into v_first_unpaid from public.academy_installments where order_id=v_o.id and status='cancelled';
  if v_first_unpaid is null then raise exception 'No quedan cuotas pendientes para reactivar.'; end if;
  update public.academy_installments
  set status='pending',
      due_at=now()+make_interval(days=>p_first_due_in_days + v_policy.installment_interval_days*(installment_no-v_first_unpaid)),
      updated_at=now(),metadata=metadata||jsonb_build_object('reactivated_by',auth.uid(),'reactivation_reason',p_reason)
  where order_id=v_o.id and status='cancelled';
  get diagnostics v_changed=row_count;
  update public.academy_orders set status='active',cancelled_at=null,collection_paused=false,updated_at=now() where id=v_o.id;
  insert into public.academy_commercial_events(order_id,event_type,actor_type,actor_user_id,message,payload)
  values(v_o.id,'installment_plan_reactivated','admin',auth.uid(),coalesce(p_reason,'Plan reactivado manualmente'),jsonb_build_object('first_due_in_days',p_first_due_in_days,'installments_reactivated',v_changed));
  insert into public.academy_notifications(order_id,audience,user_id,recipient_email,template_key,subject,body,dedupe_key,metadata)
  values(v_o.id,'student',v_o.user_id,v_o.email_normalized,'installment_plan_reactivated','Tu plan de pagos ha sido reactivado',
    format('GHC Academy ha reactivado tu plan. La próxima cuota vence dentro de %s días. Mantienes el progreso y el contenido ya adquirido.',p_first_due_in_days),
    format('order:%s:reactivated:%s',v_o.id,extract(epoch from now())::bigint),jsonb_build_object('first_due_in_days',p_first_due_in_days)) on conflict(dedupe_key) do nothing;
  v_result:=private.ghc_apply_academy_order_state(v_o.id,'admin');
  return v_result||jsonb_build_object('installments_reactivated',v_changed);
end;
$$;

revoke execute on function public.ghc_admin_get_academy_commercial_policy() from public,anon;
grant execute on function public.ghc_admin_get_academy_commercial_policy() to authenticated;
revoke execute on function public.ghc_student_get_my_academy_orders() from public,anon;
grant execute on function public.ghc_student_get_my_academy_orders() to authenticated;
revoke execute on function public.ghc_admin_get_academy_order_detail(uuid) from public,anon;
grant execute on function public.ghc_admin_get_academy_order_detail(uuid) to authenticated;
revoke execute on function public.ghc_admin_list_academy_refund_requests() from public,anon;
grant execute on function public.ghc_admin_list_academy_refund_requests() to authenticated;
revoke execute on function public.ghc_admin_pause_academy_collection(uuid,boolean,text) from public,anon;
grant execute on function public.ghc_admin_pause_academy_collection(uuid,boolean,text) to authenticated;
revoke execute on function public.ghc_admin_reactivate_academy_order(uuid,integer,text) from public,anon;
grant execute on function public.ghc_admin_reactivate_academy_order(uuid,integer,text) to authenticated;
