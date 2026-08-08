-- GHC Academy · Preventa 2026 · arquitectura operativa V0.1
-- IMPORTANTE: este archivo queda versionado en la rama de trabajo.
-- NO ejecutar en Supabase real hasta Gate técnico + autorización final de Alby.

begin;

create table if not exists public.preventa_orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null unique,
  request_key text not null unique,
  offer_code text not null default 'GHC_FOUNDERS_2026',
  offer_version text not null default '2026-08-08',

  first_name text not null,
  last_name text not null,
  email text not null,
  email_normalized text generated always as (lower(btrim(email))) stored,
  country text not null,
  phone text,
  tax_id text,

  payment_plan text not null check (payment_plan in ('single','split')),
  currency text not null default 'EUR' check (currency = 'EUR'),
  total_amount_cents integer not null,
  first_installment_cents integer not null,
  second_installment_cents integer not null default 0,
  second_due_at timestamptz,

  status text not null default 'draft'
    check (status in ('draft','awaiting_payment','partial','paid','overdue','cancelled','refunded')),

  founder_place_number smallint,
  founder_status text not null default 'pending'
    check (founder_status in ('pending','reserved','confirmed','released')),

  terms_version text not null,
  privacy_version text not null,
  legal_package_version text not null default 'GHC_ACADEMY_JURIDICO_PREVENTA_2026_APROBADO',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  cancelled_at timestamptz,

  constraint preventa_orders_price_matrix check (
    (payment_plan = 'single'
      and total_amount_cents = 169000
      and first_installment_cents = 169000
      and second_installment_cents = 0
      and second_due_at is null)
    or
    (payment_plan = 'split'
      and total_amount_cents = 179000
      and first_installment_cents = 89500
      and second_installment_cents = 89500)
  ),
  constraint preventa_orders_second_due_consistency check (
    payment_plan = 'split' or second_due_at is null
  ),
  constraint preventa_orders_founder_place_range check (
    founder_place_number is null or founder_place_number between 1 and 100
  )
);

create unique index if not exists preventa_orders_founder_place_unique
  on public.preventa_orders(founder_place_number)
  where founder_place_number is not null;

create index if not exists preventa_orders_email_idx
  on public.preventa_orders(email_normalized);

create index if not exists preventa_orders_status_idx
  on public.preventa_orders(status);

create index if not exists preventa_orders_second_due_idx
  on public.preventa_orders(second_due_at)
  where payment_plan = 'split' and status in ('partial','overdue');


create table if not exists public.preventa_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.preventa_orders(id) on delete cascade,
  installment_no smallint not null check (installment_no in (1,2)),
  provider text not null default 'sumup',
  expected_amount_cents integer not null check (expected_amount_cents > 0),
  paid_amount_cents integer not null default 0 check (paid_amount_cents >= 0),
  refunded_amount_cents integer not null default 0 check (refunded_amount_cents >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  due_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending','processing','paid','failed','overdue','refunded','partially_refunded')),
  provider_checkout_id text,
  provider_payment_id text,
  provider_metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, installment_no)
);

create index if not exists preventa_payments_status_due_idx
  on public.preventa_payments(status, due_at);

create unique index if not exists preventa_payments_provider_payment_unique
  on public.preventa_payments(provider_payment_id)
  where provider_payment_id is not null;


create table if not exists public.preventa_acceptances (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.preventa_orders(id) on delete cascade,
  acceptance_type text not null
    check (acceptance_type in ('terms','privacy_notice','private_training_ack','marketing')),
  accepted boolean not null,
  document_version text not null,
  captured_at timestamptz not null default now(),
  evidence_hash text,
  evidence_metadata jsonb not null default '{}'::jsonb,
  unique(order_id, acceptance_type, document_version)
);

create index if not exists preventa_acceptances_order_idx
  on public.preventa_acceptances(order_id);


create table if not exists public.preventa_attribution (
  order_id uuid primary key references public.preventa_orders(id) on delete cascade,
  source_channel text,
  source_detail text,
  campaign_code text,
  closer_code text,
  closer_name text,
  commission_rate numeric(5,4) not null default 0.1000
    check (commission_rate >= 0 and commission_rate <= 0.1000),
  commission_base_cents integer not null default 0 check (commission_base_cents >= 0),
  commission_status text not null default 'not_eligible'
    check (commission_status in ('not_eligible','accruing','eligible','paid','reversed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.preventa_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.preventa_orders(id) on delete cascade,
  event_type text not null,
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists preventa_events_order_time_idx
  on public.preventa_events(order_id, occurred_at desc);


create table if not exists public.preventa_email_queue (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.preventa_orders(id) on delete cascade,
  template_code text not null
    check (template_code in ('E01','E02','E03','E04','E05','E06','E07','E08','E09','E10','E11')),
  scheduled_for timestamptz not null,
  status text not null default 'queued'
    check (status in ('queued','processing','sent','failed','cancelled','skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, template_code)
);

create index if not exists preventa_email_queue_schedule_idx
  on public.preventa_email_queue(status, scheduled_for);


-- Operación atómica de creación de borrador de matrícula.
-- La API server-side calcula precios y versiones; esta función persiste todo en una única transacción.
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


-- Seguridad: ninguna tabla de preventa queda accesible directamente desde cliente.
alter table public.preventa_orders enable row level security;
alter table public.preventa_payments enable row level security;
alter table public.preventa_acceptances enable row level security;
alter table public.preventa_attribution enable row level security;
alter table public.preventa_events enable row level security;
alter table public.preventa_email_queue enable row level security;

revoke all on public.preventa_orders from anon, authenticated;
revoke all on public.preventa_payments from anon, authenticated;
revoke all on public.preventa_acceptances from anon, authenticated;
revoke all on public.preventa_attribution from anon, authenticated;
revoke all on public.preventa_events from anon, authenticated;
revoke all on public.preventa_email_queue from anon, authenticated;

revoke all on function public.preventa_create_draft_v1(
  text, text, text, text, text, text, text, text,
  integer, integer, integer,
  text, text, text, text, text,
  boolean,
  text, text, text, text
) from public, anon, authenticated;

grant select, insert, update, delete on public.preventa_orders to service_role;
grant select, insert, update, delete on public.preventa_payments to service_role;
grant select, insert, update, delete on public.preventa_acceptances to service_role;
grant select, insert, update, delete on public.preventa_attribution to service_role;
grant select, insert, update, delete on public.preventa_events to service_role;
grant select, insert, update, delete on public.preventa_email_queue to service_role;

grant execute on function public.preventa_create_draft_v1(
  text, text, text, text, text, text, text, text,
  integer, integer, integer,
  text, text, text, text, text,
  boolean,
  text, text, text, text
) to service_role;

comment on table public.preventa_orders is 'Órdenes de preventa GHC Academy Edición Fundadora 2026. Solo servidor/service_role.';
comment on table public.preventa_payments is 'Cuotas y pagos asociados a la preventa. Integración prevista con SumUp.';
comment on table public.preventa_acceptances is 'Evidencias versionadas de aceptaciones y consentimiento comercial.';
comment on table public.preventa_attribution is 'Atribución comercial y base de comisión sobre importes cobrados no reembolsados.';
comment on table public.preventa_events is 'Log de eventos idempotentes de la matrícula y sus transiciones.';
comment on table public.preventa_email_queue is 'Cola lógica E01-E11. No implica proveedor de correo conectado.';
comment on function public.preventa_create_draft_v1 is 'Crea de forma atómica e idempotente un borrador de preventa y sus registros asociados. Solo service_role.';

commit;
