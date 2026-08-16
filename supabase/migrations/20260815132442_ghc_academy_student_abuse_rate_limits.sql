create or replace function private.ghc_academy_student_abuse_guard()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer := 0;
  v_action text := '';
  v_limit integer := 0;
  v_window interval;
begin
  if v_uid is null then return new; end if;

  if tg_table_name = 'support_tickets' then
    if new.user_id is distinct from v_uid then return new; end if;
    v_action := 'support_ticket_create'; v_limit := 5; v_window := interval '10 minutes';
    perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || v_action, 0));
    select count(*)::integer into v_count from public.support_tickets t
      where t.user_id = v_uid and t.created_at >= now() - v_window;

  elsif tg_table_name = 'support_ticket_messages' then
    if coalesce(new.sender_role,'') <> 'student' or new.sender_user_id is distinct from v_uid then return new; end if;
    v_action := 'support_ticket_reply'; v_limit := 20; v_window := interval '10 minutes';
    perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || v_action, 0));
    select count(*)::integer into v_count from public.support_ticket_messages m
      where m.sender_user_id = v_uid and m.sender_role = 'student' and m.created_at >= now() - v_window;

  elsif tg_table_name = 'academy_refund_requests' then
    if new.user_id is distinct from v_uid then return new; end if;
    v_action := 'academy_refund_request'; v_limit := 5; v_window := interval '1 hour';
    perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || v_action, 0));
    select count(*)::integer into v_count from public.academy_refund_requests r
      where r.user_id = v_uid and r.created_at >= now() - v_window;

  elsif tg_table_name = 'academy_orders' then
    if new.user_id is distinct from v_uid then return new; end if;
    v_action := 'academy_order_create'; v_limit := 5; v_window := interval '10 minutes';
    perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || v_action, 0));
    select count(*)::integer into v_count from public.academy_orders o
      where o.user_id = v_uid and o.created_at >= now() - v_window;
  else
    return new;
  end if;

  if v_count >= v_limit then
    raise exception 'Demasiadas solicitudes. Espera unos minutos antes de volver a intentarlo.'
      using errcode = 'P0001', detail = format('GHC_RATE_LIMIT:%s:%s:%s', v_action, v_limit, extract(epoch from v_window)::integer);
  end if;

  return new;
end;
$$;

revoke all on function private.ghc_academy_student_abuse_guard() from public, anon, authenticated;

drop trigger if exists ghc_rate_limit_support_tickets on public.support_tickets;
create trigger ghc_rate_limit_support_tickets before insert on public.support_tickets
for each row execute function private.ghc_academy_student_abuse_guard();

drop trigger if exists ghc_rate_limit_support_ticket_messages on public.support_ticket_messages;
create trigger ghc_rate_limit_support_ticket_messages before insert on public.support_ticket_messages
for each row execute function private.ghc_academy_student_abuse_guard();

drop trigger if exists ghc_rate_limit_academy_refunds on public.academy_refund_requests;
create trigger ghc_rate_limit_academy_refunds before insert on public.academy_refund_requests
for each row execute function private.ghc_academy_student_abuse_guard();

drop trigger if exists ghc_rate_limit_academy_orders on public.academy_orders;
create trigger ghc_rate_limit_academy_orders before insert on public.academy_orders
for each row execute function private.ghc_academy_student_abuse_guard();

create or replace function public.ghc_student_check_academy_checkout_rate_limit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer := 0;
  v_oldest timestamptz;
  v_retry integer := 0;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;

  select count(*)::integer, min(a.created_at)
    into v_count, v_oldest
  from public.academy_payment_attempts a
  join public.academy_orders o on o.id = a.order_id
  where o.user_id = v_uid
    and a.provider = 'sumup'
    and a.created_at >= now() - interval '10 minutes';

  if v_count >= 8 and v_oldest is not null then
    v_retry := greatest(1, ceil(extract(epoch from ((v_oldest + interval '10 minutes') - now())))::integer);
    return jsonb_build_object(
      'allowed', false,
      'action', 'academy_sumup_checkout',
      'limit', 8,
      'window_seconds', 600,
      'current_count', v_count,
      'retry_after_seconds', v_retry
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'action', 'academy_sumup_checkout',
    'limit', 8,
    'window_seconds', 600,
    'current_count', v_count,
    'retry_after_seconds', 0
  );
end;
$$;

revoke all on function public.ghc_student_check_academy_checkout_rate_limit() from public, anon;
grant execute on function public.ghc_student_check_academy_checkout_rate_limit() to authenticated;