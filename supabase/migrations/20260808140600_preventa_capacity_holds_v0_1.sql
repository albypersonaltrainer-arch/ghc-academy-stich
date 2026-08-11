-- GHC Academy · Preventa 2026 · reservas temporales de capacidad fundadora V0.1
-- DEPENDE DE todas las migraciones preventa 14:00–14:05.
-- Objetivo: impedir que un proveedor cobre una primera cuota sin capacidad fundadora previamente apartada.

begin;

create table if not exists public.preventa_capacity_holds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.preventa_orders(id) on delete cascade,
  installment_no smallint not null default 1 check (installment_no = 1),
  founder_place_number smallint not null check (founder_place_number between 1 and 100),
  checkout_reference text not null unique,
  provider_checkout_id text unique,
  status text not null default 'held'
    check (status in ('held','attached','consumed','released','expired')),
  held_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consumed_at timestamptz,
  released_at timestamptz
);

create unique index if not exists preventa_capacity_holds_active_place_unique
  on public.preventa_capacity_holds(founder_place_number)
  where status in ('held','attached');

create unique index if not exists preventa_capacity_holds_active_order_unique
  on public.preventa_capacity_holds(order_id)
  where status in ('held','attached');

create index if not exists preventa_capacity_holds_expiry_idx
  on public.preventa_capacity_holds(status, held_until)
  where status in ('held','attached');

alter table public.preventa_capacity_holds enable row level security;
revoke all on public.preventa_capacity_holds from anon, authenticated;
grant select, insert, update, delete on public.preventa_capacity_holds to service_role;

-- Reserva una de las 100 capacidades ANTES de contactar con el proveedor.
create or replace function public.preventa_reserve_capacity_v1(
  p_order_reference text,
  p_checkout_reference text,
  p_held_until timestamptz,
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
  v_existing public.preventa_capacity_holds%rowtype;
  v_place smallint;
  v_hold_id uuid;
begin
  if p_held_until <= p_occurred_at then
    raise exception using errcode = 'P0001', message = 'INVALID_CAPACITY_HOLD_EXPIRY';
  end if;

  if exists (select 1 from public.preventa_events where idempotency_key = p_idempotency_key) then
    select h.* into v_existing
    from public.preventa_capacity_holds h
    join public.preventa_orders o on o.id = h.order_id
    where o.order_reference = p_order_reference
      and h.checkout_reference = p_checkout_reference;

    return jsonb_build_object(
      'hold_id', v_existing.id,
      'founder_place_number', v_existing.founder_place_number,
      'held_until', v_existing.held_until,
      'status', v_existing.status,
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

  if v_order.status not in ('draft','awaiting_payment') then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_ELIGIBLE_FOR_CAPACITY_HOLD';
  end if;

  if v_order.founder_place_number is not null or v_order.founder_status not in ('pending') then
    raise exception using errcode = 'P0001', message = 'ORDER_ALREADY_HAS_FOUNDER_CAPACITY';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('GHC_PREVENTA_FOUNDER_CAPACITY_2026', 0)
  );

  -- Expiración oportunista: no depende de cron para liberar capacidad abandonada.
  update public.preventa_capacity_holds
  set status = 'expired',
      released_at = p_occurred_at,
      updated_at = p_occurred_at
  where status in ('held','attached')
    and held_until <= p_occurred_at;

  -- Un nuevo intento de la misma orden sustituye cualquier hold aún activo.
  update public.preventa_capacity_holds
  set status = 'released',
      released_at = p_occurred_at,
      updated_at = p_occurred_at
  where order_id = v_order.id
    and status in ('held','attached');

  select gs::smallint into v_place
  from pg_catalog.generate_series(1, 100) as gs
  where not exists (
    select 1
    from public.preventa_orders o
    where o.founder_place_number = gs
      and o.founder_status in ('reserved','confirmed')
  )
  and not exists (
    select 1
    from public.preventa_capacity_holds h
    where h.founder_place_number = gs
      and h.status in ('held','attached')
      and h.held_until > p_occurred_at
  )
  order by gs
  limit 1;

  if v_place is null then
    raise exception using errcode = 'P0001', message = 'FOUNDER_PLACES_FULL';
  end if;

  insert into public.preventa_capacity_holds (
    order_id,
    founder_place_number,
    checkout_reference,
    status,
    held_until,
    created_at,
    updated_at
  ) values (
    v_order.id,
    v_place,
    p_checkout_reference,
    'held',
    p_held_until,
    p_occurred_at,
    p_occurred_at
  ) returning id into v_hold_id;

  insert into public.preventa_events (
    order_id, event_type, idempotency_key, payload, occurred_at
  ) values (
    v_order.id,
    'founder.capacity.held',
    p_idempotency_key,
    jsonb_build_object(
      'hold_id', v_hold_id,
      'founder_place_number', v_place,
      'checkout_reference', p_checkout_reference,
      'held_until', p_held_until
    ),
    p_occurred_at
  );

  return jsonb_build_object(
    'hold_id', v_hold_id,
    'founder_place_number', v_place,
    'held_until', p_held_until,
    'status', 'held',
    'idempotent_replay', false
  );
end;
$$;

-- Liga el hold al checkout que SumUp acaba de crear. No modifica la capacidad reservada.
create or replace function public.preventa_attach_capacity_checkout_v1(
  p_order_reference text,
  p_checkout_reference text,
  p_provider_checkout_id text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_order public.preventa_orders%rowtype;
  v_hold public.preventa_capacity_holds%rowtype;
begin
  select * into v_order
  from public.preventa_orders
  where order_reference = p_order_reference
  for update;

  if v_order.id is null then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  select * into v_hold
  from public.preventa_capacity_holds
  where order_id = v_order.id
    and checkout_reference = p_checkout_reference
  for update;

  if v_hold.id is null then
    raise exception using errcode = 'P0001', message = 'CAPACITY_HOLD_NOT_FOUND';
  end if;

  if v_hold.status = 'attached' and v_hold.provider_checkout_id = p_provider_checkout_id then
    return jsonb_build_object('hold_id', v_hold.id, 'status', 'attached', 'idempotent_replay', true);
  end if;

  if v_hold.status <> 'held' or v_hold.held_until <= p_occurred_at then
    raise exception using errcode = 'P0001', message = 'CAPACITY_HOLD_NOT_ACTIVE';
  end if;

  update public.preventa_capacity_holds
  set provider_checkout_id = p_provider_checkout_id,
      status = 'attached',
      updated_at = p_occurred_at
  where id = v_hold.id;

  return jsonb_build_object(
    'hold_id', v_hold.id,
    'founder_place_number', v_hold.founder_place_number,
    'held_until', v_hold.held_until,
    'status', 'attached',
    'idempotent_replay', false
  );
end;
$$;

-- Libera un hold si la creación/registro del checkout falla antes de que el alumno lo reciba.
create or replace function public.preventa_release_capacity_v1(
  p_order_reference text,
  p_checkout_reference text,
  p_reason text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_order_id uuid;
  v_hold public.preventa_capacity_holds%rowtype;
begin
  select id into v_order_id
  from public.preventa_orders
  where order_reference = p_order_reference;

  if v_order_id is null then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  select * into v_hold
  from public.preventa_capacity_holds
  where order_id = v_order_id
    and checkout_reference = p_checkout_reference
  for update;

  if v_hold.id is null then
    return jsonb_build_object('released', false, 'reason', 'not_found');
  end if;

  if v_hold.status in ('consumed','released','expired') then
    return jsonb_build_object('released', false, 'status', v_hold.status);
  end if;

  update public.preventa_capacity_holds
  set status = 'released',
      released_at = p_occurred_at,
      updated_at = p_occurred_at
  where id = v_hold.id;

  insert into public.preventa_events (
    order_id, event_type, idempotency_key, payload, occurred_at
  ) values (
    v_order_id,
    'founder.capacity.released',
    'capacity-release:' || v_hold.id::text,
    jsonb_build_object('hold_id', v_hold.id, 'reason', nullif(p_reason, '')),
    p_occurred_at
  )
  on conflict (idempotency_key) do nothing;

  return jsonb_build_object('released', true, 'hold_id', v_hold.id);
end;
$$;

-- Registro del intento endurecido: primera cuota exige un hold adjunto y vigente.
create or replace function public.preventa_register_checkout_attempt_v1(
  p_order_reference text,
  p_installment_no smallint,
  p_checkout_reference text,
  p_provider_checkout_id text,
  p_hosted_checkout_url text,
  p_expected_amount_cents integer,
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
  v_payment public.preventa_payments%rowtype;
  v_hold public.preventa_capacity_holds%rowtype;
  v_attempt_id uuid;
begin
  if exists (select 1 from public.preventa_events where idempotency_key = p_idempotency_key) then
    select * into v_order from public.preventa_orders where order_reference = p_order_reference;
    return jsonb_build_object('order_reference', p_order_reference, 'order_status', v_order.status, 'idempotent_replay', true);
  end if;

  select * into v_order
  from public.preventa_orders
  where order_reference = p_order_reference
  for update;

  if v_order.id is null then raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND'; end if;

  select * into v_payment
  from public.preventa_payments
  where order_id = v_order.id and installment_no = p_installment_no
  for update;

  if v_payment.id is null then raise exception using errcode = 'P0001', message = 'INSTALLMENT_NOT_FOUND'; end if;
  if v_payment.status = 'paid' then raise exception using errcode = 'P0001', message = 'INSTALLMENT_ALREADY_PAID'; end if;
  if p_expected_amount_cents <> v_payment.expected_amount_cents then raise exception using errcode = 'P0001', message = 'CHECKOUT_AMOUNT_MISMATCH'; end if;

  if p_installment_no = 1 then
    if v_order.status not in ('draft','awaiting_payment') then
      raise exception using errcode = 'P0001', message = 'INSTALLMENT_NOT_PAYABLE_IN_CURRENT_STATE';
    end if;

    select * into v_hold
    from public.preventa_capacity_holds
    where order_id = v_order.id
      and checkout_reference = p_checkout_reference
      and provider_checkout_id = p_provider_checkout_id
    for update;

    if v_hold.id is null or v_hold.status <> 'attached' or v_hold.held_until <= p_occurred_at then
      raise exception using errcode = 'P0001', message = 'ACTIVE_CAPACITY_HOLD_REQUIRED';
    end if;
  else
    if v_order.payment_plan <> 'split' or v_order.status not in ('partial','overdue') then
      raise exception using errcode = 'P0001', message = 'INSTALLMENT_NOT_PAYABLE_IN_CURRENT_STATE';
    end if;
  end if;

  update public.preventa_checkout_attempts
  set status = 'superseded', updated_at = p_occurred_at
  where order_id = v_order.id
    and installment_no = p_installment_no
    and status = 'created';

  insert into public.preventa_checkout_attempts (
    order_id, installment_no, checkout_reference, provider_checkout_id,
    hosted_checkout_url, expected_amount_cents, currency, status, created_at, updated_at
  ) values (
    v_order.id, p_installment_no, p_checkout_reference, p_provider_checkout_id,
    p_hosted_checkout_url, p_expected_amount_cents, v_payment.currency, 'created', p_occurred_at, p_occurred_at
  ) returning id into v_attempt_id;

  update public.preventa_payments
  set provider_checkout_id = p_provider_checkout_id,
      status = case when status = 'overdue' then 'overdue' else 'processing' end,
      updated_at = p_occurred_at
  where id = v_payment.id;

  if p_installment_no = 1 and v_order.status = 'draft' then
    update public.preventa_orders set status = 'awaiting_payment', updated_at = p_occurred_at where id = v_order.id;
  end if;

  insert into public.preventa_events (order_id, event_type, idempotency_key, payload, occurred_at)
  values (
    v_order.id,
    'checkout.attempt.created',
    p_idempotency_key,
    jsonb_build_object(
      'installment_no', p_installment_no,
      'checkout_reference', p_checkout_reference,
      'provider_checkout_id', p_provider_checkout_id,
      'expected_amount_cents', p_expected_amount_cents,
      'attempt_id', v_attempt_id,
      'capacity_hold_id', v_hold.id
    ),
    p_occurred_at
  );

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'order_reference', p_order_reference,
    'installment_no', p_installment_no,
    'provider_checkout_id', p_provider_checkout_id,
    'capacity_hold_id', v_hold.id,
    'idempotent_replay', false
  );
end;
$$;

-- Pago confirmado endurecido: la primera cuota consume exclusivamente la capacidad previamente reservada.
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

    if v_hold.id is null or v_hold.status <> 'attached' or v_hold.held_until < p_occurred_at then
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

revoke all on public.preventa_capacity_holds from anon, authenticated;
revoke all on function public.preventa_reserve_capacity_v1(text,text,timestamptz,text,timestamptz) from public, anon, authenticated;
revoke all on function public.preventa_attach_capacity_checkout_v1(text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.preventa_release_capacity_v1(text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.preventa_register_checkout_attempt_v1(text,smallint,text,text,text,integer,text,timestamptz) from public, anon, authenticated;
revoke all on function public.preventa_confirm_payment_v1(text,smallint,integer,text,text,timestamptz,jsonb) from public, anon, authenticated;

grant execute on function public.preventa_reserve_capacity_v1(text,text,timestamptz,text,timestamptz) to service_role;
grant execute on function public.preventa_attach_capacity_checkout_v1(text,text,text,timestamptz) to service_role;
grant execute on function public.preventa_release_capacity_v1(text,text,text,timestamptz) to service_role;
grant execute on function public.preventa_register_checkout_attempt_v1(text,smallint,text,text,text,integer,text,timestamptz) to service_role;
grant execute on function public.preventa_confirm_payment_v1(text,smallint,integer,text,text,timestamptz,jsonb) to service_role;

comment on table public.preventa_capacity_holds is 'Reservas temporales server-only de las 100 capacidades fundadoras antes de crear un checkout externo.';
comment on function public.preventa_reserve_capacity_v1 is 'Reserva temporalmente capacidad fundadora antes del checkout del proveedor. Solo service_role.';
comment on function public.preventa_attach_capacity_checkout_v1 is 'Liga una reserva de capacidad al checkout de proveedor recién creado. Solo service_role.';
comment on function public.preventa_release_capacity_v1 is 'Libera una reserva de capacidad que no llegó a convertirse en intento utilizable. Solo service_role.';

commit;
