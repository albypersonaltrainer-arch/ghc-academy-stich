-- CRM de interesados en GHC Academy, separado de órdenes y de otros productos.
-- Solo el backend con credenciales de servicio puede leer y escribir estas tablas.
create table if not exists public.preventa_interest_leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 2 and 80),
  email_normalized text not null unique check (char_length(email_normalized) between 6 and 254),
  audience text not null check (audience in ('aspirante','profesional')),
  privacy_acknowledged_at timestamptz not null,
  marketing_consent boolean not null default false,
  marketing_consented_at timestamptz,
  source_channel text not null default 'direct',
  source_medium text not null default '',
  campaign_code text not null default '',
  source_page text not null default '/preventa',
  status text not null default 'nuevo' check (status in ('nuevo','contactado','interesado','matriculado','descartado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint preventa_interest_leads_marketing_date_ck
    check ((marketing_consent and marketing_consented_at is not null)
      or (not marketing_consent and marketing_consented_at is null))
);
create index if not exists preventa_interest_leads_status_idx
  on public.preventa_interest_leads (status, created_at desc);
alter table public.preventa_interest_leads enable row level security;
revoke all on public.preventa_interest_leads from anon, authenticated;
comment on table public.preventa_interest_leads is
  'Interesados voluntarios en el programa GHC Academy. No mezclar con pedidos ni captación de otros negocios. Solo service_role.';

-- Eventos mínimos anónimos para optimizar embudo, sin cookies ni identificadores personales.
create table if not exists public.preventa_funnel_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in ('landing_view','lead_cta','lead_saved','checkout_click','resource_view')),
  page_path text not null,
  source_channel text not null default '',
  campaign_code text not null default '',
  occurred_at timestamptz not null default now()
);
create index if not exists preventa_funnel_events_time_idx
  on public.preventa_funnel_events (occurred_at desc, event_name);
alter table public.preventa_funnel_events enable row level security;
revoke all on public.preventa_funnel_events from anon, authenticated;
comment on table public.preventa_funnel_events is
  'Eventos agregables sin IP, cookie, identificador de sesión, email ni ID de contacto.';