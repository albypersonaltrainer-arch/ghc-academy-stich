# GHC Academy V1 — verificación de seguridad (12/11/2026)

Estado: **auditoría realizada; pendientes delimitados; sin promoción a producción.**

## Alcance y comprobaciones verificadas
- Supabase: proyecto `oqlxvesnjdkxlxwxkikq`; Vercel: proyecto `prj_lzAkM5g2Hzg2NaDl2LgH6QUuAWKh`.
- Cuentas: **1 admin** (`albycanarion@gmail.com`) con un factor MFA TOTP verificado; otras 2 cuentas son `student`.
- Se simuló en SQL sin modificar datos de negocio el contexto JWT administrativo: AAL1 denegado, AAL2 autorizado; la cuenta anteriormente administradora sigue denegada con AAL2.
- Los **57 RPC `ghc_admin_*`** de Supabase usan `ghc_is_admin` / `is_ghc_admin` en el cuerpo, comprobación de cobertura estática. No sustituye pruebas E2E de todos los flujos.
- Las **92 tablas físicas** del esquema `public` tienen RLS activado. 66 tablas con RLS pero sin políticas se mantienen por defecto cerradas a usuarios comunes (incluye datos internos de preventa).
- `ghc-course-assets` es un bucket privado con políticas de lectura por administración o acceso académico verificado. `ghc-media` es público para material de comunicación; revisar contenidos antes de subir material privado.
- `ghc_client_media_active` usa `security_invoker=true`; las tablas fuente tienen RLS.
- `next.config.js` define X-Frame-Options DENY, CSP básica, nosniff, Referrer-Policy, HSTS; `middleware.ts` niega por lista de permisos el campus y la mayor parte de APIs en producción. La rama de pruebas añade un comportamiento de **cierre por defecto** para builds de producción en entornos no identificados.
- Vercel: el Preview permanece protegido mediante SSO y tiene desactivadas las acciones SumUp y la entrega de email en la rama de MFA; no se ejecutan cobros reales en esta fase.

## Hallazgos por clasificar y resolver antes de apertura
1. El Security Advisor registra **13 SECURITY DEFINER invocables por anon**: 3 de GHC diseñadas para catálogo/pagos públicos/verificación de certificados, y 10 de PITTI (funciones de agente por token). Los 10 endpoints PITTI siguen expuestos. Antes de revocarlos, confirmar separación del componente PITTI: hay **1 agente habilitado** con actividad el 12/11/2026 a las 10:37 UTC. PITTI comparte proyecto Supabase y sus privilegios no deben cambiarse sin aprobación explícita.
2. El Advisor informa **89 funciones SECURITY DEFINER accesibles a usuarios autenticados**. Muchas son RPC administrativas y de estudiante con controles internos; revisar cualquier RPC nueva y evitar confundir permiso `EXECUTE` con autorización efectiva. Las 57 `ghc_admin_*` tienen guardia interna confirmada.
3. Advisor: `auth_leaked_password_protection` desactivado. La protección de contraseñas filtradas depende de prestaciones del plan de Supabase; revisar al cambiar de plan. Mitigaciones actuales: MFA administrativo y credenciales robustas.
4. **66 tablas sin políticas RLS**: no son aperturas de datos, sino denegación predeterminada. No añadir políticas genéricas para eliminar el aviso.
5. Pruebas finales antes de apertura: navegación alumno autenticado, acceso autorizado/denegado a materiales y exámenes, URLs firmadas, recuperación MFA y control real de sesión. Las pruebas de cobro SumUp quedan deliberadamente para la fase de cursos/precios definitivos.

## Cambio propuesto — **NO EJECUTADO** — retirar acceso anónimo a funciones PITTI
Las funciones PITTI tienen ACL explícita `anon=X`, mientras `authenticated` no tiene `EXECUTE`. La revocación no elimina datos, pero impediría la conexión del puente con la antigua API. Requiere aprobación del titular para modificar el proyecto compartido.

```sql
BEGIN;
REVOKE EXECUTE ON FUNCTION public.pitti_acquire_runtime_lease(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pitti_claim_next_command(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pitti_claim_next_command_v2(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pitti_finish_command(uuid, text, uuid, text, boolean, jsonb, jsonb, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pitti_get_runtime_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pitti_recover_running_commands(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pitti_release_runtime_lease(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pitti_report_install(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pitti_report_runtime(uuid, text, text, jsonb, jsonb, timestamp with time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pitti_rotate_agent_token(uuid, text, text) FROM anon;
COMMIT;
```

### Reversión (solo si se autoriza restauración de compatibilidad)
```sql
BEGIN;
GRANT EXECUTE ON FUNCTION public.pitti_acquire_runtime_lease(uuid, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.pitti_claim_next_command(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.pitti_claim_next_command_v2(uuid, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.pitti_finish_command(uuid, text, uuid, text, boolean, jsonb, jsonb, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.pitti_get_runtime_status(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.pitti_recover_running_commands(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.pitti_release_runtime_lease(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.pitti_report_install(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.pitti_report_runtime(uuid, text, text, jsonb, jsonb, timestamp with time zone) TO anon;
GRANT EXECUTE ON FUNCTION public.pitti_rotate_agent_token(uuid, text, text) TO anon;
COMMIT;
```

## Gate
- No fusionar cambios a `main` / producción sin aprobación.
- No modificar credenciales, tablas de pagos ni contratos en este paso.
- No anunciar seguridad «completamente terminada» mientras los RPC PITTI sigan públicos y las pruebas reales de acceso alumno sigan pendientes.
