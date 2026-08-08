-- GHC Academy · Preventa 2026 · liberación efectiva de plazas fundadoras V0.1
-- DEPENDE DE: 20260808_preventa_operativa_v0_1.sql
-- NO ejecutar en Supabase real hasta Gate técnico + autorización final de Alby.

begin;

create or replace function public.preventa_release_founder_number_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.founder_status = 'released' then
    new.founder_place_number := null;
  end if;
  return new;
end;
$$;

drop trigger if exists preventa_orders_release_founder_number on public.preventa_orders;
create trigger preventa_orders_release_founder_number
before insert or update of founder_status, founder_place_number
on public.preventa_orders
for each row
execute function public.preventa_release_founder_number_v1();

revoke all on function public.preventa_release_founder_number_v1() from public, anon, authenticated;
grant execute on function public.preventa_release_founder_number_v1() to service_role;

comment on function public.preventa_release_founder_number_v1 is 'Elimina el número activo de plaza cuando founder_status pasa a released, devolviéndolo al pool 1..100.';

commit;
