# CHECKPOINT · GHC Academy · fraccionamiento, acceso proporcional y desistimiento

Fecha: 2026-08-11
Rama: `academy-installments-automation-2026-08-11`
Base inicial: `1ba520200fe4077d22724574e54f9c2cf4ce000a`

## Objetivo cerrado

Dejar la Academy post-lanzamiento preparada para vender productos desde minicursos hasta high-ticket con un motor comercial independiente del proveedor de pago, altamente automatizado, visible para administración y con override manual trazado.

SumUp y Stripe NO se conectan en este bloque. Se integrarán después como proveedores que confirman cobros sobre este motor.

## Política comercial activa

Política: `GHC_ACADEMY_DEFAULT_2026_08`

- Menos de 150 €: pago único.
- De 150 € a 399,99 €: máximo 2 pagos.
- De 400 € a 999,99 €: máximo 3 pagos.
- Desde 1.000 €: máximo 4 pagos.
- Nunca más de 4 pagos internos.
- Cuotas separadas por 30 días.
- Cada curso puede desactivar el fraccionamiento o reducir su máximo a 1/2/3/4.
- Fraccionamiento interno GHC para consumidor: coste financiero 0 € en la política actual.
- Si en el futuro se desea financiación con coste, la arquitectura reserva `external_financing` para proveedor externo autorizado.
- El checkout muestra precio total final e importes exactos de cada cuota. No presenta porcentajes de recargo cuando el coste es cero.

## Acceso comercial + acceso académico

Se añaden dos candados independientes:

1. Candado comercial: solo puede llegar hasta el tramo cubierto por pagos confirmados.
2. Candado académico: mantiene la secuencialidad ya existente de lecciones, módulos y exámenes.

Ambos deben permitir el avance.

Cálculo por cuotas pagadas:
`ceil(total_modulos * cuotas_pagadas / cuotas_totales)`.

QA validada con 10 módulos y 4 pagos de 300 € sobre un curso de 1.200 €:

- 300 € -> módulos 1-3.
- 600 € -> módulos 1-5.
- 900 € -> módulos 1-8.
- 1.200 € -> módulos 1-10 + `commercial_fully_paid=true`.

Con solo la primera cuota, intentar abrir el módulo 4 devuelve `commercial_lock=true` antes de la secuencialidad académica.

Examen final de curso:
- requiere todos los módulos académicamente completados;
- requiere pago completo.

Certificado válido:
- no puede emitirse para un pedido Academy con saldo pendiente.

## Impago y recordatorios

Automatización horaria Supabase (`pg_cron`):
`ghc-academy-commercial-automation` a minuto 17 de cada hora.

Cadencia:
- 5 días antes: recordatorio amistoso.
- Día de vencimiento: aviso.
- +3 días: recordatorio.
- +7 días: recordatorio.
- +15 días: recordatorio final normal.
- +30 días: cierre automático del plan si sigue sin regularizar.

Regla esencial:
- un retraso NO quita el contenido ya pagado;
- el siguiente tramo no se abre hasta confirmar el siguiente pago;
- a +30 días el plan se cierra, pero el alumno conserva el techo comercial adquirido.

QA:
- cuota 2 retrasada artificialmente 31 días;
- plan -> `cancelled`;
- acceso previamente pagado -> siguió `active` con módulo máximo 3;
- aviso alumno = creado;
- aviso admin = creado.

## Intervención manual administrativa

Control Center: `/ghc-control-center/financiacion`

Permite:
- marcar manualmente una cuota como pagada;
- ampliar vencimientos +7 o +15 días;
- pausar/reanudar la automatización de cobro/avisos;
- reactivar un plan cerrado;
- forzar un límite concreto de módulos;
- forzar acceso completo;
- retirar override y volver al cálculo automático;
- aprobar/rechazar solicitudes de reembolso antes de que exista ejecución en proveedor;
- ejecutar manualmente la revisión automática.

Toda intervención genera evento comercial con actor/motivo/fecha.

QA reactivación:
- plan cancelado reabierto manualmente;
- próxima cuota reprogramada a +7 días;
- acceso y progreso pagados se conservaron.

Bandeja admin:
`/ghc-control-center/avisos-comerciales`

Muestra avisos operativos y permite marcarlos como leídos.

## Alumno

Área:
`/alumno/pagos`

Muestra:
- pedidos;
- precio final;
- número de pagos;
- cada cuota, importe, vencimiento y estado;
- techo comercial actual;
- coste de fraccionamiento;
- situación de desistimiento/reembolso;
- avisos de desbloqueo, vencimientos y cambios.

El layout del alumno muestra acceso directo a `Pagos` y `Soporte`.

## Checkout provider-neutral

Ruta:
`/matricula/[slug]`

En esta fase NO cobra.

Permite:
- elegir entre modalidades permitidas según precio/política/curso;
- mostrar cada plan con importes exactos;
- aceptar términos y privacidad;
- elegir `Quiero comenzar ahora`;
- cuando hay contenido digital, exige además reconocimiento expreso de la consecuencia sobre el desistimiento ordinario;
- si falta ese segundo reconocimiento, el backend rechaza la preparación aunque se intente saltar la UI.

Al preparar el pedido se guarda una `academy_contract_confirmation` con snapshot de:
- curso;
- precio total;
- coste financiero;
- cuotas e importes;
- vencimientos previstos;
- tipo de cliente;
- tipo de entrega;
- inicio inmediato sí/no;
- aceptación relacionada con desistimiento;
- versiones de términos/privacidad/legal.

## Regla de los 14 días

El reloj se ancla al PRIMER PAGO CONFIRMADO, no a la simple preparación del pedido.

Si el alumno elige `Quiero comenzar ahora` y el contenido digital requiere el reconocimiento correspondiente:
- antes del primer pago no hay acceso;
- al confirmar el primer pago, acceso inmediato al tramo pagado;
- se registra la solicitud de inicio y el reconocimiento expreso;
- el motor clasifica el desistimiento ordinario del contenido digital como no disponible conforme al supuesto configurado.

QA:
- pedido inmediato con reconocimiento -> primer pago -> `active`, módulo máximo 3;
- `ordinary_withdrawal_available=false`;
- solicitud por `withdrawal` -> `not_eligible`;
- solicitud por `nonconformity` -> `manual_review`.

Si el alumno NO elige comenzar ahora:
- primer pago confirmado -> `waiting_withdrawal`;
- `course_access` = 0 durante el periodo;
- acceso programado a primer pago + 14 días;
- al vencer, la automatización crea el acceso al tramo pagado.

Derechos imperativos distintos del desistimiento ordinario (falta de conformidad, cobro duplicado, error de facturación u otras causas protegidas) no se bloquean: pasan a revisión.

Productos `service` o `hybrid` se pueden clasificar por curso y derivan a revisión cuando el régimen de servicios exige cálculo o análisis específico.

## Avisos

La lógica de avisos está desacoplada del cobro.

`academy_notifications` registra mensajes de alumno/admin y sirve de bandeja in-app y cola preparada para email.

Actualmente cerrado:
- mensajes automáticos in-app al alumno;
- bandeja automática admin;
- deduplicación por evento;
- trazabilidad.

Pendiente de lanzamiento:
- activar un transporte de correo saliente para esta cola y validar entregabilidad. No se mezcló con el worker temporal de preventa.

## Seguridad

Tablas comerciales nuevas:
- RLS habilitado;
- `anon` sin SELECT directo;
- `authenticated` sin SELECT directo;
- lectura/escritura solo mediante RPCs controladas.

`ghc_public_get_course_payment_options`:
- anon/authenticated EXECUTE: intencional; solo devuelve pricing de cursos publicados.

`ghc_student_prepare_academy_order`:
- anon: no;
- authenticated: sí; usa `auth.uid()` y validaciones internas.

RPCs admin:
- anon: no;
- authenticated: ejecución técnica, pero cada función exige `ghc_is_admin()`.

Worker privado:
- anon/authenticated: no.

Trigger functions:
- sin ejecución directa de clientes.

Advisor Supabase mantiene avisos genéricos previos sobre SECURITY DEFINER/RLS sin policies porque esta arquitectura usa RPCs + grants explícitos. Sigue pendiente el warning externo `Leaked Password Protection Disabled` en Auth.

## Migraciones de este bloque

Producción Supabase:
- `20260811150907 ghc_academy_commercial_installment_engine`
- `20260811151020 ghc_academy_commercial_academic_guards`
- `20260811151101 ghc_academy_commercial_automation`
- `20260811151417 ghc_academy_withdrawal_and_refund_policy`
- `20260811152004 ghc_academy_commercial_control_center_api`
- `20260811152337 ghc_academy_payment_plan_policy_resolution`
- `20260811152954 ghc_academy_checkout_consent_hardening`
- `20260811153046 ghc_academy_withdrawal_clock_on_first_payment`
- `20260811154643 ghc_academy_admin_commercial_notifications`

Todos versionados en `supabase/migrations/` con los mismos números.

## QA cleanup

Curso temporal utilizado:
`qa-installments-automation-20260811`

Tras recoger evidencia se eliminaron:
- course_access QA;
- academy_orders QA y cascadas (cuotas, consentimientos, confirmaciones, eventos, notificaciones, refunds);
- settings QA;
- curso/módulos/lecciones QA.

Verificación final:
- QA courses = 0
- QA orders = 0
- QA access = 0
- QA contract confirmations = 0
- QA refund requests = 0

## Pendiente explícito

1. Conectar y probar SumUp.
2. Conectar y probar Stripe posteriormente.
3. Si se ofrece financiación con coste, conectar proveedor externo/autorizado y adaptar disclosures al régimen vigente en la fecha de lanzamiento.
4. Activar transporte real de email para `academy_notifications` y probar entregabilidad.
5. Revisar textos legales definitivos inmediatamente antes del lanzamiento por posibles cambios regulatorios.
6. Activar Supabase Auth Leaked Password Protection.

El motor comercial no depende de esos proveedores: éstos solo deberán confirmar/reflejar el cobro o reembolso en el expediente Academy.
