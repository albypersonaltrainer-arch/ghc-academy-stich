-- GHC Academy · Preventa 2026 · fix worker email V0.1
-- PostgreSQL expone las columnas de RETURNS TABLE como variables PL/pgSQL.
-- Se califican explícitamente las columnas de la cola para evitar ambigüedad.

begin;

create or replace function public.preventa_claim_email_batch_v1(
  p_limit integer default 10,
  p_now timestamptz default now()
)
returns table (
  queue_id uuid,
  order_id uuid,
  template_code text,
  scheduled_for timestamptz,
  attempt_count integer,
  recipient_email text,
  first_name text,
  last_name text,
  order_reference text,
  payment_plan text,
  total_amount_cents integer,
  first_installment_cents integer,
  second_installment_cents integer,
  second_due_at timestamptz,
  founder_place_number smallint,
  founder_status text,
  terms_version text,
  privacy_version text,
  legal_package_version text
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_limit integer;
begin
  v_limit := greatest(1, least(coalesce(p_limit, 10), 50));

  update public.preventa_email_queue q
  set status = case when q.attempt_count >= 5 then 'failed' else 'queued' end,
      last_error = case
        when q.attempt_count >= 5 then coalesce(q.last_error, 'WORKER_PROCESSING_TIMEOUT')
        else 'WORKER_PROCESSING_TIMEOUT_REQUEUED'
      end,
      updated_at = p_now
  where q.status = 'processing'
    and q.updated_at <= p_now - interval '15 minutes';

  return query
  with candidates as (
    select q.id
    from public.preventa_email_queue q
    where q.status = 'queued'
      and q.scheduled_for <= p_now
      and q.attempt_count < 5
    order by q.scheduled_for asc, q.created_at asc
    for update skip locked
    limit v_limit
  ), claimed as (
    update public.preventa_email_queue q
    set status = 'processing',
        attempt_count = q.attempt_count + 1,
        last_error = null,
        updated_at = p_now
    from candidates c
    where q.id = c.id
    returning q.*
  )
  select
    c.id,
    c.order_id,
    c.template_code,
    c.scheduled_for,
    c.attempt_count,
    o.email,
    o.first_name,
    o.last_name,
    o.order_reference,
    o.payment_plan,
    o.total_amount_cents,
    o.first_installment_cents,
    o.second_installment_cents,
    o.second_due_at,
    o.founder_place_number,
    o.founder_status,
    o.terms_version,
    o.privacy_version,
    o.legal_package_version
  from claimed c
  join public.preventa_orders o on o.id = c.order_id
  order by c.scheduled_for asc, c.created_at asc;
end;
$$;

revoke all on function public.preventa_claim_email_batch_v1(integer,timestamptz)
  from public, anon, authenticated;
grant execute on function public.preventa_claim_email_batch_v1(integer,timestamptz)
  to service_role;

comment on function public.preventa_claim_email_batch_v1(integer,timestamptz) is
  'Reclama hasta 50 emails vencidos con FOR UPDATE SKIP LOCKED; recupera processing huérfanos a los 15 minutos. Columnas calificadas para evitar colisión con RETURNS TABLE.';

commit;
