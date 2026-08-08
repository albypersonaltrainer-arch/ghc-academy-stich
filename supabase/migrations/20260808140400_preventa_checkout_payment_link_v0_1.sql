-- GHC Academy · Preventa 2026 · enlace atómico cuota <-> intento Hosted Checkout
-- DEPENDE DE: 20260808_preventa_checkout_attempts_v0_1.sql
-- NO ejecutar en Supabase real hasta Gate técnico + autorización final de Alby.

begin;

create or replace function public.preventa_sync_paid_checkout_attempt_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_checkout_id text;
begin
  if new.status <> 'paid' or new.provider <> 'sumup' then
    return new;
  end if;

  v_checkout_id := nullif(new.provider_metadata ->> 'checkout_id', '');
  if v_checkout_id is null then
    return new;
  end if;

  update public.preventa_checkout_attempts
  set status = case
        when provider_checkout_id = v_checkout_id then 'paid'
        when status in ('created','superseded') then 'superseded'
        else status
      end,
      paid_at = case
        when provider_checkout_id = v_checkout_id then coalesce(new.paid_at, now())
        else paid_at
      end,
      updated_at = coalesce(new.paid_at, now())
  where order_id = new.order_id
    and installment_no = new.installment_no
    and (
      provider_checkout_id = v_checkout_id
      or status in ('created','superseded')
    );

  return new;
end;
$$;

drop trigger if exists preventa_payments_sync_checkout_attempt on public.preventa_payments;
create trigger preventa_payments_sync_checkout_attempt
after insert or update of status, provider_metadata, paid_at
on public.preventa_payments
for each row
execute function public.preventa_sync_paid_checkout_attempt_v1();

revoke all on function public.preventa_sync_paid_checkout_attempt_v1() from public, anon, authenticated;
grant execute on function public.preventa_sync_paid_checkout_attempt_v1() to service_role;

comment on function public.preventa_sync_paid_checkout_attempt_v1 is 'Sincroniza atómicamente el intento Hosted Checkout exacto cuando una cuota SumUp queda pagada.';

commit;
