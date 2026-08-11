# CHECKPOINT · Exámenes y certificado · 2026-08-11

## Objetivo
Eliminar patrones aprovechables en la posición de las respuestas correctas y validar de extremo a extremo el flujo curso -> examen final -> aprobado/suspenso -> certificado.

## Cambio aplicado
- La posición correcta deja de depender de la letra que devuelva el modelo de IA.
- Se genera un plan interno por examen en esquema `private`.
- Para un examen de 10 preguntas y 4 opciones, cada letra correcta aparece 2 o 3 veces.
- La secuencia global se aleatoriza y no permite rachas de tres respuestas correctas con la misma letra.
- Los distractores también se recolocan al guardar la pregunta.
- La tabla del plan no está expuesta a `anon` ni `authenticated`.

## Prueba de estrés
Se creó temporalmente un curso QA con un temario de carga, volumen, intensidad, RPE, técnica, calentamiento, recuperación, adaptación y sueño.

Se generaron 10 preguntas de prueba introduciendo deliberadamente las 10 respuestas correctas como `B` en la entrada, simulando el peor sesgo posible del generador.

Resultado almacenado después de la protección:
- Secuencia: `BADBDCDBCA`
- Distribución: A=2, B=3, C=2, D=3
- Diferencia máxima entre letras: 1
- Rachas triples: ninguna

## E2E alumno
Alumno QA usado: José Luis Velasco.

### Intento 1 · deliberadamente incorrecto
- 10/10 respuestas incorrectas.
- Nota: 0%.
- Resultado: suspenso.
- `course_completions`: no creado.
- Certificado válido: no creado.

### Intento 2 · deliberadamente correcto
- 10/10 respuestas correctas.
- Nota: 100%.
- Resultado: aprobado.
- `course_completions`: creado.
- Certificado válido: creado.
- Intento registrado como número 2.

## Hallazgo adicional y corrección
La prueba detectó que el emisor automático del examen final podía crear el certificado sin rellenar `student_name_snapshot` y `course_title_snapshot`, mientras la verificación pública consume esos snapshots.

Se añadió un trigger de sincronización para que todo certificado nuevo o actualizado mantenga:
- nombre de alumno snapshot,
- título de curso snapshot,
- email cuando exista,
- `verification_code`,
- `code`.

Se backfillearon certificados existentes con campos vacíos.

La verificación pública del certificado QA mostró después correctamente:
- alumno: José Luis Velasco · Alumno Feedback,
- curso: QA · Fundamentos de carga y recuperación,
- nota: 100,
- estado: valid.

## Limpieza
Todo el curso QA, matrícula temporal, progreso, intentos y certificado temporal fueron eliminados después de la prueba.

Verificación final de limpieza:
- QA courses: 0
- QA access: 0
- QA attempts: 0
- QA certificates: 0

## Migraciones
- `20260811135055_ghc_exam_answer_position_randomization.sql`
- `20260811135546_ghc_exam_answer_position_plan.sql`
- `20260811135937_ghc_certificate_snapshot_sync.sql`
