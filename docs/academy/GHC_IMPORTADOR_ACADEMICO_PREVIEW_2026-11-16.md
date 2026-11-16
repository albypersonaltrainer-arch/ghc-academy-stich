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

## Limitaciones antes de la importación académica real
1. Necesitamos el Word maestro definitivo de un módulo para comparar texto extraído, estructura, tablas y referencias con el original. No convertir sin cotejo. No hay prueba todavía con los Word premium del usuario.
2. DOCX aún no preserva imágenes, ecuaciones, estilos inline, notas al pie, tablas anidadas complejas ni archivos adjuntos. PDF no garantiza orden o precisión cuando existen fuentes codificadas, escaneos o columnas.
3. La siguiente fase debe incorporar importación estructurada **a un área de staging/borradores**, versionado de fuentes, mapeo a curso/nivel/módulo/lección, idempotencia y un paso de aprobación humana explícita antes de cualquier escritura o publicación.
4. Antes de abrir al público: revisión de las 30 unidades académicas y sus bancos de examen, además de materiales de vídeo/imagen.

## Verificación al cierre
No se deben anunciar 30 módulos importados. Actualmente la base de datos contiene 3 módulos/16 lecciones de demostración en el Nivel 1; los otros dos niveles no contienen módulos en Supabase. Todos los cursos siguen en `draft`.

**Regla de aprobación:** sin confirmación humana sobre un documento/plan concreto, no hay escrituras a los cursos.
