# GHC Academy · Preventa 2026 · Estado Gate de email transaccional

Fecha de corte: 2026-08-10

## Estado

**PRUEBA E2E DE PAGO + E01 SUPERADA EN PREVIEW · PRODUCTION SIGUE CERRADA**

La validación se realizó íntegramente con SumUp Sandbox, Supabase real de desarrollo/Preview y Resend en modo de prueba. No se activó entrega real en Production.

## Resultado E2E validado

Flujo verificado:

`SumUp Sandbox → webhook → Supabase → cola E01 → worker → Resend → buzón de prueba`

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

La prueba real confirmó también el mecanismo de reintento: el primer intento quedó registrado y el segundo terminó en `sent` sin repetir el pago ni duplicar la matrícula.

## Corrección posterior al test

Durante la revisión manual del E01 se detectó que el CTA **“Ver estado de mi matrícula”** apuntaba a `/preventa`.

Se corrigió el flujo para E01, E02 y E10:

- nueva ruta privada `/preventa/matricula`;
- enlace firmado específico para consulta de matrícula;
- validación server-side del token;
- lectura server-side de los datos administrativos de la matrícula;
- la referencia por sí sola no permite consultar una matrícula;
- el enlace firmado tiene caducidad y no expone `SUPABASE_SERVICE_ROLE_KEY` ni otros secretos.

Los emails enviados antes de esta corrección conservan su URL histórica; los nuevos emails generan el CTA seguro.

## Scheduler de preventa

Se detectó un hueco operativo adicional: E03–E09 ya tenían `scheduled_for`, pero el worker solo se ejecutaba automáticamente inmediatamente después de ciertos webhooks de pago.

Se implementó el motor de mantenimiento programado:

- endpoint: `/api/preventa/cron`;
- protegido mediante `Authorization: Bearer <CRON_SECRET>`;
- lógica preparada para ejecutarse una vez por hora;
- Vercel Cron solo se activa en deployments de Production;
- Production no se ha desplegado ni activado.

La cuenta Vercel actual es compatible con despliegues Preview, pero el intento de declarar `0 * * * *` en `vercel.json` fue rechazado por la limitación del plan Hobby: ese plan solo permite cron una vez al día y con precisión horaria. Para no degradar la precisión de los recordatorios de pago, el cron horario no queda declarado mientras el proyecto siga en Hobby.

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
- Webhook: operativo.
- Renderer HTML + texto: operativo.
- Resend Sandbox: operativo.
- Worker: `ready=true` con la configuración de Preview validada.
- `EMAIL_PREVIEW_READY=YES` tras alinear el probe con el destinatario autorizado.
- CTA de estado de matrícula: corregida y protegida con token firmado.
- Scheduler: implementado en código y protegido; pendiente únicamente de `CRON_SECRET` y de un entorno con frecuencia horaria admitida cuando se abra el Gate de Production.

## Pendiente antes de Production

1. Verificar el dominio/subdominio definitivo de envío en Resend.
2. Sustituir `onboarding@resend.dev` por el remitente corporativo definitivo.
3. Configurar el buzón corporativo definitivo de soporte.
4. Crear `CRON_SECRET` exclusivo para Production, de al menos 32 caracteres.
5. Configurar variables live de SumUp exclusivamente cuando se autorice pasar de Sandbox a producción.
6. Pasar el proyecto a Vercel Pro —o definir un scheduler externo equivalente— y activar la frecuencia horaria del mantenimiento de preventa.
7. Ejecutar una última prueba controlada del CTA privado de matrícula con un email generado después de la corrección.
8. Limpiar o identificar explícitamente los datos Sandbox antes de la apertura real.
9. Realizar revisión final del PR y mergear únicamente con autorización expresa.

## Restricciones vigentes

- No mergear `main` todavía.
- No activar correo real en Production.
- No activar SumUp live.
- No reutilizar secretos de Preview en Production.
- No exponer `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PREVENTA_CHECKOUT_TOKEN_SECRET`, `PREVENTA_EMAIL_WORKER_SECRET` ni `CRON_SECRET` en logs, commits o URLs.
