# GHC ACADEMY — BITÁCORA ACUMULATIVA DE LOGROS
**Iniciada:** 2026-11-18 · Rama V2: `feature/ghc-importador-academico-20261116`  
**Regla:** sólo añadir entradas; nunca borrar logros anteriores. No confundir "ejecutado" con "aprobado por el usuario". Este repositorio es público: no incluir datos de alumnos, claves, textos docentes privados ni soluciones de exámenes.

## Hitos históricos recuperados — NO transcribir como aprobaciones nuevas
| Referencia | Estado y evidencia | Aprobación |
|---|---|---|
| Cierre académico global de Entrenador Personal | Informes maestros previos documentan 3 niveles y 30 módulos cerrados. Debe verificarse cada Word exacto antes de importación. | Aprobación histórica comunicada en el proyecto; no renovada en esta auditoría |
| V2 importador y demo privada (16/11/2026) | Código en rama de laboratorio; pruebas automatizadas; Preview READY `dpl_DKSz8ZMtYBBRchaKHckMyhu6RSrv`; lote breve Módulo 1 en staging. | Aprobación de publicación de contenidos: **NO** |
| Auditoría FACTORÍA IA (18/11/2026) | Informe de Codex recibido; Open Duet, Codex, Qwen y ARGOS probados dentro de su alcance; OpenMontage/WanGP no acreditados como generadores operativos locales. | No autoriza instalación/generación |

## Entradas de ejecución desde la instauración de esta bitácora

### GHC-CONT-20261118-001 · Verificación de estado + creación de matriz fuente
- **Fecha:** 2026-11-18 (hora de ejecución no registrada en el presente documento; consultar fecha del commit de GitHub para hora UTC verificable).
- **Solicitud autorizada:** instaurar estado maestro, bitácora y protocolo de respaldo; verificar en modo lectura V2, Supabase y contenido disponible. No se autorizó modificar V1 ni producción.
- **Acciones:** revisión de repo GitHub, rama V2, Vercel Preview, tablas SQL y catálogo; creación de `GHC_ACADEMY_ESTADO_MAESTRO.md` y del presente documento en rama de laboratorio, sin alterar archivos previos ni tablas.
- **Contenido verificado:** 5 registros `courses`, 3 `modules`, 16 `lessons`, 25 `exams` (23 draft/1 archived/1 published), 3 `certificates`, 1 fuente Word breve de staging; curso completo de 30 módulos reportado como cerrado documentalmente pero aún no importado íntegro.
- **Pruebas realizadas:** consultas de solo lectura a Supabase; consulta de metadatos de repositorio/despliegue; comprobación previa de ausencia de ambos archivos en rama V2 y `main`. Pendiente: releer y verificar ambas rutas tras commit.
- **Resultado:** documentos de continuidad creados; no se ha verificado backup restaurable de base de datos. Cambios de documentación NO implican aprobación de nuevas funcionalidades académicas.
- **Aprobación humana de este hito:** PENDIENTE de validación posterior; no falsear.
- **Punto de recuperación:** rama `feature/ghc-importador-academico-20261116`; Git conserva el historial de commits. Último despliegue previo READY: `dpl_DKSz8ZMtYBBRchaKHckMyhu6RSrv`. No usar un despliegue Preview como copia de seguridad de Supabase.
- **Dependencias:** verificar mecanismo de backups Supabase/Storage, catalogar Word originales y cursos previstos, validar examen y certificado con usuario de prueba.
- **Siguiente tarea exacta:** recuperar fuentes exactas de los 30 Word, el catálogo anterior de 8–10 cursos y verificar respaldo restorable antes de migraciones o importaciones masivas.

## Plantilla para la siguiente entrada (NO sustituir logros anteriores)
```text
### GHC-AAAAMMDD-NNN · Título del logro
- Fecha y hora (zona horaria + fuente):
- Alcance autorizado:
- Archivos y sistemas afectados:
- Respaldo previo y restauración:
- Pruebas, evidencias y resultados:
- Aprobación explícita del usuario:
- SHA / versión / deploy:
- Riesgos pendientes:
- Siguiente tarea exacta:
```
