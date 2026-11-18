# GHC ACADEMY — BITÁCORA ACUMULATIVA DE LOGROS
**Iniciada:** 2026-11-18 · Rama V2: `feature/ghc-importador-academico-20261116`  
**Regla:** sólo añadir entradas; nunca borrar logros anteriores. No confundir "ejecutado" con "aprobado por el usuario". Este repositorio es público: no incluir datos de alumnos, claves, textos docentes privados ni soluciones de exámenes.

## Hitos históricos recuperados — NO transcribir como aprobaciones nuevas
| Referencia | Estado y evidencia | Aprobación |
|---|---|---|
| Cierre académico global de Entrenador Personal | Informes maestros previos documentan 3 niveles y 30 módulos cerrados. Debe verificarse cada Word exacto antes de importación. | Aprobación histórica comunicada en el proyecto; no renovada en esta auditoría |
| V2 importador y demo privada (16/11/2026) | Código en rama de laboratorio; pruebas automatizadas; Preview READY `dpl_DKSz8ZMtYBBRchaKHckMyhu6RSrv`; lote breve Módulo 1 en staging. | Aprobación de publicación de contenidos: **NO** |
| Auditoría FACTORÍA IA (18/11/2026) | Informe de Codex recibido; Open Duet, Codex, Qwen y ARGOS probados dentro de su alcance; OpenMontage/WanGP no acreditados como generadores operativos locales. | No autoriza instalación/generación |

## Entradas de ejecución desde la instauración de esta bitácora

### GHC-CONT-20261118-001 · Verificación de estado + creación de matriz fuente
- **Fecha:** 2026-11-18 (hora de ejecución no registrada en el presente documento; consultar fecha del commit de GitHub para hora UTC verificable).
- **Solicitud autorizada:** instaurar estado maestro, bitácora y protocolo de respaldo; verificar en modo lectura V2, Supabase y contenido disponible. No se autorizó modificar V1 ni producción.
- **Acciones:** revisión de repo GitHub, rama V2, Vercel Preview, tablas SQL y catálogo; creación de `GHC_ACADEMY_ESTADO_MAESTRO.md` y del presente documento en rama de laboratorio, sin alterar archivos previos ni tablas.
- **Contenido verificado:** 5 registros `courses`, 3 `modules`, 16 `lessons`, 25 `exams` (23 draft/1 archived/1 published), 3 `certificates`, 1 fuente Word breve de staging; curso completo de 30 módulos reportado como cerrado documentalmente pero aún no importado íntegro.
- **Pruebas realizadas:** consultas de solo lectura a Supabase; consulta de metadatos de repositorio/despliegue; comprobación previa de ausencia de ambos archivos en rama V2 y `main`. Pendiente: releer y verificar ambas rutas tras commit.
- **Resultado:** documentos de continuidad creados; no se ha verificado backup restaurable de base de datos. Cambios de documentación NO implican aprobación de nuevas funcionalidades académicas.
- **Aprobación humana de este hito:** PENDIENTE de validación posterior; no falsear.
- **Punto de recuperación:** rama `feature/ghc-importador-academico-20261116`; Git conserva el historial de commits. Último despliegue previo READY: `dpl_DKSz8ZMtYBBRchaKHckMyhu6RSrv`. No usar un despliegue Preview como copia de seguridad de Supabase.
- **Dependencias:** verificar mecanismo de backups Supabase/Storage, catalogar Word originales y cursos previstos, validar examen y certificado con usuario de prueba.
- **Siguiente tarea exacta:** recuperar fuentes exactas de los 30 Word, el catálogo anterior de 8–10 cursos y verificar respaldo restorable antes de migraciones o importaciones masivas.

### Registro de persistencia y antecedentes recuperados
- Documento maestro inicial creado en commit `17816bcfdda3a25301548cbaba3cf7ebe87da799`; bitácora inicial creada en `18226225de5a0c59a2820398b8fee505147837ba`.
- Ambos fueron **releídos desde GitHub** en la rama V2 y comprobados como existentes. Git es el almacenamiento persistente del texto y conserva el versionado, pero esto **no valida** backup de datos de Supabase ni prueba la recuperación de la base.
- Consta un documento previo de matriz/relevo en Biblioteca con nombres alternativos propuestos. La instrucción definitiva especifica los nombres exactos aquí utilizados; no crear segunda matriz paralela. Se han localizado en archivos consultables los Word de Módulos 1 y 20, no los 30 originales completos.
- Este registro corresponde a establecimiento técnico solicitado, **aún no ratificado por el usuario como hito aprobado**.

## Plantilla para la siguiente entrada (NO sustituir logros anteriores)
```text
### GHC-AAAAMMDD-NNN · Título del logro
- Fecha y hora (zona horaria + fuente):
- Alcance autorizado:
- Archivos y sistemas afectados:
- Respaldo previo y restauración:
- Pruebas, evidencias y resultados:
- Aprobación explícita del usuario:
- SHA / versión / deploy:
- Riesgos pendientes:
- Siguiente tarea exacta:
```


### GHC-CONT-20261118-002 · Recuperación documental de catálogo y diagnóstico de respaldos
- **Fecha:** 18/11/2026; hora verificable por Git commit.
- **Alcance:** continuar verificaciones de fuentes históricas y respaldo sin modificar GHC Academy, FACTORÍA, V1, código de aplicación, base de datos ni producción.
- **Fuentes verificadas:** `PROMPT_MAESTRO_GHC_ACADEMY_PREVENTA_2026(1).txt` (índice de 30 módulos y referencias de informes de cierre); documento privado `PROYECTO: GHC CURSOS` (42 cursos candidatos, seis áreas y ubicación histórica en `Escritorio/Alby Negocios/Cursos`); archivos de Biblioteca, Google Drive y Dropbox; organización de Supabase y documentación oficial de backups.
- **Resultado:** índice de 30 módulos recuperado **documentalmente**, no sus 30 Word completos; catálogo de 42 candidatos recuperado, pero no se ha identificado selección aprobada de 7 cursos de apertura; los resultados de Drive/Dropbox no incluyen el pack completo; Supabase GHC confirmado en plan **Free** sin garantía de backups automáticos; backup recuperable NO acreditado.
- **Archivos modificados:** únicamente `GHC_ACADEMY_ESTADO_MAESTRO.md` y esta bitácora, en rama `feature/ghc-importador-academico-20261116`; sin publicar material docente privado o precios en GitHub.
- **Pruebas:** consultas de Drive/Dropbox y Library, lectura de documentos fuente, consultas de organización y proyecto Supabase. Sin generación audiovisual, importaciones, migraciones ni dumps.
- **Aprobación de este hito por usuario:** **PENDIENTE** (progreso técnico registrado, no una nueva aprobación académica).
- **Respaldo:** historial Git para documentación; **sin respaldo de base de datos validado** ni restauración de prueba.
- **Siguiente tarea:** localizar Word 1–30 con SHA-256 en el equipo mediante inventario de solo lectura; verificar y ejecutar respaldo real de Supabase previo a importaciones, con aprobación expresa para operaciones externas necesarias.


### GHC-CONT-20261118-003 · Auditoría de 30 Word definitivos y cierre de 4 advertencias técnicas
- **Fecha de los informes:** 18/11/2026 (inventario local 17:33:05, integridad 18:04:38 y comentarios 18:29:42, hora local del equipo); la hora de la actualización Git se verifica en el historial del commit.
- **Autorización explícita del usuario:** «sí» a actualizar los **dos documentos de continuidad en GitHub** tras recibir el informe de las cuatro advertencias. Es una aprobación de **registro documental**, NO de importación, despliegue ni edición del temario.
- **Alcance autorizado:** escribir solo `GHC_ACADEMY_ESTADO_MAESTRO.md` y `GHC_ACADEMY_BITACORA_LOGROS.md` en la rama aislada `feature/ghc-importador-academico-20261116`. Los archivos Word, V1, código de aplicación, Vercel, Supabase y producción permanecen sin cambios.
- **Evidencias recibidas y contrastadas:** `GHC_BUSQUEDA_DEFINITIVOS_20261118_173305.zip` (189 candidatos); `GHC_AUDITORIA_34_WORD_20261118_180433.zip` (CSV con 30 módulos y 4 informes, recuentos XML y SHA); `GHC_COMENTARIOS_M11_M14_20261118_182942.zip` (M11–M14).
- **Hallazgo:** los **30 archivos académicos definitivos** están en un árbol local separado de los materiales antiguos: carpeta relativa `Alby Negocios/Cursos/CURSO ENTRANDOR PERSONAL PITTI`, con `NIVEL 1`, `NIVEL 2`, `NIVEL 3` y cuatro informes maestros. Ver en la Matriz Fuente el manifiesto de **34 SHA-256 completos**; no se han publicado contenidos docentes ni rutas privadas absolutas.
- **Prueba de integridad:** **30/30** módulos y **4/4** informes con `Estado=OK`, `OOXML=XML_OK` y hash igual al inventario; **0** variaciones de SHA y **0** revisiones controladas detectadas. Las 30 huellas de módulos son distintas. Recuento estimado: 107.703 + 96.055 + 83.806 = **287.564 palabras**.
- **Resolución de las cuatro advertencias:** M11, M12, M13 y M14 contienen `word/comments.xml` sin comentarios OOXML ni anclas: `XML_VACIO_SIN_ANCLAS`, 0 referencias, 0 comentarios y hash sin cambios. Se cierra la incidencia **técnica**; no equivale a auditoría visual, científica o de comentarios modernos de Word.
- **Registro en GitHub:** Matriz Fuente actualizada en commit `2bf5e56cc42cad55478da7dd7ce97069590d5e1d` (blob `7824fe5701b8a9ef98bfcf1a692c0d3dbabf97ee`); esta entrada se añade en commit posterior del mismo branch. Los commits guardan el historial de los Markdown, **no** un respaldo de Supabase ni una copia de los Word.
- **No realizado:** sin importación a plataforma, sin modificación del aula, sin cambios en la base de datos, sin generación audiovisual, sin verificación visual/científica ni copia restaurable de Supabase.
- **Siguiente tarea (REQUERIRÁ NUEVA AUTORIZACIÓN):** preparar y validar un respaldo/restauración de Supabase y Storage antes de la importación académica. No activarlo sin permiso.
