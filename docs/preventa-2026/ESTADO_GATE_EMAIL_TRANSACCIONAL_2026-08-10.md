# GHC Academy · Preventa 2026 · Estado Gate de email transaccional

Fecha de corte inicial: 2026-08-10
Última actualización: 2026-08-11

## Estado

**PRUEBAS E2E DE PAGO ÚNICO Y PAGO FRACCIONADO SUPERADAS EN PREVIEW · GATE LIVE DE PREVENTA SIGUE CERRADO**

La validación se realizó íntegramente con SumUp Sandbox, Supabase y Resend en modo de prueba. Ningún cambio de estas pruebas de preventa se promovió a Production y no se activó SumUp live ni entrega de email real de preventa.

## Resultado E2E pago único + E01

Flujo verificado:

`SumUp Sandbox → webhook → Supabase → cola E01 → worker → Resend → buzón de prueba → CTA privado de matrícula`

Resultado:

- Pago Sandbox de 1.690 € confirmado.
- Orden de prueba: `GHC-C0A2CD93`.
- Estado de orden: `paid`.
- Plaza Fundador asignada: n.º 1.
- Webhook SumUp procesado correctamente.
- E01 creado en `preventa_email_queue`.
- Primer intento de entrega rechazado por Resend al usar un destinatario distinto al propietario de la cuenta de prueba.
- Reintento posterior ejecutado correctamente tras alinear `PREVENTA_EMAIL_TEST_RECIPIENT` con el buzón autorizado de Resend Sandbox.
- Estado final E01: `sent`.
- `last_error`: `null`.
- `provider_message_id`: persistido en Supabase.
- Recepción del correo confirmada manualmente en el buzón de prueba.
- CTA privado de matrícula probado manualmente y validado después de la corrección: redirige a `/preventa/matricula` y muestra el estado real de la matrícula.

La prueba real confirmó también el mecanismo de reintento: el primer intento quedó registrado y el segundo terminó en `sent` sin repetir el pago ni duplicar la matrícula.

## Resultado E2E pago fraccionado + E02/E10

Flujo verificado:

`Primera cuota 895 € → webhook → matrícula partial → E02 → segunda cuota 895 € → webhook → matrícula paid → cancelación de recordatorios → E10`

Orden de prueba: `GHC-0FD27434`.

Primera cuota:

- modalidad: `split`;
- total contratado: 1.790 €;
- primera cuota: 895 €;
- primera cuota confirmada por SumUp Sandbox;
- estado posterior: `partial`;
- plaza Fundador: n.º 2, `reserved`;
- segundo vencimiento generado a +15 días: 25 de agosto de 2026;
- E02 enviado correctamente por Resend;
- E03–E09 programados según la matriz temporal.

Segunda cuota:

- segunda cuota: 895 €;
- pago confirmado por SumUp Sandbox el 11 de agosto de 2026;
- webhook SumUp: HTTP 200;
- estado final de orden: `paid`;
- plaza Fundador n.º 2: `confirmed`;
- total pagado: 1.790 €;
- saldo pendiente: 0 €;
- E03–E09 quedaron `cancelled` automáticamente tras confirmar la segunda cuota;
- E10 se generó y envió en el mismo ciclo del webhook;
- E10 quedó `sent`, `attempt_count=1`, `last_error=null` y con `provider_message_id` persistido;
- evento `payment.installment2.paid` y evento `email.sent` quedaron registrados con idempotencia.

Para la prueba de cuota 2 se utilizó temporalmente una ruta Preview que emitía un token firmado de cuota 2 para la matrícula Sandbox y una ruta temporal para ejecutar un lote del worker. Ambas rutas fueron eliminadas inmediatamente después de completar la prueba.

## Corrección del CTA de matrícula

Durante la revisión manual del primer E01 se detectó que el CTA **“Ver estado de mi matrícula”** apuntaba a `/preventa`.

Se corrigió el flujo para E01, E02 y E10:

- nueva ruta privada `/preventa/matricula`;
- enlace firmado específico para consulta de matrícula;
- validación server-side del token;
- lectura server-side de los datos administrativos de la matrícula;
- la referencia por sí sola no permite consultar una matrícula;
- el enlace firmado tiene caducidad y no expone `SUPABASE_SERVICE_ROLE_KEY` ni otros secretos.

La corrección fue validada manualmente con un email E01 generado después del cambio. Los emails enviados antes de la corrección conservan su URL histórica; los nuevos emails generan el CTA seguro.

## Scheduler de preventa

Se detectó un hueco operativo adicional: E03–E09 ya tenían `scheduled_for`, pero el worker solo se ejecutaba automáticamente inmediatamente después de ciertos webhooks de pago.

Se implementó el motor de mantenimiento programado:

- endpoint: `/api/preventa/cron`;
- protegido mediante `Authorization: Bearer <CRON_SECRET>`;
- lógica preparada para ejecutarse una vez por hora;
- Vercel Cron solo se activa en deployments de Production;
- el Gate live de preventa permanece cerrado.

El intento de declarar `0 * * * *` en `vercel.json` fue rechazado por la limitación del plan Hobby: ese plan solo permite cron una vez al día y con precisión horaria. Para no degradar la precisión de los recordatorios de pago, el cron horario no queda declarado mientras el proyecto siga en Hobby.

**Requisito de lanzamiento:** usar Vercel Pro —o un scheduler externo equivalente— antes de activar la preventa real, y entonces declarar el endpoint `/api/preventa/cron` con frecuencia horaria.

Cada ejecución realiza, en este orden:

1. transición de matrículas fraccionadas `partial → overdue` cuando corresponde a partir de día +1;
2. cierre `overdue → cancelled` a partir de día +60, liberando la plaza conforme a la lógica existente;
3. procesamiento de la cola de emails ya vencidos, incluidos los eventos generados por las transiciones anteriores.

Las RPC económicas existentes siguen siendo la fuente de verdad y mantienen locks/idempotencia.

## Gate Preview actual

Validado:

- Persistencia Supabase: activa.
- SumUp Sandbox: operativo.
- Webhook: operativo para pago único, primera cuota y segunda cuota.
- Renderer HTML + texto: operativo.
- Resend Sandbox: operativo.
- Worker: `ready=true` con la configuración de Preview validada.
- `EMAIL_PREVIEW_READY=YES`.
- E01: validado.
- E02: validado.
- E10: validado.
- CTA privado de estado de matrícula: validado manualmente y protegido con token firmado.
- CTA de pago de segunda cuota: backend y página segura validados con pago Sandbox real.
- Cancelación automática E03–E09 al completar el segundo pago: validada.
- Scheduler: implementado en código y protegido; pendiente únicamente de `CRON_SECRET` y de un entorno con frecuencia horaria admitida cuando se abra el Gate live de preventa.

## Pendiente antes de abrir preventa live

1. Verificar el dominio/subdominio definitivo de envío en Resend.
2. Sustituir `onboarding@resend.dev` por el remitente corporativo definitivo.
3. Configurar el buzón corporativo definitivo de soporte.
4. Crear `CRON_SECRET` exclusivo para Production, de al menos 32 caracteres.
5. Configurar variables live de SumUp exclusivamente cuando se autorice pasar de Sandbox a producción.
6. Pasar el proyecto a Vercel Pro —o definir un scheduler externo equivalente— y activar la frecuencia horaria del mantenimiento de preventa.
7. Limpiar o identificar explícitamente los datos Sandbox antes de la apertura real.
8. Realizar revisión final del PR y mergear únicamente con autorización expresa.

## Restricciones vigentes

- No mergear la rama de preventa a `main` sin autorización expresa.
- No activar correo real de preventa en Production.
- No activar SumUp live.
- No reutilizar secretos de Preview en Production.
- No exponer `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PREVENTA_CHECKOUT_TOKEN_SECRET`, `PREVENTA_EMAIL_WORKER_SECRET` ni `CRON_SECRET` en logs, commits o URLs.
