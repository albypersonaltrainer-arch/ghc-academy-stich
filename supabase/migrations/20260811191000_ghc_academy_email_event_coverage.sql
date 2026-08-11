create or replace function private.ghc_prepare_academy_notification_email_state()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
begin
  if new.channel in ('email','in_app_email') and nullif(trim(coalesce(new.recipient_email,'')),'') is not null then
    if coalesce(new.email_status,'not_applicable')='not_applicable' then
      new.email_status:='pending';
      new.email_next_attempt_at:=coalesce(new.email_next_attempt_at,new.available_at,now());
    end if;
  else
    new.email_status:='not_applicable';
    new.email_next_attempt_at:=null;
  end if;
  return new;
end;
$$;

drop trigger if exists ghc_prepare_academy_notification_email_state_before on public.academy_notifications;
create trigger ghc_prepare_academy_notification_email_state_before
before insert on public.academy_notifications
for each row execute function private.ghc_prepare_academy_notification_email_state();

create or replace function private.ghc_notify_certificate_email_events()
returns trigger
language plpgsql
security definer
set search_path='public','auth'
as $$
declare v_email text; v_course_title text;
begin
  select lower(email) into v_email from auth.users where id=new.user_id;
  v_email:=coalesce(nullif(lower(trim(coalesce(new.student_email,''))),''),v_email);
  v_course_title:=coalesce(nullif(trim(coalesce(new.course_title_snapshot,'')),''),nullif(trim(coalesce(new.course_title,'')),''),'tu formación');
  if (tg_op='INSERT' and new.status='valid') or (tg_op='UPDATE' and old.status is distinct from new.status and new.status='valid') then
    insert into public.academy_notifications(audience,user_id,recipient_email,channel,template_key,subject,body,dedupe_key,metadata)
    values('student',new.user_id,v_email,'in_app_email','certificate_issued','Tu certificado de GHC Academy ya está disponible',format('Has completado los requisitos de %s. Tu certificado ya está disponible en GHC Academy y puede verificarse públicamente con su código de verificación.',v_course_title),format('certificate:%s:issued',new.id),jsonb_build_object('certificate_id',new.id,'course_id',new.course_id,'verification_slug',new.verification_slug,'certificate_code',new.certificate_code)) on conflict(dedupe_key) do nothing;
  elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status='revoked' then
    insert into public.academy_notifications(audience,user_id,recipient_email,channel,template_key,subject,body,dedupe_key,metadata)
    values('student',new.user_id,v_email,'in_app_email','certificate_revoked','Actualización sobre tu certificado de GHC Academy',format('El certificado asociado a %s ha sido revocado. Motivo: %s. Si necesitas aclaraciones, contacta con soporte de GHC Academy.',v_course_title,coalesce(nullif(trim(new.revoked_reason),''),'revisión administrativa')),format('certificate:%s:revoked',new.id),jsonb_build_object('certificate_id',new.id,'course_id',new.course_id,'revoked_reason',new.revoked_reason)) on conflict(dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ghc_notify_certificate_email_events_after on public.certificates;
create trigger ghc_notify_certificate_email_events_after
after insert or update of status on public.certificates
for each row execute function private.ghc_notify_certificate_email_events();

create or replace function private.ghc_notify_support_ticket_events()
returns trigger
language plpgsql
security definer
set search_path='public','auth'
as $$
declare v_email text;
begin
  select lower(email) into v_email from auth.users where id=new.user_id;
  if tg_op='INSERT' then
    insert into public.academy_notifications(audience,user_id,recipient_email,channel,template_key,subject,body,dedupe_key,metadata)
    values('student',new.user_id,v_email,'in_app_email','support_ticket_created','Hemos recibido tu consulta en GHC Academy',format('Tu consulta "%s" ha quedado registrada. Puedes seguir su estado y las respuestas desde el área de soporte de GHC Academy.',new.subject),format('support-ticket:%s:created:student',new.id),jsonb_build_object('ticket_id',new.id,'category',new.category)) on conflict(dedupe_key) do nothing;
    insert into public.academy_notifications(audience,channel,template_key,subject,body,dedupe_key,metadata)
    values('admin','in_app','support_ticket_created_admin','Nueva consulta de soporte en GHC Academy',format('Se ha abierto una nueva consulta: %s.',new.subject),format('support-ticket:%s:created:admin',new.id),jsonb_build_object('ticket_id',new.id,'user_id',new.user_id,'category',new.category)) on conflict(dedupe_key) do nothing;
  elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status in ('resolved','closed') then
    insert into public.academy_notifications(audience,user_id,recipient_email,channel,template_key,subject,body,dedupe_key,metadata)
    values('student',new.user_id,v_email,'in_app_email','support_ticket_status_changed','Tu consulta de soporte ha sido actualizada',format('La consulta "%s" ahora figura como %s. Puedes revisar el historial completo desde el área de soporte.',new.subject,new.status),format('support-ticket:%s:status:%s',new.id,new.status),jsonb_build_object('ticket_id',new.id,'status',new.status)) on conflict(dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ghc_notify_support_ticket_events_after on public.support_tickets;
create trigger ghc_notify_support_ticket_events_after
after insert or update of status on public.support_tickets
for each row execute function private.ghc_notify_support_ticket_events();

create or replace function private.ghc_notify_support_reply_email()
returns trigger
language plpgsql
security definer
set search_path='public','auth'
as $$
declare v_ticket public.support_tickets; v_email text;
begin
  if lower(coalesce(new.sender_role,''))<>'admin' then return new; end if;
  select * into v_ticket from public.support_tickets where id=new.ticket_id;
  if v_ticket.id is null then return new; end if;
  select lower(email) into v_email from auth.users where id=v_ticket.user_id;
  insert into public.academy_notifications(audience,user_id,recipient_email,channel,template_key,subject,body,dedupe_key,metadata)
  values('student',v_ticket.user_id,v_email,'in_app_email','support_reply_received','Tienes una nueva respuesta de soporte en GHC Academy',format('Hemos respondido a tu consulta "%s". Entra en el área de soporte para leer la respuesta completa.',v_ticket.subject),format('support-message:%s:student',new.id),jsonb_build_object('ticket_id',v_ticket.id,'message_id',new.id)) on conflict(dedupe_key) do nothing;
  return new;
end;
$$;

drop trigger if exists ghc_notify_support_reply_email_after on public.support_ticket_messages;
create trigger ghc_notify_support_reply_email_after
after insert on public.support_ticket_messages
for each row execute function private.ghc_notify_support_reply_email();

revoke execute on function private.ghc_prepare_academy_notification_email_state() from public,anon,authenticated;
revoke execute on function private.ghc_notify_certificate_email_events() from public,anon,authenticated;
revoke execute on function private.ghc_notify_support_ticket_events() from public,anon,authenticated;
revoke execute on function private.ghc_notify_support_reply_email() from public,anon,authenticated;
