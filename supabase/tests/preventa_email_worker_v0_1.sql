-- GHC Academy · Preventa 2026 · worker transaccional de email V0.1
-- Claim, concurrencia lógica, éxito idempotente, reintentos y seguridad.

begin;

insert into public.preventa_orders (
  order_reference, request_key, first_name, last_name, email, country,
  payment_plan, total_amount_cents, first_installment_cents, second_installment_cents,
  status, founder_place_number, founder_status,
  terms_version, privacy_version, legal_package_version, paid_at
) values
(
  'GHC-WORK0001', 'email-worker-request-00000001', 'Worker', 'Uno', 'worker1@example.test', 'ES',
  'single', 169000, 169000, 0,
  'paid', 98, 'confirmed', 'TERMS-TEST', 'PRIVACY-TEST', 'LEGAL-TEST', '2026-08-09T10:00:00Z'
),
(
  'GHC-WORK0002', 'email-worker-request-00000002', 'Worker', 'Dos', 'worker2@example.test', 'ES',
  'single', 169000, 169000, 0,
  'paid', 97, 'confirmed', 'TERMS-TEST', 'PRIVACY-TEST', 'LEGAL-TEST', '2026-08-09T10:00:00Z'
);

insert into public.preventa_email_queue (order_id, template_code, scheduled_for)
select id, 'E01', '2026-08-09T12:00:00Z'
from public.preventa_orders where order_reference = 'GHC-WORK0001';

insert into public.preventa_email_queue (order_id, template_code, scheduled_for)
select id, 'E10', '2026-08-09T12:00:00Z'
from public.preventa_orders where order_reference = 'GHC-WORK0002';

create temporary table claimed_1 as
select * from public.preventa_claim_email_batch_v1(1, '2026-08-09T12:01:00Z');

create temporary table claimed_2 as
select * from public.preventa_claim_email_batch_v1(1, '2026-08-09T12:01:00Z');

do $$
declare
  v_count integer;
  v_attempt integer;
begin
  select count(*) into v_count from claimed_1;
  if v_count <> 1 then raise exception 'FIRST_CLAIM_COUNT:%', v_count; end if;

  select count(*) into v_count from claimed_2;
  if v_count <> 1 then raise exception 'SECOND_CLAIM_COUNT:%', v_count; end if;

  if exists (
    select 1 from claimed_1 a join claimed_2 b on a.queue_id = b.queue_id
  ) then
    raise exception 'CLAIM_DUPLICATED_QUEUE_ITEM';
  end if;

  select attempt_count into v_attempt from claimed_1 limit 1;
  if v_attempt <> 1 then raise exception 'UNEXPECTED_FIRST_ATTEMPT:%', v_attempt; end if;
end
$$;

select public.preventa_finish_email_delivery_v1(
  (select queue_id from claimed_1 limit 1),
  true,
  'resend-message-test-001',
  null,
  '2026-08-09T12:02:00Z'
);

-- El ACK repetido de éxito debe ser inocuo.
select public.preventa_finish_email_delivery_v1(
  (select queue_id from claimed_1 limit 1),
  true,
  'resend-message-test-001',
  null,
  '2026-08-09T12:02:01Z'
);

-- El otro item falla: primer reintento a +5 minutos.
select public.preventa_finish_email_delivery_v1(
  (select queue_id from claimed_2 limit 1),
  false,
  null,
  'provider temporary failure',
  '2026-08-09T12:02:00Z'
);

do $$
declare
  v_status text;
  v_retry timestamptz;
  v_sent_events integer;
begin
  select status, scheduled_for into v_status, v_retry
  from public.preventa_email_queue
  where id = (select queue_id from claimed_2 limit 1);

  if v_status <> 'queued' then raise exception 'FIRST_RETRY_NOT_QUEUED:%', v_status; end if;
  if v_retry <> '2026-08-09T12:07:00Z'::timestamptz then raise exception 'FIRST_RETRY_WRONG_TIME:%', v_retry; end if;

  select count(*) into v_sent_events
  from public.preventa_events
  where event_type = 'email.sent'
    and payload ->> 'provider_message_id' = 'resend-message-test-001';
  if v_sent_events <> 1 then raise exception 'EMAIL_SENT_EVENT_NOT_IDEMPOTENT:%', v_sent_events; end if;
end
$$;

-- Antes del backoff no se puede volver a reclamar.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.preventa_claim_email_batch_v1(10, '2026-08-09T12:06:59Z');
  if v_count <> 0 then raise exception 'EMAIL_CLAIMED_BEFORE_RETRY:%', v_count; end if;
end
$$;

create temporary table claimed_retry as
select * from public.preventa_claim_email_batch_v1(10, '2026-08-09T12:07:00Z');

do $$
declare
  v_attempt integer;
begin
  select attempt_count into v_attempt from claimed_retry limit 1;
  if v_attempt <> 2 then raise exception 'SECOND_ATTEMPT_NOT_INCREMENTED:%', v_attempt; end if;
end
$$;

select public.preventa_finish_email_delivery_v1(
  (select queue_id from claimed_retry limit 1),
  false,
  null,
  'provider temporary failure 2',
  '2026-08-09T12:08:00Z'
);

do $$
declare
  v_retry timestamptz;
begin
  select scheduled_for into v_retry
  from public.preventa_email_queue
  where id = (select queue_id from claimed_retry limit 1);
  if v_retry <> '2026-08-09T12:38:00Z'::timestamptz then raise exception 'SECOND_RETRY_WRONG_TIME:%', v_retry; end if;
end
$$;

-- Simula un worker muerto: el siguiente claim recupera processing antiguo.
update public.preventa_email_queue
set status = 'processing', attempt_count = 2, updated_at = '2026-08-09T11:00:00Z'
where id = (select queue_id from claimed_retry limit 1);

create temporary table claimed_recovered as
select * from public.preventa_claim_email_batch_v1(10, '2026-08-09T12:40:00Z');

do $$
declare
  v_attempt integer;
begin
  select attempt_count into v_attempt from claimed_recovered limit 1;
  if v_attempt <> 3 then raise exception 'STALE_PROCESSING_NOT_RECOVERED:%', v_attempt; end if;
end
$$;

-- Fuerza quinto intento y confirma estado terminal.
update public.preventa_email_queue
set attempt_count = 5
where id = (select queue_id from claimed_recovered limit 1);

select public.preventa_finish_email_delivery_v1(
  (select queue_id from claimed_recovered limit 1),
  false,
  null,
  'provider terminal failure',
  '2026-08-09T12:41:00Z'
);

do $$
declare
  v_status text;
begin
  select status into v_status
  from public.preventa_email_queue
  where id = (select queue_id from claimed_recovered limit 1);
  if v_status <> 'failed' then raise exception 'FIFTH_ATTEMPT_NOT_TERMINAL:%', v_status; end if;

  if not exists (
    select 1 from public.preventa_events
    where event_type = 'email.delivery.failed_terminal'
      and order_id = (select order_id from claimed_recovered limit 1)
  ) then
    raise exception 'TERMINAL_FAILURE_EVENT_MISSING';
  end if;
end
$$;

-- RPCs del worker nunca son públicas.
do $$
begin
  if has_function_privilege('anon', 'public.preventa_claim_email_batch_v1(integer,timestamptz)', 'EXECUTE') then
    raise exception 'ANON_CAN_CLAIM_EMAILS';
  end if;
  if has_function_privilege('authenticated', 'public.preventa_claim_email_batch_v1(integer,timestamptz)', 'EXECUTE') then
    raise exception 'AUTH_CAN_CLAIM_EMAILS';
  end if;
  if not has_function_privilege('service_role', 'public.preventa_claim_email_batch_v1(integer,timestamptz)', 'EXECUTE') then
    raise exception 'SERVICE_ROLE_CANNOT_CLAIM_EMAILS';
  end if;
  if has_function_privilege('anon', 'public.preventa_finish_email_delivery_v1(uuid,boolean,text,text,timestamptz)', 'EXECUTE') then
    raise exception 'ANON_CAN_FINISH_EMAILS';
  end if;
  if not has_function_privilege('service_role', 'public.preventa_finish_email_delivery_v1(uuid,boolean,text,text,timestamptz)', 'EXECUTE') then
    raise exception 'SERVICE_ROLE_CANNOT_FINISH_EMAILS';
  end if;
end
$$;

select 'PREVENTA_EMAIL_WORKER_V0_1_OK' as result;

rollback;
