-- GHC Academy · Preventa 2026 · transiciones económicas atómicas V0.1
-- DEPENDE DE: 20260808_preventa_operativa_v0_1.sql
-- IMPORTANTE: versionado únicamente. NO ejecutar en Supabase real hasta Gate técnico + autorización final de Alby.

begin;

-- -----------------------------------------------------------------------------
-- 1. Endurecimiento de creación de borradores frente a concurrencia real.
--    El advisory lock es transaccional y serializa únicamente el mismo request_key.
-- -----------------------------------------------------------------------------
create or replace function public.preventa_create_draft_v1(
  p_order_reference text,
  p_request_key text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_country text,
  p_phone text,
  p_payment_plan text,
  p_total_amount_cents integer,
  p_first_installment_cents integer,
  p_second_installment_cents integer,
  p_offer_code text,
  p_offer_version text,
  p_terms_version text,
  p_privacy_version text,
  p_legal_package_version text,
  p_marketing_consent boolean,
  p_source_channel text,
  p_source_detail text,
  p_campaign_code text,
  p_closer_code text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_order_id uuid;
  v_existing_reference text;
begin
  if p_request_key is null or length(btrim(p_request_key)) < 16 then
    raise exception using errcode = 'P0001', message = 'INVALID_REQUEST_KEY';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_key, 0));

  select id, order_reference
    into v_order_id, v_existing_reference
  from public.preventa_orders
  where request_key = p_request_key;

  if v_order_id is not null then
    return jsonb_build_object(
      'order_id', v_order_id,
      'order_reference', v_existing_reference,
      'idempotent_replay', true
    );
  end if;

  insert into public.preventa_orders (
    order_reference,
    request_key,
    offer_code,
    offer_version,
    first_name,
    last_name,
    email,
    country,
    phone,
    payment_plan,
    total_amount_cents,
    first_installment_cents,
    second_installment_cents,
    second_due_at,
    status,
    founder_status,
    terms_version,
    privacy_version,
    legal_package_version
  ) values (
    p_order_reference,
    p_request_key,
    p_offer_code,
    p_offer_version,
    p_first_name,
    p_last_name,
    p_email,
    p_country,
    nullif(p_phone, ''),
    p_payment_plan,
    p_total_amount_cents,
    p_first_installment_cents,
    p_second_installment_cents,
    null,
    'draft',
    'pending',
    p_terms_version,
    p_privacy_version,
    p_legal_package_version
  )
  returning id into v_order_id;

  insert into public.preventa_payments (
    order_id,
    installment_no,
    expected_amount_cents,
    due_at,
    status
  ) values (
    v_order_id,
    1,
    p_first_installment_cents,
    null,
    'pending'
  );

  if p_payment_plan = 'split' then
    insert into public.preventa_payments (
      order_id,
      installment_no,
      expected_amount_cents,
      due_at,
      status
    ) values (
      v_order_id,
      2,
      p_second_installment_cents,
      null,
      'pending'
    );
  end if;

  insert into public.preventa_acceptances (
    order_id,
    acceptance_type,
    accepted,
    document_version,
    evidence_metadata
  ) values
    (v_order_id, 'terms', true, p_terms_version, jsonb_build_object('request_key', p_request_key)),
    (v_order_id, 'privacy_notice', true, p_privacy_version, jsonb_build_object('request_key', p_request_key)),
    (v_order_id, 'private_training_ack', true, p_legal_package_version, jsonb_build_object('request_key', p_request_key)),
    (v_order_id, 'marketing', coalesce(p_marketing_consent, false), p_privacy_version, jsonb_build_object('request_key', p_request_key));

  insert into public.preventa_attribution (
    order_id,
    source_channel,
    source_detail,
    campaign_code,
    closer_code
  ) values (
    v_order_id,
    nullif(p_source_channel, ''),
    nullif(p_source_detail, ''),
    nullif(p_campaign_code, ''),
    nullif(p_closer_code, '')
  );

  insert into public.preventa_events (
    order_id,
    event_type,
    idempotency_key,
    payload
  ) values (
    v_order_id,
    'order.draft.created',
    'order:' || p_request_key || ':draft-created',
    jsonb_build_object(
      'order_reference', p_order_reference,
      'payment_plan', p_payment_plan,
      'total_amount_cents', p_total_amount_cents,
      'offer_code', p_offer_code,
      'offer_version', p_offer_version
    )
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_reference', p_order_reference,
    'idempotent_replay', false
  );
end;
$$;


-- -----------------------------------------------------------------------------
-- 2. Checkout preparado: draft -> awaiting_payment.
--    No cobra ni reserva plaza. Solo registra que existe un checkout de proveedor.
-- -----------------------------------------------------------------------------
create or replace function public.preventa_prepare_checkout_v1(
  p_order_reference text,
  p_provider_checkout_id text,
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
  if exists (
    select 1 from public.preventa_events where idempotency_key = p_idempotency_key
  ) then
    select * into v_order
    from public.preventa_orders
    where order_reference = p_order_reference;

    return jsonb_build_object(
      'order_reference', p_order_reference,
      'order_status', v_order.status,
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

  if v_order.status <> 'draft' then
    raise exception using errcode = 'P0001', message = 'INVALID_ORDER_STATE_FOR_CHECKOUT';
  end if;

  update public.preventa_orders
  set status = 'awaiting_payment', updated_at = p_occurred_at
  where id = v_order.id;

  update public.preventa_payments
  set provider_checkout_id = nullif(p_provider_checkout_id, ''),
      status = 'processing',
      updated_at = p_occurred_at
  where order_id = v_order.id and installment_no = 1;

  insert into public.preventa_events (
    order_id, event_type, idempotency_key, payload, occurred_at
  ) values (
    v_order.id,
    'checkout.prepared',
    p_idempotency_key,
    jsonb_build_object('provider_checkout_id', nullif(p_provider_checkout_id, '')),
    p_occurred_at
  );

  return jsonb_build_object(
    'order_reference', p_order_reference,
    'order_status', 'awaiting_payment',
    'idempotent_replay', false
  );
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. Pago confirmado.
--    Actualiza cuota, orden, plaza, comisión, evento y correos en una transacción.
-- -----------------------------------------------------------------------------
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
  v_existing_order_id uuid;
  v_existing_installment smallint;
  v_due_at timestamptz;
  v_founder_place smallint;
  v_event_type text;
begin
  if p_provider_payment_id is null or btrim(p_provider_payment_id) = '' then
    raise exception using errcode = 'P0001', message = 'INVALID_PROVIDER_PAYMENT_ID';
  end if;

  if exists (
    select 1 from public.preventa_events where idempotency_key = p_idempotency_key
  ) then
    select * into v_order
    from public.preventa_orders
    where order_reference = p_order_reference;

    return jsonb_build_object(
      'order_reference', p_order_reference,
      'order_status', v_order.status,
      'founder_status', v_order.founder_status,
      'founder_place_number', v_order.founder_place_number,
      'idempotent_replay', true,
      'duplicate_provider_payment', false
    );
  end if;

  select * into v_order
  from public.preventa_orders
  where order_reference = p_order_reference
  for update;

  if v_order.id is null then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  select order_id, installment_no
    into v_existing_order_id, v_existing_installment
  from public.preventa_payments
  where provider_payment_id = p_provider_payment_id;

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

  if v_payment.id is null then
    raise exception using errcode = 'P0001', message = 'INSTALLMENT_NOT_FOUND';
  end if;

  if p_amount_cents <> v_payment.expected_amount_cents then
    raise exception using errcode = 'P0001', message = 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  if v_order.payment_plan = 'single' then
    if p_installment_no <> 1 or v_order.status <> 'awaiting_payment' then
      raise exception using errcode = 'P0001', message = 'INVALID_SINGLE_PAYMENT_STATE';
    end if;
  elsif p_installment_no = 1 then
    if v_order.status <> 'awaiting_payment' then
      raise exception using errcode = 'P0001', message = 'INVALID_FIRST_INSTALLMENT_STATE';
    end if;
  else
    if v_order.status not in ('partial', 'overdue') then
      raise exception using errcode = 'P0001', message = 'INVALID_SECOND_INSTALLMENT_STATE';
    end if;

    select * into v_first
    from public.preventa_payments
    where order_id = v_order.id and installment_no = 1
    for update;

    if v_first.status <> 'paid' then
      raise exception using errcode = 'P0001', message = 'FIRST_INSTALLMENT_NOT_PAID';
    end if;
  end if;

  -- Serializa la elección de números 1..100 para evitar colisiones entre pagos simultáneos.
  if v_order.founder_place_number is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('GHC_PREVENTA_FOUNDER_CAPACITY_2026', 0)
    );

    select gs::smallint into v_founder_place
    from pg_catalog.generate_series(1, 100) as gs
    where not exists (
      select 1
      from public.preventa_orders o
      where o.founder_place_number = gs
        and o.founder_status in ('reserved', 'confirmed')
    )
    order by gs
    limit 1;

    if v_founder_place is null then
      raise exception using errcode = 'P0001', message = 'FOUNDER_PLACES_FULL';
    end if;
  else
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
    set status = 'paid',
        founder_place_number = v_founder_place,
        founder_status = 'confirmed',
        paid_at = p_occurred_at,
        updated_at = p_occurred_at
    where id = v_order.id;

    update public.preventa_attribution
    set commission_base_cents = p_amount_cents,
        commission_status = 'accruing',
        updated_at = p_occurred_at
    where order_id = v_order.id;

    insert into public.preventa_email_queue (order_id, template_code, scheduled_for)
    values (v_order.id, 'E01', p_occurred_at)
    on conflict (order_id, template_code) do nothing;

    v_event_type := 'payment.single.paid';

  elsif p_installment_no = 1 then
    v_due_at := p_occurred_at + interval '15 days';

    update public.preventa_payments
    set due_at = v_due_at,
        status = 'pending',
        updated_at = p_occurred_at
    where order_id = v_order.id and installment_no = 2;

    update public.preventa_orders
    set status = 'partial',
        founder_place_number = v_founder_place,
        founder_status = 'reserved',
        second_due_at = v_due_at,
        updated_at = p_occurred_at
    where id = v_order.id;

    update public.preventa_attribution
    set commission_base_cents = p_amount_cents,
        commission_status = 'accruing',
        updated_at = p_occurred_at
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
    set status = 'paid',
        founder_place_number = v_founder_place,
        founder_status = 'confirmed',
        paid_at = p_occurred_at,
        updated_at = p_occurred_at
    where id = v_order.id;

    update public.preventa_attribution
    set commission_base_cents = v_order.first_installment_cents + p_amount_cents,
        commission_status = 'accruing',
        updated_at = p_occurred_at
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

  insert into public.preventa_events (
    order_id, event_type, idempotency_key, payload, occurred_at
  ) values (
    v_order.id,
    v_event_type,
    p_idempotency_key,
    jsonb_build_object(
      'installment_no', p_installment_no,
      'amount_cents', p_amount_cents,
      'provider_payment_id', p_provider_payment_id,
      'founder_place_number', v_founder_place,
      'second_due_at', v_due_at
    ),
    p_occurred_at
  );

  select * into v_order
  from public.preventa_orders
  where id = v_order.id;

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


-- -----------------------------------------------------------------------------
-- 4. Primera jornada vencida: partial -> overdue.
-- -----------------------------------------------------------------------------
create or replace function public.preventa_mark_overdue_v1(
  p_order_reference text,
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
  if exists (
    select 1 from public.preventa_events where idempotency_key = p_idempotency_key
  ) then
    return jsonb_build_object('order_reference', p_order_reference, 'idempotent_replay', true);
  end if;

  select * into v_order
  from public.preventa_orders
  where order_reference = p_order_reference
  for update;

  if v_order.id is null then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  if v_order.payment_plan <> 'split' or v_order.status <> 'partial' or v_order.second_due_at is null then
    raise exception using errcode = 'P0001', message = 'INVALID_ORDER_STATE_FOR_OVERDUE';
  end if;

  if p_occurred_at < v_order.second_due_at + interval '1 day' then
    raise exception using errcode = 'P0001', message = 'OVERDUE_TOO_EARLY';
  end if;

  update public.preventa_payments
  set status = 'overdue', updated_at = p_occurred_at
  where order_id = v_order.id and installment_no = 2 and status <> 'paid';

  update public.preventa_orders
  set status = 'overdue', updated_at = p_occurred_at
  where id = v_order.id;

  insert into public.preventa_events (
    order_id, event_type, idempotency_key, payload, occurred_at
  ) values (
    v_order.id,
    'payment.installment2.overdue',
    p_idempotency_key,
    jsonb_build_object('second_due_at', v_order.second_due_at),
    p_occurred_at
  );

  return jsonb_build_object(
    'order_reference', p_order_reference,
    'order_status', 'overdue',
    'idempotent_replay', false
  );
end;
$$;


-- -----------------------------------------------------------------------------
-- 5. Reembolso total confirmado.
-- -----------------------------------------------------------------------------
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
  if exists (
    select 1 from public.preventa_events where idempotency_key = p_idempotency_key
  ) then
    return jsonb_build_object('order_reference', p_order_reference, 'idempotent_replay', true);
  end if;

  if exists (
    select 1
    from public.preventa_events
    where event_type = 'payment.full_refunded'
      and payload ->> 'provider_refund_id' = p_provider_refund_id
  ) then
    return jsonb_build_object(
      'order_reference', p_order_reference,
      'idempotent_replay', true,
      'duplicate_provider_refund', true
    );
  end if;

  select * into v_order
  from public.preventa_orders
  where order_reference = p_order_reference
  for update;

  if v_order.id is null then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  if v_order.status not in ('partial', 'paid', 'overdue') then
    raise exception using errcode = 'P0001', message = 'NOTHING_TO_REFUND';
  end if;

  if not exists (
    select 1 from public.preventa_payments
    where order_id = v_order.id and paid_amount_cents > refunded_amount_cents
  ) then
    raise exception using errcode = 'P0001', message = 'NOTHING_TO_REFUND';
  end if;

  update public.preventa_payments
  set status = case when paid_amount_cents > 0 then 'refunded' else status end,
      refunded_amount_cents = paid_amount_cents,
      updated_at = p_occurred_at
  where order_id = v_order.id;

  update public.preventa_orders
  set status = 'refunded',
      founder_status = 'released',
      updated_at = p_occurred_at
  where id = v_order.id;

  update public.preventa_attribution
  set commission_base_cents = 0,
      commission_status = 'reversed',
      updated_at = p_occurred_at
  where order_id = v_order.id;

  update public.preventa_email_queue
  set status = 'cancelled', updated_at = p_occurred_at
  where order_id = v_order.id
    and template_code in ('E03','E04','E05','E06','E07','E08','E09')
    and status in ('queued','failed');

  insert into public.preventa_events (
    order_id, event_type, idempotency_key, payload, occurred_at
  ) values (
    v_order.id,
    'payment.full_refunded',
    p_idempotency_key,
    jsonb_build_object('provider_refund_id', p_provider_refund_id),
    p_occurred_at
  );

  return jsonb_build_object(
    'order_reference', p_order_reference,
    'order_status', 'refunded',
    'founder_status', 'released',
    'idempotent_replay', false
  );
end;
$$;


-- -----------------------------------------------------------------------------
-- 6. Cierre por impago al cumplirse 60 días desde el segundo vencimiento.
-- -----------------------------------------------------------------------------
create or replace function public.preventa_close_nonpayment_v1(
  p_order_reference text,
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
  if exists (
    select 1 from public.preventa_events where idempotency_key = p_idempotency_key
  ) then
    return jsonb_build_object('order_reference', p_order_reference, 'idempotent_replay', true);
  end if;

  select * into v_order
  from public.preventa_orders
  where order_reference = p_order_reference
  for update;

  if v_order.id is null then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  if v_order.payment_plan <> 'split' or v_order.status <> 'overdue' or v_order.second_due_at is null then
    raise exception using errcode = 'P0001', message = 'INVALID_ORDER_STATE_FOR_DAY60_CLOSE';
  end if;

  if p_occurred_at < v_order.second_due_at + interval '60 days' then
    raise exception using errcode = 'P0001', message = 'DAY60_TOO_EARLY';
  end if;

  update public.preventa_orders
  set status = 'cancelled',
      founder_status = 'released',
      cancelled_at = p_occurred_at,
      updated_at = p_occurred_at
  where id = v_order.id;

  update public.preventa_email_queue
  set status = 'cancelled', updated_at = p_occurred_at
  where order_id = v_order.id
    and template_code in ('E03','E04','E05','E06','E07','E08')
    and status in ('queued','failed');

  insert into public.preventa_events (
    order_id, event_type, idempotency_key, payload, occurred_at
  ) values (
    v_order.id,
    'order.cancelled.nonpayment',
    p_idempotency_key,
    jsonb_build_object('second_due_at', v_order.second_due_at),
    p_occurred_at
  );

  return jsonb_build_object(
    'order_reference', p_order_reference,
    'order_status', 'cancelled',
    'founder_status', 'released',
    'idempotent_replay', false
  );
end;
$$;


-- -----------------------------------------------------------------------------
-- Seguridad: todas las operaciones económicas son exclusivamente server/service_role.
-- -----------------------------------------------------------------------------
revoke all on function public.preventa_prepare_checkout_v1(text, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.preventa_confirm_payment_v1(text, smallint, integer, text, text, timestamptz, jsonb)
  from public, anon, authenticated;
revoke all on function public.preventa_mark_overdue_v1(text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.preventa_full_refund_v1(text, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.preventa_close_nonpayment_v1(text, text, timestamptz)
  from public, anon, authenticated;

grant execute on function public.preventa_prepare_checkout_v1(text, text, text, timestamptz)
  to service_role;
grant execute on function public.preventa_confirm_payment_v1(text, smallint, integer, text, text, timestamptz, jsonb)
  to service_role;
grant execute on function public.preventa_mark_overdue_v1(text, text, timestamptz)
  to service_role;
grant execute on function public.preventa_full_refund_v1(text, text, text, timestamptz)
  to service_role;
grant execute on function public.preventa_close_nonpayment_v1(text, text, timestamptz)
  to service_role;

comment on function public.preventa_prepare_checkout_v1 is 'Transición atómica draft -> awaiting_payment. Solo service_role.';
comment on function public.preventa_confirm_payment_v1 is 'Confirma pagos de preventa atómicamente y aplica cuota, orden, plaza, comisión, evento y correos. Solo service_role.';
comment on function public.preventa_mark_overdue_v1 is 'Marca segunda cuota vencida a partir del día +1. Solo service_role.';
comment on function public.preventa_full_refund_v1 is 'Aplica reembolso total, libera plaza y revierte comisión. Solo service_role.';
comment on function public.preventa_close_nonpayment_v1 is 'Cierra una matrícula fraccionada impagada a día +60. Solo service_role.';

commit;
