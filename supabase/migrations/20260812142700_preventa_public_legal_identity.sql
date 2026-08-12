create table if not exists public.preventa_public_legal_identity (
  id smallint primary key default 1 check (id = 1),
  owner text not null,
  tax_id text not null,
  address text not null,
  email text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.preventa_public_legal_identity enable row level security;

revoke all on table public.preventa_public_legal_identity from anon, authenticated;
grant select, insert, update, delete on table public.preventa_public_legal_identity to service_role;
