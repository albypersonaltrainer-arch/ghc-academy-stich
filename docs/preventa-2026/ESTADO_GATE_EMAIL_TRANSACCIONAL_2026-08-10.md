# GHC Academy · Preventa 2026 · Estado Gate de email transaccional

Fecha de corte inicial: 2026-08-10
Última actualización: 2026-08-11

## Estado

**QA E2E ECONÓMICO Y TRANSACCIONAL CRÍTICO SUPERADO EN PREVIEW/SANDBOX · GATE LIVE DE PREVENTA SIGUE CERRADO**

La validación se realizó con SumUp Sandbox, Supabase y Resend en modo de prueba. Las pruebas de preventa no activaron SumUp live ni entrega real de email de preventa.

## Resultado E2E pago único + E01

Flujo verificado:

`SumUp Sandbox → webhook → Supabase → cola E01 → worker → Resend → buzón de prueba → CTA privado de matrícula`

Resultado:

- Pago Sandbox de 1.690 € confirmado.
- Orden de prueba: `GHC-C0A2CD93`.
- Estado de orden: `paid`.
- Plaza Fundador asignada: n.º 1.
- Webhook SumUp procesado correctamente.
- E01 creado y entregado.
- El mecanismo de reintento de email quedó validado después de un rechazo inicial de Resend por destinatario Sandbox no autorizado.
- Recepción del correo confirmada manualmente.
- CTA privado de matrícula probado manualmente y validado después de la corrección.

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
- E03–E09 quedaron `cancelled` automáticamente;
- E10 se generó y envió en el mismo ciclo del webhook;
- E10 fue revisado manualmente y su CTA privado mostró correctamente la matrícula abonada.

Las rutas temporales utilizadas para acelerar la prueba de cuota 2 y ejecutar el worker fueron eliminadas tras la validación.

## Fallo real de pago + E12

Se ejecutó un checkout real de SumUp Sandbox con una tarjeta de prueba que fuerza fallo de autenticación 3DS.

Orden: `GHC-2435393F`.

Resultado verificado:

- SumUp devolvió fallo real del checkout;
- webhook verificó el estado contra la API de SumUp;
- pago quedó `failed` y con 0 € cobrados;
- orden quedó `awaiting_payment`, por tanto reintentable;
- plaza temporal fue liberada;
- `founder_place_number` quedó `null`;
- E12 se generó y envió exactamente una vez;
- recepción y contenido del mensaje fueron confirmados manualmente.

## Checkout expirado real + E13

Se creó un checkout PENDING real en SumUp Sandbox y se desactivó mediante la API del proveedor, provocando estado `EXPIRED`.

Resultado verificado:

- SumUp devolvió `EXPIRED`;
- webhook reconsultó el checkout contra SumUp y aplicó la transición;
- intento quedó `expired`;
- pago quedó `pending`, con 0 € cobrados;
- orden quedó `awaiting_payment`, por tanto reintentable;
- hold de capacidad quedó `expired` y liberado;
- ninguna plaza Fundador quedó retenida;
- E13 se generó y envió en un único intento;
- la ruta temporal de QA fue eliminada inmediatamente después de la prueba.

## Reembolso real SumUp + E14

Se detectó que la transición interna de refund estaba cubierta por SQL, pero faltaba la operación real contra SumUp. Se añadió un servicio server-side reutilizable que ejecuta el orden correcto:

`SumUp refund aceptado → transición interna Supabase → liberación de plaza → reversión de comisión → E14`

La prueba se realizó sobre `GHC-0FD27434`, que tenía dos transacciones de 895 €.

Resultado:

- SumUp Sandbox aceptó el refund completo de la primera transacción de 895 €;
- SumUp Sandbox aceptó el refund completo de la segunda transacción de 895 €;
- total reembolsado: 1.790 €;
- ambos pagos quedaron `refunded` y con `refunded_amount_cents = 89500`;
- orden quedó `refunded`;
- plaza Fundador quedó `released` y `founder_place_number = null`;
- base de comisión quedó en 0 €;
- comisión quedó `reversed`;
- E14 se generó y envió correctamente por Resend;
- la ruta temporal utilizada para ejecutar la prueba fue eliminada después del test.

El servicio permanente queda en capa server-side; antes del lanzamiento debe conectarse a una operación administrativa segura y autenticada para que un reembolso real no dependa de código temporal.

## Impago de segunda cuota + cierre día +60

Además de las suites PostgreSQL de CI, se ejecutó una prueba transaccional contra el Supabase real del proyecto dentro de una transacción terminada en `ROLLBACK`, por lo que no dejó datos QA persistentes.

Quedó verificado:

- no se puede marcar `overdue` antes de `second_due_at + 1 día`;
- `partial → overdue` funciona en el momento permitido;
- no se puede ejecutar cierre +60 antes de la fecha exacta (`DAY60_TOO_EARLY`);
- `overdue → cancelled` funciona a +60 días;
- el cierre libera la plaza Fundador;
- E09 se sincroniza con el momento efectivo del cierre;
- las operaciones son idempotentes.

## Suites automáticas

La CI `Preventa PostgreSQL Integration` cubre de forma recurrente:

- pago único y fraccionado;
- idempotencia de pagos;
- hold obligatorio y límites de capacidad;
- `FAILED` y `EXPIRED`;
- refund y reutilización de plaza;
- pago tardío de segunda cuota después de `overdue`;
- cancelación E03–E09 al completar pago;
- E09–E14;
- permisos de funciones económicas y tablas privadas.

## CTA privado de matrícula

Los emails E01, E02 y E10 utilizan una ruta privada `/preventa/matricula` con:

- token firmado específico;
- validación server-side;
- lectura server-side de datos administrativos;
- referencia de matrícula insuficiente por sí sola para consultar datos;
- caducidad del enlace;
- ausencia de secretos en cliente, URL o email.

Validación manual superada.

## Scheduler de preventa

Está implementado el motor de mantenimiento programado:

- endpoint `/api/preventa/cron`;
- protegido mediante `Authorization: Bearer <CRON_SECRET>`;
- lógica preparada para frecuencia horaria;
- marca `partial → overdue` cuando corresponde;
- ejecuta cierre `overdue → cancelled` a +60 y libera plaza;
- drena emails vencidos.

El plan Vercel Hobby no admite el cron horario requerido. Para no degradar la precisión, el cron no está declarado en `vercel.json` mientras no exista un scheduler adecuado.

**Requisito de lanzamiento:** Vercel Pro o scheduler externo equivalente, `CRON_SECRET` exclusivo de Production y frecuencia horaria activa.

## Gate Preview actual

Validado:

- Persistencia Supabase.
- SumUp Sandbox.
- Pago único 1.690 €.
- Pago fraccionado 895 € + 895 €.
- Webhook y verificación server-to-server contra SumUp.
- Fallo real `FAILED`.
- Expiración real `EXPIRED`.
- Reembolso real de proveedor, incluida matrícula con dos transacciones.
- Impago, overdue y cierre +60.
- Reserva, confirmación, liberación y reutilización de plazas Fundador.
- Idempotencia económica.
- E01, E02, E10, E12, E13 y E14 E2E.
- Cadena E03–E09 y cierre E09 por suites/QA transaccional.
- Resend Sandbox y worker.
- CTA privado de matrícula.
- CTA de segunda cuota.
- CI PostgreSQL.

## Pendiente antes de abrir preventa live

1. Verificar el dominio/subdominio definitivo de envío en Resend.
2. Sustituir `onboarding@resend.dev` por remitente corporativo definitivo.
3. Configurar buzón corporativo definitivo de soporte.
4. Pasar a Vercel Pro o scheduler equivalente y activar mantenimiento horario.
5. Crear `CRON_SECRET` exclusivo para Production.
6. Configurar credenciales live de SumUp únicamente al abrir el Gate live.
7. Conectar `refund-service` a una acción administrativa segura/autenticada para operar refunds sin rutas temporales.
8. Reconciliar la rama de preventa con el `main` actual, que ha recibido cambios de Academy en paralelo, y resolver cualquier conflicto antes del merge.
9. Limpiar o identificar explícitamente datos Sandbox existentes antes de apertura.
10. Ejecutar QA final de Production con cobro real controlado de importe mínimo o procedimiento equivalente autorizado, una vez estén las credenciales live.
11. Revisión final del PR y merge únicamente con autorización expresa.

## Restricciones vigentes

- No mergear la rama de preventa a `main` sin autorización expresa.
- No activar SumUp live sin Gate explícito.
- No activar email real de preventa sin dominio/remitente definitivo.
- No reutilizar secretos de Preview en Production.
- No exponer `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PREVENTA_CHECKOUT_TOKEN_SECRET`, `PREVENTA_EMAIL_WORKER_SECRET` ni `CRON_SECRET` en logs, commits o URLs.
