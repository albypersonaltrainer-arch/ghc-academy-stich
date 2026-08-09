# GHC Academy · Preventa 2026 · Estado Gate técnico de pagos

Fecha de actualización: 2026-08-09  
Rama: `preventa-2026-auditoria-v0-1`  
Producción Git (`main`): **sin merge**  
Estado del Gate: **PASS — SANDBOX / NO LIVE**

## 1. Alcance del Gate

Este documento certifica el estado técnico del circuito de preventa de GHC Academy en entorno Preview + SumUp Sandbox + Supabase real.

El PASS significa que los flujos de cobro y sus transiciones internas han sido probados de extremo a extremo en Sandbox. **No autoriza cobros reales, no autoriza merge a `main` y no sustituye los Gates pendientes de comunicaciones, UX/legal final y credenciales de producción.**

## 2. Supabase real

Proyecto: `oqlxvesnjdkxlxwxkikq`  
URL: `https://oqlxvesnjdkxlxwxkikq.supabase.co`

Migraciones de preventa aplicadas actualmente:

1. `preventa_operativa_v0_1` — `20260808155125`
2. `preventa_idempotencia_v0_2` — `20260808155205`
3. `preventa_transiciones_pago_v0_1` — `20260808155324`
4. `preventa_checkout_attempts_v0_1` — `20260808155359`
5. `preventa_checkout_payment_link_v0_1` — `20260808155415`
6. `preventa_founder_release_fix_v0_1` — `20260808155433`
7. `preventa_capacity_holds_v0_1` — `20260808160926`
8. `preventa_capacity_expiry_boundary_fix_v0_1` — `20260808184346`
9. `preventa_checkout_terminal_states_v0_1` — `20260809114459`
10. `preventa_full_refund_release_place_fix_v0_1` — `20260809123915`

Tablas privadas de preventa:

- `preventa_orders`
- `preventa_payments`
- `preventa_acceptances`
- `preventa_attribution`
- `preventa_events`
- `preventa_email_queue`
- `preventa_checkout_attempts`
- `preventa_capacity_holds`

Las ocho tablas tienen RLS habilitado. La ausencia de policies directas en estas tablas es intencionada: no son una API de cliente. Las operaciones económicas se realizan server-side.

Auditoría directa de todas las funciones `public.preventa_%` activas:

- `anon`: sin `EXECUTE`
- `authenticated`: sin `EXECUTE`
- `service_role`: con `EXECUTE`
- funciones económicas: `SECURITY INVOKER`, no `SECURITY DEFINER`

Por tanto, el cliente no puede confirmar pagos, adjudicar plazas, registrar reembolsos ni manipular capacidad mediante las RPC de preventa.

## 3. Protección de las 100 plazas Fundador

Flujo de primera cuota:

`contexto DB → reserve capacity → crear Hosted Checkout SumUp → attach checkout → registrar intento → entregar URL → webhook verificado → consumir hold`

Reglas activas:

- máximo 100 plazas;
- primera cuota exige un `capacity hold` previo;
- hold de primera cuota: **45 minutos**;
- la segunda cuota no reserva una plaza nueva: conserva la plaza adjudicada por la primera;
- `held_until` es límite exclusivo: si `occurred_at == held_until`, el hold está expirado;
- pago sin hold activo: rechazado de forma atómica;
- checkout fallido o expirado: libera capacidad y deja la matrícula reintentable;
- reembolso completo: libera estado y número de plaza.

La duración de 45 minutos está bloqueada por CI sobre `FIRST_INSTALLMENT_HOLD_MINUTES = 45`.

La frontera exacta `occurred_at == held_until` está cubierta por una suite SQL específica que exige `ACTIVE_CAPACITY_HOLD_REQUIRED` y comprueba que no se muten orden, pago, hold ni eventos.

## 4. Webhook SumUp

La notificación entrante **nunca se considera prueba de pago por sí sola**.

Cada webhook:

1. valida formato de evento;
2. recupera el checkout exacto desde la API autenticada de SumUp;
3. valida checkout ID, merchant, EUR, referencia GHC, cuota e importe;
4. clasifica `PENDING`, `FAILED`, `EXPIRED` o `PAID`;
5. aplica la transición server-side idempotente.

Estados:

- `PENDING`: HTTP 200, sin transición económica;
- `FAILED`: persistido como intento fallido, pago fallido, hold liberado;
- `EXPIRED`: intento expirado, hold expirado, pago reintentable;
- `PAID`: pago confirmado únicamente tras encontrar una transacción `SUCCESSFUL` verificable por importe y moneda.

## 5. Pruebas end-to-end reales en SumUp Sandbox

### 5.1 Pago único — 1.690 €

**PASS**

Se comprobó:

- Hosted Checkout real Sandbox;
- webhook real;
- reconsulta a SumUp API;
- matrícula `paid`;
- pago `paid` = 169.000 céntimos;
- plaza Fundador confirmada;
- hold consumido;
- comisión base 169.000;
- E01 encolado.

### 5.2 Pago fraccionado — 895 € + 895 €

**PASS**

Primera cuota:

- 89.500 céntimos `paid`;
- matrícula `partial`;
- plaza Fundador `reserved`;
- segunda cuota `pending`;
- vencimiento exactamente `+15 days`;
- comisión base 89.500;
- E02–E09 generados.

Segunda cuota:

- otros 89.500 céntimos `paid`;
- matrícula final `paid`;
- misma plaza Fundador `confirmed`;
- comisión base final 179.000;
- E03–E09 cancelados;
- E10 encolado.

### 5.3 Pago denegado

**PASS**

Con tarjeta oficial de fallo 3DS Sandbox y precio comercial real de 1.690 €:

- SumUp denegó el pago;
- hubo entrega duplicada del webhook;
- ambos requests devolvieron HTTP 200;
- matrícula `awaiting_payment`;
- pago `failed`, 0 cobrado;
- intento `failed`;
- hold `released`;
- ninguna plaza adjudicada;
- comisión 0;
- un único evento terminal.

### 5.4 Checkout expirado

**PASS**

El checkout pendiente fue desactivado por API de SumUp y verificado después como `EXPIRED`:

- webhook HTTP 200;
- matrícula `awaiting_payment`;
- pago `pending`, 0 cobrado;
- intento `expired`;
- hold `expired`;
- ninguna plaza adjudicada;
- comisión 0;
- matrícula reintentable.

### 5.5 Reembolso completo

**PASS**

Sobre un pago Sandbox real de 1.690 €:

- SumUp aceptó refund completo con HTTP 204;
- el reembolso se confirmó posteriormente contra la API de transacciones de SumUp;
- matrícula `refunded`;
- pago `refunded`;
- 169.000 céntimos reembolsados sobre 169.000 pagados;
- founder status `released`;
- `founder_place_number = null`;
- comisión base 0;
- comisión `reversed`;
- un único evento de refund.

La prueba descubrió y corrigió previamente un defecto que liberaba el estado de plaza pero conservaba su número. La corrección está migrada y cubierta por CI.

### 5.6 Idempotencia PAID del webhook

**PASS**

Se reutilizó un checkout real Sandbox ya pagado y se envió la misma notificación `PAID` dos veces al webhook real:

- primer webhook: HTTP 200, `idempotent_replay=false`;
- segundo webhook: HTTP 200, `idempotent_replay=true`;
- un único evento `payment.single.paid`;
- un único E01;
- un único pago;
- una única plaza consumida;
- una única comisión.

## 6. CI PostgreSQL 17

Workflow: `Preventa PostgreSQL Integration`

Suite actual:

- `supabase/tests/preventa_integration_v0_1.sql`
- `supabase/tests/preventa_terminal_states_v0_1.sql`
- `supabase/tests/preventa_capacity_boundary_v0_1.sql`

Último Gate de frontera/hold validado:

- GitHub Actions run `31314881028`
- run number 76
- resultado: **success**

Cobertura acumulada relevante:

- idempotencia de creación;
- primera cuota imposible sin hold;
- reserva/attach/consumo/liberación de capacidad;
- hold 45 minutos fijado en CI;
- frontera exacta de expiración;
- pago único;
- fraccionado 895 + 895;
- vencimiento +15 días;
- overdue;
- E01–E10 a nivel de cola;
- comisión;
- FAILED;
- EXPIRED;
- refund y reutilización de plaza;
- permisos server-only.

## 7. Estado Vercel Preview

Rama: `preventa-2026-auditoria-v0-1`

Última Preview limpia verificada:

- deployment: `dpl_9Jhdr3V4dDgvM356hc7WrTCht672`
- commit: `24dc4b148028ca80e9af52a68005bb107da9a768`
- estado: **READY**

Build normal restaurado:

`node scripts/check-preventa-preview-env.mjs && node scripts/verify-sumup-sandbox.mjs && next build`

Los scripts destructivos o de replay usados en las pruebas manuales fueron retirados del build una vez completada cada prueba.

## 8. Limpieza de datos de prueba

Tras cada prueba se eliminaron las matrículas ficticias y sus relaciones por cascada.

Estado final comprobado en los escenarios cerrados: sin órdenes, holds, intentos ni pagos ficticios residuales correspondientes a las pruebas.

Los checkouts/transacciones utilizados permanecen únicamente en el ledger Sandbox de SumUp, donde no representan dinero real.

## 9. Auditoría de seguridad Supabase

### Alcance preventa

No se detectaron WARN de seguridad específicos de las tablas o RPC económicas de preventa.

El advisor informa `RLS Enabled No Policy` como nivel `INFO` para las tablas privadas de preventa. En este diseño es deliberado porque el acceso está cerrado a `anon/authenticated` y se opera mediante `service_role` server-side.

Referencia del linter:  
https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

### Fuera del alcance preventa

El proyecto general GHC Academy sí mantiene advertencias preexistentes en otras áreas: funciones administrativas/exámenes `SECURITY DEFINER` ejecutables por roles públicos o autenticados, helpers con `search_path` mutable y protección de contraseñas filtradas deshabilitada.

Estas advertencias **no fueron creadas por la preventa y no deben confundirse con un PASS global de seguridad de toda Academy**. Deben tratarse en un Gate de hardening independiente antes del lanzamiento general de la plataforma.

Referencias del advisor:

- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## 10. Resolución del Gate

### PASS técnico de pagos en Sandbox

A fecha 2026-08-09 se consideran validados los flujos críticos de cobro de preventa:

- pago único;
- pago fraccionado;
- rechazo;
- expiración;
- reembolso completo;
- reintento/idempotencia del webhook;
- reserva y liberación de plaza;
- comisión;
- cola transaccional E01–E10.

### NO LIVE todavía

Siguen bloqueados hasta Gate explícito posterior:

- merge a `main`;
- credenciales SumUp Live;
- cobros reales;
- activación irreversible de producción.

Antes de Live deben cerrarse como mínimo:

1. contenido y experiencia real de emails al alumno;
2. comunicaciones de fallo, expiración, reembolso y mora;
3. revisión UX/legal final de checkout y confirmación;
4. conexión definitiva del checkout visible al endpoint operativo;
5. rotación/eliminación del bypass temporal de Vercel usado en Sandbox;
6. revisión final de secretos y variables por entorno.

**Siguiente Gate: comunicaciones transaccionales al alumno.**
