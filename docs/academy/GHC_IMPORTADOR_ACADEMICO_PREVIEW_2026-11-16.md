# GHC Academy · Importador académico · Laboratorio Preview (16-11-2026)

## Decisión del proyecto
Se prepara una vía segura para importar los 30 módulos académicos cerrados en Word, **sin alterar V1**, sin abrir Academy y sin habilitar matrículas, pagos ni correo transaccional.

**Rama independiente:** `feature/ghc-importador-academico-20261116`, derivada de la Preview de seguridad `test/ghc-v1-security-mfa-20261112`. El código NO se ha fusionado a `main`.

## MVP implementado: lectura y vista previa, NO importación persistente
- Página: `/ghc-control-center/importador`.
- API: `POST /api/academy/import/preview`; Node.js, multipart, archivo de 12 MB como máximo.
- Tipos aceptados: `.docx`, `.pdf` con texto extraíble. Los `.doc` antiguos no están soportados.
- Contenido extraído con límites de tamaño: títulos (estilos Heading1–6), párrafos y tablas DOCX; PDF extracción preliminar de cadenas de texto. NO se asume que los PDF complejos puedan extraerse fielmente.
- Presentación del texto sin reescritura de IA, con advertencias, estadísticas, bloques de revisión y copia manual de JSON de revisión al portapapeles.
- **Sin escribir en Supabase Storage ni tablas**; sin crear/editar cursos, módulos o lecciones; sin emitir exámenes ni certificados.
- Los archivos se procesan transitoriamente en memoria por Vercel, y el texto extraído se devuelve exclusivamente a la sesión del solicitante. No se registran contenidos de documentos en logs.

## Seguridad y aislamiento
- Protegido por Supabase Auth, `ghc_is_admin` (admin + TOTP verificado + AAL2).
- El handler no existe funcionalmente fuera del entorno Preview de la rama exacta; deniega con 404.
- Middleware de esta Preview solo deja acceder a `/acceso`, MFA, importador y su API, además del logo y assets compilados. Todo lo demás, incluyendo endpoints de cobro, se cierra.
- Variables Vercel exclusivas de esta rama: `GHC_ACADEMIC_IMPORT_PREVIEW_ONLY=true`; `SUMUP_CHECKOUT_ENABLED=false`, `SUMUP_WEBHOOK_ENABLED=false`, `PREVENTA_EMAIL_DELIVERY_ENABLED=false`, `ACADEMY_CHECKOUT_ENABLED=false`, `ACADEMY_EMAIL_DELIVERY_ENABLED=false`.
- El gate de build comprueba la rama, autenticación configurada, ausencia de SumUp API key y desactivación de efectos comerciales.
- SSO de despliegues Preview de Vercel sigue activado.
- No se toca la base de datos, las políticas RLS, producción, ni PITTI.

## Pruebas
- `scripts/test-academic-import-preview.mjs`, ejecutado automáticamente durante el build de esta rama.
- Fixture sintético DOCX: extrae un encabezado, un párrafo y una tabla.
- Fixture sintético PDF: extrae texto de un flujo comprimido.
- Rechaza extensiones no soportadas y PDF sin texto extraíble.
- Next.js build/TypeScript y deploy deben quedar `READY` antes de invitar al administrador a probarlo en navegador.

## QA adicional con originales reales (biblioteca del proyecto, lectura local)

Se localizaron dos Word definitivos existentes en la biblioteca del usuario. Se extrajeron **solo en el entorno de análisis** para una verificación de paridad estructural; **no se han cargado a Vercel ni adjuntado al repositorio y no se ha creado ningún módulo o lección**. La comparación reproduce los criterios de extracción del parser y coteja el texto con una lectura independiente de DOCX; no sustituye todavía al E2E de subida desde navegador.

| Fuente | Párrafos con contenido | Encabezados | Listas numeradas | Viñetas | Tablas | Celdas de tabla | Gráficos incluidos |
|---|---:|---:|---:|---:|---:|---:|---:|
| Nivel 1, Módulo 1 — «La profesión del entrenador personal» | 813 | 136 | 71 | 390 | 12 | 125 | 0 |
| Nivel 2, Módulo 20 — «Integración avanzada del entrenamiento y Sistema GHC» | 422 | 64 | 186 | 28 | 20 | 396 | 34 |

- **Paridad textual local:** 813/813 párrafos y 125/125 celdas correctos en Módulo 1; 422/422 párrafos y 396/396 celdas correctos en Módulo 20.
- Se ha detectado un estilo de numeración propio del programa, `GHCCompactNumber`, con 186 entradas. La Preview se ha adaptado para reconocerlo como lista numerada sin inventar valores de numeración.
- Se preservan los saltos entre párrafos dentro de una misma celda; el alumno/editor tendrá que cotejar la presentación visual final.
- **Los 34 gráficos/imágenes del Módulo 20 NO se extraen** en esta fase: antes de publicar contenido deberá añadirse un pipeline de recursos con asociación a la lección, accesibilidad y validación. La interfaz advierte que la extracción es incompleta.
- El objetivo de la versión es fidelidad de extracción **textual y semántica inicial**, no importación de medios ni producción.

## Fase 2 — propuesta de lecciones e inventario de imágenes (16-11-2026)

### Trabajo implementado en la misma rama aislada
- `lib/academy/draft-plan.ts` crea una **propuesta no aprobada** por encabezados de nivel 1 y conserva referencias a los bloques originales; no se hacen escrituras en la academia.
- Clasificaciones editoriales iniciales: **lección candidata**, **orientación**, **práctica**, **evaluación**, **solucionario reservado**, **guion de vídeo**, **glosario**, **referencias** y **revisión manual**.
- Las secciones `Respuestas orientativas` quedan marcadas `private_answer_key / staff_only` y no se ofrecen como lecciones publicables.
- La interfaz `/ghc-control-center/importador` muestra propuesta de secciones, bloques y una copia JSON de la propuesta. Ese JSON es para revisión; no contiene miniaturas ni supone autorización de publicación.
- Se inspeccionan `word/_rels/document.xml.rels` y los `a:blip` realmente situados en `word/document.xml` para asociar imágenes a la posición y a la sección. La huella SHA-256 identifica cada archivo y se detecta la ausencia de descripción accesible.
- Se valida la cabecera binaria del recurso antes de mostrar una miniatura. Solo se admiten PNG, JPG, WebP y GIF originales; no se generan ni editan imágenes. Hay un límite de tamaño por miniatura y de datos embebidos en la respuesta.
- Se distingue entre todos los archivos de `word/media` y las imágenes efectivamente vinculadas al cuerpo: **Módulo 20: 34 archivos internos, 6 figuras colocadas**. Los demás se mantienen como pendientes de asociación: no se descartan ni se publican.
- Se contrasta la identidad del módulo en la portada con el título de `docProps/core.xml`. En el Word definitivo del **Módulo 20**, la portada indica **20** mientras los metadatos internos siguen indicando **19**. Se muestra aviso destacado y el título del módulo queda pendiente de revisión, en vez de utilizar el título antiguo.
- El clasificador diferencia **evaluaciones docentes** de secciones pedagógicas sobre evaluación (por ejemplo, «Evaluación mínima útil» es lección candidata, no examen).
- Contenido original y archivos gráficos no se han añadido al repositorio: las pruebas reales se analizaron en un entorno de lectura aparte.

### Validación automática
- El build de la rama ejecuta `scripts/test-academic-import-preview.mjs` (DOCX y PDF sintéticos) y `scripts/test-academic-draft-plan.mjs`.
- La segunda prueba verifica secciones candidatas, claves reservadas a docentes, vinculación de imagen por relación interna y rechazo del título obsoleto.
- La validación de comportamiento con sesión de administrador y carga del Word real desde el navegador sigue pendiente de revisión interactiva del titular. Un build `READY` no demuestra ese recorrido completo.

### Regla de publicación
**No existe en esta fase ninguna acción que genere, inserte, edite o publique cursos, lecciones, preguntas o imágenes en Supabase.** La próxima fase requerirá diseño de staging persistente, revisión de los documentos originales con recursos y una autorización explícita sobre cada operación concreta.

## Limitaciones antes de la importación académica real
1. Necesitamos el Word maestro definitivo de un módulo para comparar texto extraído, estructura, tablas y referencias con el original. No convertir sin cotejo. No hay prueba todavía con los Word premium del usuario.
2. DOCX aún no preserva imágenes, ecuaciones, estilos inline, notas al pie, tablas anidadas complejas ni archivos adjuntos. PDF no garantiza orden o precisión cuando existen fuentes codificadas, escaneos o columnas.
3. La siguiente fase debe incorporar importación estructurada **a un área de staging/borradores**, versionado de fuentes, mapeo a curso/nivel/módulo/lección, idempotencia y un paso de aprobación humana explícita antes de cualquier escritura o publicación.
4. Antes de abrir al público: revisión de las 30 unidades académicas y sus bancos de examen, además de materiales de vídeo/imagen.

## Verificación al cierre
No se deben anunciar 30 módulos importados. Actualmente la base de datos contiene 3 módulos/16 lecciones de demostración en el Nivel 1; los otros dos niveles no contienen módulos en Supabase. Todos los cursos siguen en `draft`.

**Regla de aprobación:** sin confirmación humana sobre un documento/plan concreto, no hay escrituras a los cursos.
