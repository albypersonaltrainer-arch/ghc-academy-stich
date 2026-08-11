create or replace function public.ghc_admin_list_academy_notifications(p_limit integer default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',x.id,'order_id',x.order_id,'template_key',x.template_key,'subject',x.subject,'body',x.body,
    'status',x.status,'created_at',x.created_at,'read_at',x.read_at,'metadata',x.metadata
  ) order by x.created_at desc),'[]'::jsonb)
  into v_result
  from (
    select n.* from public.academy_notifications n
    where n.audience='admin' and n.available_at<=now()
    order by n.created_at desc
    limit greatest(1,least(coalesce(p_limit,100),500))
  ) x;
  return v_result;
end;
$$;

create or replace function public.ghc_admin_mark_academy_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public'
as $$
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  update public.academy_notifications
  set status=case when status='pending' then 'read' else status end,
      read_at=coalesce(read_at,now())
  where id=p_notification_id and audience='admin';
  return found;
end;
$$;

revoke execute on function public.ghc_admin_list_academy_notifications(integer) from public,anon;
grant execute on function public.ghc_admin_list_academy_notifications(integer) to authenticated;
revoke execute on function public.ghc_admin_mark_academy_notification_read(uuid) from public,anon;
grant execute on function public.ghc_admin_mark_academy_notification_read(uuid) to authenticated;
