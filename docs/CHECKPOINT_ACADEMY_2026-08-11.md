# CHECKPOINT · GHC Academy · 2026-08-11

## Estado
GHC Academy queda migrada a una arquitectura V2 con secuencialidad, matrícula, evaluaciones server-side, certificados públicos mínimos, soporte real y separación pago → derecho comercial → acceso académico.

## Producción Academy V2
- `/alumno`: solo cursos con `course_access` activo.
- `/cursos/[slug]`: catálogo seguro; no expone contenido privado.
- `/cursos/[slug]/[lessonId]`: secuencia controlada por backend.
- Mini/exámenes: corrección en RPC, sin clave en cliente.
- Examen final: bloqueado por prerrequisitos también en DB.
- `/certificados/[id]`: usa `ghc_public_verify_certificate`; imprime solo certificados `valid`.
- Manuales: proxy autenticado y controlado por acceso de lección.
- Storage: alumno solo lee assets de cursos con matrícula activa.

## Seguridad
- Alumno no puede cambiar `profiles.role`.
- Alumno no puede insertar/editar progreso, módulos, intentos, completados o certificados directamente.
- No hay lectura pública directa de lecciones, módulos, claves de examen o certificados.
- RPC legacy que revelaban corrección post-intento: deshabilitadas.
- Superficie `anon` intencionada: únicamente `ghc_public_get_course_catalog(text)` y `ghc_public_verify_certificate(text)`.
- Funciones `ghc_admin_*` auditadas con guard de rol interno.

## Evaluaciones y contenido QA
- Preguntas `needs_review` no pueden publicarse.
- Exámenes de lección/módulo demo bajados a `draft`.
- Solo queda publicado el examen final revisado existente.
- El contenido actualmente cargado en Supabase es QA/demo (3 módulos / 16 lecciones), no el contenido premium final.
- Cursos vacíos y curso de prueba retirados del catálogo público (`draft`/`archived`).
- El contenido académico premium de los 30 módulos deberá importarse cuando se disponga de los archivos definitivos; no se ha fingido esa importación.

## Tester José
Usuario: `jose.luis.velasco.alumno@ghc-academy.com`
- Progreso reiniciado a 0.
- 1 matrícula activa de QA: Nivel 1.
- Lección 1 permitida.
- Lección 2 bloqueada hasta completar la anterior.
- Examen final bloqueado.

## Pagos y accesos
Nueva tabla: `academy_entitlements`.
Estados:
- `payment_pending`
- `pending_activation`
- `active`
- `revoked`

Regla:
`pago → entitlement → activación GHC → course_access`

Un pago NO abre Academy automáticamente.
- Preventa pagada existente: `pending_activation`.
- Preventa parcial existente: `payment_pending`.
- Cancelación/reembolso revoca entitlement y accesos derivados.
- Arquitectura preparada para `preventa`, `sumup`, `stripe`, `manual`.

Control admin real:
- `/ghc-control-center/accesos`
- lista derechos y matrículas reales;
- activa cursos desde entitlement;
- revoca derechos/accesos;
- concede acceso manual con trazabilidad.

## Soporte
Tablas:
- `support_tickets`
- `support_ticket_messages`

Alumno:
- `/alumno/soporte`
- abrir ticket, consultar conversación, responder.

Admin:
- `/ghc-control-center/soporte`
- listar tickets, prioridad, estado, responder, resolver/cerrar.

## Pruebas efectuadas
- Vercel Preview Academy V2: READY.
- Vercel producción Academy V2: READY, sin errores runtime observados.
- JWT simulado de José contra RPC reales: 1 curso, 0 %, primera lección sí, segunda no, final no.
- Certificado real de Alby: verificación pública válida.
- Certificado inexistente: no válido y sin diploma.
- Entitlement activado dentro de transacción/rollback: genera vínculo `course_access` correcto.
- Soporte José → admin dentro de transacción/rollback: 2 mensajes, estado `waiting_user`; 0 tickets persistidos tras rollback.

## Configuración externa pendiente
Supabase Security Advisor sigue indicando `Leaked Password Protection Disabled`. Es un ajuste de Supabase Auth, no una migración SQL; no está expuesto por las herramientas de gestión disponibles en este entorno.

## Siguiente fase lógica
1. Importar contenido académico premium definitivo.
2. Revisar/aprobar bancos de preguntas reales antes de publicarlos.
3. Conectar SumUp real al estado económico ya existente; el entitlement ya desacopla el proveedor del acceso.
4. E2E visual final con José autenticado desde navegador real.
