# GHC Academy · Preventa 2026 · Estado Gate técnico Supabase

Fecha: 2026-08-08
Rama: `preventa-2026-auditoria-v0-1`
Producción Git (`main`): sin merge.

## Supabase real

Proyecto: `oqlxvesnjdkxlxwxkikq`
URL: `https://oqlxvesnjdkxlxwxkikq.supabase.co`

Migraciones aplicadas correctamente:

1. `preventa_operativa_v0_1`
2. `preventa_idempotencia_v0_2`
3. `preventa_transiciones_pago_v0_1`
4. `preventa_checkout_attempts_v0_1`
5. `preventa_checkout_payment_link_v0_1`
6. `preventa_founder_release_fix_v0_1`
7. `preventa_capacity_holds_v0_1`

Tablas privadas de preventa:
- `preventa_orders`
- `preventa_payments`
- `preventa_acceptances`
- `preventa_attribution`
- `preventa_events`
- `preventa_email_queue`
- `preventa_checkout_attempts`
- `preventa_capacity_holds`

Todas con RLS habilitado y sin acceso de cliente directo. Las RPC económicas y de capacidad quedan revocadas para `anon` y `authenticated` y concedidas a `service_role`.

## Pruebas

### PostgreSQL 17 efímero en GitHub Actions

Resultado V0.2: verde.

Verifica, entre otros:
- idempotencia de creación de matrícula;
- primera cuota imposible sin `capacity hold`;
- reserva temporal de capacidad antes de checkout externo;
- enlace hold ↔ checkout;
- consumo del hold al verificarse el primer pago;
- pago único 1.690 €;
- fraccionado 895 € + 895 €;
- vencimiento +15 días;
- overdue;
- E01 y E02–E10;
- comisión;
- refund y reutilización de plaza;
- liberación explícita de hold fallido;
- permisos server-only.

### Supabase real con ROLLBACK

Se ejecutó una prueba transaccional completa en el motor real:
- crear matrícula ficticia;
- comprobar rechazo de primera cuota sin hold;
- reservar capacidad 30 minutos;
- ligar checkout;
- registrar intento;
- confirmar pago verificado;
- resultado observado: `order=paid`, `founder=confirmed`, `hold=consumed`, `payment=paid`, `attempt=paid`;
- `ROLLBACK` al final.

Comprobación posterior:
- órdenes de prueba: 0;
- holds de prueba: 0.

## Protección de capacidad fundadora

La primera cuota exige una capacidad fundadora previamente apartada. El flujo server-side preparado es:

`contexto DB → reserve capacity → crear Hosted Checkout SumUp → attach provider checkout → registrar intento → entregar URL`

Si la creación o registro falla, el backend libera el hold. Los holds tienen duración prevista de 30 minutos, alineada con la sesión Hosted Checkout de SumUp documentada actualmente.

La segunda cuota no reserva nueva capacidad porque la plaza ya quedó asociada tras el primer pago.

## Estado Vercel

Los Previews recientes de la rama están `READY`.

Gates actualmente cerrados en el runtime:
- `PREVENTA_PERSISTENCE_ENABLED`: false/no disponible;
- `SUPABASE_SERVICE_ROLE_KEY`: no disponible en el Preview actual;
- `PREVENTA_CHECKOUT_TOKEN_SECRET`: no disponible;
- `SUMUP_CHECKOUT_ENABLED`: false;
- credenciales SumUp: no configuradas;
- cobros reales: imposibles.

## Próximo paso manual mínimo

Configurar en Vercel, primero solo para Preview de la rama de preventa:

- `NEXT_PUBLIC_SUPABASE_URL=https://oqlxvesnjdkxlxwxkikq.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=<secret server-side obtenido desde Supabase>`
- `PREVENTA_PERSISTENCE_ENABLED=true`
- `PREVENTA_CHECKOUT_TOKEN_SECRET=<secreto aleatorio de al menos 32 caracteres>`

Mantener todavía:
- `SUMUP_CHECKOUT_ENABLED=false`
- `SUMUP_WEBHOOK_ENABLED=false`

Tras configurar esas variables, el siguiente Gate es probar creación real de borradores desde el Preview contra Supabase, limpiar los datos de prueba y solo después entrar en SumUp sandbox.
