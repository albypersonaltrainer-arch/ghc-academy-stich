# GHC ACADEMY V2 — evaluación oficial y desbloqueos
**Estado:** propuesta técnica, NO aplicada a Supabase. Sin autorización de publicación.

## Sistemas que ya existen
- `ghc_student_get_my_courses`: matrícula y siguiente lección.
- `ghc_student_get_lesson_experience`: lectura privada de contenido, progreso, evaluaciones y acceso autorizado.
- `ghc_student_complete_lesson`: persistencia de lección.
- `ghc_student_submit_learning_exam`: guarda intentos y puede completar lección/módulo.
- `ghc_student_get_published_course_exam` y `ghc_student_submit_course_exam`: examen final tras módulo, con reglas comerciales de acceso.
- `module_completions`, `lesson_progress`, `exam_attempts`, `certificates`: tablas existentes.

## Hallazgo que bloquea la activación de V2
En `supabase/migrations/20260811132000_ghc_p0_secure_learning_flow_rpc.sql` el procedimiento legado hace:
```sql
v_score := round((v_correct_answers::numeric / v_total_questions::numeric) * 100)::integer;
v_passed := v_score >= v_pass_percentage;
```
Con un 79,5 % puede resultar 80 % tras redondear y aprobar indebidamente. Debe mantenerse la nota de presentación si interesa, pero **la decisión de aprobado debe usar comparación exacta de enteros**:
```sql
v_passed := (v_correct_answers * 100 >= v_total_questions * v_pass_percentage);
```
Además, cuando el curso requiere 80 % deben comprobarse los valores actuales de `pass_percentage`, `pass_score` y `passing_score` de los exámenes; existen valores de reserva de 70 % en funciones históricas. Antes de activar, revisar las diferencias y proponer migración idempotente en copia de prueba, verificando la fachada `private.ghc_internal_submit_learning_exam_legacy` en la versión realmente instalada.

## Estado del código V2
- `lib/academy/v2-academic-flow.ts`: estado de acceso, evaluación, progreso y siguiente módulo **solo para presentación**.
- `app/ghc-v2/curso/page.tsx`: lector privado de la experiencia académica de un alumno autenticado mediante RPCs existentes.
- **Escrituras desactivadas por bandera de código fija.** No se guardan intentos, progreso ni calificaciones desde esta página; no se importan documentos.
- `app/seguimiento-v2/page.tsx`: recorrido de demostración con datos ficticios, sin conexión a Supabase.
- Los resultados oficiales y el certificado deben provenir exclusivamente del servidor; nunca del cálculo del navegador ni del quiz demostrativo.

## Para activar en una fase posterior con autorización
1. Validar Word íntegro del Módulo 1 e importación privada aprobada.
2. Probar datos reales de alumno en entorno de prueba aislado, incluida la caducidad de acceso, límites de intentos y preguntas incompletas.
3. Corregir la comparación estricta del 80 % **mediante migración SQL autorizada** y sin tocar los respaldos originales.
4. Ensayar 79,5 % → suspenso, 80 % → aprobado, progreso y desbloqueo efectivo de módulo 2.
5. Solo tras aprobar el circuito, habilitar explícitamente las acciones de escritura V2 y preparar certificados propios GHC después del examen final.
