# GHC Academy · Arquitectura operativa de matrícula y pagos · V0.1

## Estado

Documento de implementación en rama `preventa-2026-auditoria-v0-1`.

No ejecuta cobros ni modifica Supabase real. Define la máquina de estados que debe gobernar checkout, SumUp, matrícula, segundo vencimiento, correos E01–E11, atribución comercial y activación académica.

## Precios aprobados

- Pago único fundador: **1.690 €**.
- Pago fraccionado: **1.790 € total**.
- Cuota 1: **895 €**.
- Cuota 2: **895 €**.
- Vencimiento cuota 2: **15 días naturales después del primer pago**.
- Máximo: **100 plazas fundadoras**.

## Principio de arquitectura

El estado de la matrícula no se infiere de la interfaz ni del correo enviado. La fuente de verdad será la base de datos.

Cada cambio importante genera:

1. actualización de estado;
2. evento auditable con clave idempotente;
3. actualización o creación de cuota cuando corresponda;
4. alta/cancelación de correos programados;
5. actualización de atribución/comisión si procede.

## Estados de orden

### `draft`

Orden creada internamente pero aún no preparada para pago.

### `awaiting_payment`

Orden lista para primera transacción. No existe pago válido todavía.

### `partial`

Solo para modalidad fraccionada. Primera cuota de 895 € cobrada y segunda cuota pendiente.

### `paid`

- Pago único: 1.690 € confirmado; o
- Fraccionado: 895 € + 895 € confirmados.

Solo `paid` puede llegar a estado de acceso académico habilitable.

### `overdue`

Modalidad fraccionada con segunda cuota vencida y no pagada.

El expediente puede seguir abierto para regularización conforme al paquete jurídico aprobado, pero el acceso académico permanece bloqueado.

### `cancelled`

Expediente cerrado conforme a las condiciones aplicables o por cancelación administrativa registrada.

### `refunded`

Importe total reembolsado. No debe conservar acceso académico derivado de esa orden salvo decisión administrativa expresa y registrada.

## Estados de plaza fundadora

- `pending`: todavía no consolidada.
- `reserved`: primera transacción válida confirmada; plaza retenida.
- `confirmed`: orden completamente pagada.
- `released`: plaza liberada por cancelación/reembolso conforme a la política que se implemente.

La asignación de `founder_place_number` debe ser única y estar limitada a 1–100.

## Flujo · pago único

### A. Creación

`draft → awaiting_payment`

Se crea:

- referencia única de orden;
- total 169000 céntimos;
- cuota 1 de 169000 céntimos;
- versiones legales aceptadas;
- atribución comercial;
- evidencias de consentimientos.

### B. SumUp aprobado

`awaiting_payment → paid`

Acciones atómicas:

- marcar cuota 1 `paid`;
- registrar `provider_payment_id`;
- guardar importe y hora recibida;
- asignar/reservar número fundador si procede;
- `founder_status → confirmed`;
- calcular base de comisión sobre importe efectivamente cobrado y no reembolsado;
- encolar E01;
- registrar evento `payment.single.paid`.

## Flujo · 50 % + 50 %

### A. Creación

`draft → awaiting_payment`

Se crean:

- total 179000 céntimos;
- cuota 1: 89500 céntimos;
- cuota 2: 89500 céntimos;
- fecha de cuota 2 calculada a +15 días naturales, únicamente después de confirmarse cuota 1.

### B. Primera cuota aprobada

`awaiting_payment → partial`

Acciones:

- cuota 1 `paid`;
- cuota 2 `pending`;
- `second_due_at = paid_at_cuota_1 + 15 días`;
- `founder_status → reserved`;
- asignar número fundador si procede;
- actualizar base de comisión por los 895 € efectivamente cobrados;
- enviar E02;
- programar E03, E04 y vencimientos posteriores;
- registrar `payment.installment1.paid`.

### C. Tres días antes del vencimiento

Estado sigue `partial`.

- enviar E03 una sola vez;
- no modificar estado económico.

### D. Día del vencimiento

Estado sigue `partial` mientras el día no haya concluido según la regla técnica que se adopte.

- enviar E04 una sola vez.

### E. Primer día tras vencimiento sin pago

`partial → overdue`

- cuota 2 `overdue`;
- enviar E05;
- acceso bloqueado;
- conservar expediente abierto.

### F. Seguimiento de regularización

Mientras `overdue`:

- día +7: E06;
- día +30: E07;
- día +53: E08;
- día +60: aplicar cierre solo si no existe excepción aprobada/registrada.

### G. Segunda cuota aprobada antes del cierre

`partial|overdue → paid`

- cuota 2 `paid`;
- cancelar E03–E09 todavía pendientes;
- `founder_status → confirmed`;
- actualizar base de comisión con la segunda cuota;
- enviar E10;
- registrar `payment.installment2.paid`.

### H. Día 60 sin regularización

`overdue → cancelled`

Solo si no existe excepción administrativa válida.

- `founder_status` se trata conforme a la política final de liberación de plaza;
- cancelar comunicaciones de cobro posteriores;
- enviar E09;
- registrar `order.cancelled.nonpayment`.

## Acceso académico

La apertura de octubre y el pago son condiciones independientes.

Un alumno será `access_eligible` únicamente cuando se cumplan simultáneamente:

- plataforma académica declarada operativa;
- orden `paid`;
- no existe reembolso/cancelación que invalide la matrícula;
- alta técnica completada;
- no hay incidencia administrativa bloqueante.

En ese momento:

- enviar E11;
- crear o habilitar matrícula académica;
- registrar `academic.access.enabled`.

## Correos E01–E11

| Código | Disparador |
|---|---|
| E01 | pago único confirmado |
| E02 | primera cuota 895 € confirmada |
| E03 | 3 días antes de segunda cuota |
| E04 | día del segundo vencimiento |
| E05 | día +1 vencido sin pago |
| E06 | día +7 vencido |
| E07 | día +30 vencido |
| E08 | día +53 vencido |
| E09 | cierre día +60 sin excepción |
| E10 | segunda cuota confirmada |
| E11 | plataforma abierta + matrícula apta |

Cada correo se identifica de forma única por `(order_id, template_code)`, evitando duplicados por reintentos técnicos.

## Idempotencia

Todo webhook o callback de pago debe llevar una clave idempotente interna.

El mismo evento externo no puede:

- crear dos pagos;
- asignar dos plazas;
- sumar dos veces una comisión;
- enviar dos correos;
- activar dos veces una matrícula.

## Atribución y comisión

La atribución debe fijarse al crear la orden y conservarse de manera trazable.

Campos mínimos:

- canal de origen;
- detalle/origen concreto;
- campaña si existe;
- closer/código si existe;
- tasa de comisión;
- base de comisión cobrada.

La comisión se calcula sobre importes **efectivamente cobrados y no reembolsados**.

En la modalidad fraccionada, la comisión se devenga por cuota cobrada, no por el total contratado antes de cobrarlo.

## Consentimientos

Registrar por separado y versionados:

- aceptación de condiciones;
- información/privacidad;
- reconocimiento de naturaleza privada de la formación;
- consentimiento comercial opcional.

Nunca usar el consentimiento comercial como condición para comprar.

## Seguridad

Las tablas de preventa no deben ser accesibles directamente desde `anon` ni desde el cliente autenticado.

Las operaciones de pedido/pago se realizan desde servidor con privilegios controlados.

No exponer service-role key al navegador.

No confiar en importes enviados por el cliente. El servidor debe derivar el precio exclusivamente de códigos de oferta válidos:

- `single` → 169000;
- `split` → 179000 / 89500 + 89500.

## Qué NO se hace todavía

- No ejecutar migración en Supabase real.
- No conectar SumUp.
- No habilitar botones de cobro.
- No enviar correos reales.
- No asignar plazas reales.
- No crear alumnos reales.
- No fusionar en `main`.

## Gate previo a ejecución

Antes de aplicar la migración en Supabase real:

1. revisión técnica del SQL;
2. revisión de integración server-side;
3. prueba de idempotencia;
4. prueba de pago único;
5. prueba 895 + 895;
6. prueba de webhook duplicado;
7. prueba de reembolso;
8. prueba de vencimientos/cancelación;
9. prueba E01–E11;
10. autorización expresa de Alby.
