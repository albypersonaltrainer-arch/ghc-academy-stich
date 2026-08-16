# CHECKPOINT · GHC Academy Security · 2026-08-16

## Estado

Bloque de seguridad crítico de GHC Academy cerrado y desplegado en producción.

- Producción Vercel: READY.
- Academy permanece cerrada por middleware/feature gates.
- SumUp Academy permanece deshabilitado hasta activación explícita.
- Preventa LIVE permanece operativa y no fue desactivada.

## Correcciones críticas cerradas

1. Escalada de privilegios en `profiles.role`.
   - Se eliminó el bypass implícito provocado por `SECURITY DEFINER` + `current_user`.
   - El cambio de rol administrativo exige `service_role` o administrador autenticado reconocido por `ghc_is_admin()`.

2. Emisión/revocación de certificados.
   - Las funciones legacy se movieron al esquema `private`.
   - `anon` y `authenticated` no pueden ejecutar directamente la lógica legacy.
   - Las fachadas públicas exigen identidad administrativa autenticada.

3. Reducción de superficie pública.
   - Solo permanecen anónimas las RPC intencionadamente públicas: catálogo, opciones de pago y verificación pública de certificados.
   - RPC de proveedor no ejecutables por usuarios autenticados normales.

4. Assets académicos.
   - Bucket privado.
   - Allowlist MIME aplicada.
   - Acceso de lectura condicionado a acceso real a la lección.

5. Abuso y pagos.
   - Rate limiting para checkout Academy y otras acciones sensibles.
   - Checkout Academy fail-closed.
   - Webhook contrasta el estado contra SumUp antes de registrar un pago.

## Framework / CI

- Next.js actualizado a 15.5.21 Maintenance LTS.
- React / React DOM actualizados a 19.2.8.
- Rutas adaptadas al contrato asíncrono de `params` / `searchParams` de Next 15.
- CI de seguridad ejecuta:
  - `npx tsc --noEmit`
  - `npx next build`
  - `npm audit --omit=dev` bloqueando HIGH/CRITICAL.

## PR fusionados

- #33 · cierre de seguridad y actualización LTS.
- #34 · compatibilidad completa con Next 15 LTS.

## Smoke test de producción

- `/preventa`: 200.
- `/ghc-control-center`: bloqueado, sin contenido administrativo público.
- `/api/academy/payments/sumup-checkout`: 404 en producción mientras Academy está cerrada.
- `/preventa/pago` sin token: respuesta segura de enlace no válido.
- `/preventa/matricula` sin token: respuesta segura de enlace no válido.
- Cabeceras observadas: HSTS, CSP anti-frame, X-Frame-Options DENY, nosniff, Referrer-Policy y no-store donde corresponde.

## Pruebas de privilegios

Validado mediante transacciones con ROLLBACK:

- alumno no puede autoascenderse a admin;
- alumno no puede leer preguntas de examen directamente;
- alumno no puede emitir ni revocar certificados;
- administrador legítimo conserva su vía autorizada;
- `service_role` conserva la vía de mantenimiento necesaria.

No quedaron datos de prueba persistidos.

## Pendiente no bloqueante

Supabase Auth mantiene desactivada la protección contra contraseñas conocidas en filtraciones (`Leaked Password Protection`). Es una mejora de plataforma pendiente de activar desde la configuración de Auth cuando se disponga del control correspondiente.

## Higiene de repositorio

Se añade `.gitignore` para impedir commits accidentales de `.env*`, claves privadas, artefactos de Vercel/Next, logs y salidas de auditoría.

Las ramas históricas de hardening se conservan por ahora; no se eliminan automáticamente porque la eliminación de ramas es destructiva y no aporta seguridad inmediata.
