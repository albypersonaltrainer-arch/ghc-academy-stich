create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null, category text not null default 'general', status text not null default 'open', priority text not null default 'normal',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_message_at timestamptz not null default now(),
  resolved_at timestamptz null, closed_at timestamptz null,
  constraint support_tickets_category_check check(category in('general','tecnico','contenido','acceso','pagos')),
  constraint support_tickets_status_check check(status in('open','in_progress','waiting_user','resolved','closed')),
  constraint support_tickets_priority_check check(priority in('normal','high','urgent'))
);
create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade, sender_role text not null, body text not null, created_at timestamptz not null default now(),
  constraint support_ticket_messages_sender_role_check check(sender_role in('student','admin')),
  constraint support_ticket_messages_body_check check(char_length(trim(body)) between 1 and 8000)
);
create index if not exists support_tickets_user_idx on public.support_tickets(user_id,updated_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets(status,last_message_at desc);
create index if not exists support_messages_ticket_idx on public.support_ticket_messages(ticket_id,created_at);
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
drop policy if exists "Students read own support tickets" on public.support_tickets;
create policy "Students read own support tickets" on public.support_tickets for select to authenticated using(user_id=auth.uid() or public.ghc_is_admin());
drop policy if exists "GHC admins manage support tickets" on public.support_tickets;
create policy "GHC admins manage support tickets" on public.support_tickets for all to authenticated using(public.ghc_is_admin()) with check(public.ghc_is_admin());
drop policy if exists "Students read own support messages" on public.support_ticket_messages;
create policy "Students read own support messages" on public.support_ticket_messages for select to authenticated using(exists(select 1 from public.support_tickets t where t.id=support_ticket_messages.ticket_id and(t.user_id=auth.uid() or public.ghc_is_admin())));
drop policy if exists "GHC admins manage support messages" on public.support_ticket_messages;
create policy "GHC admins manage support messages" on public.support_ticket_messages for all to authenticated using(public.ghc_is_admin()) with check(public.ghc_is_admin());

create or replace function public.ghc_student_list_support_tickets()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare v_user uuid:=auth.uid(); v_result jsonb;
begin
  if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'subject',t.subject,'category',t.category,'status',t.status,'priority',t.priority,'created_at',t.created_at,'updated_at',t.updated_at,'last_message_at',t.last_message_at,'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'sender_role',m.sender_role,'body',m.body,'created_at',m.created_at) order by m.created_at) from public.support_ticket_messages m where m.ticket_id=t.id),'[]'::jsonb)) order by t.last_message_at desc),'[]'::jsonb) into v_result from public.support_tickets t where t.user_id=v_user;
  return v_result;
end$$;
grant execute on function public.ghc_student_list_support_tickets() to authenticated; revoke execute on function public.ghc_student_list_support_tickets() from anon;

create or replace function public.ghc_student_create_support_ticket(p_subject text,p_category text,p_message text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_user uuid:=auth.uid(); v_ticket public.support_tickets; v_category text;
begin
  if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
  if char_length(trim(coalesce(p_subject,''))) not between 4 and 160 then raise exception 'El asunto debe tener entre 4 y 160 caracteres.'; end if;
  if char_length(trim(coalesce(p_message,''))) not between 1 and 8000 then raise exception 'El mensaje no es válido.'; end if;
  v_category:=lower(trim(coalesce(p_category,'general'))); if v_category not in('general','tecnico','contenido','acceso','pagos') then v_category:='general'; end if;
  insert into public.support_tickets(user_id,subject,category,status,priority,created_at,updated_at,last_message_at) values(v_user,trim(p_subject),v_category,'open','normal',now(),now(),now()) returning * into v_ticket;
  insert into public.support_ticket_messages(ticket_id,sender_user_id,sender_role,body,created_at) values(v_ticket.id,v_user,'student',trim(p_message),now());
  return jsonb_build_object('id',v_ticket.id,'status',v_ticket.status,'subject',v_ticket.subject,'category',v_ticket.category,'created_at',v_ticket.created_at);
end$$;
grant execute on function public.ghc_student_create_support_ticket(text,text,text) to authenticated; revoke execute on function public.ghc_student_create_support_ticket(text,text,text) from anon;

create or replace function public.ghc_student_reply_support_ticket(p_ticket_id uuid,p_message text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_user uuid:=auth.uid(); v_ticket public.support_tickets;
begin
  if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
  if char_length(trim(coalesce(p_message,''))) not between 1 and 8000 then raise exception 'El mensaje no es válido.'; end if;
  select * into v_ticket from public.support_tickets where id=p_ticket_id and user_id=v_user for update;
  if v_ticket.id is null then raise exception 'Ticket no encontrado.'; end if; if v_ticket.status='closed' then raise exception 'El ticket está cerrado.'; end if;
  insert into public.support_ticket_messages(ticket_id,sender_user_id,sender_role,body,created_at) values(v_ticket.id,v_user,'student',trim(p_message),now());
  update public.support_tickets set status=case when status in('resolved','waiting_user') then 'open' else status end,updated_at=now(),last_message_at=now(),resolved_at=null where id=v_ticket.id;
  return jsonb_build_object('ticket_id',v_ticket.id,'ok',true);
end$$;
grant execute on function public.ghc_student_reply_support_ticket(uuid,text) to authenticated; revoke execute on function public.ghc_student_reply_support_ticket(uuid,text) from anon;

create or replace function public.ghc_admin_list_support_tickets()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare v_result jsonb;
begin
  if not public.ghc_is_admin() then raise exception 'Acceso administrativo requerido.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'user_id',t.user_id,'email',(select u.email from auth.users u where u.id=t.user_id),'name',(select p.full_name from public.profiles p where p.id=t.user_id),'subject',t.subject,'category',t.category,'status',t.status,'priority',t.priority,'created_at',t.created_at,'updated_at',t.updated_at,'last_message_at',t.last_message_at,'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'sender_role',m.sender_role,'body',m.body,'created_at',m.created_at) order by m.created_at) from public.support_ticket_messages m where m.ticket_id=t.id),'[]'::jsonb)) order by case t.status when 'open' then 1 when 'in_progress' then 2 when 'waiting_user' then 3 when 'resolved' then 4 else 5 end,t.last_message_at desc),'[]'::jsonb) into v_result from public.support_tickets t;
  return v_result;
end$$;
grant execute on function public.ghc_admin_list_support_tickets() to authenticated; revoke execute on function public.ghc_admin_list_support_tickets() from anon;

create or replace function public.ghc_admin_reply_support_ticket(p_ticket_id uuid,p_message text,p_status text default 'waiting_user')
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_ticket public.support_tickets; v_status text;
begin
  if not public.ghc_is_admin() then raise exception 'Acceso administrativo requerido.'; end if;
  if char_length(trim(coalesce(p_message,''))) not between 1 and 8000 then raise exception 'El mensaje no es válido.'; end if;
  v_status:=lower(trim(coalesce(p_status,'waiting_user'))); if v_status not in('open','in_progress','waiting_user','resolved','closed') then raise exception 'Estado no válido.'; end if;
  select * into v_ticket from public.support_tickets where id=p_ticket_id for update; if v_ticket.id is null then raise exception 'Ticket no encontrado.'; end if;
  insert into public.support_ticket_messages(ticket_id,sender_user_id,sender_role,body,created_at) values(v_ticket.id,auth.uid(),'admin',trim(p_message),now());
  update public.support_tickets set status=v_status,updated_at=now(),last_message_at=now(),resolved_at=case when v_status='resolved' then now() else null end,closed_at=case when v_status='closed' then now() else null end where id=v_ticket.id;
  return jsonb_build_object('ticket_id',v_ticket.id,'status',v_status,'ok',true);
end$$;
grant execute on function public.ghc_admin_reply_support_ticket(uuid,text,text) to authenticated; revoke execute on function public.ghc_admin_reply_support_ticket(uuid,text,text) from anon;

create or replace function public.ghc_admin_update_support_ticket(p_ticket_id uuid,p_status text,p_priority text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_status text:=lower(trim(coalesce(p_status,''))); v_priority text:=lower(trim(coalesce(p_priority,'')));
begin
  if not public.ghc_is_admin() then raise exception 'Acceso administrativo requerido.'; end if;
  if v_status not in('open','in_progress','waiting_user','resolved','closed') then raise exception 'Estado no válido.'; end if;
  if v_priority<>'' and v_priority not in('normal','high','urgent') then raise exception 'Prioridad no válida.'; end if;
  update public.support_tickets set status=v_status,priority=case when v_priority='' then priority else v_priority end,resolved_at=case when v_status='resolved' then coalesce(resolved_at,now()) else null end,closed_at=case when v_status='closed' then coalesce(closed_at,now()) else null end,updated_at=now() where id=p_ticket_id;
  if not found then raise exception 'Ticket no encontrado.'; end if;
  return jsonb_build_object('ticket_id',p_ticket_id,'status',v_status,'priority',case when v_priority='' then null else v_priority end,'ok',true);
end$$;
grant execute on function public.ghc_admin_update_support_ticket(uuid,text,text) to authenticated; revoke execute on function public.ghc_admin_update_support_ticket(uuid,text,text) from anon;
