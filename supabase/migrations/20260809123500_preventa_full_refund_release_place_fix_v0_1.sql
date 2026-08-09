-- GHC Academy · Preventa 2026 · full refund founder place release fix V0.1
-- En un reembolso completo, la plaza Fundador deja de pertenecer a la matrícula
-- y debe poder reutilizarse sin conservar founder_place_number en la orden.

begin;

create or replace function public.preventa_full_refund_v1(
  p_order_reference text,
  p_provider_refund_id text,
  p_idempotency_key text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_order public.preventa_orders%rowtype;
begin
  if exists(select 1 from public.preventa_events where idempotency_key=p_idempotency_key) then
    return jsonb_build_object('order_reference',p_order_reference,'idempotent_replay',true);
  end if;

  if exists(
    select 1
    from public.preventa_events
    where event_type='payment.full_refunded'
      and payload->>'provider_refund_id'=p_provider_refund_id
  ) then
    return jsonb_build_object(
      'order_reference',p_order_reference,
      'idempotent_replay',true,
      'duplicate_provider_refund',true
    );
  end if;

  select * into v_order
  from public.preventa_orders
  where order_reference=p_order_reference
  for update;

  if v_order.id is null then
    raise exception using errcode='P0001',message='ORDER_NOT_FOUND';
  end if;

  if v_order.status not in('partial','paid','overdue') then
    raise exception using errcode='P0001',message='NOTHING_TO_REFUND';
  end if;

  if not exists(
    select 1
    from public.preventa_payments
    where order_id=v_order.id
      and paid_amount_cents>refunded_amount_cents
  ) then
    raise exception using errcode='P0001',message='NOTHING_TO_REFUND';
  end if;

  update public.preventa_payments
  set status=case when paid_amount_cents>0 then 'refunded' else status end,
      refunded_amount_cents=paid_amount_cents,
      updated_at=p_occurred_at
  where order_id=v_order.id;

  update public.preventa_orders
  set status='refunded',
      founder_status='released',
      founder_place_number=null,
      updated_at=p_occurred_at
  where id=v_order.id;

  update public.preventa_attribution
  set commission_base_cents=0,
      commission_status='reversed',
      updated_at=p_occurred_at
  where order_id=v_order.id;

  update public.preventa_email_queue
  set status='cancelled',
      updated_at=p_occurred_at
  where order_id=v_order.id
    and template_code in('E03','E04','E05','E06','E07','E08','E09')
    and status in('queued','failed');

  insert into public.preventa_events(
    order_id,event_type,idempotency_key,payload,occurred_at
  ) values(
    v_order.id,
    'payment.full_refunded',
    p_idempotency_key,
    jsonb_build_object('provider_refund_id',p_provider_refund_id),
    p_occurred_at
  );

  return jsonb_build_object(
    'order_reference',p_order_reference,
    'order_status','refunded',
    'founder_status','released',
    'founder_place_number',null,
    'idempotent_replay',false
  );
end;
$$;

revoke all on function public.preventa_full_refund_v1(text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.preventa_full_refund_v1(text,text,text,timestamptz) to service_role;

comment on function public.preventa_full_refund_v1 is
  'Aplica reembolso completo verificado, revierte comisión y libera completamente la plaza Fundador. Solo service_role.';

commit;
