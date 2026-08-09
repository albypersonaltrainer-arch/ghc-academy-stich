-- GHC Academy · Preventa 2026 · estados terminales de checkout V0.1
-- Persiste FAILED / EXPIRED verificados contra SumUp y deja la matrícula reintentable.

begin;

create or replace function public.preventa_mark_checkout_terminal_v1(
  p_order_reference text,
  p_installment_no smallint,
  p_provider_checkout_id text,
  p_terminal_status text,
  p_idempotency_key text,
  p_occurred_at timestamptz,
  p_provider_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_order public.preventa_orders%rowtype;
  v_payment public.preventa_payments%rowtype;
  v_attempt public.preventa_checkout_attempts%rowtype;
  v_hold public.preventa_capacity_holds%rowtype;
  v_attempt_status text;
  v_payment_status text;
begin
  if p_terminal_status not in ('failed','expired') then
    raise exception using errcode = 'P0001', message = 'INVALID_TERMINAL_CHECKOUT_STATUS';
  end if;

  if p_installment_no not in (1,2) then
    raise exception using errcode = 'P0001', message = 'INVALID_INSTALLMENT_NUMBER';
  end if;

  if p_provider_checkout_id is null or btrim(p_provider_checkout_id) = '' then
    raise exception using errcode = 'P0001', message = 'INVALID_PROVIDER_CHECKOUT_ID';
  end if;

  if exists (select 1 from public.preventa_events where idempotency_key = p_idempotency_key) then
    select * into v_order from public.preventa_orders where order_reference = p_order_reference;
    return jsonb_build_object(
      'order_reference', p_order_reference,
      'order_status', v_order.status,
      'founder_status', v_order.founder_status,
      'founder_place_number', v_order.founder_place_number,
      'terminal_status', p_terminal_status,
      'idempotent_replay', true
    );
  end if;

  select * into v_order
  from public.preventa_orders
  where order_reference = p_order_reference
  for update;

  if v_order.id is null then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  select * into v_payment
  from public.preventa_payments
  where order_id = v_order.id and installment_no = p_installment_no
  for update;

  if v_payment.id is null then
    raise exception using errcode = 'P0001', message = 'INSTALLMENT_NOT_FOUND';
  end if;

  if v_payment.status = 'paid' then
    raise exception using errcode = 'P0001', message = 'INSTALLMENT_ALREADY_PAID';
  end if;

  select * into v_attempt
  from public.preventa_checkout_attempts
  where order_id = v_order.id
    and installment_no = p_installment_no
    and provider_checkout_id = p_provider_checkout_id
  for update;

  if v_attempt.id is null then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_ATTEMPT_NOT_FOUND';
  end if;

  if v_attempt.status = 'paid' then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_ATTEMPT_ALREADY_PAID';
  end if;

  v_attempt_status := p_terminal_status;
  v_payment_status := case when p_terminal_status = 'failed' then 'failed' else 'pending' end;

  update public.preventa_checkout_attempts
  set status = v_attempt_status,
      updated_at = p_occurred_at
  where id = v_attempt.id;

  update public.preventa_payments
  set status = v_payment_status,
      provider_metadata = coalesce(provider_metadata, '{}'::jsonb) || coalesce(p_provider_metadata, '{}'::jsonb),
      failed_at = case when p_terminal_status = 'failed' then p_occurred_at else failed_at end,
      updated_at = p_occurred_at
  where id = v_payment.id;

  if p_installment_no = 1 then
    select * into v_hold
    from public.preventa_capacity_holds
    where order_id = v_order.id
      and provider_checkout_id = p_provider_checkout_id
    for update;

    if v_hold.id is not null and v_hold.status in ('held','attached') then
      update public.preventa_capacity_holds
      set status = case when p_terminal_status = 'expired' then 'expired' else 'released' end,
          released_at = p_occurred_at,
          updated_at = p_occurred_at
      where id = v_hold.id;
    end if;
  end if;

  -- La matrícula sigue abierta a un nuevo intento. Nunca adjudicamos plaza por un checkout no pagado.
  if p_installment_no = 1 then
    update public.preventa_orders
    set status = 'awaiting_payment',
        founder_place_number = null,
        founder_status = 'pending',
        updated_at = p_occurred_at
    where id = v_order.id;
  end if;

  insert into public.preventa_events (
    order_id, event_type, idempotency_key, payload, occurred_at
  ) values (
    v_order.id,
    case when p_terminal_status = 'failed' then 'checkout.attempt.failed' else 'checkout.attempt.expired' end,
    p_idempotency_key,
    jsonb_build_object(
      'installment_no', p_installment_no,
      'provider_checkout_id', p_provider_checkout_id,
      'terminal_status', p_terminal_status,
      'attempt_id', v_attempt.id,
      'capacity_hold_id', v_hold.id,
      'provider_metadata', coalesce(p_provider_metadata, '{}'::jsonb)
    ),
    p_occurred_at
  );

  select * into v_order from public.preventa_orders where id = v_order.id;

  return jsonb_build_object(
    'order_reference', p_order_reference,
    'order_status', v_order.status,
    'founder_status', v_order.founder_status,
    'founder_place_number', v_order.founder_place_number,
    'attempt_status', v_attempt_status,
    'payment_status', v_payment_status,
    'terminal_status', p_terminal_status,
    'idempotent_replay', false
  );
end;
$$;

revoke all on function public.preventa_mark_checkout_terminal_v1(text,smallint,text,text,text,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.preventa_mark_checkout_terminal_v1(text,smallint,text,text,text,timestamptz,jsonb) to service_role;

comment on function public.preventa_mark_checkout_terminal_v1 is
  'Persiste FAILED/EXPIRED verificados contra SumUp, libera capacity hold de primera cuota y permite reintento. Solo service_role.';

commit;
