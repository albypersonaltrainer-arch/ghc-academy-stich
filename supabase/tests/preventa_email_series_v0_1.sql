-- GHC Academy · Preventa 2026 · test serie transaccional E09-E14
-- Se ejecuta dentro de transacción y termina en ROLLBACK.

begin;

insert into public.preventa_orders (
  order_reference,
  request_key,
  first_name,
  last_name,
  email,
  country,
  payment_plan,
  total_amount_cents,
  first_installment_cents,
  second_installment_cents,
  status,
  founder_place_number,
  founder_status,
  terms_version,
  privacy_version,
  legal_package_version,
  paid_at
) values (
  'GHC-EMAIL001',
  'email-series-paid-request-0001',
  'Email',
  'Paid',
  'email-paid@example.test',
  'ES',
  'single',
  169000,
  169000,
  0,
  'paid',
  99,
  'confirmed',
  'TERMS-TEST',
  'PRIVACY-TEST',
  'LEGAL-TEST',
  '2026-08-09T10:00:00Z'
), (
  'GHC-EMAIL002',
  'email-series-open-request-0002',
  'Email',
  'Open',
  'email-open@example.test',
  'ES',
  'single',
  169000,
  169000,
  0,
  'awaiting_payment',
  null,
  'pending',
  'TERMS-TEST',
  'PRIVACY-TEST',
  'LEGAL-TEST',
  null
);

-- E11: solo matrícula pagada y Fundador confirmada.
select public.preventa_queue_access_email_v1(
  'GHC-EMAIL001',
  'email-series-access-0001',
  '2026-10-01T08:00:00Z'
);

select public.preventa_queue_access_email_v1(
  'GHC-EMAIL001',
  'email-series-access-0001',
  '2026-10-01T08:00:01Z'
);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.preventa_email_queue q
  join public.preventa_orders o on o.id = q.order_id
  where o.order_reference = 'GHC-EMAIL001'
    and q.template_code = 'E11';

  if v_count <> 1 then
    raise exception 'E11_NOT_IDEMPOTENT:%', v_count;
  end if;

  if not exists (
    select 1
    from public.preventa_events e
    join public.preventa_orders o on o.id = e.order_id
    where o.order_reference = 'GHC-EMAIL001'
      and e.event_type = 'academy.access.email.queued'
  ) then
    raise exception 'E11_EVENT_MISSING';
  end if;
end
$$;

do $$
begin
  begin
    perform public.preventa_queue_access_email_v1(
      'GHC-EMAIL002',
      'email-series-access-invalid-0002',
      '2026-10-01T08:00:00Z'
    );
    raise exception 'EXPECTED_E11_INELIGIBLE_REJECTION';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'ORDER_NOT_ELIGIBLE_FOR_ACCESS_EMAIL' then
        raise;
      end if;
  end;
end
$$;

-- E12, E13 y E14: nacen de eventos económicos previamente verificados.
insert into public.preventa_events (
  order_id, event_type, idempotency_key, payload, occurred_at
)
select id, 'checkout.attempt.failed', 'email-series-failed-0001', '{}'::jsonb, '2026-08-09T11:00:00Z'
from public.preventa_orders where order_reference = 'GHC-EMAIL002';

insert into public.preventa_events (
  order_id, event_type, idempotency_key, payload, occurred_at
)
select id, 'checkout.attempt.expired', 'email-series-expired-0001', '{}'::jsonb, '2026-08-09T11:05:00Z'
from public.preventa_orders where order_reference = 'GHC-EMAIL002';

insert into public.preventa_events (
  order_id, event_type, idempotency_key, payload, occurred_at
)
select id, 'payment.full_refunded', 'email-series-refund-0001', '{}'::jsonb, '2026-08-09T11:10:00Z'
from public.preventa_orders where order_reference = 'GHC-EMAIL002';

do $$
declare
  v_codes text[];
begin
  select array_agg(q.template_code order by q.template_code)
    into v_codes
  from public.preventa_email_queue q
  join public.preventa_orders o on o.id = q.order_id
  where o.order_reference = 'GHC-EMAIL002'
    and q.template_code in ('E12','E13','E14');

  if v_codes is distinct from array['E12','E13','E14']::text[] then
    raise exception 'INCIDENT_EMAILS_MISSING:%', v_codes;
  end if;
end
$$;

-- E09: el momento de envío debe sincronizarse con el cierre efectivo.
insert into public.preventa_email_queue (
  order_id, template_code, scheduled_for, status
)
select id, 'E09', '2026-10-01T00:00:00Z', 'queued'
from public.preventa_orders where order_reference = 'GHC-EMAIL002';

insert into public.preventa_events (
  order_id, event_type, idempotency_key, payload, occurred_at
)
select id, 'order.cancelled.nonpayment', 'email-series-close-0001', '{}'::jsonb, '2026-10-15T12:34:56Z'
from public.preventa_orders where order_reference = 'GHC-EMAIL002';

do $$
declare
  v_scheduled timestamptz;
  v_status text;
begin
  select q.scheduled_for, q.status
    into v_scheduled, v_status
  from public.preventa_email_queue q
  join public.preventa_orders o on o.id = q.order_id
  where o.order_reference = 'GHC-EMAIL002'
    and q.template_code = 'E09';

  if v_scheduled <> '2026-10-15T12:34:56Z'::timestamptz then
    raise exception 'E09_NOT_SYNCED_TO_CLOSE:%', v_scheduled;
  end if;

  if v_status <> 'queued' then
    raise exception 'E09_UNEXPECTED_STATUS:%', v_status;
  end if;
end
$$;

-- Seguridad de la RPC de apertura.
do $$
begin
  if has_function_privilege('anon', 'public.preventa_queue_access_email_v1(text,text,timestamptz)', 'EXECUTE') then
    raise exception 'ANON_CAN_EXECUTE_E11_QUEUE';
  end if;

  if has_function_privilege('authenticated', 'public.preventa_queue_access_email_v1(text,text,timestamptz)', 'EXECUTE') then
    raise exception 'AUTHENTICATED_CAN_EXECUTE_E11_QUEUE';
  end if;

  if not has_function_privilege('service_role', 'public.preventa_queue_access_email_v1(text,text,timestamptz)', 'EXECUTE') then
    raise exception 'SERVICE_ROLE_CANNOT_EXECUTE_E11_QUEUE';
  end if;
end
$$;

select 'PREVENTA_EMAIL_SERIES_V0_1_OK' as result;

rollback;
