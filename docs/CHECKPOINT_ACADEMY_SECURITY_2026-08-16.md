# CHECKPOINT · GHC Academy Security · 2026-08-16

## Estado ejecutivo

El bloque crítico de seguridad de GHC Academy está cerrado, reproducido en GitHub/Supabase y desplegado en Producción.

- Producción Vercel: **READY**.
- Deployment actual tras PR #49: `dpl_7L4b97keijnebewWUn9PetkxNTjS`.
- Commit de `main`: `e6cecb609e23c1fe67a20833c626c2e82d627ff4`.
- Dominios activos: `ghcacademy.net` y `www.ghcacademy.net`.
- Academy permanece cerrada por middleware/feature gates.
- SumUp Academy permanece deshabilitado hasta activación explícita.
- Preventa LIVE permanece operativa.
- No se han dejado datos de prueba persistidos en las pruebas transaccionales.

## Correcciones críticas cerradas

### 1. Privilegios y rol administrativo

- Corregida la escalada `student -> admin` provocada por una función `SECURITY DEFINER` que confiaba en identidad de ejecución incorrecta.
- El cambio de `profiles.role` administrativo queda limitado a backend de confianza o admin reconocido.
- Validado con usuario alumno simulado y `ROLLBACK`.

### 2. Certificados

- Lógica legacy de emisión/revocación movida a `private`.
- Las fachadas públicas de administración exigen admin autenticado.
- `anon` no puede emitir/revocar.
- Alumno no puede emitir/revocar.
- Admin legítimo conserva la vía válida.

### 3. Superficie RPC Supabase

Barrido completo del schema `public`:

- ninguna RPC `preventa_*` es ejecutable por `anon` ni por alumno autenticado;
- las únicas RPC GHC anónimas son las tres deliberadamente públicas:
  - `ghc_public_get_course_catalog`;
  - `ghc_public_get_course_payment_options`;
  - `ghc_public_verify_certificate`;
- RPC de proveedor no ejecutables por usuarios normales;
- RPC `ghc_admin_*` inspeccionadas con guard interno de administración;
- no se detectaron policies RLS basadas en `auth.role()` obsoleto ni `user_metadata` controlable por usuario.

### 4. Default privileges fail-closed

Migración aplicada también al Supabase real:

`20260816110100_preventa_public_default_privileges_fail_closed.sql`

Para objetos futuros creados por `postgres` dentro de `public`:

- nuevas tablas ya no heredan permisos de `anon`/`authenticated`;
- nuevas secuencias ya no heredan permisos de `anon`/`authenticated`;
- `service_role` conserva sus permisos de servidor.

Las funciones no se modifican en default ACL porque el `EXECUTE` implícito de `PUBLIC` es global y tocarlo podría afectar schemas internos de Supabase. Las migraciones de aplicación deben continuar haciendo REVOKE/GRANT explícito para funciones.

La migración tiene prueba PostgreSQL con objeto temporal + `ROLLBACK` y CI verde.

### 5. Assets y streaming

- Bucket académico privado.
- Allowlist MIME aplicada; HTML no permitido.
- Policy de Storage valida acceso real a la lección.
- Streaming exige sesión autenticada y las RPC vuelven a validar `auth.uid()`/acceso.
- Endpoint playback valida `lessonId` UUID antes de RPC.
- Endpoint de progreso valida `sessionId`, evita `NaN` y valores extremos.
- Errores RPC/SQL de streaming no se devuelven al cliente.

### 6. Abuso / rate limiting

- Rate limiting para checkout Academy, soporte, reembolsos y creación de órdenes Academy.
- Checkout Academy fail-closed si el comprobador de rate limit falla.
- Rate limiting adicional de Preventa pública queda como decisión de producto/privacidad (#45), ya que implicaría IP/WAF/CAPTCHA/umbrales.
- En la auditoría no había abuso activo: 0 borradores Preventa en las últimas 24 h.

### 7. SumUp y pagos

- El dinero nunca se acredita por el webhook sin reconsultar SumUp.
- Se verifican merchant, referencia, moneda, importe, checkout y transacción SUCCESSFUL.
- Preventa usa token HMAC-SHA256 ligado a `orderReference + installmentNo`, expiración y `timingSafeEqual`.
- Precio/moneda/cuota se resuelven en backend/DB; no se confía en importes del navegador.
- Webhook Preventa comprueba que `provider_checkout_id` esté registrado antes de usar nuestra API key para consultar SumUp.
- `provider_checkout_id` tiene índice UNIQUE.
- IDs de webhook ajenos se ignoran sin consumir una consulta autenticada a SumUp.
- Los cuerpos de error de SumUp ya no se propagan a logs/excepciones.
- Los mensajes SQL/RPC internos del puente SumUp Academy han sido redactados.

### 8. Email / Resend

- Los cuerpos/mensajes de error del proveedor Resend ya no se propagan a logs ni errores persistidos.
- La cola inspeccionada no tenía `queued/retry` acumulados durante la auditoría; solo `sent/cancelled`.

## Superficie HTTP de Producción

### Permitida

- `/` -> rewrite de Preventa.
- páginas buyer-facing de Preventa y `/legal`.
- assets explícitamente necesarios para Preventa.
- POST operativos permitidos de Preventa.

### Cerrada

- Academy/admin -> página de bloqueo 503 + `noindex` + `no-store`.
- APIs Academy -> 404 mientras Academy está cerrada.
- QA/selftests/admin API de Preventa -> no públicos.
- GET diagnósticos de:
  - `/api/preventa/orders`;
  - `/api/preventa/sumup-checkout`;
  - `/api/preventa/sumup-webhook`;
  ahora devuelven 404 en Producción.
- `/api/preventa/cron` es POST-only; GET devuelve 404.
- `/.env`, `/.env.production`, `.git`, `.aws`, `.ssh`, phpMyAdmin/PHPUnit/CGI y probes similares se cierran con 404 o con la mitigación previa de Vercel.
- Probe WordPress observado: Vercel lo bloqueó antes del middleware con 403 `x-vercel-mitigated: deny`.

Cabeceras verificadas: HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, CSP anti-frame/object/base-uri y `no-store` donde corresponde.

## Scheduler de Preventa

La implementación ya está preparada de forma segura:

- endpoint POST-only;
- Bearer secret >=32 caracteres;
- comparación `timingSafeEqual`;
- `Cache-Control: private, no-store`;
- workflow GitHub llama con POST.

**No está activado** porque faltan credenciales/configuración:

- Vercel Production: `CRON_SECRET`;
- GitHub Actions: `PREVENTA_CRON_SECRET`;
- GitHub Actions: `PREVENTA_CRON_URL`.

Issue: #43.

Impacto observado en la auditoría: 0 emails pendientes/retry, 0 órdenes parciales vencidas >24 h y 0 expedientes overdue >60 días. No había deuda operativa acumulada en ese momento.

## Framework, dependencias y CI

- Next.js: `15.5.21`.
- React / React DOM: `19.2.8`.
- Rutas migradas al contrato asíncrono de `params/searchParams` de Next 15.
- Vercel Production usa Node `24.x`.
- `Academy Security Typecheck` ya prueba Node 24.
- CI ejecuta:
  - instalación;
  - `npx tsc --noEmit`;
  - `npm run build` (mismo comando de aplicación que Vercel, incluyendo gates previos);
  - `npm audit --omit=dev`, bloqueando HIGH/CRITICAL.
- El workflow se dispara también ante cambios de middleware, scripts, configuración Vercel/Next y cualquier workflow GitHub.
- Suite PostgreSQL 17 de Preventa aplica migraciones en orden y ejecuta pruebas SQL.

Pendiente de supply chain: no existe `package-lock.json`; issue #38. Hasta disponer de lockfile no se debe cambiar a `npm ci` ni inventar un lockfile manualmente.

Dependabot alerts aparecen desactivadas; issue #41. La integración disponible tampoco permite verificar/cambiar branch protection ni leer secret-scanning alerts.

## Higiene de repositorio

- `.gitignore` añadido para `.env*`, claves privadas, logs, artefactos Next/Vercel y salidas de auditoría.
- No se encontraron `.env` versionados en `main` durante la inspección del árbol.
- El repositorio está actualmente **public**; confirmar si es deliberado antes de cambiar visibilidad (#37).
- No se eliminan ramas históricas automáticamente: es destructivo y no aporta seguridad inmediata.

## Producción / observabilidad

- Últimos smoke tests: Preventa 200, Academy admin 503, Academy SumUp 404, cron GET 404.
- Vercel no mostró errores runtime de aplicación en las ventanas inspeccionadas tras los despliegues.
- Búsquedas de logs en el deployment endurecido no devolvieron `Bearer`, `service_role` ni cadenas `SUPABASE` sensibles.
- Los deployments de Preview siguen fallando por falta de `SUMUP_API_KEY` de Preview/Sandbox; Producción no está afectada. Issue #52.

## Auth / administración

Hallazgo pendiente antes de abrir Academy:

- 2 perfiles `admin` legítimos;
- ambos vinculados a usuarios Auth confirmados y no bloqueados;
- 0 factores MFA verificados;
- 3 sesiones admin activas, todas AAL1 y sin factor MFA; la más antigua observada fue creada en mayo de 2026.

No forzar MFA ni revocar sesiones antes del enrolamiento para evitar lockout. Gate #42:

1. enrolar MFA en todos los admins legítimos;
2. verificar sesión AAL2;
3. probar Control Center;
4. revisar/revocar sesiones AAL1 antiguas;
5. solo después valorar MFA obligatorio global.

Supabase Auth mantiene `Leaked Password Protection` desactivado: #35.

La UI de registro anuncia `Mínimo 6 caracteres`, pero la política efectiva de Auth no es legible desde esta integración: verificar/alinear antes de apertura (#48).

## Privacidad / alumno

- Watermark de contenidos incluye actualmente email completo + IDs cortos de usuario/sesión. Decidir deliberadamente si mantener PII completa o enmascararla (#50).
- Varias pantallas de alumno aún muestran `error.message` RPC de Supabase en caso de fallo. No es bypass de autorización, pero conviene redactarlo para evitar detalle interno (#51). Requiere una vía de patch fiable para no reescribir componentes grandes a mano.

## Performance no bloqueante

Advisor de Supabase muestra oportunidades de RLS/initplan, policies duplicadas, índices duplicados/FK y otros avisos. La base actual es pequeña y no se justifica DDL agresivo solo para silenciar el linter. Backlog #39.

## PR fusionados en este cierre

- #33 · cierre de seguridad y actualización LTS.
- #34 · compatibilidad completa Next 15.
- #36 · higiene de repo + checkpoint inicial.
- #40 · superficie pública / probes + cobertura de CI.
- #44 · redacción de errores, diagnósticos públicos, streaming y webhook precheck.
- #46 · default privileges fail-closed para futuras tablas/secuencias.
- #47 · scheduler Preventa POST-only / no-store.
- #49 · CI alineado con Node 24 de Producción.

## Issues / gates abiertos

- #35 · Leaked Password Protection.
- #37 · confirmar visibilidad pública del repo.
- #38 · package-lock + `npm ci`.
- #39 · performance Supabase antes de escalar.
- #41 · Dependabot + branch protection.
- #42 · MFA admin + sesiones AAL1.
- #43 · credenciales scheduler Preventa.
- #45 · rate limiting/bot protection de matrícula pública.
- #48 · política de contraseña vs copy UI.
- #50 · PII del watermark.
- #51 · redactar `error.message` RPC en UI alumno.
- #52 · SUMUP_API_KEY de Preview/Sandbox.

## Qué puede seguirse haciendo sin el titular

- auditorías read-only;
- CI/build/security regression;
- mejoras inequívocamente fail-closed;
- documentación/checkpoints;
- redacción de logs/errores cuando no cambia semántica;
- smoke tests sin crear pagos ni datos reales;
- backlog técnico con evidencia.

## Qué requiere al titular

- abrir Academy o activar SumUp Academy;
- generar/copiar/rotar credenciales;
- activar scheduler al introducir secretos;
- cambiar repo public/private;
- política de contraseñas / Leaked Password Protection;
- enrolamiento MFA y revocación de sesiones administrativas;
- CAPTCHA/IP tracking/WAF con impacto UX/privacidad;
- decisión de PII del watermark;
- mover/reembolsar dinero real;
- cambiar precios, términos o datos reales.

## Siguiente gate real antes de apertura Academy

No abrir Academy hasta cerrar al menos: **#35, #42 y #48**, verificar la estrategia de recovery administrativo y repetir smoke/authz con una cuenta admin AAL2 y una cuenta alumno real. Los demás issues deben priorizarse según lanzamiento/tráfico, pero no invalidan el cierre crítico actual.