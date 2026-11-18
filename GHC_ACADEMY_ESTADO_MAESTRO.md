# GHC ACADEMY — ESTADO MAESTRO
**Corte de verificación:** 2026-11-18 (Europa/Madrid)  
**Estado documental:** activo; auditoría de 34 Word consolidada el 18/11/2026; rama V2 aislada. **Estado más reciente: sección 11.**  
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
**Localización e integridad de 30 Word + 4 informes maestros comprobadas el 18/11/2026 (sección 11). Siguiente bloqueo operativo: verificar respaldo restaurable de Supabase/Storage antes de cualquier importación, previa autorización específica del usuario.** No generar material audiovisual ni alterar la V1. La secuencia posterior: convertir lecciones al aula, validar examen 80 % y desbloqueos/certificado, probar vídeo 4–6 minutos con aprobación específica.

### Confrontación con relevo anterior de Biblioteca
Existe en Biblioteca el documento histórico `GHC_ACADEMY_MATRIZ_FUENTE_ESTADO_MAESTRO_2026-11-18.md` (relevo e instrucciones; **no** una instalación). Propone cuatro nombres alternativos bajo `docs/`, pero la instrucción definitiva del usuario especifica los dos nombres exactos de raíz usados aquí. **No abrir otra matriz paralela ni duplicar bitácoras.** Para el futuro, usar estos dos archivos versionados como canon; el documento de Biblioteca es antecedente consultable. El objetivo de 8 cursos sigue pendiente de recuperación de nombres aprobados, no de creación arbitraria.

### Localización física/documental verificada
**Estado actualizado el 18/11/2026:** inventarios de solo lectura realizados en el equipo del usuario han localizado los 30 Word definitivos y los cuatro informes de cierre; sus SHA-256 han coincidido en la auditoría posterior. Véase sección 11 para evidencias, ruta relativa y límites. Este hallazgo no implica que los archivos se hayan copiado, subido o importado en la plataforma.

## 9. Referencias de continuidad
- `docs/academy/GHC_STAGING_PRIVADO_ACTIVADO_2026-11-16.md`
- Rama `feature/ghc-importador-academico-20261116`
- Supabase proyecto `oqlxvesnjdkxlxwxkikq`
- Vercel Preview `dpl_DKSz8ZMtYBBRchaKHckMyhu6RSrv`
- Auditoría operativa FACTORÍA IA realizada por Codex el 18/11/2026 (documento recibido en conversación; no copiar registros privados al repositorio).

## 10. Verificación documental adicional — 18/11/2026 (NO es aprobación de contenido)
- **Índice oficial de los 30 módulos recuperado** del documento privado `PROMPT_MAESTRO_GHC_ACADEMY_PREVENTA_2026(1).txt` (agosto 2026), sección “Arquitectura oficial de los treinta módulos”: 10 módulos en Nivel 1 (Fundamentos Profesionales), 10 en Nivel 2 (Metodología de Entrenamiento Especializado) y 10 en Nivel 3 (Maestría Profesional y Dirección del Servicio). Su estructura nominal está preservada en esa fuente; NO significa tener los 30 archivos Word descargados. Se documenta que las versiones definitivas de los Módulos 21 y 22 sustituyen a las anteriores.
- **Catálogo histórico independiente recuperado** del documento privado “PROYECTO: GHC CURSOS”: aproximadamente **42 cursos candidatos**, distribuidos en seis áreas (Entrenamiento; Salud, Ejercicio y Readaptación; Nutrición; Valoración; Poblaciones Especiales; Tecnología y Datos). La carpeta histórica de organización era `Escritorio/Alby Negocios/Cursos`; su existencia actual en Windows **NO verificada**. Los 42 son candidatos, no la selección aprobada de 7 adicionales para abrir con Entrenador Personal. No publicar el catálogo ni precios internos en GitHub público.
- **Búsqueda de ficheros:** dos Word académicos accesibles en el ámbito de Library/archivos de conversación (Módulos 1 y 20); búsquedas actuales en Drive y Dropbox no devolvieron paquete completo de Word GHC. No se ha inspeccionado el ordenador del usuario en esta tarea; el resto de originales requiere inventario local de solo lectura.
- **Backup — hecho verificado:** proyecto Supabase GHC Academy en organización con plan **Free**, comprobado por consulta de organización; proyecto `ACTIVE_HEALTHY`. La documentación vigente de Supabase indica que las copias diarias automáticas corresponden a Pro/Team/Enterprise y recomienda `supabase db dump` + almacenamiento externo para proyectos Free; los objetos de Storage necesitan copia separada. **No hay backup restaurable acreditado ni prueba de recuperación; no importar datos en masa hasta resolverlo.** Referencia pública de proveedor: `https://supabase.com/docs/guides/platform/backups`.
- **Acción controlada de búsqueda anterior (ya concluida el 18/11):** el inventario local encontró los 30 Word y cuatro informes, y después se auditaron por SHA-256 y OOXML (sección 11). El respaldo Supabase/Storage sigue pendiente y necesita permiso específico antes de nuevas acciones.


## 11. Inventario completo de 34 Word y resolución de cuatro advertencias — 18/11/2026
**Hito autorizado por el usuario:** actualizar únicamente este estado maestro y la bitácora con los resultados ya recogidos; NO constituye aprobación para importaciones, modificaciones académicas, publicación, producción ni cambios en Supabase.

### Ubicación local verificada por inventario de solo lectura
- Ruta relativa respecto del Escritorio: `Alby Negocios/Cursos/CURSO ENTRANDOR PERSONAL PITTI/` (se omite la ruta absoluta y el nombre de usuario porque el repositorio GitHub es público).
- Subcarpetas: `NIVEL 1` (M01–M10), `NIVEL 2` (M11–M20), `NIVEL 3` (M21–M30). En la colección hay también cuatro informes maestros.
- Se inventariaron metadatos, nombres y hashes de los documentos en Windows; **los DOCX originales continúan en el ordenador del usuario**, no se adjuntaron a GitHub ni al campus. Algunos nombres tienen sufijos de copia `(1)`; antes de importarlos deberá utilizarse exactamente el fichero cuyo SHA figura abajo.
- **Fuentes de evidencia recibidas:** `GHC_BUSQUEDA_DEFINITIVOS_20261118_173305.zip` (189 candidatos), `GHC_AUDITORIA_34_WORD_20261118_180433.zip` (auditoría XML/huellas) y `GHC_COMENTARIOS_M11_M14_20261118_182942.zip` (comprobación de comentarios); los archivos ZIP de resultados son locales/privados, no forman parte de GitHub público.

### Resultados contrastados
- **30/30 módulos** + **4/4 informes**: cada DOCX tiene estructura OOXML legible y SHA-256 coincidente con el inventario anterior; **0 cambios de huella**, **0 fallos de lectura XML**, **0 marcas de control de cambios detectadas**. Los 30 módulos tienen hashes diferentes entre sí.
- Las cuatro advertencias de `word/comments.xml` corresponden a M11, M12, M13 y M14. Auditoría específica: en cada uno `XML_VACIO_SIN_ANCLAS`, **0 comentarios OOXML detectables, 0 referencias/anclas y SHA-256 coincidente**. No requieren limpieza automática; permanecen los archivos XML vacíos. Los comentarios modernos de Word o accesibilidad visual no quedan cubiertos por estas pruebas.
- Palabras aproximadas, por recuento automatizado: Nivel 1 **107.703**, Nivel 2 **96.055**, Nivel 3 **83.806**; total **287.564**. Son cifras técnicas aproximadas, no un recuento editorial Word certificado.
- M01 auditado: **73.729 bytes**, SHA coincidente con reconstrucción previa `8dc645921abfe0fa3ef756d0e56dd9f60f84ace16a33ea42f7756e2112d0c4cf`.
- **Límites:** NO se ha verificado científicamente el texto completo, ni paginación/maquetación visual, calidad de recursos, accesibilidad completa, compatibilidad de importación o autorización de publicación. NO hay todavía respaldo restaurable de Supabase/Storage verificado.

### Manifiesto criptográfico de módulos (solo metadatos, sin contenidos privados)
| Módulo | Nivel | SHA-256 del Word verificado |
|---|---|---|
| 01 | Nivel 1 | `8dc645921abfe0fa3ef756d0e56dd9f60f84ace16a33ea42f7756e2112d0c4cf` |
| 02 | Nivel 1 | `0562258a4920dc3368154e1f02fd9ead341305f2f42d4581564454d5d8d1a0de` |
| 03 | Nivel 1 | `5c48ba56d3c2041a53341af15dbf5b3e68a556aba20d7cd1928bbe847d9d1199` |
| 04 | Nivel 1 | `28d30a24329885eefe9e93c8ebab76ae3a031bd6ce1091f8b673b5a19c71e6e1` |
| 05 | Nivel 1 | `74a76d4f99d4401d6ef3431dbcba933f921b7c6a9f7c527d1933c91db9f854dc` |
| 06 | Nivel 1 | `b412bd167d00dac20d69b73956d174234c82a1213a5ce75889c1f6dc4f351114` |
| 07 | Nivel 1 | `7c3f8203f40bb2617a6cde4c8394dae662423ebbaf5871a1605b68e0abe36e68` |
| 08 | Nivel 1 | `f620b02feee85fb6ab24b929e5cbc61f65db867b79286af02251ee84ba72e856` |
| 09 | Nivel 1 | `0fe90713c95b255d615fef8e4f7d0cfd33e471a8a6fe161a0fa1e1b43cc150da` |
| 10 | Nivel 1 | `3266fa958b3d24e7dd5e683aa4ac54ee4c2136ec956a17f97348cc7a81233fa7` |
| 11 | Nivel 2 | `c4214719e6a992210cdf395c4b7f865f28d9e8deb018b6268c87de6191fe5224` |
| 12 | Nivel 2 | `476752ecc3058616f89120884c15f1f103247774319167069dd8a8b803754c32` |
| 13 | Nivel 2 | `cca4edf6b4a5e02c537948a408c96e571227b3b0bfe791da9cf6e49b0376acef` |
| 14 | Nivel 2 | `88c015727c12e5b8cd7b8ce1a9a8e0ef3e2c27deb84fb7a14bc199a256cdecfb` |
| 15 | Nivel 2 | `95fc497b798d3b29a87fbae5bf9ffa9c2c08c6364e8356eef865ad49d9a986e5` |
| 16 | Nivel 2 | `8e03f9b856f3128e9cc1a6cbee73cfe8f348604ea83c885b09d068fab146755d` |
| 17 | Nivel 2 | `ab4a5b6c410949ea1e3a15b6bb4fa2127f6ffb58725a22b26e8dcccb13217fdd` |
| 18 | Nivel 2 | `aba8ed999fbcefa107d852524defe57c3b714e1f8d552b8f6060a0c71b7677b0` |
| 19 | Nivel 2 | `04bc995025b4f1b362ca6f83c30dabbed7a6080c4c33e76e80017b8870d8b46c` |
| 20 | Nivel 2 | `238ae44f7bbd6c179000e84ea8bc2370918db9229feb9a44768955b300a050c9` |
| 21 | Nivel 3 | `1fbe8034289693378b57d68776f06de4f0c72fa7553bc72813845a1cbb7ba49c` |
| 22 | Nivel 3 | `d285797d7f075db332db0d2cf1ac11d6012134dfbd1c44fb125b3d6ee8151884` |
| 23 | Nivel 3 | `84cd413daa870104bdac7829291a02523d264366030ebfed6a9fdb5de96b56ba` |
| 24 | Nivel 3 | `f085bb8a66a01176570689d1e19771e91ab056dd522e77fac2c8960d1b1203d4` |
| 25 | Nivel 3 | `d17c8e528bf3bcb90530183b0fc46731099b38d4eef29c6498f5456aa2492c9b` |
| 26 | Nivel 3 | `d6a4f33047c285507633895d9b528cd2c7180d0cff79ed29f02699991f427d5a` |
| 27 | Nivel 3 | `236f441e2df716e1fd14bfb19b8af31762da4a6e0fcbb544cae1b58801bec7e1` |
| 28 | Nivel 3 | `288c964999d3e15434b8d4058b6269d3402c10bbec15c21d9d3e460fea7c0f21` |
| 29 | Nivel 3 | `619eb583a97ce7319de8e6feee999fe1eb9c17dd7dd1811717593d72d5369540` |
| 30 | Nivel 3 | `27769bd89b5af710ced3da89b67ee2b7e4d13e83c651223ae8136ae58231e03e` |

### Manifiesto de los informes maestros
| Informe | SHA-256 verificado |
|---|---|
| Cierre global | `2dc86f4211864abebf287f54c0951ac08e18f088e6507517a4e1e4a526afaab8` |
| Cierre Nivel 1 | `0b709d5cfff431825ce9a0ce45d902d01e78da00562e533e9a855d2f2724e2d8` |
| Cierre Nivel 2 | `4afd3c91408d9dd1a4be0d200810b75297ae1c8f0ac3b7d460873c2031635530` |
| Cierre Nivel 3 | `e566145f24274e42902bb0da0c15a99934869423b7f38d133d94a21f5990662d` |

### Siguiente tarea pendiente (requiere permiso separado)
**Preparar y validar el respaldo de Supabase y Storage, con restauración comprobable, antes de importar material académico.** El sistema de Git solo respalda código/documentación; no respalda base de datos ni objetos de Storage. Mantener intactos V1, producción y archivos Word hasta nueva autorización.
