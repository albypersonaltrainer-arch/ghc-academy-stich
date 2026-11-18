# GHC ACADEMY — ESTADO MAESTRO
**Corte de verificación:** 2026-11-18 (Europa/Madrid)  
**Estado documental:** activo; primera versión creada en rama V2 aislada.  
**Fuente de verdad operativa:** este documento + `GHC_ACADEMY_BITACORA_LOGROS.md` + evidencias en GitHub, Vercel y Supabase. Ante cualquier contradicción, verificar sistema y fuentes, NO sobrescribir los hechos.
**Seguridad de publicación:** este repositorio es PÚBLICO. No escribir textos académicos de pago, datos personales, direcciones de correo, tokens, secretos, credenciales, evaluaciones con soluciones o contenido privado del alumnado en estos archivos.

## 1. Misión y decisiones vigentes
- Objetivo: GHC Academy V2 interactiva con un mínimo de 8 cursos, objetivo ampliado de 10. No reconstruir V1 ni duplicar su desarrollo. Mantener identidad oficial y eslogan `SPORT THROUGH SCIENCE`; diseño del aula actual todavía NO aprobado (fatiga visual señalada por el usuario).
- Entrenador Personal: 30 módulos académicamente cerrados según los informes maestros previos, divididos en tres niveles. **Cierre documental no equivale a 30 módulos ya importados y verificados en Supabase.** No regenerarlos desde cero.
- Experiencia de alumno: vídeo educativo breve, lección íntegra en página, examen, corrección y explicaciones, progreso persistente; umbral de aprobado **80 %**, bloqueo del módulo siguiente hasta superarlo; certificado propio GHC tras cumplir todos los requisitos. NO anunciar acreditación oficial externa.
- FACTORÍA IA: **exactamente tres funciones de agentes**: (1) investigación/generación de contenidos y fuentes, (2) producción audiovisual de 4–6 minutos por módulo, (3) generación de exámenes con respuestas/justificaciones. Las notas, intentos, progreso, bloqueo y certificados los gestiona GHC Academy, no un cuarto agente. No crear agentes por nombre sin demostrar necesidad.
- Puede exportarse Word/PDF para revisión, pero la conversión al aula debe preservar contenido estructurado sin exigir PDF intermedio.
- Sin generación o edición de imágenes ni vídeos sin autorización explícita de ejecución. Sin publicar, alterar V1, contratar APIs, instalar herramientas ni ejecutar cambios irreversibles sin autorización específica.

## 2. Evidencias verificadas directamente el 18/11/2026
### GitHub y despliegue
- Repositorio fuente: `albypersonaltrainer-arch/ghc-academy-stich` (visibilidad: **público**).
- Rama V2 aislada y no de producción: `feature/ghc-importador-academico-20261116`.
- Rutas existentes y revisadas: `app/ghc-control-center/importador/page.tsx`, `app/ghc-control-center/aula-modelo/page.tsx`, `app/api/academy/import/staging/aula/route.ts`, `app/api/academy/import/staging/commit/route.ts`.
- Código existente: extractor DOCX/PDF, borradores privados, previsualización, clasificación/ocultación de material docente, visualización de unidades por encabezado H2 y progreso de demo administrativo. La evidencia de pruebas automáticas no equivale a E2E completo en navegador.
- Vercel proyecto: `prj_lzAkM5g2Hzg2NaDl2LgH6QUuAWKh`; último despliegue READY comprobado: `dpl_DKSz8ZMtYBBRchaKHckMyhu6RSrv`, commit `6cb9f4f4b69dab3acd4540b25a7da250228f64c4` en Preview (sin `target` Production). Otros despliegues anteriores fallaron durante correcciones y NO deben presentarse como entregas estables.
- No existe evidencia aquí de que todo lo nuevo esté publicado ni de una prueba integral de compra, examen y certificado.
### Supabase
- Proyecto `oqlxvesnjdkxlxwxkikq` — consultado SOLO LECTURA.
- Consulta SQL directa, NO el estimador de filas de la lista de tablas: `public.courses` **5**, `public.modules` **3**, `public.lessons` **16**, `public.exams` **25** (23 draft, 1 archived, 1 published), `public.certificates` **3**, `public.exam_blueprints` **1**.
- `ghc_academic_staging.import_batches`: **1** borrador del Módulo 1, `MODULO_1_NIVEL_1_COMPLETO.docx`, estado `needs_correction`, huella `6324a0da7894cb3ffad2bf37311219fc9235b565d8bce0a627ec6bf561b361f5`. No es la reconstrucción íntegra.
- `ghc_academic_staging.aula_demo_progress`: **0** registros en la comprobación. No hay prueba de sesión real de alumno con evaluación y progreso integral.
- RLS declarado habilitado en las tablas consultadas; NO implica auditoría completa de las políticas.
### Fuente académica
- Documento de referencia inspeccionado en pruebas anteriores: `GHC_ACADEMY_MODULO_1_RECONSTRUCCION_ACADEMICA_2026.docx` (73.729 bytes; SHA-256 `8dc645921abfe0fa3ef756d0e56dd9f60f84ace16a33ea42f7756e2112d0c4cf`; 31 encabezados H1, 82 H2, 23 H3 y 12 tablas). **No cargado en staging**. No almacenar su contenido de pago en este repositorio público.
- Informes maestros de cierre global de 3 niveles y 30 módulos documentados anteriormente; falta contrastar existencia, versiones y SHA de los 30 archivos fuente reales antes de importarlos en lote.
- La V1 es referencia y debe conservarse sin modificaciones.

## 3. Catálogo registrado en la base de datos (NO inventar más cursos)
| Registro existente | Estado SQL (18/11) | Identidad |
|---|---|---|
| Entrenador Personal Nivel 1 | draft | `entrenador-personal-nivel-1` |
| Entrenador Personal Nivel 2 | draft | `entrenador-personal-nivel-2` |
| Entrenador Personal Nivel 3 | draft | `entrenador-personal-nivel-3` |
| Entrenador Especializado en Lipedema | draft | `entrenador-especializado-lipedema` |
| Perla: Por qué caminar no basta en lipedema | draft | `perla-caminar-no-basta-lipedema` |

**Estos son 5 registros, no 5 cursos formativos terminados**: hay tres niveles de una formación y dos elementos de lipedema cuya clasificación debe validarse con el catálogo comercial/académico previamente aprobado. No inventar siete programas adicionales para llegar a 8 cursos hasta recuperar el catálogo anterior.
- Módulos SQL existentes: nivel 1, posiciones 1–3, titulados `Fundamentos del entrenamiento científico`, `Evaluación inicial y objetivos` y `Progresión y control de cargas`. El estado de esos registros no garantiza que sus contenidos sean los Word definitivos.
- No hay clasificación académica definitiva de otros 7–9 cursos verificada en esta revisión.

## 4. FACTORÍA IA — estado tras auditoría de Codex del 18/11
| Función acordada | Base reutilizable | Acreditación y bloqueo |
|---|---|---|
| Contenidos y fuentes | Codex y roles de Agency Agents (Research Synthesist, Statistician, Technical Writer, Evidence Collector) | Codex instalado y probado en trabajos supervisados; roles documentados, no acreditados como agentes ejecutables autónomos. Exige verificación de fuentes y aprobación editorial. |
| Exámenes | Esquema/tablas actuales de GHC + Codex/roles reutilizados | Existen `exam_blueprints` y tablas de preguntas/intentos; generación IA y ciclo alumno 80%→desbloqueo→certificado aún no probados extremo a extremo. |
| Vídeos 4–6 min | OpenMontage candidato principal; FFmpeg/FFprobe instalados; WanGP y MoneyPrinterTurbo candidatos alternativos | OpenMontage/WanGP tienen código pero NO ejecución local demostrada; FFmpeg solo verificado por versión. Antes de producir, comprobar derechos/licencias, compatibilidad, costes, duración y autorización específica para generación de medios. |

Open Duet 0.8.4 operativo en funciones históricas probadas; Qwen/llama.cpp probado localmente para asistencia, no validación científica; ARGOS (7 especialistas + REVIEWER) probado para auditorías web, no validación científica ni pedagógica. No crear más agentes solo por organización.

## 5. Hecho, probado, pendiente — límites explícitos
**Hecho:** infraestructura V2 aislada, APIs de borrador y demo, modelo básico de progreso privado, esquema persistente para contenidos/exámenes/certificados.
**Probado:** despliegue Vercel READY de Preview, pruebas automatizadas de conversión y protección de material, consultas SQL de estado real.
**Pendiente de comprobar:** 30 Word fuente exactos; importación por lotes sin pérdida; 80 % y desbloqueo; exámenes IA aprobados; certificados propios; pruebas de usuario real; sistema audiovisual de 4–6 minutos; licencias; catálogo aprobado de 8–10 cursos; revisión visual; auditoría de seguridad y de backups.

## 6. Versionado, respaldos y recuperación
- Línea de base antes de crear este documento: el último despliegue READY se identifica arriba. Git conserva histórico de commits en rama separada; la creación de los documentos NO modifica los archivos existentes. **No hacer merge automático a `main`.**
- Para cada cambio posterior: (a) comprobar branch y SHA inicial, (b) revisar diferencias, (c) generar commit reversible y referencia de punto de restauración, (d) ejecutar tests, (e) verificar build Preview, (f) esperar aprobación. Nunca exponer secretos ni contenidos privados en Git.
- **Respaldo de base de datos Supabase NO VERIFICADO.** No existe evidencia obtenida en esta revisión de copia restorable, instantánea PITR ni ensayo de recuperación. Una rama Git NO respalda datos Supabase.
- Antes de escribir masivamente contenido o modificar tablas: obtener y verificar un respaldo real de Supabase/Storage por mecanismo apropiado según plan y permisos; documentar alcance, cifrado, acceso, fecha, retención y restauración. **No tocar producción ni activar funciones que incurran en cargos sin autorización.**
- Artefactos de aulas/estudiantes y materiales docentes solo en almacenamiento privado con permisos verificados. Registrar referencias/hashes, nunca claves.

## 7. Bitácora, aprobación y continuidad
- Documento acumulativo: `GHC_ACADEMY_BITACORA_LOGROS.md` (también en esta rama). Solo marcar como **APROBADO POR USUARIO** tras confirmación explícita.
- Tras cada hito aprobado: fecha/hora comprobada, ID, modificación, pruebas y resultado, aprobación, SHA de Git/DB y siguiente paso. Verificar lectura posterior.
- En chats nuevos, consultar primero ambos documentos y código/datos actuales. Si discrepan, priman las evidencias comprobadas; registrar discrepancia, no sobrescribir automáticamente.

## 8. Siguiente paso exacto
**Recuperar el catálogo ya decidido de 8–10 cursos y localizar los 30 Word finales de Entrenador Personal, con ruta y SHA; después, confirmar respaldo verificable de Supabase antes de la primera importación masiva privada.** No generar material audiovisual ni alterar la V1. La secuencia posterior: convertir lecciones al aula, validar examen 80 % y desbloqueos/certificado, probar vídeo 4–6 minutos con aprobación específica.

### Confrontación con relevo anterior de Biblioteca
Existe en Biblioteca el documento histórico `GHC_ACADEMY_MATRIZ_FUENTE_ESTADO_MAESTRO_2026-11-18.md` (relevo e instrucciones; **no** una instalación). Propone cuatro nombres alternativos bajo `docs/`, pero la instrucción definitiva del usuario especifica los dos nombres exactos de raíz usados aquí. **No abrir otra matriz paralela ni duplicar bitácoras.** Para el futuro, usar estos dos archivos versionados como canon; el documento de Biblioteca es antecedente consultable. El objetivo de 8 cursos sigue pendiente de recuperación de nombres aprobados, no de creación arbitraria.

### Localización física/documental verificada
En los archivos consultables se ha localizado el Word reconstruido del **Módulo 1** y un archivo del **Módulo 20** (`GHC_ACADEMY_MODULO_20_DEFINITIVO_2026.docx`). Esto **no** acredita que los otros 28 originales estén actualmente accesibles ni cuál es su ubicación definitiva. Los informes de cierre siguen siendo la evidencia de desarrollo académico previo.

## 9. Referencias de continuidad
- `docs/academy/GHC_STAGING_PRIVADO_ACTIVADO_2026-11-16.md`
- Rama `feature/ghc-importador-academico-20261116`
- Supabase proyecto `oqlxvesnjdkxlxwxkikq`
- Vercel Preview `dpl_DKSz8ZMtYBBRchaKHckMyhu6RSrv`
- Auditoría operativa FACTORÍA IA realizada por Codex el 18/11/2026 (documento recibido en conversación; no copiar registros privados al repositorio).
