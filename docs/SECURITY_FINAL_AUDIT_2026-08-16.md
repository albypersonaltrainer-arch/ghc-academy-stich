# GHC Academy · Auditoría final de seguridad · 2026-08-16

## Alcance

Auditoría sobre el `main` real posterior al hardening de exámenes y al cierre de escrituras anónimas. El objetivo es reducir superficie de ataque sin alterar las reglas comerciales de PREVENTA, sin publicar Academy y sin cambiar el routing público actual.

## Cerrado y validado

- CI de seguridad: TypeScript, build de producción y `npm audit` HIGH/CRITICAL en verde.
- Supply-chain: `package-lock.json` v3 versionado y CI migrado de `npm install` a `npm ci`.
- `anon`: 0 tablas `public` con INSERT/UPDATE/DELETE y 0 secuencias accesibles. Las 3 RPC públicas deliberadas continúan disponibles.
- Lectura anónima: 0 tablas con SELECT anónimo y RLS desactivado.
- Provider/worker RPCs: 0 EXECUTE para `anon` y 0 para `authenticated` en pagos y workers sensibles.
- Defaults de aplicación (`postgres`): futuras tablas/secuencias y futuras funciones públicas quedan fail-closed para clientes. El CI crea un RPC de prueba y verifica que no hereda EXECUTE para `anon`/`authenticated`.
- Funciones admin: todas las `ghc_admin_*` SECURITY DEFINER pasan por guard central; prueba con identidad de alumno confirma `ghc_is_admin=false` y rechazo `No autorizado`.
- Funciones student: análisis de todas las SECURITY DEFINER autenticadas; el único overload sin `auth.uid()` directo es un wrapper que delega al overload actual con control de identidad.
- PREVENTA admin: `requirePreventaAdmin()` reutiliza el guard central `ghc_is_admin()`, por lo que hereda identidad UUID estricta y MFA/AAL2 progresivo.
- PREVENTA: diagnósticos de orders, SumUp checkout, webhook, preview-order y email worker fuera de Production o protegidos por secreto.
- PREVENTA webhook: checkout desconocido se rechaza antes de consultar SumUp; el estado económico se revalida contra proveedor; respuestas no-store.
- Academy SumUp: callback/webhook de Production anclado a `ACADEMY_PUBLIC_BASE_URL`; no se acepta fallback al origin entrante en Production.
- Academy webhook: checkout debe existir, importe/moneda/merchant/status se validan contra SumUp; respuestas no-store.
- Storage privado: alumno autenticado sin derecho ve 0 objetos; el único helper `private` ejecutable por authenticated es el bridge de lectura de assets autorizado.
- XSS de contenido: guard de escritura activo; payloads script/handler/javascript/iframe/svg/srcdoc/data rechazados.
- Cabeceras: anti-clickjacking, nosniff, HSTS, referrer policy, CSP frame/object/base y no-store en áreas privadas.
- Middleware: Academy permanece bloqueada en Production; PREVENTA sigue siendo la superficie pública. El cron permite GET/POST exclusivamente en su ruta y el resto de mutaciones buyer-facing sigue POST-only.
- Scheduler PREVENTA: preparado para Vercel Cron horario `17 * * * *` usando `CRON_SECRET`; GitHub Actions queda como fallback compatible.

## Advisor Supabase

Los avisos RLS Enabled No Policy son INFO esperados en tablas RPC-only cerradas. Los 3 WARN anónimos corresponden a las 3 RPC públicas deliberadas. Los WARN de funciones admin autenticadas son esperados porque la autorización se ejecuta dentro del guard central y se ha probado con identidad de alumno.

## Pendientes que requieren control externo/manual

1. **Supabase Auth · Leaked Password Protection**: el Advisor confirma que está desactivado. El conector disponible no permite modificar esta configuración de Auth.
2. **MFA TOTP de administradores**: backend y pantalla están preparados; requiere enrolar/verificar físicamente el factor de cada administrador. Una vez verificado, el guard central exige AAL2 automáticamente.
3. **`CRON_SECRET` de Production**: la integración de Vercel Cron queda preparada. La API de Vercel disponible no expone gestión/lectura de variables de entorno; tras el deploy debe comprobarse ejecución real. Si `CRON_SECRET` no existe, habrá que configurarlo manualmente.
4. **Defaults del rol interno `supabase_admin`**: la plataforma mantiene ACL por defecto amplias para ese rol. Los objetos actuales de la aplicación son propiedad de `postgres` (51 tablas) y están cerrados; la conexión de aplicación no es miembro de `supabase_admin` y PostgreSQL impide modificar sus defaults desde este canal.

## Restricciones preservadas

- No publicar Academy.
- No alterar la oferta, precios, vencimientos, reservas ni semántica contractual de PREVENTA.
- No sustituir SumUp ni reimplementar pagos/email existentes.
- No habilitar gates de Academy en Production.
