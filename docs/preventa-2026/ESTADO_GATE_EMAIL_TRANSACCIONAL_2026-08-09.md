# GHC Academy · Preventa 2026 · Gate de email transaccional

Fecha de corte: 2026-08-09

## Estado

**IMPLEMENTACIÓN TÉCNICA LISTA · ENTREGA REAL CERRADA POR GATE**

No activar envío de producción ni configurar credenciales live hasta completar la validación de entrega en Preview y aprobar el Gate final.

## Serie cubierta

E01–E14:

- E01 · matrícula confirmada · pago único
- E02 · primera cuota confirmada
- E03 · faltan 3 días para la segunda cuota
- E04 · vence hoy
- E05 · vencida · día 1
- E06 · regularización · día 7
- E07 · regularización · día 30
- E08 · último aviso · día 53
- E09 · cierre efectivo por impago
- E10 · matrícula completamente abonada
- E11 · apertura y acceso
- E12 · intento de pago rechazado
- E13 · sesión de pago caducada
- E14 · reembolso total confirmado

## Implementado

- Renderer HTML real con estilos inline y fallback de texto plano.
- Sustitución estricta de variables; una variable requerida ausente bloquea el envío.
- Escape HTML de datos dinámicos.
- CTA HTTPS validada.
- Enlaces firmados para reanudar pagos pendientes.
- Página server-side `/preventa/pago` que valida firma antes de permitir crear un nuevo Hosted Checkout.
- Adapter de Resend por API REST.
- Idempotency-Key estable por `queue_id`.
- En Preview, cualquier entrega queda forzada a `PREVENTA_EMAIL_TEST_RECIPIENT`; nunca se usa el email real de la matrícula.
- Worker privado protegido por secreto de al menos 32 caracteres.
- Claim concurrente con `FOR UPDATE SKIP LOCKED`.
- Recuperación de locks `processing` huérfanos tras 15 minutos.
- Backoff de reintento: 5 min, 30 min, 2 h y 8 h; quinto intento terminal.
- Eventos de auditoría para envío, reintento y fallo terminal.
- RPCs del worker accesibles solo a `service_role`.
- Preview del renderer disponible solo fuera de producción.

## Validaciones

- Vercel Preview: READY.
- Build: sin errores.
- GitHub Actions `Preventa PostgreSQL Integration`: run 100 · SUCCESS.
- Supabase real: migraciones del worker aplicadas.
- Supabase real a fecha de corte: 0 órdenes, 0 emails en cola, 0 entregas pendientes.
- Endpoint de estado del worker: disponible; `ready=false` mientras falten proveedor, remitente, soporte y secreto.

## Variables necesarias para prueba de entrega en Preview

Configurar **solo en Preview**:

- `PREVENTA_EMAIL_DELIVERY_ENABLED=true`
- `PREVENTA_EMAIL_PROVIDER=resend`
- `RESEND_API_KEY=<secreto Resend>`
- `PREVENTA_EMAIL_FROM=GHC Academy <matriculas@send.ghcacademy.net>`
- `PREVENTA_EMAIL_TEST_RECIPIENT=<buzón real de prueba>`
- `PREVENTA_EMAIL_SUPPORT=<dirección de soporte>`
- `PREVENTA_EMAIL_WORKER_SECRET=<secreto aleatorio >= 32 caracteres>`

La dirección exacta de remitente puede ajustarse antes del Gate final; el dominio/subdominio debe estar verificado por el proveedor.

## Pendiente antes de abrir el Gate de email

1. Crear/configurar cuenta de Resend.
2. Verificar el subdominio de envío y sus registros DNS.
3. Añadir las variables anteriores únicamente a Vercel Preview.
4. Confirmar que `/api/preventa/email-worker` pasa a `ready=true`.
5. Insertar una matrícula ficticia controlada y poner en cola un email de prueba.
6. Ejecutar el worker privado.
7. Verificar recepción, HTML, texto plano, remitente, CTA, `provider_message_id` y estado `sent` en Supabase.
8. Ejecutar prueba de reintento/fallo sin enviar a alumnos reales.
9. Limpiar datos ficticios.
10. Documentar resultado y mantener Production desactivado hasta Gate final.

## Restricciones

- No mergear `main` por este bloque.
- No habilitar entrega real en Production.
- No reutilizar secretos de Preview en Production.
- No exponer `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PREVENTA_CHECKOUT_TOKEN_SECRET` ni `PREVENTA_EMAIL_WORKER_SECRET` en logs, commits o URLs.
