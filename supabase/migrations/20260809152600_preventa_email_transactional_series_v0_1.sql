-- GHC Academy · Preventa 2026 · serie transaccional E01-E14 V0.1
-- Amplía la cola a E12-E14, enlaza incidencias económicas verificadas
-- y deja E11 habilitable exclusivamente desde backend cuando abra Academy.

begin;

-- -----------------------------------------------------------------------------
-- 1. Catálogo de plantillas de cola: E01-E14.
-- -----------------------------------------------------------------------------
alter table public.preventa_email_queue
  drop constraint if exists preventa_email_queue_template_code_check;

alter table public.preventa_email_queue
  add constraint preventa_email_queue_template_code_check
  check (template_code in (
    'E01','E02','E03','E04','E05','E06','E07','E08','E09','E10','E11','E12','E13','E14'
  ));

-- -----------------------------------------------------------------------------
-- 2. Eventos económicos -> emails transaccionales de incidencia.
--    El evento ya ha sido validado por la lógica económica antes de entrar aquí.
-- -----------------------------------------------------------------------------
create or replace function public.preventa_enqueue_transactional_email_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_template text;
begin
  v_template := case new.event_type
    when 'checkout.attempt.failed' then 'E12'
    when 'checkout.attempt.expired' then 'E13'
    when 'payment.full_refunded' then 'E14'
    when 'order.cancelled.nonpayment' then 'E09'
    else null
  end;

  if v_template is null or new.order_id is null then
    return new;
  end if;

  if v_template = 'E09' then
    insert into public.preventa_email_queue (
      order_id, template_code, scheduled_for, status, updated_at
    ) values (
      new.order_id, 'E09', new.occurred_at, 'queued', new.occurred_at
    )
    on conflict (order_id, template_code) do update
      set scheduled_for = excluded.scheduled_for,
          status = case
            when public.preventa_email_queue.status = 'sent' then 'sent'
            else 'queued'
          end,
          last_error = case
            when public.preventa_email_queue.status = 'sent' then public.preventa_email_queue.last_error
            else null
          end,
          updated_at = excluded.updated_at;
  else
    insert into public.preventa_email_queue (
      order_id, template_code, scheduled_for
    ) values (
      new.order_id, v_template, new.occurred_at
    )
    on conflict (order_id, template_code) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.preventa_enqueue_transactional_email_v1()
  from public, anon, authenticated;

drop trigger if exists preventa_events_enqueue_transactional_email_v1
  on public.preventa_events;

create trigger preventa_events_enqueue_transactional_email_v1
after insert on public.preventa_events
for each row
execute function public.preventa_enqueue_transactional_email_v1();

comment on function public.preventa_enqueue_transactional_email_v1 is
  'Encola E12/E13/E14 desde eventos económicos verificados y sincroniza E09 con el cierre efectivo por impago.';

-- -----------------------------------------------------------------------------
-- 3. E11 · apertura y acceso.
--    No se programa por fecha estimada: solo se encola cuando la plataforma ya
--    está operativa y la matrícula está pagada + plaza Fundador confirmada.
-- -----------------------------------------------------------------------------
create or replace function public.preventa_queue_access_email_v1(
  p_order_reference text,
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
begin
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) < 12 then
    raise exception using errcode = 'P0001', message = 'INVALID_IDEMPOTENCY_KEY';
  end if;

  if exists (
    select 1
    from public.preventa_events
    where idempotency_key = p_idempotency_key
  ) then
    return jsonb_build_object(
      'order_reference', p_order_reference,
      'template_code', 'E11',
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

  if v_order.status <> 'paid'
     or v_order.founder_status <> 'confirmed'
     or v_order.founder_place_number is null then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_ELIGIBLE_FOR_ACCESS_EMAIL';
  end if;

  insert into public.preventa_email_queue (
    order_id, template_code, scheduled_for
  ) values (
    v_order.id, 'E11', p_occurred_at
  )
  on conflict (order_id, template_code) do nothing;

  insert into public.preventa_events (
    order_id, event_type, idempotency_key, payload, occurred_at
  ) values (
    v_order.id,
    'academy.access.email.queued',
    p_idempotency_key,
    jsonb_build_object(
      'template_code', 'E11',
      'founder_place_number', v_order.founder_place_number
    ),
    p_occurred_at
  );

  return jsonb_build_object(
    'order_reference', p_order_reference,
    'template_code', 'E11',
    'founder_place_number', v_order.founder_place_number,
    'idempotent_replay', false
  );
end;
$$;

revoke all on function public.preventa_queue_access_email_v1(text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.preventa_queue_access_email_v1(text,text,timestamptz)
  to service_role;

comment on function public.preventa_queue_access_email_v1 is
  'Encola E11 únicamente para matrículas pagadas y Fundador confirmadas. Solo service_role.';

commit;
