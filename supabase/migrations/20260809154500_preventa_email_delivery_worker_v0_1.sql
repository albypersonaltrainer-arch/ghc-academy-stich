-- GHC Academy · Preventa 2026 · worker transaccional de email V0.1
-- Claim concurrente seguro, recuperación de locks huérfanos y finalización idempotente.

begin;

comment on table public.preventa_email_queue is
  'Cola transaccional E01-E14. El proveedor de entrega se ejecuta exclusivamente desde backend.';

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

  -- Un proceso muerto no puede bloquear una matrícula indefinidamente.
  update public.preventa_email_queue
  set status = case when attempt_count >= 5 then 'failed' else 'queued' end,
      last_error = case
        when attempt_count >= 5 then coalesce(last_error, 'WORKER_PROCESSING_TIMEOUT')
        else 'WORKER_PROCESSING_TIMEOUT_REQUEUED'
      end,
      updated_at = p_now
  where status = 'processing'
    and updated_at <= p_now - interval '15 minutes';

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
  'Reclama hasta 50 emails vencidos con FOR UPDATE SKIP LOCKED; recupera processing huérfanos a los 15 minutos.';

create or replace function public.preventa_finish_email_delivery_v1(
  p_queue_id uuid,
  p_success boolean,
  p_provider_message_id text,
  p_error text,
  p_occurred_at timestamptz default now()
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_queue public.preventa_email_queue%rowtype;
  v_next_status text;
  v_retry_at timestamptz;
  v_event_key text;
begin
  select * into v_queue
  from public.preventa_email_queue
  where id = p_queue_id
  for update;

  if v_queue.id is null then
    raise exception using errcode = 'P0001', message = 'EMAIL_QUEUE_ITEM_NOT_FOUND';
  end if;

  if p_success and v_queue.status = 'sent' then
    return jsonb_build_object(
      'queue_id', v_queue.id,
      'status', 'sent',
      'idempotent_replay', true
    );
  end if;

  if v_queue.status <> 'processing' then
    raise exception using errcode = 'P0001', message = 'EMAIL_QUEUE_ITEM_NOT_PROCESSING';
  end if;

  if p_success then
    update public.preventa_email_queue
    set status = 'sent',
        provider_message_id = nullif(btrim(coalesce(p_provider_message_id, '')), ''),
        last_error = null,
        sent_at = p_occurred_at,
        updated_at = p_occurred_at
    where id = v_queue.id;

    v_event_key := 'email:' || v_queue.id::text || ':sent';

    insert into public.preventa_events (
      order_id, event_type, idempotency_key, payload, occurred_at
    ) values (
      v_queue.order_id,
      'email.sent',
      v_event_key,
      jsonb_build_object(
        'queue_id', v_queue.id,
        'template_code', v_queue.template_code,
        'provider_message_id', nullif(btrim(coalesce(p_provider_message_id, '')), ''),
        'attempt_count', v_queue.attempt_count
      ),
      p_occurred_at
    )
    on conflict (idempotency_key) do nothing;

    return jsonb_build_object(
      'queue_id', v_queue.id,
      'status', 'sent',
      'attempt_count', v_queue.attempt_count,
      'idempotent_replay', false
    );
  end if;

  if v_queue.attempt_count >= 5 then
    v_next_status := 'failed';
    v_retry_at := v_queue.scheduled_for;
  else
    v_next_status := 'queued';
    v_retry_at := p_occurred_at + case v_queue.attempt_count
      when 1 then interval '5 minutes'
      when 2 then interval '30 minutes'
      when 3 then interval '2 hours'
      else interval '8 hours'
    end;
  end if;

  update public.preventa_email_queue
  set status = v_next_status,
      scheduled_for = v_retry_at,
      provider_message_id = null,
      last_error = left(coalesce(nullif(btrim(p_error), ''), 'EMAIL_PROVIDER_ERROR'), 2000),
      updated_at = p_occurred_at
  where id = v_queue.id;

  v_event_key := 'email:' || v_queue.id::text || ':attempt:' || v_queue.attempt_count::text || ':failed';

  insert into public.preventa_events (
    order_id, event_type, idempotency_key, payload, occurred_at
  ) values (
    v_queue.order_id,
    case when v_next_status = 'failed' then 'email.delivery.failed_terminal' else 'email.delivery.retry_scheduled' end,
    v_event_key,
    jsonb_build_object(
      'queue_id', v_queue.id,
      'template_code', v_queue.template_code,
      'attempt_count', v_queue.attempt_count,
      'next_status', v_next_status,
      'retry_at', case when v_next_status = 'queued' then v_retry_at else null end,
      'error', left(coalesce(nullif(btrim(p_error), ''), 'EMAIL_PROVIDER_ERROR'), 1000)
    ),
    p_occurred_at
  )
  on conflict (idempotency_key) do nothing;

  return jsonb_build_object(
    'queue_id', v_queue.id,
    'status', v_next_status,
    'attempt_count', v_queue.attempt_count,
    'retry_at', case when v_next_status = 'queued' then v_retry_at else null end,
    'idempotent_replay', false
  );
end;
$$;

revoke all on function public.preventa_finish_email_delivery_v1(uuid,boolean,text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.preventa_finish_email_delivery_v1(uuid,boolean,text,text,timestamptz)
  to service_role;

comment on function public.preventa_finish_email_delivery_v1(uuid,boolean,text,text,timestamptz) is
  'Finaliza un claim de email. Éxito -> sent; fallo -> reintento 5m/30m/2h/8h y terminal al quinto intento.';

commit;
