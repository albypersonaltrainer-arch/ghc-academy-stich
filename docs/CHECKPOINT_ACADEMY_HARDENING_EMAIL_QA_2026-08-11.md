# CHECKPOINT · GHC ACADEMY · HARDENING + EMAIL + QA

Fecha: 2026-08-11  
Rama: `academy-hardening-email-qa-2026-08-11`  
Base: `main` @ `b53d34b5444ba94492886bcde79d3cbd8321a9e8`

## Objetivo de este bloque

Avanzar sin intervención del propietario únicamente tareas 100 % seguras y reversibles/no dependientes de decisiones externas:

1. refactor técnico seguro;
2. foundation de email transaccional provider-neutral;
3. limpieza/auditoría no destructiva;
4. QA técnico de regresión.

Quedan explícitamente fuera: contenido premium real, SumUp/Stripe, dominio/DNS, identidad fiscal/legal definitiva, elección de proveedor de email y configuración manual de Auth.

## 1. Refactor técnico seguro

Eliminados por estar demostrablemente muertos y sin referencias:

- `app/test-click/page.tsx`: ruta pública de prueba de clic;
- `public/mock-data.json`: estudiantes/transacciones ficticios expuestos como asset público;
- `app/lib/supabaseClient.js`: archivo vacío sin uso.

Mejorado:

- `/login` deja de montar un componente cliente solo para redirigir; usa `redirect('/acceso')` server-side.

Conservado deliberadamente:

- `public/stitch-pages/*.html` y capturas/assets Stitch: referencias visuales, sin efecto sobre runtime;
- wrappers V2 actuales (`StudentDashboardV2`, `CourseOverviewV2`, `FinalExamV2`, `LessonExperience`);
- `app/admin/page.tsx` con hard-stop `notFound()`;
- `/ghc-control-center/pagos` como redirect de compatibilidad;
- `app/ghc-control-center/page.tsx` no se refactoriza agresivamente sin build completo.

## 2. Email transaccional provider-neutral

Migración live: `ghc_academy_email_delivery_foundation`.
Repo: `supabase/migrations/20260811190000_ghc_academy_email_delivery_foundation.sql`.

`academy_notifications` conserva su estado in-app y añade un estado independiente de entrega email:

- `email_status`: `not_applicable | pending | processing | sent | failed | skipped`;
- `email_attempt_count`;
- `email_next_attempt_at`;
- `email_locked_at`;
- `email_last_error`;
- `email_provider`;
- `email_provider_message_id`;
- `email_sent_at`.

Esto evita que marcar un aviso como leído impida su futura entrega por email.

Worker provider-neutral, solo `service_role`:

- `ghc_email_worker_claim_academy_notifications(limit, stale_lock_minutes)`;
- `ghc_email_worker_mark_academy_sent(id, provider, provider_message_id)`;
- `ghc_email_worker_mark_academy_failed(id, error, retry_after_seconds)`;
- `ghc_email_worker_skip_academy_notification(id, reason)`.

Propiedades:

- `FOR UPDATE SKIP LOCKED`;
- locks recuperables;
- máximo 8 intentos;
- backoff automático, máximo 1 hora por defecto;
- retry explícito admitido entre 60 s y 24 h;
- el fallo de email nunca revierte un pago, acceso o evento académico;
- transport/provider todavía no conectado.

Privilegios verificados:

- anon → worker: `false`;
- authenticated → worker: `false`;
- service_role → worker: `true`;
- anon/authenticated → SELECT directo `academy_notifications`: `false`.

## 3. Cobertura automática de eventos email

Migración live: `ghc_academy_email_event_coverage`.
Repo: `supabase/migrations/20260811191000_ghc_academy_email_event_coverage.sql`.

Cualquier nuevo aviso `email` o `in_app_email` con destinatario válido entra automáticamente en `email_status='pending'`.

Se añaden eventos provider-neutral para:

- certificado emitido;
- certificado revocado;
- ticket de soporte creado → alumno email-ready + admin in-app;
- ticket resuelto/cerrado → alumno email-ready;
- respuesta de soporte por admin → alumno email-ready.

Los eventos comerciales de pedido, cuotas, recordatorios, cancelación, reactivación y reembolso ya utilizaban `academy_notifications` y quedan automáticamente cubiertos por el nuevo trigger.

Pruebas transaccionales con rollback:

- aviso `in_app_email` → `email_status=pending`, programado, 0 residuos;
- ticket soporte → aviso alumno email-ready + aviso admin in-app;
- respuesta admin → aviso alumno email-ready;
- tras rollback: 0 tickets y 0 notificaciones QA.

## 4. Índices seguros añadidos

Añadidos únicamente para FKs del motor Academy reciente que el advisor señaló sin cobertura:

- `academy_commercial_events(order_id)`;
- `academy_contract_confirmations(user_id)`;
- `academy_legal_acceptances(user_id)`;
- `academy_notifications(order_id)`;
- `academy_orders(course_id)`;
- `academy_orders(policy_id)`;
- `academy_refund_requests(order_id)`;
- `academy_refund_requests(user_id)`;
- `course_access(commercial_order_id)`;
- índice parcial de cola de email.

No se eliminan índices históricos por aparecer como `unused`: Academy todavía no tiene tráfico representativo.
No se reescriben RLS por avisos de optimización sin una ventana de regresión completa.

## 5. Limpieza de datos

Se detectó el curso archivado `prueba-definitiva-cflgz`:

- 1 módulo;
- 1 lección;
- 1 examen;
- 0 accesos;
- 0 pedidos;
- 0 intentos;
- 0 completados;
- 0 certificados;
- 0 media assets.

Eliminado mediante migración guardada `20260811190500_ghc_remove_archived_test_course.sql`, con guards que impiden borrarlo si existiera actividad real.

Se conserva deliberadamente `entrenador-personal-nivel-1` en `draft` con 3 módulos / 16 lecciones demo, porque sigue siendo útil para probar la plataforma hasta sustituirlo por contenido premium real. Contiene recursos de prueba YouTube, SoundHelix, Mozilla PDF.js y MDN. No se publica y no se considera contenido definitivo.

Snapshot final QA:

- QA courses: 0;
- Academy orders: 0;
- installments: 0;
- refund requests: 0;
- contract confirmations: 0;
- Academy notifications: 0;
- support tickets: 0;
- lesson media assets: 0;
- stream playback sessions: 0;
- certificados temporales José: 0.

## 6. QA de seguridad

Superficie anónima GHC verificada:

- anon student RPCs: 0;
- anon admin RPCs: 0;
- anon email-worker RPCs: 0;
- authenticated email-worker RPCs: 0;
- GHC RPCs anónimas totales: 3, exactamente las intencionadas:
  1. `ghc_public_get_course_catalog(text)`;
  2. `ghc_public_get_course_payment_options(text)`;
  3. `ghc_public_verify_certificate(text)`.

Los avisos `RLS enabled no policy` en tablas Academy/preventa son compatibles con el diseño deliberado: acceso directo revocado y operaciones por RPC controlado.
Los warnings de SECURITY DEFINER son esperados en esta arquitectura; los admin RPC validan identidad/rol internamente y los student RPC validan `auth.uid()`/propiedad.

Pendiente externo conocido:

- Supabase Auth: `Leaked Password Protection Disabled`.

No se puede corregir desde las acciones actualmente disponibles del connector; requiere configuración de Auth.

## 7. QA de runtime / Vercel

Producción consultada en Vercel: **0 runtime errors en las últimas 24 h**.

Vercel sí construyó un commit temprano de esta rama (`c1b85b...`) como Preview READY. Los commits posteriores están rechazados por la cuota de builds con mensaje explícito:

`Deployment rate limited — retry in 24 hours.`

No se interpreta como fallo de compilación del código.

## Estado del bloque

- Refactor técnico seguro: CERRADO dentro del alcance sin riesgo.
- Email: foundation/cola/eventos/retries/seguridad CERRADOS; solo queda conectar un transport/provider real.
- Limpieza/auditoría: CERRADA para lo que puede tocarse antes de importar el contenido real.
- QA técnico: CERRADO para backend/permisos/runtime actual; QA visual/multidispositivo definitivo queda para cuando exista contenido final y el nuevo build pueda desplegarse.

## Siguiente paso dependiente del propietario

Prioridad recomendada:

1. hacer accesibles los documentos premium del Nivel 1;
2. importar contenido real;
3. generar/revisar examen real Nivel 1;
4. elegir/configurar transporte email cuando toque;
5. SumUp real;
6. identidad legal/fiscal;
7. dominio;
8. Leaked Password Protection;
9. E2E y QA visual final con contenido definitivo.
