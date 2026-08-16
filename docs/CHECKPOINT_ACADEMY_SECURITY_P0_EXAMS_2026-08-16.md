# CHECKPOINT · GHC Academy · P0 Exámenes · 2026-08-16

Complementa los checkpoints de seguridad anteriores con los hallazgos y correcciones realizados después del PR #58.

## Estado final verificado

- Producción Vercel tras PR #61: `READY`.
- Preventa LIVE continúa operativa.
- Academy continúa cerrada por middleware.
- `/api/academy/payments/sumup-checkout`: 404 en Producción.
- `/ghc-control-center`: 503 + `noindex` + `no-store`.
- Runtime errors Vercel, verificación final 30 min: 0.
- Asersiones finales Supabase: `FINAL_ACADEMY_SECURITY_ASSERTIONS_OK`.

## PR #59 · Límites DB de reembolsos

Aplicado en Supabase real y fusionado en `main`:

- `academy_refund_requests.reason_text <= 8000`;
- `academy_refund_requests.decision_reason <= 8000`.

Antes de aplicar:

- 0 filas excedían los límites;
- constraints probados/validados dentro de transacción con ROLLBACK;
- CI completo verde.

No cambia elegibilidad, importes, estados ni revisión humana.

## P0 #60 · Bypass directo del examen final

### Vulnerabilidad confirmada

`ghc_student_submit_course_exam(uuid,jsonb)` no repetía el gate que usa la pantalla del examen final.

Una identidad autenticada ficticia sin matrícula pudo llamar directamente la RPC y alcanzar la validación de respuestas (`Debes responder todas las preguntas`). Esto probó, sin escrituras, que no se comprobaban antes de grading:

- matrícula/acceso actual;
- pago comercial completo;
- todos los módulos completados.

La función legacy podía, en caso de aprobar, crear `course_completion` y certificado.

### Corrección

- implementación de grading movida a `private.ghc_internal_submit_course_exam_legacy`;
- EXECUTE revocado a roles API;
- fachada pública conserva la firma original;
- exige examen publicado `exam_scope='course'`;
- reutiliza `ghc_student_get_published_course_exam(course_id)` como gate canónico;
- exige `unlocked=true`;
- exige que `p_exam_id` coincida exactamente con el examen final disponible;
- solo entonces llama a la lógica legacy privada.

### Validación

- DDL ensayado primero con ROLLBACK;
- identidad sin matrícula bloqueada antes de grading;
- `authenticated` sin EXECUTE sobre legacy privada;
- CI Academy + PostgreSQL verde;
- migración aplicada a Supabase real;
- prueba posterior a migración repetida con ROLLBACK;
- PR #60 fusionado.

## P0 #61 · Acceso actual en exámenes de lección/módulo

### Hallazgo

Los exámenes de lección ya comprobaban acceso exacto, pero el branch de módulo dependía de progreso histórico. Un usuario que hubiera completado lecciones y luego perdiera acceso podía conservar suficiente progreso para intentar llamar directamente la RPC de examen de módulo.

No existían exámenes de módulo publicados en el momento del hallazgo, por lo que no había explotación activa observada.

### Corrección

- grading legacy movido a `private.ghc_internal_submit_learning_exam_legacy`;
- EXECUTE revocado a roles API;
- fachada pública valida examen publicado lesson/module;
- lesson: exige acceso actual a la lección;
- module: toma una lección real del módulo y reutiliza `ghc_internal_student_lesson_access` como gate comercial/actual;
- la lógica legacy mantiene después la exigencia de completar todas las lecciones, intentos y scoring.

### Prueba fuerte

Dentro de una transacción en Supabase real:

1. se creó un examen temporal de módulo en draft;
2. se añadió una pregunta activa y `approved`;
3. se publicó respetando el trigger real de publicación;
4. una identidad ficticia sin matrícula intentó entregar respuestas;
5. quedó bloqueada antes de grading;
6. legacy privada no era ejecutable por `authenticated`;
7. ROLLBACK eliminó examen/pregunta/estado temporal.

La prueba se repitió después de aplicar la migración real. PR #61 fusionado.

## Confidencialidad de respuestas de examen

Verificado:

- `ghc_student_get_published_course_exam` no entrega `correct_option`, `is_correct` ni explicación previa;
- `ghc_student_get_lesson_experience` tampoco entrega respuestas correctas;
- `exam_questions` y `exam_question_options` tienen RLS sin policy SELECT para alumnos;
- un alumno no puede saltarse la RPC para leer el banco de preguntas/opciones;
- `exam_attempt_answers` es visible al alumno solo para sus propios intentos posteriores.

No se encontró fuga pre-intento de respuestas correctas.

## Gate de integridad pedagógica · issue #62

El examen final publicado actual tiene:

- `attempts_mode = unlimited`;
- `max_attempts = null`;
- `show_explanation = true`;
- aprobado al 70%.

La RPC de resultado devuelve siempre `correct_label`, `correct_text` e `is_correct`; `show_explanation` solo controla el texto narrativo de explicación.

Con reintentos ilimitados, un alumno puede aprender las respuestas tras un intento fallido y repetir. No es un bypass técnico y no se cambia automáticamente: requiere decisión pedagógica/certificadora.

## Gate de identidad de certificado · issue #63

La emisión/snapshot del certificado utiliza `profiles.full_name` y `profiles.email`. El alumno puede editar esos campos de su propio perfil; `role` sí está protegido.

Datos actuales verificados:

- 3 perfiles existentes;
- 0 discrepancias entre `profiles.email` y `auth.users.email`;
- 0 perfiles sin `full_name`.

No hay inconsistencia actual, pero antes de certificar alumnos reales debe definirse si el diploma usa identidad auto-declarada, identidad verificada o identidad aprobada por administración.

## Asersiones finales de permisos

La verificación final de Supabase exige y confirmó:

- solo las 3 RPC públicas intencionadas son ejecutables por `anon`;
- `anon` no puede entregar exámenes course/learning;
- `authenticated` puede ejecutar las fachadas públicas de entrega;
- `authenticated` no puede ejecutar las implementaciones legacy privadas;
- `ghc_internal_student_lesson_access(uuid,uuid)` no es ejecutable por `anon`/`authenticated`;
- ninguna RPC `ghc_provider_*` es ejecutable por `authenticated`.

Resultado: `FINAL_ACADEMY_SECURITY_ASSERTIONS_OK`.

## Estado después de los P0

- **P0 acceso examen final: CERRADO**.
- **P0 acceso examen lección/módulo: CERRADO**.
- **Banco de preguntas/respuestas previas: protegido por RPC + RLS**.
- **Producción: READY y sin errores runtime en la verificación final**.
- **Academy: sigue cerrada**.
- **SumUp Academy: sigue cerrado**.
- **Preventa LIVE: sigue operativa**.

## Gates humanos que siguen vigentes antes de abrir Academy

Prioridad mínima antes de apertura:

- #35 · Leaked Password Protection;
- #42 · MFA de admins + revisión de sesiones AAL1;
- #48 · política real de contraseña vs copy de registro;
- #62 · política de intentos/feedback del examen certificador;
- #63 · fuente/verificación de identidad en certificados.

Otros pendientes técnicos/no bloqueantes siguen documentados en los checkpoints e issues anteriores.