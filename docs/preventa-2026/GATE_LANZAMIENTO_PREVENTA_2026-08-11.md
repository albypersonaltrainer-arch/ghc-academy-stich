# GHC Academy · Gate de lanzamiento de preventa

Fecha: 11 de agosto de 2026

## Estado ejecutivo

**MOTOR TÉCNICO CRÍTICO DE PREVENTA: VALIDADO EN PREVIEW/SANDBOX.**

**GATE LIVE TÉCNICO: CERRADO** hasta completar configuración live de correo, scheduler y SumUp. La identidad/fiscalidad del prestador queda fuera del QA técnico y debe resolverse externamente antes de cualquier afirmación de cumplimiento legal.

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

### E2E final desde landing pública

El 11 de agosto de 2026 se ejecutó el recorrido completo desde la landing pública de Preview, sin usar la pantalla técnica de QA.

Orden creada:

`GHC-F6538C96`

Resultado verificado:

- entrada desde `/preventa`;
- navegación a `/preventa/checkout`;
- creación real de pedido: HTTP 200;
- creación de Hosted Checkout SumUp: HTTP 200;
- modalidad: pago único;
- importe: 1.690 €;
- SumUp Sandbox confirmó el pago;
- webhook recibido: HTTP 200;
- webhook drenó el worker transaccional con `claimed: 1`, `sent: 1`, `retryOrFailed: 0`;
- orden final: `paid`;
- total pagado: 1.690 €;
- total reembolsado: 0 €;
- plaza Fundador: n.º 2, `confirmed`;
- hold de capacidad: `consumed`;
- intento de checkout: `paid`;
- atribución: `source_channel = preventa-web`;
- `source_detail = public-checkout-preview-sandbox`;
- campaña: `FOUNDERS_2026`;
- E01 enviado en un único intento;
- E01 sin error de entrega;
- provider message id registrado.

Con esta prueba queda validado el recorrido que hará un comprador real desde la superficie pública, no únicamente desde arneses técnicos.

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

## Scheduler horario sin Vercel Pro

Endpoint disponible:

`/api/preventa/cron`

Protegido con Bearer `CRON_SECRET` y preparado para frecuencia horaria.

Se añadió una alternativa sin coste adicional mediante GitHub Actions:

`.github/workflows/preventa-scheduled-maintenance.yml`

Configuración:

- ejecución cada hora al minuto `:17`;
- `workflow_dispatch` disponible para prueba manual;
- concurrencia bloqueada para evitar solapamientos;
- timeout de 3 minutos;
- llamada HTTP con Bearer secreto;
- cualquier respuesta distinta de HTTP 200 falla el workflow;
- el secreto no se imprime en logs.

GitHub ejecuta los workflows `schedule` únicamente desde la rama por defecto. Por tanto, el scheduler no se activa mientras esta rama permanezca sin mergear a `main`.

### Configuración necesaria al abrir Production

Crear en GitHub Actions:

- `PREVENTA_CRON_URL` = URL Production completa de `/api/preventa/cron`;
- `PREVENTA_CRON_SECRET` = mismo secreto aleatorio de al menos 32 caracteres configurado como `CRON_SECRET` en Vercel Production.

Con esta arquitectura **Vercel Pro deja de ser requisito de lanzamiento** para el mantenimiento horario.

## Bloqueos técnicos restantes antes de abrir cobros

### 1. Email transaccional live

- verificar dominio/subdominio en Resend;
- sustituir `onboarding@resend.dev` por remitente corporativo;
- configurar soporte corporativo;
- retirar redirección de seguridad a buzón de prueba en Production.

### 2. Scheduler Production

El código ya está terminado. Solo queda, al abrir el Gate:

- crear los dos secretos de GitHub Actions;
- configurar el mismo `CRON_SECRET` en Vercel Production;
- ejecutar `workflow_dispatch` una vez y verificar HTTP 200;
- dejar activo el schedule horario.

### 3. SumUp live

- credenciales live únicamente con autorización explícita;
- webhook live apuntando al deployment final;
- smoke test controlado después del Gate.

### 4. Datos Sandbox

Identificar/eliminar de forma controlada los registros Sandbox antes de abrir la preventa. No borrar datos hasta que el cierre documental del QA esté asegurado.

## Identidad, fiscalidad y documentación jurídica

La documentación contractual existente contiene campos pendientes de identidad del prestador y no puede considerarse jurídicamente final mientras dichos datos no estén cerrados.

Este asunto queda expresamente separado del QA técnico. No se introducirán datos ficticios ni se declarará cumplimiento jurídico que no haya sido verificado.

## Gate de merge

El PR de preventa permanece sin fusionar a `main`.

No mergear ni activar Production live sin autorización expresa.
