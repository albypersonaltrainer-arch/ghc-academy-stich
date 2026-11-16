# GHC Academy · Staging académico privado — activación 16/11/2026

## Refuerzo de fiabilidad y recuperación segura — 16/11/2026

Tras revisar la confirmación de la subida, se corrigió un posible escenario de pérdida de datos: si se reenviaba la confirmación de un Word ya registrado, el antiguo bloque `finally` podía borrar su original al tratar el intento como error duplicado. **Se eliminó todo borrado automático de la ruta de confirmación.**

- La confirmación consulta primero `ghc_academic_stage_source_info(uuid)`. Si el identificador ya está registrado, solo confirma de forma idempotente cuando coinciden nombre, formato, tamaño, ruta privada y SHA-256. Si hay discrepancias, devuelve un conflicto sin modificar archivos ni registros.
- Ante una subida interrumpida o una validación fallida puede quedar un archivo aún no registrado en el bucket. **Se conserva para recuperación o limpieza manual tras revisión**, nunca se borra silenciosamente.
- Se creó la RPC `ghc_academic_stage_health()` como **`SECURITY INVOKER`**, ejecutable exclusivamente por `service_role`. Proporciona recuentos de registros, objetos, archivos sin registrar, objetos sin registro con más de dos horas y registros cuyo archivo original falte, más una muestra limitada para inspección. No modifica ninguna tabla ni objeto.
- La ruta `GET /api/academy/import/staging/health` aplica la misma verificación de sesión administrativa + MFA AAL2 y de rama Preview exacta que el resto del importador. La pantalla muestra el resumen junto al inventario y advierte si detecta anomalías.
- El test `scripts/test-academic-staging-guardrails.mjs` valida los reintentos, rechazo de conflictos y ausencia de llamadas a `storage.remove` en el endpoint de confirmación. Se ejecuta en el build de esta rama.
- La comprobación SQL de `ghc_academic_stage_health()` con `SET LOCAL ROLE service_role` devolvió **0 lotes, 0 secciones, 0 figuras, 0 objetos, 0 originales faltantes y 0 subidas sin registrar**. `anon` y `authenticated` no tienen `EXECUTE` en esta función.

**Queda pendiente:** prueba de navegador autenticado con MFA, subida completa de un documento definitivo y revisión del contenido restaurado. Hasta completarla, el circuito real de punta a punta no debe presentarse como validado.

## Estado y alcance

**CREADO y comprobado** en el proyecto Supabase `oqlxvesnjdkxlxwxkikq`, mediante la migración registrada **`20261116144459_ghc_academic_private_staging_20261116`**.

El usuario autorizó crear un área privada de preparación en Supabase, separada de los módulos/lecciones actuales y de PITTI. Se ha creado únicamente la infraestructura **vacía**. No se han importado Word, imágenes, evaluaciones ni datos de alumnos. No hay nueva interfaz de escritura y no se ha modificado ni promovido el código de producción.

### Entidades instaladas (esquema aislado `ghc_academic_staging`)

| Tabla | Función |
|---|---|
| `import_batches` | Registra archivo de origen, hash SHA-256, revisión, tipo, tamaño, identidad de nivel/módulo y estado de revisión, junto con bloques extraídos y advertencias |
| `section_drafts` | Secciones editoriales y clasificación; los exámenes y solucionarios están obligatoriamente marcados `staff_only` mediante una restricción de base de datos |
| `media_drafts` | Inventario de figuras con hashes, rutas, alt y referencias de ubicación, sin publicar |
| `review_events` | Historial técnico de eventos de revisión |

Todas las tablas tienen UUID, restricciones de consistencia, vínculos internos, índices y **RLS activada sin políticas de acceso a clientes**. Los roles `anon` y `authenticated` no tienen permisos de uso del esquema ni acceso a las tablas. Solo `service_role` puede utilizarlas; ninguna credencial de este rol se ha expuesto en el navegador.

### Depósito privado de originales

- **Bucket:** `ghc-academic-staging`
- **Acceso público:** `false` (privado).
- **Máximo por archivo:** 12 MiB = 12.582.912 bytes.
- **MIME permitidos:** DOCX, PDF, JSON, PNG, JPG, WebP y GIF.
- **Políticas sobre objetos:** ninguna que habilite este bucket para anónimos, alumnos o administradores desde el navegador. Toda futura subida/descarga deberá mediarla un backend restringido que compruebe administrador + MFA AAL2.
- **Objetos al terminar la activación:** 0.

La creación del bucket está documentada por Supabase como una operación admitida mediante SQL. No se crearon objetos en `storage.objects` por SQL.

### Validaciones posteriores ejecutadas

| Comprobación | Resultado |
|---|---|
| Tablas nuevas | 4 / 4 con RLS |
| Lectura por rol `anon` | Denegada para las 4 |
| Lectura por rol `authenticated` | Denegada para las 4 |
| Uso del esquema por `anon` / `authenticated` | Denegado |
| Uso del esquema y lectura por `service_role` | Permitidos |
| Bucket privado, límite y MIME | Verificados |
| Políticas de Storage que abran el bucket | 0 |
| Filas de staging | 0 en las 4 tablas |
| Objetos en depósito privado | 0 |
| Nivel 1 | Sigue `draft` con 3 módulos/16 lecciones de demostración |
| Niveles 2 y 3 | Siguen `draft` con 0 módulos |
| PITTI | 10 RPC antiguas accesibles con token y 1 agente habilitado, sin cambios |

**Asesor de seguridad de Supabase:** no identificó nuevas advertencias de exposición específicas para el esquema o depósito. Sí muestra `rls_enabled_no_policy` (informativo): aumenta el recuento al crear cuatro tablas deliberadamente cerradas sin políticas. Las advertencias anteriores de PITTI y funciones históricas permanecen.

### Segunda etapa: API privada conectada en Preview (16/11/2026)

Se añadió a Supabase la migración `ghc_staging_service_role_only_write_and_list_20261116` con dos funciones SQL **`SECURITY INVOKER`** en `public`:
- `ghc_academic_stage_save(jsonb)`: guarda de manera transaccional un lote fuente, sus secciones, el inventario de figuras y un evento técnico; **no modifica `public.courses/modules/lessons`**. Verifica huella, tamaño, formato, identidad de rutas, límites y que examen/solucionario permanezcan reservados.
- `ghc_academic_stage_list(integer)`: devuelve solo el inventario de cabeceras y recuentos de borradores.
- `EXECUTE` se **revocó de PUBLIC, anon y authenticated**; únicamente `service_role` puede invocarlas. No se han concedido accesos a alumnos.

Se comprobó la función de guardado bajo `SET LOCAL ROLE service_role` con un ejemplo sintético dentro de una transacción `BEGIN ... ROLLBACK`. El inventario de prueba se leyó desde esa transacción y los recuentos finales de staging permanecieron a cero; se verificó además que `anon` y `authenticated` no pueden ejecutar ninguna de las dos RPC. **No se ha subido material académico real en estas pruebas**.

### Ruta de subida privada (sin superar el límite de cuerpo de Vercel)

1. El administrador abre la rama aislada `feature/ghc-importador-academico-20261116`, iniciando sesión con MFA verificado (AAL2).
2. `POST /api/academy/import/staging/init` valida la sesión en Auth, el rol+MFA vía `ghc_is_admin`, el origen del navegador, el entorno Preview y la rama. Solo entonces utiliza la clave de servicio **en el servidor** para entregar un permiso de subida firmado asociado a `originals/<UUID>/source.docx` o `source.pdf`. El token firmado **no es la clave de servicio** y está limitado al objeto solicitado.
3. El navegador transfiere el Word/PDF **directamente a Supabase Storage** con `uploadToSignedUrl`, evitando pasar el binario de hasta 12 MiB por el límite de cuerpo HTTP de una función de Vercel.
4. `POST /api/academy/import/staging/commit` vuelve a comprobar administrador + MFA AAL2, lee el archivo privado con la clave de servicio exclusivamente en backend, verifica tamaño y SHA-256, reanaliza el documento de forma independiente y llama a la RPC transaccional. Los medios originales permanecen dentro del Word; sus huellas, posiciones y descripciones se inventarían para revisión posterior.
5. En caso de fallo de la validación o del guardado, el backend **intenta** borrar únicamente el objeto de la ruta recién reservada. Si la sesión se cierra entre los pasos 3 y 4, puede quedar un original provisional sin asociar; requerirá mantenimiento de limpieza seguro basado en el inventario.
6. `GET /api/academy/import/staging/list` consulta en modo administración el inventario de borradores sin revelar el texto completo ni emitir URLs de descarga.

**No existe ninguna función de publicación** ni un mecanismo automático que copie staging hacia los cursos de alumnos. No se suben originales sin pulsar el botón específico «Guardar original y borrador privado».

> Los nuevos endpoints se limitan a la rama Preview exacta y requieren credencial JWT de administrador con AAL2; la clave `SUPABASE_SERVICE_ROLE_KEY` existe como variable sensible de servidor y no se expone en código, respuesta, correo ni `NEXT_PUBLIC_*`. La sesión protegida y una carga real desde el navegador aún deberán probarse manualmente con el titular; la validación SQL transaccional y la compilación no sustituyen esa prueba.

### Lectura de originales para revisión posterior

Se ha incorporado la RPC privada `ghc_academic_stage_source_info(uuid)` (**`SECURITY INVOKER` y solo `service_role`**) y la ruta **`GET /api/academy/import/staging/review?id=<uuid>`**, también limitada a la rama Preview exacta y a administrador con MFA AAL2. El backend:
- Consulta únicamente metadatos del archivo ya registrado.
- Comprueba la ruta derivada del UUID y el formato; descarga el original desde el depósito privado.
- Verifica tamaño y SHA-256 frente al registro de staging y reconstruye una vista de revisión desde el Word original.
- Devuelve el contenido a la sesión administradora con cabeceras `no-store`; **no publica, copia ni edita los cursos**.

La página incorpora el botón `Abrir original y revisar` en cada entrada de staging y abre automáticamente la vista después de un guardado confirmado. Esto evita volver a transferir un Word grande a través del endpoint de análisis directo.

**Limitación consciente:** `POST /api/academy/import/preview` (análisis sin almacenamiento persistente) queda para archivos de hasta aproximadamente **4 MiB** debido al límite de carga de Vercel. Para un Word mayor, como el Módulo 20, utilizar **`Guardar original y borrador privado`** y después abrirlo desde el inventario, sin publicación. Las pruebas con la sesión MFA del titular aún están pendientes.

**Estado de control tras la instalación:** las 3 RPC de staging son `SECURITY INVOKER` y conceden `EXECUTE` exclusivamente a `service_role`; RLS y ausencia de políticas de cliente se mantienen. Las cuatro tablas del staging y el bucket continúan vacíos, sin documentos reales importados.

### Gate de publicación futura; no habilitado

El laboratorio actual sigue **sin escritura**. No se debe conectar todavía el botón «importar» a Supabase sin:
1. Definir un backend exclusivo para la rama autorizada, con verificación JWT real, MFA AAL2, comprobaciones de sesión y autorización administrativa del servidor.
2. Mantener `service_role` exclusivamente en servidor, nunca en `NEXT_PUBLIC_*` ni en respuestas o logs.
3. Implementar carga multipart con comprobación de hash, tamaño, tipo MIME, rutas de objeto y protección contra duplicados; cuidar atomicidad entre Storage y las tablas de staging.
4. Probar accesos denegados de estudiante/anónimo y de administrador AAL1, y acceso autorizado AAL2.
5. Guardar los Word como borradores en el bucket privado y las secciones en las tablas privadas. No crear ni sobrescribir `public.modules`, `public.lessons` o material de exámenes.
6. Requerir aprobación humana de estructura, figuras, evaluación y publicación antes de cualquier migración a los cursos.

### Reversión — NO EJECUTAR sin otra autorización

Si se decide deshacer la infraestructura y **solo si continúa vacía**, comprobar primero los cuatro recuentos de tablas y el número de objetos del bucket. Después, por separado y con autorización expresa, se podría eliminar el bucket por la API de Storage y eliminar `ghc_academic_staging` mediante una migración de retirada. **No ejecutar `DROP SCHEMA ... CASCADE` ni borrar objetos automáticamente**, pues una futura versión podría contener material académico que debemos conservar.

### Registro de continuidad

- Rama técnica: `feature/ghc-importador-academico-20261116`.
- Producción V1 / rama `main`: sin modificaciones.
- Material original: todavía no se ha subido.
- Pagos SumUp: no activados.
- Próximo hito: preparar y validar la API administrativa para subir un Word definitivo a staging en un entorno controlado, **solo después de asegurar el circuito de autenticación, sin publicar**.
