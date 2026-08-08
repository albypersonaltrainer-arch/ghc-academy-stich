-- GHC Academy · Preventa 2026 · intentos Hosted Checkout SumUp V0.1
-- DEPENDE DE:
--   20260808_preventa_operativa_v0_1.sql
--   20260808_preventa_transiciones_pago_v0_1.sql
-- NO ejecutar en Supabase real hasta Gate técnico + autorización final de Alby.

begin;

create table if not exists public.preventa_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.preventa_orders(id) on delete cascade,
  installment_no smallint not null check (installment_no in (1,2)),
  provider text not null default 'sumup' check (provider = 'sumup'),
  checkout_reference text not null unique,
  provider_checkout_id text not null unique,
  hosted_checkout_url text not null,
  expected_amount_cents integer not null check (expected_amount_cents > 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  status text not null default 'created'
    check (status in ('created','paid','expired','failed','superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists preventa_checkout_attempts_order_installment_idx
  on public.preventa_checkout_attempts(order_id, installment_no, created_at desc);

alter table public.preventa_checkout_attempts enable row level security;
revoke all on public.preventa_checkout_attempts from anon, authenticated;
grant select, insert, update, delete on public.preventa_checkout_attempts to service_role;

-- Devuelve exclusivamente el contexto necesario para crear un checkout desde servidor.
create or replace function public.preventa_checkout_context_v1(
  p_order_reference text,
  p_installment_no smallint
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_order public.preventa_orders%rowtype;
  v_payment public.preventa_payments%rowtype;
begin
  select * into v_order
  from public.preventa_orders
  where order_reference = p_order_reference;

  if v_order.id is null then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  select * into v_payment
  from public.preventa_payments
  where order_id = v_order.id and installment_no = p_installment_no;

  if v_payment.id is null then
    raise exception using errcode = 'P0001', message = 'INSTALLMENT_NOT_FOUND';
  end if;

  if v_payment.status = 'paid' then
    raise exception using errcode = 'P0001', message = 'INSTALLMENT_ALREADY_PAID';
  end if;

  if p_installment_no = 1 then
    if v_order.status not in ('draft','awaiting_payment') then
      raise exception using errcode = 'P0001', message = 'INSTALLMENT_NOT_PAYABLE_IN_CURRENT_STATE';
    end if;
  else
    if v_order.payment_plan <> 'split' or v_order.status not in ('partial','overdue') then
      raise exception using errcode = 'P0001', message = 'INSTALLMENT_NOT_PAYABLE_IN_CURRENT_STATE';
    end if;
  end if;

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_reference', v_order.order_reference,
    'payment_plan', v_order.payment_plan,
    'order_status', v_order.status,
    'installment_no', p_installment_no,
    'expected_amount_cents', v_payment.expected_amount_cents,
    'currency', v_payment.currency
  );
end;
$$;

-- Registra cada intento y actualiza la cuota, sin perder intentos anteriores.
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
  v_attempt_id uuid;
begin
  if exists (select 1 from public.preventa_events where idempotency_key = p_idempotency_key) then
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

  if p_expected_amount_cents <> v_payment.expected_amount_cents then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_AMOUNT_MISMATCH';
  end if;

  if p_installment_no = 1 then
    if v_order.status not in ('draft','awaiting_payment') then
      raise exception using errcode = 'P0001', message = 'INSTALLMENT_NOT_PAYABLE_IN_CURRENT_STATE';
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
    order_id,
    installment_no,
    checkout_reference,
    provider_checkout_id,
    hosted_checkout_url,
    expected_amount_cents,
    currency,
    status,
    created_at,
    updated_at
  ) values (
    v_order.id,
    p_installment_no,
    p_checkout_reference,
    p_provider_checkout_id,
    p_hosted_checkout_url,
    p_expected_amount_cents,
    v_payment.currency,
    'created',
    p_occurred_at,
    p_occurred_at
  )
  returning id into v_attempt_id;

  update public.preventa_payments
  set provider_checkout_id = p_provider_checkout_id,
      status = case when status = 'overdue' then 'overdue' else 'processing' end,
      updated_at = p_occurred_at
  where id = v_payment.id;

  if p_installment_no = 1 and v_order.status = 'draft' then
    update public.preventa_orders
    set status = 'awaiting_payment', updated_at = p_occurred_at
    where id = v_order.id;
  end if;

  insert into public.preventa_events (
    order_id, event_type, idempotency_key, payload, occurred_at
  ) values (
    v_order.id,
    'checkout.attempt.created',
    p_idempotency_key,
    jsonb_build_object(
      'installment_no', p_installment_no,
      'checkout_reference', p_checkout_reference,
      'provider_checkout_id', p_provider_checkout_id,
      'expected_amount_cents', p_expected_amount_cents,
      'attempt_id', v_attempt_id
    ),
    p_occurred_at
  );

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'order_reference', p_order_reference,
    'installment_no', p_installment_no,
    'provider_checkout_id', p_provider_checkout_id,
    'idempotent_replay', false
  );
end;
$$;

-- Al confirmar un pago, marca también como pagado el intento exacto y supersede los demás.
create or replace function public.preventa_mark_checkout_attempt_paid_v1(
  p_provider_checkout_id text,
  p_provider_payment_id text,
  p_occurred_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.preventa_checkout_attempts%rowtype;
begin
  select * into v_attempt
  from public.preventa_checkout_attempts
  where provider_checkout_id = p_provider_checkout_id
  for update;

  if v_attempt.id is null then
    return;
  end if;

  update public.preventa_checkout_attempts
  set status = case when id = v_attempt.id then 'paid' else 'superseded' end,
      paid_at = case when id = v_attempt.id then p_occurred_at else paid_at end,
      updated_at = p_occurred_at
  where order_id = v_attempt.order_id
    and installment_no = v_attempt.installment_no
    and status in ('created','superseded');
end;
$$;

revoke all on function public.preventa_checkout_context_v1(text, smallint) from public, anon, authenticated;
revoke all on function public.preventa_register_checkout_attempt_v1(text, smallint, text, text, text, integer, text, timestamptz) from public, anon, authenticated;
revoke all on function public.preventa_mark_checkout_attempt_paid_v1(text, text, timestamptz) from public, anon, authenticated;

grant execute on function public.preventa_checkout_context_v1(text, smallint) to service_role;
grant execute on function public.preventa_register_checkout_attempt_v1(text, smallint, text, text, text, integer, text, timestamptz) to service_role;
grant execute on function public.preventa_mark_checkout_attempt_paid_v1(text, text, timestamptz) to service_role;

comment on table public.preventa_checkout_attempts is 'Historial de intentos Hosted Checkout de SumUp por matrícula/cuota. Solo servidor.';
comment on function public.preventa_checkout_context_v1 is 'Devuelve contexto server-only para crear un checkout con importe calculado desde DB.';
comment on function public.preventa_register_checkout_attempt_v1 is 'Registra cada intento Hosted Checkout preservando trazabilidad y reintentos.';

commit;
