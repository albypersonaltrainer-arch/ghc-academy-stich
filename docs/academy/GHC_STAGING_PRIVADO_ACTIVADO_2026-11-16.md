# GHC Academy · Staging académico privado — activación 16/11/2026

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

### Gate: conexión futura del importador

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
