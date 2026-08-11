# GHC Academy · Gate de lanzamiento de preventa

Fecha: 11 de agosto de 2026

## Estado ejecutivo

**MOTOR TÉCNICO CRÍTICO DE PREVENTA: VALIDADO EN PREVIEW/SANDBOX.**

**GATE LIVE: CERRADO** hasta completar identidad/legal, correo corporativo, scheduler y credenciales SumUp live.

Este documento complementa y actualiza `ESTADO_GATE_EMAIL_TRANSACCIONAL_2026-08-10.md`.

## E2E económicos superados

- Pago único real en SumUp Sandbox: 1.690 €.
- Fraccionado real: 895 € + 895 €, total contractual 1.790 €.
- Segunda cuota a +15 días naturales.
- Webhook SumUp verificado server-to-server; la notificación por sí sola no acredita pago.
- Fallo real `FAILED`: 0 € cobrados, orden reintentable, hold liberado, E12 enviado.
- Checkout real `EXPIRED`: 0 € cobrados, orden reintentable, hold expirado/liberado, E13 enviado.
- Reembolso completo real SumUp sobre dos transacciones de 895 €: ambas aceptadas, Supabase sincronizado, plaza liberada, comisión revertida, E14 enviado.
- Impago cuota 2: `partial → overdue` a +1 día y `overdue → cancelled` a +60 días, con protección contra ejecución prematura.
- Pago tardío de cuota 2 después de `overdue`: recupera estado `paid` mientras el expediente siga abierto.
- Idempotencia de pagos, terminales, email y reembolsos validada.

## Emails y enlaces

E2E/manualmente validados:

- E01 pago único.
- E02 primera cuota fraccionada.
- E10 pago completo fraccionado.
- E12 pago fallido.
- E13 checkout expirado.
- E14 reembolso.
- CTA privado de matrícula con token firmado.
- CTA de segunda cuota con token firmado y limitado a cuota/orden.

E03–E09 están cubiertos por suites SQL y mantenimiento programado; al pagar la cuota 2 se cancelan automáticamente los recordatorios restantes.

## Checkout público

El checkout público dejó de ser un simulador.

Ruta:

`/preventa/checkout`

Flujo actual:

`landing → formulario real → /api/preventa/orders → matrícula persistida → token firmado → /api/preventa/sumup-checkout → SumUp Hosted Checkout`

En Preview utiliza Sandbox y lo indica de forma visible. El código de Production queda preparado para el proveedor real, pero no se activa SumUp live sin Gate explícito.

La landing `/preventa` muestra:

- pago único 1.690 €;
- fraccionado 895 € + 895 €, total 1.790 €;
- vencimiento de segunda cuota a los 15 días naturales;
- enlaces reales al checkout.

## Operativa administrativa de reembolso

Implementado panel:

`/ghc-control-center/preventa`

Características:

- autenticación por sesión Supabase;
- API server-side valida JWT con Auth;
- autorización adicional por rol `admin`, `owner` o `superadmin` consultado server-side;
- listado de matrículas y cuotas;
- reembolso completo solo para estados reembolsables;
- confirmación manual escribiendo exactamente la referencia `GHC-XXXXXXXX`;
- SumUp se ejecuta primero y Supabase solo se actualiza después de aceptación del proveedor;
- evento administrativo de auditoría tras el reembolso;
- service role y API key de SumUp nunca se envían al cliente.

## Seguridad Supabase real

Auditado el 11 de agosto de 2026 contra el proyecto real:

- las 8 tablas de preventa tienen RLS activo;
- `anon`: sin SELECT/INSERT/UPDATE/DELETE directo;
- `authenticated`: sin SELECT/INSERT/UPDATE/DELETE directo;
- RPC económicas críticas: sin EXECUTE para `anon` ni `authenticated`;
- RPC económicas críticas: EXECUTE disponible para `service_role`.

Tablas verificadas:

- `preventa_orders`
- `preventa_payments`
- `preventa_acceptances`
- `preventa_attribution`
- `preventa_events`
- `preventa_email_queue`
- `preventa_checkout_attempts`
- `preventa_capacity_holds`

## Compatibilidad con Academy

La rama `preventa-2026-auditoria-v0-1` se sincronizó dos veces con `main` durante el QA porque Academy recibió cambios en paralelo.

Última base integrada de `main`:

`2dfbf12dad2975ae51e634f022866a79b18cff62`

Merge de sincronización en preventa:

`a1f61e531aea0d7c39abc57cf9a67f05cc3fe58e`

Estado tras sincronización:

- `behind_by = 0`;
- CI `Preventa PostgreSQL Integration`: SUCCESS;
- Vercel Preview: READY;
- Next.js compila y pasa lint/types;
- los avisos de autoprefixer existentes en Academy no bloquean build.

## Scheduler

Código disponible:

`/api/preventa/cron`

Protegido con Bearer `CRON_SECRET` y preparado para frecuencia horaria.

Bloqueo de infraestructura actual: el plan Vercel Hobby no permite el cron horario requerido. No se degradará deliberadamente la política a una ejecución diaria.

**Gate live:** Vercel Pro o scheduler externo equivalente + `CRON_SECRET` exclusivo de Production.

## Bloqueos reales restantes antes de abrir cobros

### 1. Identidad y paquete jurídico público — BLOQUEANTE

Las condiciones existentes están marcadas expresamente como `BORRADOR JURÍDICO OPERATIVO · NO PUBLICAR`.

Faltan como mínimo:

- prestador legal definitivo;
- NIF/CIF;
- domicilio legal;
- email legal/desistimiento y soporte definitivo;
- dominio definitivo que debe figurar en contratación;
- cierre contractual de la duración mínima de acceso/continuidad;
- revisión jurídica final.

No se publicarán páginas legales con placeholders ni se activará checkout live mientras este bloque siga abierto.

### 2. Email transaccional live — BLOQUEANTE

- verificar dominio/subdominio en Resend;
- sustituir `onboarding@resend.dev` por remitente corporativo;
- configurar soporte corporativo;
- retirar redirección de seguridad a buzón de prueba en Production.

### 3. Scheduler horario — BLOQUEANTE

- Vercel Pro o equivalente;
- `CRON_SECRET` Production;
- activar frecuencia horaria.

### 4. SumUp live — BLOQUEANTE PARA COBRAR

- credenciales live únicamente con autorización explícita;
- webhook live apuntando al deployment final;
- smoke test controlado después del Gate.

### 5. Datos Sandbox — PRE-LANZAMIENTO

Identificar/eliminar de forma controlada los registros Sandbox antes de abrir la preventa. No borrar datos hasta que el cierre documental del QA esté asegurado.

## Gate de merge

El PR de preventa permanece sin fusionar a `main`.

No mergear ni activar Production live sin autorización expresa.
