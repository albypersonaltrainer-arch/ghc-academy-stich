create or replace function private.ghc_prepare_academy_notification_email_state()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
begin
  if new.template_key='installment_upcoming' then
    new.body:=replace(
      new.body,
      'No tienes que hacer nada ahora si tu método de pago está preparado.',
      'Puedes completar la cuota desde «Mi plan de formación» antes del vencimiento; el pago se confirma a través de SumUp.'
    );
  end if;

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

revoke execute on function private.ghc_prepare_academy_notification_email_state() from public,anon,authenticated;
