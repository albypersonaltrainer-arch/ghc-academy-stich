create extension if not exists pg_cron with schema pg_catalog;

create or replace function private.ghc_run_academy_commercial_automation(p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = 'public','private','auth'
as $$
declare
  v_policy public.academy_commercial_policies;
  v_i record;
  v_o public.academy_orders;
  v_before integer;
  v_over integer;
  v_processed integer:=0;
  v_cancelled integer:=0;
  v_notices integer:=0;
  v_limit integer;
begin
  select * into v_policy from public.academy_commercial_policies
  where status='active' and effective_from<=p_now and (effective_to is null or effective_to>p_now)
  order by effective_from desc limit 1;
  if v_policy.id is null then raise exception 'No hay política comercial activa.'; end if;

  for v_o in select * from public.academy_orders
    where status not in ('completed','cancelled','refunded','chargeback')
      and collection_paused=false
  loop
    if v_o.status='waiting_withdrawal' and v_o.access_start_at is not null and p_now>=v_o.access_start_at then
      perform private.ghc_apply_academy_order_state(v_o.id,'cron');
      insert into public.academy_notifications(order_id,audience,user_id,recipient_email,template_key,subject,body,dedupe_key)
      values(v_o.id,'student',v_o.user_id,v_o.email_normalized,'access_started_after_withdrawal','Tu acceso a GHC Academy ya está disponible',
        'Ha finalizado el plazo previo solicitado y tu acceso correspondiente a los pagos confirmados ya está disponible.',
        format('order:%s:withdrawal-access-started',v_o.id)) on conflict(dedupe_key) do nothing;
    end if;
    perform private.ghc_apply_academy_order_state(v_o.id,'cron');
    v_processed:=v_processed+1;
  end loop;

  for v_i in
    select i.*,o.user_id,o.email_normalized,o.order_reference,o.status order_status,o.course_id
    from public.academy_installments i join public.academy_orders o on o.id=i.order_id
    where i.status in ('pending','failed','overdue')
      and o.status not in ('completed','cancelled','refunded','chargeback')
      and o.collection_paused=false
  loop
    if v_i.due_at<p_now and v_i.status<>'overdue' then
      update public.academy_installments set status='overdue',updated_at=p_now where id=v_i.id;
      insert into public.academy_commercial_events(order_id,event_type,actor_type,message,payload)
      values(v_i.order_id,'installment_overdue','cron','Cuota vencida',jsonb_build_object('installment_no',v_i.installment_no,'due_at',v_i.due_at));
    end if;

    foreach v_before in array v_policy.reminder_before_days loop
      if p_now>=v_i.due_at-make_interval(days=>v_before) and p_now<v_i.due_at then
        insert into public.academy_notifications(order_id,audience,user_id,recipient_email,template_key,subject,body,dedupe_key,metadata)
        values(v_i.order_id,'student',v_i.user_id,v_i.email_normalized,'installment_upcoming','Recordatorio de tu próximo pago',
          format('Tu pago %s de %s vence en %s días. No tienes que hacer nada ahora si tu método de pago está preparado.',v_i.installment_no,(select installment_count from public.academy_orders where id=v_i.order_id),v_before),
          format('order:%s:installment:%s:before:%s',v_i.order_id,v_i.installment_no,v_before),jsonb_build_object('installment_no',v_i.installment_no,'due_at',v_i.due_at))
        on conflict(dedupe_key) do nothing;
        if found then v_notices:=v_notices+1; end if;
      end if;
    end loop;

    if p_now>=v_i.due_at and p_now<v_i.due_at+interval '24 hours' then
      insert into public.academy_notifications(order_id,audience,user_id,recipient_email,template_key,subject,body,dedupe_key,metadata)
      values(v_i.order_id,'student',v_i.user_id,v_i.email_normalized,'installment_due','Tu pago vence hoy',
        format('Hoy vence el pago %s de tu plan. El contenido ya pagado permanece disponible; el siguiente tramo se habilitará cuando se confirme el pago.',v_i.installment_no),
        format('order:%s:installment:%s:due',v_i.order_id,v_i.installment_no),jsonb_build_object('installment_no',v_i.installment_no,'due_at',v_i.due_at))
      on conflict(dedupe_key) do nothing;
      if found then v_notices:=v_notices+1; end if;
    end if;

    foreach v_over in array v_policy.overdue_reminder_days loop
      if p_now>=v_i.due_at+make_interval(days=>v_over) then
        insert into public.academy_notifications(order_id,audience,user_id,recipient_email,template_key,subject,body,dedupe_key,metadata)
        values(v_i.order_id,'student',v_i.user_id,v_i.email_normalized,'installment_overdue_reminder','Pago pendiente de regularizar',
          format('Tu pago %s sigue pendiente desde hace %s días. No hemos retirado el contenido que ya has pagado, pero el siguiente tramo seguirá bloqueado hasta regularizarlo.',v_i.installment_no,v_over),
          format('order:%s:installment:%s:over:%s',v_i.order_id,v_i.installment_no,v_over),jsonb_build_object('installment_no',v_i.installment_no,'days_overdue',v_over))
        on conflict(dedupe_key) do nothing;
        if found then v_notices:=v_notices+1; end if;

        insert into public.academy_notifications(order_id,audience,template_key,subject,body,dedupe_key,metadata)
        values(v_i.order_id,'admin','installment_overdue_admin','Cuota Academy pendiente',
          format('El pedido %s tiene pendiente la cuota %s desde hace al menos %s días.',v_i.order_reference,v_i.installment_no,v_over),
          format('order:%s:installment:%s:over-admin:%s',v_i.order_id,v_i.installment_no,v_over),jsonb_build_object('user_id',v_i.user_id,'installment_no',v_i.installment_no,'days_overdue',v_over))
        on conflict(dedupe_key) do nothing;
      end if;
    end loop;

    if p_now>=v_i.due_at+make_interval(days=>v_policy.cancel_after_days) then
      select * into v_o from public.academy_orders where id=v_i.order_id for update;
      if v_o.status not in ('completed','cancelled','refunded','chargeback') then
        update public.academy_orders set status='cancelled',cancelled_at=p_now,updated_at=p_now where id=v_o.id;
        update public.academy_installments set status='cancelled',updated_at=p_now where order_id=v_o.id and status in ('pending','failed','overdue');
        select coalesce(commercial_max_module_order,0) into v_limit from public.course_access where user_id=v_o.user_id and course_id=v_o.course_id;
        insert into public.academy_commercial_events(order_id,event_type,actor_type,message,payload)
        values(v_o.id,'installment_plan_cancelled','cron','Plan fraccionado cancelado por impago prolongado',jsonb_build_object('cancel_after_days',v_policy.cancel_after_days,'retained_module_limit',v_limit));
        insert into public.academy_notifications(order_id,audience,user_id,recipient_email,template_key,subject,body,dedupe_key,metadata)
        values(v_o.id,'student',v_o.user_id,v_o.email_normalized,'installment_plan_cancelled','Tu plan de pagos se ha cerrado',
          format('Han transcurrido %s días desde el vencimiento sin regularización. El plan fraccionado se ha cerrado. Mantienes el acceso al contenido ya adquirido hasta el módulo %s. Si quieres continuar, contacta con GHC Academy.',v_policy.cancel_after_days,coalesce(v_limit,0)),
          format('order:%s:plan-cancelled',v_o.id),jsonb_build_object('retained_module_limit',v_limit))
        on conflict(dedupe_key) do nothing;
        insert into public.academy_notifications(order_id,audience,template_key,subject,body,dedupe_key,metadata)
        values(v_o.id,'admin','installment_plan_cancelled_admin','Plan Academy cancelado automáticamente',
          format('El plan %s se ha cancelado automáticamente tras %s días de impago. El alumno conserva únicamente el tramo ya pagado.',v_o.order_reference,v_policy.cancel_after_days),
          format('order:%s:plan-cancelled-admin',v_o.id),jsonb_build_object('user_id',v_o.user_id,'retained_module_limit',v_limit))
        on conflict(dedupe_key) do nothing;
        v_cancelled:=v_cancelled+1;
      end if;
    end if;
  end loop;

  return jsonb_build_object('processed_orders',v_processed,'cancelled_orders',v_cancelled,'notifications_queued',v_notices,'ran_at',p_now);
end;
$$;

create or replace function public.ghc_admin_run_academy_commercial_automation()
returns jsonb
language plpgsql
security definer
set search_path = 'private','public'
as $$
begin
  if auth.uid() is null or not public.ghc_is_admin() then raise exception 'No autorizado.'; end if;
  return private.ghc_run_academy_commercial_automation(now());
end;
$$;

revoke execute on function private.ghc_run_academy_commercial_automation(timestamptz) from public,anon,authenticated;
revoke execute on function public.ghc_admin_run_academy_commercial_automation() from public,anon;
grant execute on function public.ghc_admin_run_academy_commercial_automation() to authenticated;

select cron.schedule(
  'ghc-academy-commercial-automation',
  '17 * * * *',
  $$select private.ghc_run_academy_commercial_automation(now());$$
);
