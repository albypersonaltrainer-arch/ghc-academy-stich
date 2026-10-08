-- Seguimiento educativo únicamente para interesados con opt-in comercial.
alter table public.preventa_interest_leads
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists preventa_interest_leads_unsubscribe_token_uq
  on public.preventa_interest_leads (unsubscribe_token);

create table if not exists public.preventa_interest_email_queue (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.preventa_interest_leads(id) on delete cascade,
  template_code text not null check (template_code in ('L01','L02','L03')),
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','cancelled','failed')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  sent_at timestamptz,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  unique (lead_id, template_code)
);
create index if not exists preventa_interest_email_queue_due_idx
  on public.preventa_interest_email_queue (scheduled_at, status);
alter table public.preventa_interest_email_queue enable row level security;
revoke all on public.preventa_interest_email_queue from anon, authenticated;
comment on table public.preventa_interest_email_queue is 'L01-L03: solo solicitudes con marketing_consent=true. Envío server-side con cancelación inmediata tras baja.';
