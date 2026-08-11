create schema if not exists private;

create table if not exists public.academy_commercial_policies (
  id uuid primary key default gen_random_uuid(),
  policy_code text not null unique,
  status text not null default 'active' check (status in ('draft','active','retired')),
  currency text not null default 'EUR',
  installment_min_cents integer not null default 15000 check (installment_min_cents >= 0),
  three_payment_min_cents integer not null default 40000 check (three_payment_min_cents >= 0),
  four_payment_min_cents integer not null default 100000 check (four_payment_min_cents >= 0),
  max_installments smallint not null default 4 check (max_installments between 1 and 4),
  installment_interval_days integer not null default 30 check (installment_interval_days between 1 and 90),
  withdrawal_days integer not null default 14 check (withdrawal_days between 0 and 30),
  reminder_before_days integer[] not null default array[5],
  overdue_reminder_days integer[] not null default array[3,7,15],
  cancel_after_days integer not null default 30 check (cancel_after_days between 7 and 120),
  merchant_consumer_fee_mode text not null default 'zero' check (merchant_consumer_fee_mode in ('zero','external_only')),
  external_financing_enabled boolean not null default false,
  legal_version text not null default 'GHC_ACADEMY_POSTLAUNCH_ES_2026_08',
  notes text,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.academy_commercial_policies (
  policy_code,status,currency,installment_min_cents,three_payment_min_cents,four_payment_min_cents,
  max_installments,installment_interval_days,withdrawal_days,reminder_before_days,overdue_reminder_days,
  cancel_after_days,merchant_consumer_fee_mode,external_financing_enabled,legal_version,notes
)
values (
  'GHC_ACADEMY_DEFAULT_2026_08','active','EUR',15000,40000,100000,4,30,14,array[5],array[3,7,15],30,
  'zero',false,'GHC_ACADEMY_POSTLAUNCH_ES_2026_08',
  'Fraccionamiento interno GHC sin coste financiero para consumidor. Financiación con coste reservada a proveedor externo autorizado.'
)
on conflict (policy_code) do nothing;

create table if not exists public.academy_orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null unique default ('GHC-A-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  user_id uuid not null references auth.users(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  email_normalized text not null,
  customer_type text not null default 'consumer' check (customer_type in ('consumer','professional_business')),
  policy_id uuid not null references public.academy_commercial_policies(id) on delete restrict,
  payment_mode text not null check (payment_mode in ('single','merchant_installments','external_financing')),
  installment_count smallint not null check (installment_count between 1 and 4),
  currency text not null default 'EUR',
  base_total_cents integer not null check (base_total_cents >= 0),
  financing_fee_cents integer not null default 0 check (financing_fee_cents >= 0),
  payable_total_cents integer not null check (payable_total_cents >= 0),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','waiting_withdrawal','active','past_due','completed','cancelled','refunded','chargeback','suspended')),
  provider text not null default 'unassigned' check (provider in ('unassigned','sumup','stripe','external_finance','manual')),
  provider_reference text,
  immediate_start boolean not null default false,
  withdrawal_ends_at timestamptz,
  withdrawal_waived_at timestamptz,
  access_start_at timestamptz,
  fully_paid_at timestamptz,
  cancelled_at timestamptz,
  collection_paused boolean not null default false,
  terms_version text not null,
  privacy_version text not null,
  legal_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists academy_orders_one_open_per_user_course
on public.academy_orders(user_id, course_id)
where status in ('awaiting_payment','waiting_withdrawal','active','past_due','suspended');

create table if not exists public.academy_installments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.academy_orders(id) on delete cascade,
  installment_no smallint not null check (installment_no between 1 and 4),
  amount_cents integer not null check (amount_cents >= 0),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','paid','failed','overdue','cancelled','refunded','chargeback')),
  provider text not null default 'unassigned' check (provider in ('unassigned','sumup','stripe','external_finance','manual')),
  provider_checkout_id text,
  provider_payment_id text,
  paid_amount_cents integer not null default 0 check (paid_amount_cents >= 0),
  refunded_amount_cents integer not null default 0 check (refunded_amount_cents >= 0),
  paid_at timestamptz,
  failed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, installment_no)
);

create table if not exists public.academy_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.academy_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  acceptance_type text not null check (acceptance_type in ('terms','privacy','digital_content_start_request','withdrawal_loss_ack','service_start_request')),
  version text not null,
  accepted boolean not null default true,
  accepted_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  unique(order_id, acceptance_type)
);

create table if not exists public.academy_commercial_events (
  id bigserial primary key,
  order_id uuid references public.academy_orders(id) on delete cascade,
  event_type text not null,
  actor_type text not null default 'system' check (actor_type in ('system','student','admin','provider','cron')),
  actor_user_id uuid,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.academy_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.academy_orders(id) on delete cascade,
  audience text not null check (audience in ('student','admin')),
  user_id uuid,
  recipient_email text,
  channel text not null default 'in_app_email' check (channel in ('in_app','email','in_app_email')),
  template_key text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending','sent','read','failed','skipped')),
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz,
  dedupe_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.academy_commercial_policies enable row level security;
alter table public.academy_orders enable row level security;
alter table public.academy_installments enable row level security;
alter table public.academy_legal_acceptances enable row level security;
alter table public.academy_commercial_events enable row level security;
alter table public.academy_notifications enable row level security;

revoke all on public.academy_commercial_policies from public, anon, authenticated;
revoke all on public.academy_orders from public, anon, authenticated;
revoke all on public.academy_installments from public, anon, authenticated;
revoke all on public.academy_legal_acceptances from public, anon, authenticated;
revoke all on public.academy_commercial_events from public, anon, authenticated;
revoke all on public.academy_notifications from public, anon, authenticated;

alter table public.course_access
  add column if not exists commercial_order_id uuid references public.academy_orders(id) on delete set null,
  add column if not exists commercial_max_module_order integer,
  add column if not exists commercial_fully_paid boolean not null default true,
  add column if not exists commercial_manual_override boolean not null default false;

create or replace function private.ghc_installment_count_limit(p_price_cents integer)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when coalesce(p_price_cents,0) < 15000 then 1
    when p_price_cents < 40000 then 2
    when p_price_cents < 100000 then 3
    else 4
  end;
$$;

create or replace function public.ghc_public_get_course_payment_options(p_course_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public','private'
as $$
declare
  v_course public.courses;
  v_policy public.academy_commercial_policies;
  v_price integer;
  v_max integer;
  v_plans jsonb := '[]'::jsonb;
  v_count integer;
  v_amounts jsonb;
begin
  select * into v_course from public.courses where slug=p_course_slug and status='published' limit 1;
  if v_course.id is null then return jsonb_build_object('available',false); end if;
  select * into v_policy from public.academy_commercial_policies where status='active' and effective_from<=now() and (effective_to is null or effective_to>now()) order by effective_from desc limit 1;
  if v_policy.id is null then raise exception 'No hay política comercial activa.'; end if;
  v_price := round(coalesce(v_course.price,0)*100)::integer;
  v_max := least(v_policy.max_installments, private.ghc_installment_count_limit(v_price));
  for v_count in 1..v_max loop
    select coalesce(jsonb_agg(amount order by n),'[]'::jsonb) into v_amounts
    from (
      select n,
        (v_price / v_count) + case when n <= (v_price % v_count) then 1 else 0 end as amount
      from generate_series(1,v_count) n
    ) s;
    v_plans := v_plans || jsonb_build_array(jsonb_build_object(
      'installment_count',v_count,
      'payment_mode',case when v_count=1 then 'single' else 'merchant_installments' end,
      'total_cents',v_price,
      'financing_fee_cents',0,
      'installment_amounts_cents',v_amounts,
      'interval_days',case when v_count=1 then null else v_policy.installment_interval_days end
    ));
  end loop;
  return jsonb_build_object(
    'available',true,'course_id',v_course.id,'course_slug',v_course.slug,'course_title',v_course.title,
    'currency',v_policy.currency,'base_price_cents',v_price,'plans',v_plans,
    'max_installments',v_max,'immediate_start_available',true,'withdrawal_days',v_policy.withdrawal_days,
    'merchant_financing_fee_mode',v_policy.merchant_consumer_fee_mode,
    'external_financing_enabled',v_policy.external_financing_enabled,'legal_version',v_policy.legal_version
  );
end;
$$;

create or replace function private.ghc_apply_academy_order_state(p_order_id uuid, p_actor text default 'system')
returns jsonb
language plpgsql
security definer
set search_path = 'public','private','auth'
as $$
declare
  v_order public.academy_orders;
  v_paid_count integer := 0;
  v_paid_sum integer := 0;
  v_module_count integer := 0;
  v_max_module integer := 0;
  v_old_max integer := 0;
  v_start_allowed boolean := false;
  v_next_status text;
  v_email text;
begin
  select * into v_order from public.academy_orders where id=p_order_id for update;
  if v_order.id is null then raise exception 'Pedido Academy no encontrado.'; end if;
  select count(*)::integer, coalesce(sum(paid_amount_cents-refunded_amount_cents),0)::integer
    into v_paid_count,v_paid_sum
  from public.academy_installments
  where order_id=v_order.id and status='paid' and paid_amount_cents>refunded_amount_cents;
  select count(*)::integer into v_module_count from public.modules where course_id=v_order.course_id;
  if v_paid_count>0 and v_order.installment_count>0 then
    v_max_module := least(v_module_count, ceil(v_module_count::numeric * v_paid_count::numeric / v_order.installment_count::numeric)::integer);
  end if;
  v_start_allowed := v_order.immediate_start or (v_order.access_start_at is not null and now()>=v_order.access_start_at);
  if v_paid_count >= v_order.installment_count and v_paid_sum >= v_order.payable_total_cents then
    v_next_status := 'completed';
  elsif v_paid_count>0 and not v_start_allowed then
    v_next_status := 'waiting_withdrawal';
  elsif exists(select 1 from public.academy_installments i where i.order_id=v_order.id and i.status in ('pending','failed','overdue') and i.due_at<now()) then
    v_next_status := 'past_due';
  elsif v_paid_count>0 then
    v_next_status := 'active';
  else
    v_next_status := 'awaiting_payment';
  end if;
  if v_order.status not in ('cancelled','refunded','chargeback','suspended') then
    update public.academy_orders set status=v_next_status,
      fully_paid_at=case when v_next_status='completed' then coalesce(fully_paid_at,now()) else fully_paid_at end,
      updated_at=now() where id=v_order.id;
  end if;
  if v_start_allowed and v_paid_count>0 and v_order.status not in ('refunded','chargeback','suspended') then
    select coalesce(commercial_max_module_order,0) into v_old_max
    from public.course_access where user_id=v_order.user_id and course_id=v_order.course_id;
    insert into public.course_access(
      user_id,course_id,status,access_source,provider_reference,granted_by,granted_at,reason,metadata,
      commercial_order_id,commercial_max_module_order,commercial_fully_paid,commercial_manual_override,created_at,updated_at
    ) values (
      v_order.user_id,v_order.course_id,'active',
      case when v_order.provider in ('sumup','stripe') then v_order.provider else 'admin' end,
      coalesce(v_order.provider_reference,v_order.order_reference),null,now(),'Acceso automático por pago Academy',
      jsonb_build_object('academy_order_id',v_order.id,'order_reference',v_order.order_reference,'automation',true),
      v_order.id,v_max_module,(v_next_status='completed'),false,now(),now()
    ) on conflict (user_id,course_id) do update set
      status='active',revoked_at=null,reason='Acceso automático por pago Academy',
      commercial_order_id=excluded.commercial_order_id,
      commercial_max_module_order=case when public.course_access.commercial_manual_override then public.course_access.commercial_max_module_order else excluded.commercial_max_module_order end,
      commercial_fully_paid=case when public.course_access.commercial_manual_override then public.course_access.commercial_fully_paid else excluded.commercial_fully_paid end,
      metadata=public.course_access.metadata || excluded.metadata,updated_at=now();
    if v_max_module>v_old_max then
      select email into v_email from auth.users where id=v_order.user_id;
      insert into public.academy_notifications(order_id,audience,user_id,recipient_email,template_key,subject,body,dedupe_key,metadata)
      values(v_order.id,'student',v_order.user_id,v_email,'access_unlocked','Nuevo contenido disponible',
        format('Pago confirmado. Ya tienes disponible el contenido de tu curso hasta el módulo %s, sujeto también a la progresión académica.',v_max_module),
        format('order:%s:access:%s',v_order.id,v_max_module),jsonb_build_object('max_module_order',v_max_module))
      on conflict (dedupe_key) do nothing;
      insert into public.academy_notifications(order_id,audience,template_key,subject,body,dedupe_key,metadata)
      values(v_order.id,'admin','access_unlocked_admin','Acceso Academy actualizado',
        format('El pedido %s ha desbloqueado automáticamente hasta el módulo %s.',v_order.order_reference,v_max_module),
        format('order:%s:access-admin:%s',v_order.id,v_max_module),jsonb_build_object('max_module_order',v_max_module,'user_id',v_order.user_id))
      on conflict (dedupe_key) do nothing;
    end if;
  end if;
  insert into public.academy_commercial_events(order_id,event_type,actor_type,message,payload)
  values(v_order.id,'order_state_applied',case when p_actor in ('admin','provider','cron','student') then p_actor else 'system' end,
    'Estado comercial recalculado',jsonb_build_object('paid_installments',v_paid_count,'paid_cents',v_paid_sum,'max_module_order',v_max_module,'status',v_next_status));
  return jsonb_build_object('order_id',v_order.id,'status',v_next_status,'paid_installments',v_paid_count,'paid_cents',v_paid_sum,'max_module_order',v_max_module,'access_started',v_start_allowed,'fully_paid',v_next_status='completed');
end;
$$;

create or replace function public.ghc_student_prepare_academy_order(
  p_course_id uuid,
  p_installment_count integer,
  p_start_now boolean,
  p_customer_type text,
  p_terms_accepted boolean,
  p_privacy_accepted boolean,
  p_terms_version text,
  p_privacy_version text
)
returns jsonb
language plpgsql
security definer
set search_path = 'public','private','auth'
as $$
declare
  v_uid uuid := auth.uid();
  v_course public.courses;
  v_policy public.academy_commercial_policies;
  v_price integer;
  v_limit integer;
  v_email text;
  v_order public.academy_orders;
  v_n integer;
  v_amount integer;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  if not coalesce(p_terms_accepted,false) or not coalesce(p_privacy_accepted,false) then raise exception 'Debes aceptar las condiciones y la política de privacidad.'; end if;
  if coalesce(p_customer_type,'consumer') not in ('consumer','professional_business') then raise exception 'Tipo de cliente no válido.'; end if;
  select * into v_course from public.courses where id=p_course_id and status='published';
  if v_course.id is null then raise exception 'El curso no está disponible para matrícula.'; end if;
  select * into v_policy from public.academy_commercial_policies where status='active' and effective_from<=now() and (effective_to is null or effective_to>now()) order by effective_from desc limit 1;
  if v_policy.id is null then raise exception 'No hay política comercial activa.'; end if;
  v_price := round(coalesce(v_course.price,0)*100)::integer;
  v_limit := least(v_policy.max_installments, private.ghc_installment_count_limit(v_price));
  if p_installment_count<1 or p_installment_count>v_limit then raise exception 'Ese número de pagos no está disponible para este curso.'; end if;
  select lower(email) into v_email from auth.users where id=v_uid;
  insert into public.academy_orders(
    user_id,course_id,email_normalized,customer_type,policy_id,payment_mode,installment_count,currency,
    base_total_cents,financing_fee_cents,payable_total_cents,status,provider,immediate_start,
    withdrawal_ends_at,withdrawal_waived_at,access_start_at,terms_version,privacy_version,legal_version
  ) values(
    v_uid,v_course.id,v_email,coalesce(p_customer_type,'consumer'),v_policy.id,
    case when p_installment_count=1 then 'single' else 'merchant_installments' end,p_installment_count,v_policy.currency,
    v_price,0,v_price,'awaiting_payment','unassigned',coalesce(p_start_now,false),
    now()+make_interval(days=>v_policy.withdrawal_days),
    case when coalesce(p_start_now,false) then now() else null end,
    case when coalesce(p_start_now,false) then now() else now()+make_interval(days=>v_policy.withdrawal_days) end,
    coalesce(nullif(trim(p_terms_version),''),v_policy.legal_version),coalesce(nullif(trim(p_privacy_version),''),v_policy.legal_version),v_policy.legal_version
  ) returning * into v_order;
  for v_n in 1..p_installment_count loop
    v_amount := (v_price / p_installment_count) + case when v_n <= (v_price % p_installment_count) then 1 else 0 end;
    insert into public.academy_installments(order_id,installment_no,amount_cents,due_at)
    values(v_order.id,v_n,v_amount,now()+make_interval(days=>v_policy.installment_interval_days*(v_n-1)));
  end loop;
  insert into public.academy_legal_acceptances(order_id,user_id,acceptance_type,version,evidence)
  values(v_order.id,v_uid,'terms',v_order.terms_version,jsonb_build_object('accepted_in','academy_checkout')),
        (v_order.id,v_uid,'privacy',v_order.privacy_version,jsonb_build_object('accepted_in','academy_checkout'));
  if coalesce(p_start_now,false) then
    insert into public.academy_legal_acceptances(order_id,user_id,acceptance_type,version,evidence)
    values(v_order.id,v_uid,'digital_content_start_request',v_order.legal_version,jsonb_build_object('explicit',true)),
          (v_order.id,v_uid,'withdrawal_loss_ack',v_order.legal_version,jsonb_build_object('explicit',true));
  end if;
  insert into public.academy_commercial_events(order_id,event_type,actor_type,actor_user_id,message,payload)
  values(v_order.id,'order_prepared','student',v_uid,'Pedido Academy preparado',jsonb_build_object('installments',p_installment_count,'start_now',p_start_now,'total_cents',v_price));
  return jsonb_build_object('order_id',v_order.id,'order_reference',v_order.order_reference,'status',v_order.status,'total_cents',v_price,'installment_count',p_installment_count,'start_now',p_start_now,'access_start_at',v_order.access_start_at,'provider_connected',false);
end;
$$;

create or replace function public.ghc_admin_mark_academy_installment_paid(p_installment_id uuid, p_paid_at timestamptz default now(), p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = 'public','private'
as $$
declare
  v_i public.academy_installments;
  v_result jsonb;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  select * into v_i from public.academy_installments where id=p_installment_id for update;
  if v_i.id is null then raise exception 'Cuota no encontrada.'; end if;
  update public.academy_installments set status='paid',provider='manual',paid_amount_cents=amount_cents,paid_at=coalesce(p_paid_at,now()),updated_at=now(),metadata=metadata||jsonb_build_object('manual_reason',p_reason,'marked_by',auth.uid()) where id=v_i.id;
  insert into public.academy_commercial_events(order_id,event_type,actor_type,actor_user_id,message,payload)
  values(v_i.order_id,'installment_paid_manual','admin',auth.uid(),coalesce(p_reason,'Cuota marcada como pagada manualmente'),jsonb_build_object('installment_id',v_i.id,'installment_no',v_i.installment_no));
  v_result := private.ghc_apply_academy_order_state(v_i.order_id,'admin');
  return v_result;
end;
$$;

create or replace function public.ghc_admin_extend_academy_order(p_order_id uuid, p_days integer, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare v_changed integer;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  if p_days<1 or p_days>60 then raise exception 'La extensión debe estar entre 1 y 60 días.'; end if;
  update public.academy_installments set due_at=due_at+make_interval(days=>p_days),updated_at=now(),metadata=metadata||jsonb_build_object('extended_by_days',p_days,'extended_by',auth.uid(),'reason',p_reason)
  where order_id=p_order_id and status in ('pending','failed','overdue');
  get diagnostics v_changed=row_count;
  update public.academy_orders set updated_at=now() where id=p_order_id;
  insert into public.academy_commercial_events(order_id,event_type,actor_type,actor_user_id,message,payload)
  values(p_order_id,'due_dates_extended','admin',auth.uid(),coalesce(p_reason,'Vencimientos ampliados'),jsonb_build_object('days',p_days,'installments_changed',v_changed));
  return jsonb_build_object('order_id',p_order_id,'days_added',p_days,'installments_changed',v_changed);
end;
$$;

create or replace function public.ghc_admin_override_academy_access(p_order_id uuid, p_module_limit integer, p_full_access boolean, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare v_order public.academy_orders; v_modules integer;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  select * into v_order from public.academy_orders where id=p_order_id;
  if v_order.id is null then raise exception 'Pedido no encontrado.'; end if;
  select count(*)::integer into v_modules from public.modules where course_id=v_order.course_id;
  if coalesce(p_full_access,false) then p_module_limit:=v_modules; end if;
  if p_module_limit<0 or p_module_limit>v_modules then raise exception 'Límite de módulos no válido.'; end if;
  update public.course_access set status='active',commercial_order_id=v_order.id,commercial_max_module_order=p_module_limit,commercial_fully_paid=coalesce(p_full_access,false),commercial_manual_override=true,reason=coalesce(p_reason,'Override manual comercial'),updated_at=now()
  where user_id=v_order.user_id and course_id=v_order.course_id;
  if not found then raise exception 'Aún no existe matrícula académica para ese pedido.'; end if;
  insert into public.academy_commercial_events(order_id,event_type,actor_type,actor_user_id,message,payload)
  values(v_order.id,'access_override','admin',auth.uid(),coalesce(p_reason,'Override manual comercial'),jsonb_build_object('module_limit',p_module_limit,'full_access',p_full_access));
  return jsonb_build_object('order_id',v_order.id,'module_limit',p_module_limit,'full_access',p_full_access,'manual_override',true);
end;
$$;

create or replace function public.ghc_admin_release_academy_access_override(p_order_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = 'public','private'
as $$
declare v_order public.academy_orders; v_result jsonb;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  select * into v_order from public.academy_orders where id=p_order_id;
  if v_order.id is null then raise exception 'Pedido no encontrado.'; end if;
  update public.course_access set commercial_manual_override=false,updated_at=now() where user_id=v_order.user_id and course_id=v_order.course_id;
  insert into public.academy_commercial_events(order_id,event_type,actor_type,actor_user_id,message)
  values(v_order.id,'access_override_released','admin',auth.uid(),coalesce(p_reason,'Override manual retirado'));
  v_result:=private.ghc_apply_academy_order_state(v_order.id,'admin');
  return v_result;
end;
$$;

create or replace function public.ghc_admin_list_academy_orders()
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public','auth'
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',o.id,'order_reference',o.order_reference,'user_id',o.user_id,'email',o.email_normalized,'course_id',o.course_id,
    'course_title',c.title,'customer_type',o.customer_type,'payment_mode',o.payment_mode,'installment_count',o.installment_count,
    'currency',o.currency,'base_total_cents',o.base_total_cents,'financing_fee_cents',o.financing_fee_cents,'payable_total_cents',o.payable_total_cents,
    'status',o.status,'provider',o.provider,'immediate_start',o.immediate_start,'withdrawal_ends_at',o.withdrawal_ends_at,'access_start_at',o.access_start_at,
    'fully_paid_at',o.fully_paid_at,'created_at',o.created_at,
    'installments',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'installment_no',i.installment_no,'amount_cents',i.amount_cents,'due_at',i.due_at,'status',i.status,'paid_at',i.paid_at) order by i.installment_no) from public.academy_installments i where i.order_id=o.id),'[]'::jsonb),
    'course_access',(select jsonb_build_object('status',ca.status,'max_module_order',ca.commercial_max_module_order,'fully_paid',ca.commercial_fully_paid,'manual_override',ca.commercial_manual_override) from public.course_access ca where ca.user_id=o.user_id and ca.course_id=o.course_id limit 1)
  ) order by o.created_at desc),'[]'::jsonb) into v_result
  from public.academy_orders o join public.courses c on c.id=o.course_id;
  return v_result;
end;
$$;

create or replace function public.ghc_student_list_academy_notifications()
returns jsonb
language plpgsql
security definer
set search_path = 'public','auth'
as $$
declare v_uid uuid:=auth.uid(); v_email text; v_result jsonb;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  select lower(email) into v_email from auth.users where id=v_uid;
  select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'order_id',n.order_id,'template_key',n.template_key,'subject',n.subject,'body',n.body,'status',n.status,'created_at',n.created_at,'read_at',n.read_at) order by n.created_at desc),'[]'::jsonb)
  into v_result from public.academy_notifications n where n.audience='student' and (n.user_id=v_uid or lower(n.recipient_email)=v_email) and n.available_at<=now();
  return v_result;
end;
$$;

create or replace function public.ghc_student_mark_academy_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = 'public','auth'
as $$
declare v_uid uuid:=auth.uid(); v_email text;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  select lower(email) into v_email from auth.users where id=v_uid;
  update public.academy_notifications set status=case when status='pending' then 'read' else status end,read_at=coalesce(read_at,now())
  where id=p_notification_id and audience='student' and (user_id=v_uid or lower(recipient_email)=v_email);
  return found;
end;
$$;

revoke execute on function private.ghc_installment_count_limit(integer) from public, anon, authenticated;
revoke execute on function private.ghc_apply_academy_order_state(uuid,text) from public, anon, authenticated;

revoke execute on function public.ghc_public_get_course_payment_options(text) from public, authenticated;
grant execute on function public.ghc_public_get_course_payment_options(text) to anon;

revoke execute on function public.ghc_student_prepare_academy_order(uuid,integer,boolean,text,boolean,boolean,text,text) from public, anon;
grant execute on function public.ghc_student_prepare_academy_order(uuid,integer,boolean,text,boolean,boolean,text,text) to authenticated;
revoke execute on function public.ghc_student_list_academy_notifications() from public, anon;
grant execute on function public.ghc_student_list_academy_notifications() to authenticated;
revoke execute on function public.ghc_student_mark_academy_notification_read(uuid) from public, anon;
grant execute on function public.ghc_student_mark_academy_notification_read(uuid) to authenticated;

revoke execute on function public.ghc_admin_mark_academy_installment_paid(uuid,timestamptz,text) from public, anon;
grant execute on function public.ghc_admin_mark_academy_installment_paid(uuid,timestamptz,text) to authenticated;
revoke execute on function public.ghc_admin_extend_academy_order(uuid,integer,text) from public, anon;
grant execute on function public.ghc_admin_extend_academy_order(uuid,integer,text) to authenticated;
revoke execute on function public.ghc_admin_override_academy_access(uuid,integer,boolean,text) from public, anon;
grant execute on function public.ghc_admin_override_academy_access(uuid,integer,boolean,text) to authenticated;
revoke execute on function public.ghc_admin_release_academy_access_override(uuid,text) from public, anon;
grant execute on function public.ghc_admin_release_academy_access_override(uuid,text) to authenticated;
revoke execute on function public.ghc_admin_list_academy_orders() from public, anon;
grant execute on function public.ghc_admin_list_academy_orders() to authenticated;
