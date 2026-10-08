-- Panel agregado de captación. Sin datos personales ni acceso público.
create or replace view public.preventa_commercial_dashboard_v1
with (security_invoker = true)
as
select 'visitas_landing'::text as metric, count(*)::bigint as total
from public.preventa_funnel_events where event_name = 'landing_view'
union all
select 'interesados_registrados'::text, count(*)::bigint from public.preventa_interest_leads
union all
select 'interesados_optin_comercial'::text, count(*)::bigint
from public.preventa_interest_leads where marketing_consent = true
union all
select 'clics_checkout'::text, count(*)::bigint
from public.preventa_funnel_events where event_name = 'checkout_click'
union all
select 'matriculas_iniciadas'::text, count(*)::bigint
from public.preventa_orders
union all
select 'matriculas_pago_parcial'::text, count(*)::bigint
from public.preventa_orders where status = 'partial'
union all
select 'matriculas_abonadas'::text, count(*)::bigint
from public.preventa_orders where status = 'paid';
revoke all on public.preventa_commercial_dashboard_v1 from anon, authenticated;
comment on view public.preventa_commercial_dashboard_v1 is
  'Indicadores de interés y matrícula para GHC Academy; no equivale a atribución individual ni a ventas causadas por el funnel.';
