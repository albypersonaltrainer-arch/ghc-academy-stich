create table if not exists public.academy_security_sessions (
  session_id uuid primary key,
  user_id uuid not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  auth_created_at timestamptz,
  auth_refreshed_at timestamp,
  not_after timestamptz,
  ip inet,
  user_agent text,
  aal text,
  last_course_id uuid,
  last_lesson_id uuid
);

create index if not exists academy_security_sessions_user_last_seen_idx
  on public.academy_security_sessions(user_id, last_seen_at desc);

alter table public.academy_security_sessions enable row level security;
revoke all on table public.academy_security_sessions from public, anon, authenticated;

create table if not exists public.academy_security_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid,
  session_id uuid,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','low','medium','high','critical')),
  object_type text,
  object_id text,
  source text not null default 'database',
  details jsonb not null default '{}'::jsonb
);

create index if not exists academy_security_events_occurred_idx
  on public.academy_security_events(occurred_at desc);
create index if not exists academy_security_events_actor_idx
  on public.academy_security_events(actor_user_id, occurred_at desc);
create index if not exists academy_security_events_type_idx
  on public.academy_security_events(event_type, occurred_at desc);

alter table public.academy_security_events enable row level security;
revoke all on table public.academy_security_events from public, anon, authenticated;

create or replace function public.ghc_student_touch_security_session(
  p_course_id uuid default null,
  p_lesson_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_auth_session auth.sessions%rowtype;
  v_concurrent integer := 0;
  v_recent_event boolean := false;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  begin
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception when others then
    v_session_id := null;
  end;

  if v_session_id is null then
    return jsonb_build_object('tracked', false, 'reason', 'session_id_unavailable');
  end if;

  select * into v_auth_session
  from auth.sessions s
  where s.id = v_session_id and s.user_id = v_user_id
  limit 1;

  if v_auth_session.id is null then
    return jsonb_build_object('tracked', false, 'reason', 'auth_session_not_found');
  end if;

  insert into public.academy_security_sessions (
    session_id, user_id, first_seen_at, last_seen_at,
    auth_created_at, auth_refreshed_at, not_after,
    ip, user_agent, aal, last_course_id, last_lesson_id
  ) values (
    v_auth_session.id, v_user_id, now(), now(),
    v_auth_session.created_at, v_auth_session.refreshed_at, v_auth_session.not_after,
    v_auth_session.ip, left(coalesce(v_auth_session.user_agent, ''), 500), v_auth_session.aal::text,
    p_course_id, p_lesson_id
  )
  on conflict (session_id) do update set
    last_seen_at = excluded.last_seen_at,
    auth_refreshed_at = excluded.auth_refreshed_at,
    not_after = excluded.not_after,
    ip = excluded.ip,
    user_agent = excluded.user_agent,
    aal = excluded.aal,
    last_course_id = coalesce(excluded.last_course_id, academy_security_sessions.last_course_id),
    last_lesson_id = coalesce(excluded.last_lesson_id, academy_security_sessions.last_lesson_id);

  select count(*)::integer into v_concurrent
  from public.academy_security_sessions s
  where s.user_id = v_user_id
    and s.last_seen_at >= now() - interval '30 minutes'
    and (s.not_after is null or s.not_after > now());

  if v_concurrent >= 3 then
    select exists (
      select 1 from public.academy_security_events e
      where e.actor_user_id = v_user_id
        and e.event_type = 'academy.concurrent_sessions_detected'
        and e.occurred_at >= now() - interval '1 hour'
    ) into v_recent_event;

    if not v_recent_event then
      insert into public.academy_security_events(
        actor_user_id, session_id, event_type, severity, object_type, object_id, source, details
      ) values (
        v_user_id, v_session_id, 'academy.concurrent_sessions_detected', 'medium',
        'user', v_user_id::text, 'session_guard',
        jsonb_build_object('active_sessions_30m', v_concurrent)
      );
    end if;
  end if;

  return jsonb_build_object(
    'tracked', true,
    'session_id', v_session_id,
    'active_sessions_30m', v_concurrent,
    'review_recommended', v_concurrent >= 3
  );
end;
$$;

revoke all on function public.ghc_student_touch_security_session(uuid, uuid) from public, anon;
grant execute on function public.ghc_student_touch_security_session(uuid, uuid) to authenticated;

create schema if not exists private;

create or replace function private.ghc_academy_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row jsonb;
  v_old jsonb;
  v_actor uuid := auth.uid();
  v_session uuid;
  v_object_id text;
  v_severity text := 'info';
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;

  begin
    v_session := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception when others then
    v_session := null;
  end;

  v_object_id := coalesce(v_row ->> 'id', v_row ->> 'user_id', v_row ->> 'course_id', 'unknown');

  if tg_table_name = 'profiles' then
    v_severity := 'high';
  elsif tg_table_name in ('course_access','academy_installments','academy_orders','academy_refund_requests','certificates') then
    v_severity := 'medium';
  end if;

  insert into public.academy_security_events(
    actor_user_id, session_id, event_type, severity, object_type, object_id, source, details
  ) values (
    v_actor,
    v_session,
    'academy.audit.' || tg_table_name || '.' || lower(tg_op),
    v_severity,
    tg_table_name,
    v_object_id,
    'db_trigger',
    jsonb_strip_nulls(jsonb_build_object(
      'operation', tg_op,
      'status', v_row ->> 'status',
      'old_status', v_old ->> 'status',
      'role', v_row ->> 'role',
      'old_role', v_old ->> 'role',
      'user_id', v_row ->> 'user_id',
      'course_id', v_row ->> 'course_id',
      'module_id', v_row ->> 'module_id',
      'lesson_id', v_row ->> 'lesson_id',
      'order_id', v_row ->> 'order_id',
      'installment_no', v_row ->> 'installment_no'
    ))
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.ghc_academy_audit_change() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'courses','modules','lessons','exams','certificates','course_access',
    'academy_orders','academy_installments','academy_refund_requests',
    'academy_course_commercial_settings','lesson_media_assets'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists ghc_security_audit_%I on public.%I', t, t);
      execute format(
        'create trigger ghc_security_audit_%I after insert or update or delete on public.%I for each row execute function private.ghc_academy_audit_change()',
        t, t
      );
    end if;
  end loop;
end $$;

drop trigger if exists ghc_security_audit_profile_role on public.profiles;
create trigger ghc_security_audit_profile_role
after insert or update of role on public.profiles
for each row execute function private.ghc_academy_audit_change();

create or replace function public.ghc_admin_get_security_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.ghc_is_admin() then
    raise exception 'No autorizado.';
  end if;

  select jsonb_build_object(
    'active_sessions_30m', (
      select count(*) from public.academy_security_sessions s
      where s.last_seen_at >= now() - interval '30 minutes'
        and (s.not_after is null or s.not_after > now())
    ),
    'users_with_3plus_sessions_30m', (
      select count(*) from (
        select user_id from public.academy_security_sessions s
        where s.last_seen_at >= now() - interval '30 minutes'
          and (s.not_after is null or s.not_after > now())
        group by user_id having count(*) >= 3
      ) x
    ),
    'security_events_24h', (
      select count(*) from public.academy_security_events e
      where e.occurred_at >= now() - interval '24 hours'
    ),
    'high_or_critical_events_24h', (
      select count(*) from public.academy_security_events e
      where e.occurred_at >= now() - interval '24 hours'
        and e.severity in ('high','critical')
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.ghc_admin_get_security_overview() from public, anon;
grant execute on function public.ghc_admin_get_security_overview() to authenticated;

create or replace function public.ghc_admin_list_security_events(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit,100), 500));
  v_result jsonb;
begin
  if not public.ghc_is_admin() then
    raise exception 'No autorizado.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.occurred_at desc), '[]'::jsonb)
  into v_result
  from (
    select e.id, e.occurred_at, e.actor_user_id, e.session_id, e.event_type,
           e.severity, e.object_type, e.object_id, e.source, e.details
    from public.academy_security_events e
    order by e.occurred_at desc
    limit v_limit
  ) x;

  return v_result;
end;
$$;

revoke all on function public.ghc_admin_list_security_events(integer) from public, anon;
grant execute on function public.ghc_admin_list_security_events(integer) to authenticated;

create or replace function public.ghc_admin_list_security_sessions(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit,100), 500));
  v_result jsonb;
begin
  if not public.ghc_is_admin() then
    raise exception 'No autorizado.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.last_seen_at desc), '[]'::jsonb)
  into v_result
  from (
    select s.session_id, s.user_id, s.first_seen_at, s.last_seen_at, s.not_after,
           s.ip::text as ip, s.user_agent, s.aal, s.last_course_id, s.last_lesson_id
    from public.academy_security_sessions s
    order by s.last_seen_at desc
    limit v_limit
  ) x;

  return v_result;
end;
$$;

revoke all on function public.ghc_admin_list_security_sessions(integer) from public, anon;
grant execute on function public.ghc_admin_list_security_sessions(integer) to authenticated;
