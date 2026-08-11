alter table public.academy_notifications
  add column if not exists email_status text not null default 'not_applicable',
  add column if not exists email_attempt_count integer not null default 0,
  add column if not exists email_next_attempt_at timestamptz,
  add column if not exists email_locked_at timestamptz,
  add column if not exists email_last_error text,
  add column if not exists email_provider text not null default 'unassigned',
  add column if not exists email_provider_message_id text,
  add column if not exists email_sent_at timestamptz;

alter table public.academy_notifications drop constraint if exists academy_notifications_email_status_check;
alter table public.academy_notifications add constraint academy_notifications_email_status_check
  check (email_status in ('not_applicable','pending','processing','sent','failed','skipped'));
alter table public.academy_notifications drop constraint if exists academy_notifications_email_attempt_count_check;
alter table public.academy_notifications add constraint academy_notifications_email_attempt_count_check
  check (email_attempt_count >= 0);

update public.academy_notifications
set email_status = case
  when channel in ('email','in_app_email') and nullif(trim(coalesce(recipient_email,'')),'') is not null then 'pending'
  else 'not_applicable'
end
where email_status='not_applicable' and email_attempt_count=0 and email_sent_at is null;

create index if not exists academy_notifications_email_delivery_idx
  on public.academy_notifications(email_status, available_at, email_next_attempt_at)
  where channel in ('email','in_app_email') and email_status in ('pending','processing','failed');

create index if not exists academy_commercial_events_order_id_idx on public.academy_commercial_events(order_id);
create index if not exists academy_contract_confirmations_user_id_idx on public.academy_contract_confirmations(user_id);
create index if not exists academy_legal_acceptances_user_id_idx on public.academy_legal_acceptances(user_id);
create index if not exists academy_notifications_order_id_idx on public.academy_notifications(order_id);
create index if not exists academy_orders_course_id_idx on public.academy_orders(course_id);
create index if not exists academy_orders_policy_id_idx on public.academy_orders(policy_id);
create index if not exists academy_refund_requests_order_id_idx on public.academy_refund_requests(order_id);
create index if not exists academy_refund_requests_user_id_idx on public.academy_refund_requests(user_id);
create index if not exists course_access_commercial_order_id_idx on public.course_access(commercial_order_id);

create or replace function public.ghc_email_worker_claim_academy_notifications(
  p_limit integer default 25,
  p_stale_lock_minutes integer default 10
)
returns setof public.academy_notifications
language plpgsql
security definer
set search_path='public','auth'
as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'No autorizado.'; end if;
  return query
  with candidates as (
    select n.id
    from public.academy_notifications n
    where n.channel in ('email','in_app_email')
      and nullif(trim(coalesce(n.recipient_email,'')),'') is not null
      and n.available_at <= now()
      and n.email_attempt_count < 8
      and (
        (n.email_status in ('pending','failed') and coalesce(n.email_next_attempt_at,n.available_at) <= now())
        or (n.email_status='processing' and n.email_locked_at is not null and n.email_locked_at < now()-make_interval(mins=>greatest(1,least(coalesce(p_stale_lock_minutes,10),120))))
      )
    order by n.available_at,n.created_at,n.id
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,25),100))
  )
  update public.academy_notifications n
  set email_status='processing',email_locked_at=now(),email_attempt_count=n.email_attempt_count+1,email_last_error=null
  from candidates c where n.id=c.id
  returning n.*;
end;
$$;

create or replace function public.ghc_email_worker_mark_academy_sent(p_notification_id uuid,p_provider text,p_provider_message_id text default null)
returns boolean language plpgsql security definer set search_path='public','auth' as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'No autorizado.'; end if;
  update public.academy_notifications
  set email_status='sent',email_sent_at=now(),email_locked_at=null,email_next_attempt_at=null,email_last_error=null,
      email_provider=coalesce(nullif(trim(p_provider),''),'unassigned'),email_provider_message_id=nullif(trim(coalesce(p_provider_message_id,'')),'')
  where id=p_notification_id and email_status='processing';
  return found;
end;
$$;

create or replace function public.ghc_email_worker_mark_academy_failed(p_notification_id uuid,p_error text,p_retry_after_seconds integer default null)
returns boolean language plpgsql security definer set search_path='public','auth' as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'No autorizado.'; end if;
  update public.academy_notifications n
  set email_status='failed',email_locked_at=null,email_last_error=left(coalesce(nullif(trim(p_error),''),'Error de entrega no especificado'),2000),
      email_next_attempt_at=case when n.email_attempt_count>=8 then null else now()+make_interval(secs=>case
        when p_retry_after_seconds is not null then greatest(60,least(p_retry_after_seconds,86400))
        else least(3600,(power(2,least(n.email_attempt_count,6))*60)::integer) end) end
  where n.id=p_notification_id and n.email_status='processing';
  return found;
end;
$$;

create or replace function public.ghc_email_worker_skip_academy_notification(p_notification_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path='public','auth' as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'No autorizado.'; end if;
  update public.academy_notifications
  set email_status='skipped',email_locked_at=null,email_next_attempt_at=null,
      email_last_error=left(coalesce(nullif(trim(p_reason),''),'Omitido por el worker'),2000)
  where id=p_notification_id and email_status in ('pending','processing','failed');
  return found;
end;
$$;

revoke all on function public.ghc_email_worker_claim_academy_notifications(integer,integer) from public,anon,authenticated;
revoke all on function public.ghc_email_worker_mark_academy_sent(uuid,text,text) from public,anon,authenticated;
revoke all on function public.ghc_email_worker_mark_academy_failed(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.ghc_email_worker_skip_academy_notification(uuid,text) from public,anon,authenticated;
grant execute on function public.ghc_email_worker_claim_academy_notifications(integer,integer) to service_role;
grant execute on function public.ghc_email_worker_mark_academy_sent(uuid,text,text) to service_role;
grant execute on function public.ghc_email_worker_mark_academy_failed(uuid,text,integer) to service_role;
grant execute on function public.ghc_email_worker_skip_academy_notification(uuid,text) to service_role;
