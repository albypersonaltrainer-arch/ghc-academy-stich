# ADDENDUM · GHC Academy Security · 2026-08-16

Este documento complementa `CHECKPOINT_ACADEMY_SECURITY_2026-08-16.md` con el trabajo realizado después del PR #53.

## Estado de Producción

- Deployment validado tras PR #56: `dpl_FFHMptq54j6vFKaKxAyrwvXJo9m6`.
- Commit desplegado: `7eac28c110dcc874893944ff7e6ca6ac8776cdfa`.
- Estado Vercel: `READY`.
- `ghcacademy.net/preventa`: operativo.
- `/api/academy/email-worker`: 404 en Producción por cierre global de Academy.
- `/ghc-control-center`: 503 + `noindex` + `no-store`.
- Vercel runtime errors, ventana final de 30 minutos: 0.

## PR #54 · Manual PDF hardening

La ruta autenticada del Manual se endureció sin modificar autorización:

- `lessonId` debe ser UUID válido;
- `courseSlug` se valida por formato/longitud;
- descarga de Storage sigue usando la sesión del alumno, no `service_role`;
- se mantiene la comprobación `ghc_student_get_lesson_experience`;
- cualquier manual privado debe comenzar con firma binaria `%PDF-`;
- el fallback beta permitido únicamente a `https://mozilla.github.io` también debe ser PDF real por firma;
- redirecciones externas se rechazan;
- respuesta same-origin fijada a `application/pdf`, `nosniff`, `no-referrer` y `no-store`.

Riesgo eliminado: servir inline contenido activo/no-PDF si el recurso beta o un `manual_path` quedaran mal configurados.

## Auditoría XSS frontend

Búsqueda de código sobre el repo sin resultados para:

- `dangerouslySetInnerHTML`;
- `innerHTML`;
- `eval(`.

Esto complementa el guard de contenido de lecciones y reduce la superficie de ejecución de contenido proveniente de Supabase.

## Auditoría de generación/publicación de exámenes

Se verificó técnicamente el gate humano:

- ruta generadora exige sesión real + admin;
- examen generado nace `status='draft'`;
- preguntas IA nacen `question_status='draft_ai'`;
- fin de generación mueve blueprint a `in_review`, no a publicado;
- `ghc_admin_publish_exam_from_blueprint(uuid)` exige admin;
- publicación se bloquea si existen preguntas `draft_ai`, `needs_review` o `rejected`;
- existe guard para que un examen no permanezca publicado si las preguntas regresan a estado no aprobado.

Por tanto, el flujo **IA -> draft -> revisión humana -> publicación manual** está técnicamente preservado.

Residual de hardening: issue #55 para validar `blueprintId` como UUID y redactar algunos `error.message` internos de la ruta grande de generación, sin alterar el gate humano.

## PR #56 · Academy email worker hardening

El worker privilegiado de correo Academy conserva su autenticación por secreto >=32 caracteres y `timingSafeEqual`, pero ahora además:

- errores SQL/RPC se convierten en códigos estables;
- errores del proveedor no se persisten como mensajes arbitrarios;
- `p_error` recibe códigos controlados;
- resultados usan `errorCode`;
- logs de fallo usan códigos constantes;
- `batchSize` se valida como entero entre 1 y 50;
- body JSON inválido devuelve 400;
- respuestas usan `Cache-Control: private, no-store`.

No se modificaron destinatarios, plantillas, retry semantics ni proveedor.

## CI / build

PR #56 pasó con:

- Node 24;
- instalación correcta;
- `npx tsc --noEmit`;
- `npm run build` completo;
- `npm audit --omit=dev` con HIGH=0 y CRITICAL=0.

Persisten 4 warnings CSS Autoprefixer `end -> flex-end`; no son de seguridad. Issue #57.

## Configuración cliente/secretos

La revisión de `next.config.js` no encontró API keys ni `service_role` inyectados al bundle. Los valores definidos vía `env` son datos/flags públicos de Preventa. Las credenciales sensibles siguen siendo variables server-side.

En los logs inspeccionados del deployment endurecido no aparecieron patrones `Bearer`, `service_role` ni cadenas Supabase sensibles.

## Storage

Las policies inspeccionadas no conceden escritura de assets académicos a alumnos. La lectura autenticada continúa condicionada por acceso exacto a la lección; administración conserva la vía de gestión.

## Pendientes añadidos después del checkpoint principal

- #55 · sanear errores/UUID en generador de exámenes.
- #57 · limpiar 4 warnings CSS Autoprefixer.

Siguen vigentes los gates y pendientes enumerados en el checkpoint principal, especialmente #35, #42 y #48 antes de abrir Academy.

## Estado de cierre de esta pasada

No se ha abierto Academy, no se ha activado SumUp Academy, no se han creado/refundado pagos reales y no se han cambiado credenciales ni datos reales.

El estado sigue siendo:

- **seguridad crítica: cerrada**;
- **Producción: READY**;
- **Preventa LIVE: operativa**;
- **Academy: cerrada por diseño**;
- **gates humanos antes de apertura: MFA/Auth/credenciales y decisiones de privacidad documentadas en issues**.