-- GHC Academy · Preventa 2026 · frontera de expiración de capacity hold V0.1
-- Corrige exclusivamente la comparación de expiración en confirmación de pago:
-- held_until = p_occurred_at ya está expirado, igual que en reserve/attach/register.

begin;

create or replace function public.preventa_confirm_payment_v1(
  p_order_reference text,
  p_installment_no smallint,
  p_amount_cents integer,
  p_provider_payment_id text,
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
  v_first public.preventa_payments%rowtype;
  v_hold public.preventa_capacity_holds%rowtype;
  v_existing_order_id uuid;
  v_existing_installment smallint;
  v_due_at timestamptz;
  v_founder_place smallint;
  v_event_type text;
  v_checkout_id text;
begin
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception using errcode = 'P0001', message = 'INVALID_PROVIDER_PAYMENT_ID';
  end if;

  if exists (select 1 from public.preventa_events where idempotency_key = p_idempotency_key) then
    select * into v_order from public.preventa_orders where order_reference = p_order_reference;
    return jsonb_build_object(
      'order_reference', p_order_reference,
      'order_status', v_order.status,
      'founder_status', v_order.founder_status,
      'founder_place_number', v_order.founder_place_number,
      'idempotent_replay', true,
      'duplicate_provider_payment', false
    );
  end if;

  select * into v_order from public.preventa_orders where order_reference = p_order_reference for update;
  if v_order.id is null then raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND'; end if;

  select order_id, installment_no into v_existing_order_id, v_existing_installment
  from public.preventa_payments where provider_payment_id = p_provider_payment_id;

  if v_existing_order_id is not null then
    if v_existing_order_id = v_order.id and v_existing_installment = p_installment_no then
      return jsonb_build_object(
        'order_reference', p_order_reference,
        'order_status', v_order.status,
        'founder_status', v_order.founder_status,
        'founder_place_number', v_order.founder_place_number,
        'idempotent_replay', true,
        'duplicate_provider_payment', true
      );
    end if;
    raise exception using errcode = 'P0001', message = 'PROVIDER_PAYMENT_ID_ALREADY_USED';
  end if;

  select * into v_payment
  from public.preventa_payments
  where order_id = v_order.id and installment_no = p_installment_no
  for update;

  if v_payment.id is null then raise exception using errcode = 'P0001', message = 'INSTALLMENT_NOT_FOUND'; end if;
  if p_amount_cents <> v_payment.expected_amount_cents then raise exception using errcode = 'P0001', message = 'PAYMENT_AMOUNT_MISMATCH'; end if;

  if v_order.payment_plan = 'single' then
    if p_installment_no <> 1 or v_order.status <> 'awaiting_payment' then
      raise exception using errcode = 'P0001', message = 'INVALID_SINGLE_PAYMENT_STATE';
    end if;
  elsif p_installment_no = 1 then
    if v_order.status <> 'awaiting_payment' then
      raise exception using errcode = 'P0001', message = 'INVALID_FIRST_INSTALLMENT_STATE';
    end if;
  else
    if v_order.status not in ('partial','overdue') then
      raise exception using errcode = 'P0001', message = 'INVALID_SECOND_INSTALLMENT_STATE';
    end if;
    select * into v_first from public.preventa_payments where order_id = v_order.id and installment_no = 1 for update;
    if v_first.status <> 'paid' then raise exception using errcode = 'P0001', message = 'FIRST_INSTALLMENT_NOT_PAID'; end if;
  end if;

  if p_installment_no = 1 then
    v_checkout_id := nullif(coalesce(p_provider_metadata, '{}'::jsonb) ->> 'checkout_id', '');
    if v_checkout_id is null then
      raise exception using errcode = 'P0001', message = 'PROVIDER_CHECKOUT_ID_REQUIRED';
    end if;

    select * into v_hold
    from public.preventa_capacity_holds
    where order_id = v_order.id
      and provider_checkout_id = v_checkout_id
    for update;

    -- Frontera única: igualdad significa expirado.
    if v_hold.id is null or v_hold.status <> 'attached' or v_hold.held_until <= p_occurred_at then
      raise exception using errcode = 'P0001', message = 'ACTIVE_CAPACITY_HOLD_REQUIRED';
    end if;

    v_founder_place := v_hold.founder_place_number;
  else
    if v_order.founder_place_number is null or v_order.founder_status not in ('reserved','confirmed') then
      raise exception using errcode = 'P0001', message = 'FOUNDER_CAPACITY_MISSING_FOR_SECOND_INSTALLMENT';
    end if;
    v_founder_place := v_order.founder_place_number;
  end if;

  update public.preventa_payments
  set status = 'paid',
      paid_amount_cents = p_amount_cents,
      provider_payment_id = p_provider_payment_id,
      provider_metadata = coalesce(p_provider_metadata, '{}'::jsonb),
      paid_at = p_occurred_at,
      updated_at = p_occurred_at
  where id = v_payment.id;

  if v_order.payment_plan = 'single' then
    update public.preventa_orders
    set status = 'paid', founder_place_number = v_founder_place, founder_status = 'confirmed',
        paid_at = p_occurred_at, updated_at = p_occurred_at
    where id = v_order.id;

    update public.preventa_attribution
    set commission_base_cents = p_amount_cents, commission_status = 'accruing', updated_at = p_occurred_at
    where order_id = v_order.id;

    insert into public.preventa_email_queue (order_id, template_code, scheduled_for)
    values (v_order.id, 'E01', p_occurred_at)
    on conflict (order_id, template_code) do nothing;

    v_event_type := 'payment.single.paid';

  elsif p_installment_no = 1 then
    v_due_at := p_occurred_at + interval '15 days';

    update public.preventa_payments
    set due_at = v_due_at, status = 'pending', updated_at = p_occurred_at
    where order_id = v_order.id and installment_no = 2;

    update public.preventa_orders
    set status = 'partial', founder_place_number = v_founder_place, founder_status = 'reserved',
        second_due_at = v_due_at, updated_at = p_occurred_at
    where id = v_order.id;

    update public.preventa_attribution
    set commission_base_cents = p_amount_cents, commission_status = 'accruing', updated_at = p_occurred_at
    where order_id = v_order.id;

    insert into public.preventa_email_queue (order_id, template_code, scheduled_for)
    values
      (v_order.id, 'E02', p_occurred_at),
      (v_order.id, 'E03', v_due_at - interval '3 days'),
      (v_order.id, 'E04', v_due_at),
      (v_order.id, 'E05', v_due_at + interval '1 day'),
      (v_order.id, 'E06', v_due_at + interval '7 days'),
      (v_order.id, 'E07', v_due_at + interval '30 days'),
      (v_order.id, 'E08', v_due_at + interval '53 days'),
      (v_order.id, 'E09', v_due_at + interval '60 days')
    on conflict (order_id, template_code) do nothing;

    v_event_type := 'payment.installment1.paid';

  else
    update public.preventa_orders
    set status = 'paid', founder_place_number = v_founder_place, founder_status = 'confirmed',
        paid_at = p_occurred_at, updated_at = p_occurred_at
    where id = v_order.id;

    update public.preventa_attribution
    set commission_base_cents = v_order.first_installment_cents + p_amount_cents,
        commission_status = 'accruing', updated_at = p_occurred_at
    where order_id = v_order.id;

    update public.preventa_email_queue
    set status = 'cancelled', updated_at = p_occurred_at
    where order_id = v_order.id
      and template_code in ('E03','E04','E05','E06','E07','E08','E09')
      and status in ('queued','failed');

    insert into public.preventa_email_queue (order_id, template_code, scheduled_for)
    values (v_order.id, 'E10', p_occurred_at)
    on conflict (order_id, template_code) do nothing;

    v_event_type := 'payment.installment2.paid';
  end if;

  if p_installment_no = 1 then
    update public.preventa_capacity_holds
    set status = 'consumed', consumed_at = p_occurred_at, updated_at = p_occurred_at
    where id = v_hold.id;
  end if;

  insert into public.preventa_events (order_id, event_type, idempotency_key, payload, occurred_at)
  values (
    v_order.id,
    v_event_type,
    p_idempotency_key,
    jsonb_build_object(
      'installment_no', p_installment_no,
      'amount_cents', p_amount_cents,
      'provider_payment_id', p_provider_payment_id,
      'founder_place_number', v_founder_place,
      'capacity_hold_id', v_hold.id,
      'second_due_at', v_due_at
    ),
    p_occurred_at
  );

  select * into v_order from public.preventa_orders where id = v_order.id;

  return jsonb_build_object(
    'order_reference', p_order_reference,
    'order_status', v_order.status,
    'founder_status', v_order.founder_status,
    'founder_place_number', v_order.founder_place_number,
    'second_due_at', v_order.second_due_at,
    'event_type', v_event_type,
    'idempotent_replay', false,
    'duplicate_provider_payment', false
  );
end;
$$;

revoke all on function public.preventa_confirm_payment_v1(text,smallint,integer,text,text,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.preventa_confirm_payment_v1(text,smallint,integer,text,text,timestamptz,jsonb) to service_role;

comment on function public.preventa_confirm_payment_v1 is
  'Confirma pagos de preventa; la primera cuota exige hold adjunto con held_until estrictamente posterior a p_occurred_at. Solo service_role.';

commit;
