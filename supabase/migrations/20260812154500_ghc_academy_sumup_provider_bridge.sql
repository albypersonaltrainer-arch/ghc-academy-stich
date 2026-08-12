create table if not exists public.academy_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.academy_orders(id) on delete cascade,
  installment_id uuid not null references public.academy_installments(id) on delete cascade,
  provider text not null default 'sumup' check (provider in ('sumup','stripe')),
  checkout_reference text not null unique,
  provider_checkout_id text not null unique,
  hosted_checkout_url text,
  expected_amount_cents integer not null check (expected_amount_cents > 0),
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in ('pending','paid','failed','expired','cancelled')),
  provider_payment_id text,
  idempotency_key text not null unique,
  provider_metadata jsonb not null default '{}'::jsonb,
  terminal_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_payment_attempts_order_idx
  on public.academy_payment_attempts(order_id, created_at desc);
create index if not exists academy_payment_attempts_installment_idx
  on public.academy_payment_attempts(installment_id, created_at desc);
create unique index if not exists academy_payment_attempts_provider_payment_uidx
  on public.academy_payment_attempts(provider, provider_payment_id)
  where provider_payment_id is not null;

alter table public.academy_payment_attempts enable row level security;
revoke all on public.academy_payment_attempts from public, anon, authenticated;

create or replace function public.ghc_student_get_academy_installment_checkout_context(
  p_order_id uuid,
  p_installment_no integer
)
returns jsonb
language plpgsql
security definer
set search_path = 'public','auth'
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.academy_orders;
  v_installment public.academy_installments;
  v_course public.courses;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if p_installment_no < 1 or p_installment_no > 4 then
    raise exception 'Número de cuota no válido.';
  end if;

  select * into v_order
  from public.academy_orders
  where id = p_order_id and user_id = v_uid;

  if v_order.id is null then
    raise exception 'Pedido Academy no encontrado.';
  end if;
  if v_order.status in ('cancelled','refunded','chargeback','suspended') then
    raise exception 'Este pedido no admite nuevos cobros.';
  end if;

  select * into v_installment
  from public.academy_installments
  where order_id = v_order.id and installment_no = p_installment_no;

  if v_installment.id is null then
    raise exception 'Cuota Academy no encontrada.';
  end if;
  if v_installment.status = 'paid' then
    raise exception 'Esta cuota ya está pagada.';
  end if;
  if v_installment.status in ('cancelled','refunded','chargeback') then
    raise exception 'Esta cuota no admite nuevos cobros.';
  end if;

  select * into v_course from public.courses where id = v_order.course_id;

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_reference', v_order.order_reference,
    'order_status', v_order.status,
    'installment_id', v_installment.id,
    'installment_no', v_installment.installment_no,
    'installment_status', v_installment.status,
    'amount_cents', v_installment.amount_cents,
    'currency', v_order.currency,
    'course_id', v_order.course_id,
    'course_slug', v_course.slug,
    'course_title', v_course.title,
    'email', v_order.email_normalized,
    'provider', v_order.provider
  );
end;
$$;

create or replace function public.ghc_provider_register_academy_sumup_checkout(
  p_order_id uuid,
  p_installment_id uuid,
  p_checkout_reference text,
  p_provider_checkout_id text,
  p_hosted_checkout_url text,
  p_expected_amount_cents integer,
  p_currency text,
  p_idempotency_key text,
  p_provider_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_order public.academy_orders;
  v_installment public.academy_installments;
  v_attempt public.academy_payment_attempts;
begin
  if coalesce(trim(p_checkout_reference),'') = '' or coalesce(trim(p_provider_checkout_id),'') = '' then
    raise exception 'Identificadores de checkout incompletos.';
  end if;
  if coalesce(trim(p_idempotency_key),'') = '' then
    raise exception 'Falta clave de idempotencia.';
  end if;

  select * into v_attempt
  from public.academy_payment_attempts
  where idempotency_key = p_idempotency_key;
  if v_attempt.id is not null then
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'order_id', v_attempt.order_id,
      'installment_id', v_attempt.installment_id,
      'provider_checkout_id', v_attempt.provider_checkout_id,
      'status', v_attempt.status,
      'idempotent_replay', true
    );
  end if;

  select * into v_order from public.academy_orders where id = p_order_id for update;
  select * into v_installment
  from public.academy_installments
  where id = p_installment_id and order_id = p_order_id
  for update;

  if v_order.id is null or v_installment.id is null then
    raise exception 'Pedido o cuota Academy no encontrados.';
  end if;
  if v_order.status in ('cancelled','refunded','chargeback','suspended') then
    raise exception 'El pedido no admite checkout.';
  end if;
  if v_installment.status in ('paid','cancelled','refunded','chargeback') then
    raise exception 'La cuota no admite checkout.';
  end if;
  if v_installment.amount_cents <> p_expected_amount_cents then
    raise exception 'Importe de checkout distinto del importe de la cuota.';
  end if;
  if v_order.currency <> upper(trim(p_currency)) then
    raise exception 'Moneda de checkout distinta de la moneda del pedido.';
  end if;

  insert into public.academy_payment_attempts(
    order_id, installment_id, provider, checkout_reference, provider_checkout_id,
    hosted_checkout_url, expected_amount_cents, currency, status, idempotency_key,
    provider_metadata
  ) values (
    v_order.id, v_installment.id, 'sumup', trim(p_checkout_reference), trim(p_provider_checkout_id),
    nullif(trim(p_hosted_checkout_url),''), p_expected_amount_cents, v_order.currency, 'pending',
    trim(p_idempotency_key), coalesce(p_provider_metadata,'{}'::jsonb)
  ) returning * into v_attempt;

  update public.academy_installments
  set provider = 'sumup',
      provider_checkout_id = v_attempt.provider_checkout_id,
      metadata = metadata || jsonb_build_object(
        'sumup_checkout_reference', v_attempt.checkout_reference,
        'sumup_attempt_id', v_attempt.id
      ),
      updated_at = now()
  where id = v_installment.id;

  update public.academy_orders
  set provider = 'sumup',
      provider_reference = coalesce(provider_reference, v_attempt.provider_checkout_id),
      updated_at = now()
  where id = v_order.id;

  insert into public.academy_commercial_events(order_id,event_type,actor_type,message,payload)
  values(
    v_order.id,
    'sumup_checkout_created',
    'provider',
    'Checkout SumUp creado para cuota Academy',
    jsonb_build_object(
      'attempt_id',v_attempt.id,
      'installment_id',v_installment.id,
      'installment_no',v_installment.installment_no,
      'provider_checkout_id',v_attempt.provider_checkout_id,
      'checkout_reference',v_attempt.checkout_reference,
      'expected_amount_cents',v_attempt.expected_amount_cents
    )
  );

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'order_id', v_order.id,
    'installment_id', v_installment.id,
    'provider_checkout_id', v_attempt.provider_checkout_id,
    'status', v_attempt.status,
    'idempotent_replay', false
  );
end;
$$;

create or replace function public.ghc_provider_get_academy_sumup_checkout_context(
  p_provider_checkout_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'attempt_id',a.id,
    'attempt_status',a.status,
    'order_id',o.id,
    'order_reference',o.order_reference,
    'order_status',o.status,
    'installment_id',i.id,
    'installment_no',i.installment_no,
    'installment_status',i.status,
    'expected_amount_cents',a.expected_amount_cents,
    'currency',a.currency,
    'checkout_reference',a.checkout_reference,
    'provider_checkout_id',a.provider_checkout_id,
    'provider_payment_id',a.provider_payment_id,
    'course_title',c.title,
    'course_slug',c.slug
  ) into v_result
  from public.academy_payment_attempts a
  join public.academy_orders o on o.id = a.order_id
  join public.academy_installments i on i.id = a.installment_id
  join public.courses c on c.id = o.course_id
  where a.provider = 'sumup' and a.provider_checkout_id = trim(p_provider_checkout_id)
  limit 1;

  if v_result is null then
    raise exception 'Checkout SumUp Academy no registrado.';
  end if;
  return v_result;
end;
$$;

create or replace function public.ghc_provider_mark_academy_sumup_checkout_terminal(
  p_provider_checkout_id text,
  p_terminal_status text,
  p_occurred_at timestamptz default now(),
  p_provider_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'public','private'
as $$
declare
  v_attempt public.academy_payment_attempts;
  v_installment public.academy_installments;
  v_state jsonb;
  v_status text := lower(trim(p_terminal_status));
begin
  if v_status not in ('failed','expired','cancelled') then
    raise exception 'Estado terminal SumUp no válido.';
  end if;

  select * into v_attempt
  from public.academy_payment_attempts
  where provider = 'sumup' and provider_checkout_id = trim(p_provider_checkout_id)
  for update;

  if v_attempt.id is null then raise exception 'Checkout SumUp Academy no registrado.'; end if;
  if v_attempt.status = 'paid' then
    return jsonb_build_object('attempt_id',v_attempt.id,'status','paid','ignored_terminal_event',true);
  end if;
  if v_attempt.status = v_status then
    return jsonb_build_object('attempt_id',v_attempt.id,'status',v_status,'idempotent_replay',true);
  end if;

  update public.academy_payment_attempts
  set status = v_status,
      terminal_at = coalesce(p_occurred_at,now()),
      provider_metadata = provider_metadata || coalesce(p_provider_metadata,'{}'::jsonb),
      updated_at = now()
  where id = v_attempt.id;

  select * into v_installment from public.academy_installments where id = v_attempt.installment_id for update;
  if v_installment.status not in ('paid','refunded','chargeback','cancelled') then
    update public.academy_installments
    set status = 'failed',
        failed_at = coalesce(p_occurred_at,now()),
        metadata = metadata || jsonb_build_object('sumup_checkout_terminal_status',v_status) || coalesce(p_provider_metadata,'{}'::jsonb),
        updated_at = now()
    where id = v_installment.id;
  end if;

  insert into public.academy_commercial_events(order_id,event_type,actor_type,message,payload)
  values(
    v_attempt.order_id,
    'sumup_checkout_' || v_status,
    'provider',
    'Checkout SumUp Academy en estado terminal',
    jsonb_build_object('attempt_id',v_attempt.id,'installment_id',v_attempt.installment_id,'provider_checkout_id',v_attempt.provider_checkout_id,'status',v_status)
  );

  v_state := private.ghc_apply_academy_order_state(v_attempt.order_id,'provider');
  return v_state || jsonb_build_object('attempt_id',v_attempt.id,'checkout_status',v_status,'idempotent_replay',false);
end;
$$;

create or replace function public.ghc_provider_confirm_academy_sumup_payment(
  p_provider_checkout_id text,
  p_provider_payment_id text,
  p_amount_cents integer,
  p_occurred_at timestamptz default now(),
  p_provider_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'public','private'
as $$
declare
  v_attempt public.academy_payment_attempts;
  v_installment public.academy_installments;
  v_order public.academy_orders;
  v_state jsonb;
begin
  if coalesce(trim(p_provider_payment_id),'') = '' then raise exception 'Falta id de pago SumUp.'; end if;
  if p_amount_cents <= 0 then raise exception 'Importe SumUp no válido.'; end if;

  select * into v_attempt
  from public.academy_payment_attempts
  where provider = 'sumup' and provider_checkout_id = trim(p_provider_checkout_id)
  for update;
  if v_attempt.id is null then raise exception 'Checkout SumUp Academy no registrado.'; end if;

  select * into v_installment from public.academy_installments where id = v_attempt.installment_id for update;
  select * into v_order from public.academy_orders where id = v_attempt.order_id for update;

  if v_attempt.expected_amount_cents <> p_amount_cents or v_installment.amount_cents <> p_amount_cents then
    raise exception 'Importe SumUp no coincide con la cuota Academy.';
  end if;
  if v_order.status in ('cancelled','refunded','chargeback','suspended') then
    raise exception 'El pedido no admite confirmación de pago.';
  end if;

  if v_installment.status = 'paid' then
    if v_installment.provider_payment_id = trim(p_provider_payment_id) then
      v_state := private.ghc_apply_academy_order_state(v_order.id,'provider');
      return v_state || jsonb_build_object('attempt_id',v_attempt.id,'provider_payment_id',v_installment.provider_payment_id,'idempotent_replay',true);
    end if;
    raise exception 'La cuota ya está pagada con otro identificador de proveedor.';
  end if;

  update public.academy_payment_attempts
  set status = 'paid',
      provider_payment_id = trim(p_provider_payment_id),
      terminal_at = coalesce(p_occurred_at,now()),
      provider_metadata = provider_metadata || coalesce(p_provider_metadata,'{}'::jsonb),
      updated_at = now()
  where id = v_attempt.id;

  update public.academy_installments
  set status = 'paid',
      provider = 'sumup',
      provider_checkout_id = v_attempt.provider_checkout_id,
      provider_payment_id = trim(p_provider_payment_id),
      paid_amount_cents = p_amount_cents,
      paid_at = coalesce(p_occurred_at,now()),
      failed_at = null,
      metadata = metadata || jsonb_build_object('sumup_attempt_id',v_attempt.id,'sumup_checkout_reference',v_attempt.checkout_reference) || coalesce(p_provider_metadata,'{}'::jsonb),
      updated_at = now()
  where id = v_installment.id;

  update public.academy_orders
  set provider = 'sumup',
      provider_reference = coalesce(provider_reference,v_attempt.provider_checkout_id),
      updated_at = now()
  where id = v_order.id;

  insert into public.academy_commercial_events(order_id,event_type,actor_type,message,payload)
  values(
    v_order.id,
    'installment_paid_sumup',
    'provider',
    'Cuota Academy confirmada por SumUp',
    jsonb_build_object(
      'attempt_id',v_attempt.id,
      'installment_id',v_installment.id,
      'installment_no',v_installment.installment_no,
      'provider_checkout_id',v_attempt.provider_checkout_id,
      'provider_payment_id',trim(p_provider_payment_id),
      'amount_cents',p_amount_cents
    )
  );

  v_state := private.ghc_apply_academy_order_state(v_order.id,'provider');
  return v_state || jsonb_build_object(
    'attempt_id',v_attempt.id,
    'installment_id',v_installment.id,
    'installment_no',v_installment.installment_no,
    'provider_payment_id',trim(p_provider_payment_id),
    'idempotent_replay',false
  );
end;
$$;

revoke execute on function public.ghc_student_get_academy_installment_checkout_context(uuid,integer) from public, anon;
grant execute on function public.ghc_student_get_academy_installment_checkout_context(uuid,integer) to authenticated;

revoke execute on function public.ghc_provider_register_academy_sumup_checkout(uuid,uuid,text,text,text,integer,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.ghc_provider_register_academy_sumup_checkout(uuid,uuid,text,text,text,integer,text,text,jsonb) to service_role;

revoke execute on function public.ghc_provider_get_academy_sumup_checkout_context(text) from public, anon, authenticated;
grant execute on function public.ghc_provider_get_academy_sumup_checkout_context(text) to service_role;

revoke execute on function public.ghc_provider_mark_academy_sumup_checkout_terminal(text,text,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.ghc_provider_mark_academy_sumup_checkout_terminal(text,text,timestamptz,jsonb) to service_role;

revoke execute on function public.ghc_provider_confirm_academy_sumup_payment(text,text,integer,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.ghc_provider_confirm_academy_sumup_payment(text,text,integer,timestamptz,jsonb) to service_role;
