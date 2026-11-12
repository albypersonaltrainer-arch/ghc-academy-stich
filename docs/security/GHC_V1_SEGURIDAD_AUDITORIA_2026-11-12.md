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

## Actualización de decisión — 12/11/2026 18:35 (Madrid)
**El usuario autoriza la revocación SOLO si no perjudica a los proyectos. Se decide NO REVOCAR todavía.**

Se ha demostrado actividad efectiva del PITTI Bridge contra la API de Supabase hasta las **10:37:48 UTC del 12/11/2026**, con **18.542 solicitudes** a `pitti_claim_next_command` y **935** a `pitti_report_runtime` en la ventana de aproximadamente 23 horas consultada. El agente de versión 0.5.0 continúa marcado como `enabled=true`; no hay comandos pendientes ni en ejecución. No hay garantía de que no vuelva a arrancar, por lo que revocar sus permisos `anon` podría interrumpirlo. Las diez funciones siguen con ACL `anon`, `authenticated` no tiene permiso y validan token de agente mediante hash SHA-256 y estado `enabled` en `pitti_agent_token_valid` (no demuestra ausencia de otras vulnerabilidades).

No se han cambiado permisos de PITTI, usuarios, tokens, configuración de pagos, ni producción. **Próximo paso condicionado:** confirmar migración/desuso del Bridge y origen de las llamadas antes de revocar o de mover PITTI a infraestructura independiente. La activación en GitHub de este informe no constituye ejecución SQL.

## Refuerzo aplicado en la base de datos activa — MFA obligatorio para administración

Tras autorización general para mejorar la seguridad sin afectar a PITTI, se aplicó en el proyecto Supabase `oqlxvesnjdkxlxwxkikq` una actualización transaccional mediante `CREATE OR REPLACE FUNCTION` a las funciones `public.ghc_is_admin()` y `public.is_ghc_admin()`:

- En lugar del modelo progresivo anterior (sin TOTP verificado se admitía AAL1), ahora **siempre** exigen rol de administración, **al menos un factor MFA verificado** y `auth.jwt()->>'aal' = 'aal2'`.
- Las funciones conservan `SECURITY DEFINER`, `STABLE`, la misma firma, el `search_path` y los privilegios: `authenticated` puede ejecutar, `anon` no.
- Precondiciones comprobadas: exactamente un administrador y MFA verificado.
- Dentro de la misma transacción, se validaron cuatro casos: administrador AAL1 denegado, administrador AAL2 permitido, usuario no administrador AAL2 denegado y administrador sin claim AAL denegado; si fallaban, toda la transacción revertía.
- Verificación posterior independiente: 1 administrador, 1 factor verificado, ambas funciones requieren MFA/AAL2, **57/57 RPC de administrador** siguen referenciando guardia, **10 RPC de PITTI accesibles a `anon` permanecen SIN CAMBIOS** y 1 agente PITTI continúa habilitado.
- No se ha fusionado `main` ni modificado el código de producción en Vercel. La modificación SQL sí está aplicada directamente en Supabase y rige para todo entorno conectado al mismo proyecto.

### Condición actual para el acceso al panel

Para operar, el administrador debe entrar y verificar TOTP hasta que su sesión indique `AAL2 · PROTEGIDA`. La pantalla de MFA de la rama Preview permite hacer la verificación aun antes de que el rol obtenga permisos administrativos, ya que la entrada al asistente se basa en el perfil. No desinstalar ni perder el dispositivo TOTP sin asegurar recuperación de la cuenta; la recuperación de acceso administrativo requeriría reconfiguración autorizada.

### Definición efectiva (ambas funciones tienen el mismo cuerpo)

```sql
SELECT EXISTS (
  SELECT 1
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND lower(coalesce(p.role,'')) IN ('admin','superadmin','owner')
    AND coalesce(auth.jwt() ->> 'aal','aal1')='aal2'
    AND EXISTS (
      SELECT 1 FROM auth.mfa_factors f
      WHERE f.user_id=p.id AND f.status::text='verified'
    )
);
```

### Reversión solo para emergencia, con autorización

Restaurar la definición anterior con `CREATE OR REPLACE FUNCTION` en cada función, reemplazando los dos requisitos finales por esta condición progresiva:

```sql
AND (
  NOT EXISTS (
    SELECT 1 FROM auth.mfa_factors f
    WHERE f.user_id=p.id AND f.status::text='verified'
  )
  OR coalesce(auth.jwt() ->> 'aal','aal1')='aal2'
)
```

No ejecutar la reversión salvo necesidad real, ya que debilita el requisito para futuros administradores que no hayan activado MFA.

## Gate
- No fusionar cambios a `main` / producción sin aprobación.
- No modificar credenciales, tablas de pagos ni contratos en este paso.
- No anunciar seguridad «completamente terminada» mientras los RPC PITTI sigan públicos y las pruebas reales de acceso alumno sigan pendientes.
