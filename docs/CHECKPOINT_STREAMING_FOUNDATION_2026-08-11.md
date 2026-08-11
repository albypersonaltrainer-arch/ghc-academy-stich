# CHECKPOINT · Streaming Foundation · 2026-08-11

## Objetivo
Dejar GHC Academy preparada para incorporar streaming VOD y directo sin rehacer la plataforma ni acoplarla hoy a un proveedor concreto.

## Estado cerrado
- Nueva capa de activos multimedia por lección: `lesson_media_assets`.
- Protocolos previstos: `file`, `hls`, `dash`, `embed`, `webrtc`.
- Tipos previstos: `video`, `audio`, `live`.
- Estados previstos: `draft`, `processing`, `ready`, `scheduled`, `live`, `ended`, `error`, `archived`.
- Proveedor desacoplado mediante `provider`, `provider_asset_id` y `playback_reference`.
- Soporte para URL pública/no firmada cuando proceda y para futuros adaptadores de playback firmado.
- Supabase Storage se conserva para archivos tradicionales; no se fuerza a usarlo como CDN HLS.
- Reproductor HLS integrado en la experiencia de lección mediante `hls.js` y fallback nativo cuando el navegador soporta HLS directamente.
- Soporte de `embed` para players gestionados por proveedor.
- Estados de directo programado y directo en curso preparados en UI.
- Los vídeos actuales siguen funcionando como fallback: si no existe `lesson_media_asset`, se utiliza el `video_path` existente.

## Seguridad y autorización
- Las tablas `lesson_media_assets` y `stream_playback_sessions` tienen RLS habilitado y no permiten acceso directo a `anon` ni `authenticated`.
- El alumno obtiene media únicamente por RPC autenticado.
- `ghc_student_get_lesson_media` reutiliza `ghc_internal_student_lesson_access`, por lo que exige matrícula activa y respeta la secuencialidad del curso.
- La apertura de una sesión de reproducción vuelve a comprobar acceso a la lección.
- El progreso de reproducción vuelve a comprobar que la sesión pertenece al usuario y que conserva acceso a la lección.
- Los adaptadores que requieran firma NO entregan playback hasta que el proveedor concreto tenga su adaptador configurado en servidor.

## Sesiones y telemetría
Tabla `stream_playback_sessions`:
- usuario;
- asset;
- curso/lección;
- proveedor;
- apertura y expiración;
- último contacto;
- posición actual;
- máxima posición alcanzada;
- duración;
- evento `ended`.

El player reporta progreso aproximadamente cada 20 segundos, al pausar y al finalizar. Esta telemetría no bloquea la reproducción si falla.

## API
- `GET /api/academy/streaming/playback?lessonId=...`
  - valida Bearer token;
  - valida usuario;
  - obtiene media autorizada;
  - selecciona live activo, vídeo principal o directo programado;
  - resuelve playback según proveedor;
  - abre sesión de reproducción.
- `POST /api/academy/streaming/progress`
  - guarda posición/duración/ended sobre la sesión autorizada.

## RPC admin preparados
- `ghc_admin_upsert_lesson_media_asset`
- `ghc_admin_list_lesson_media_assets`
- `ghc_admin_archive_lesson_media_asset`

Esto permite que, cuando se elija proveedor, el panel admin pueda registrar/editar activos sin cambiar el modelo académico.

## RPC alumno preparados
- `ghc_student_get_lesson_media`
- `ghc_student_open_stream_session`
- `ghc_student_touch_stream_session`

## QA ejecutado
Se creó temporalmente un asset HLS para la primera lección accesible a José con:
- provider: `generic_hls`
- protocol: `hls`
- status: `ready`
- URL QA no firmada.

Resultado:
- José vio exactamente 1 asset autorizado;
- abrió una sesión de playback;
- guardó progreso a 123 segundos;
- `max_position_seconds` quedó en 123;
- después se eliminó el asset QA y la sesión asociada por cascade.

Comprobación final QA:
- assets temporales: 0
- sesiones temporales: 0

## Decisión arquitectónica
No se selecciona proveedor ahora. La arquitectura queda preparada para incorporar, por ejemplo, Mux, Cloudflare Stream, Bunny Stream, Vimeo u otro proveedor mediante un adaptador servidor. Las claves privadas/tokens nunca deben almacenarse en `lesson_media_assets`; deben permanecer en variables seguras del servidor.

## Pendiente cuando se elija proveedor
1. Elegir proveedor y pricing.
2. Implementar su adaptador de ingest/upload y playback firmado.
3. Añadir webhooks de procesamiento/live si el proveedor los ofrece.
4. Añadir administración visual de assets en Control Center si se quiere operar sin SQL/RPC.
5. Probar VOD real y un directo real con dispositivos/navegadores objetivo.

No es necesario rediseñar cursos, lecciones, accesos, progreso académico ni certificados para hacer esos pasos.
