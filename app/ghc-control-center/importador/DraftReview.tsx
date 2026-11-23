'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AcademicPreview } from '../../../lib/academy/import-preview'
import { buildAcademicDraft } from '../../../lib/academy/draft-plan'
import type { AcademicDraftSection, DraftKind } from '../../../lib/academy/draft-plan'
import { academicReviewPackage } from '../../../lib/academy/review-export'
import { simulateAcademicImport } from '../../../lib/academy/import-dry-run'
import type { PreviewDatabaseSnapshot } from '../../../lib/academy/import-dry-run'
import { createClient } from '@supabase/supabase-js'
import styles from './importador.module.css'

type Props = { preview: AcademicPreview }
type Adjustment = {
  title: string
  kind: DraftKind
  reviewed: boolean
  note: string
}

const OPTIONS: ReadonlyArray<{ value: DraftKind; label: string }> = [
  { value: 'lesson_candidate', label: 'Lección candidata' },
  { value: 'orientation', label: 'Orientación' },
  { value: 'practice', label: 'Práctica / actividad' },
  { value: 'assessment', label: 'Material de evaluación · docente' },
  { value: 'private_answer_key', label: 'Respuestas reservadas · docente' },
  { value: 'video_script', label: 'Guion audiovisual' },
  { value: 'glossary', label: 'Glosario' },
  { value: 'references', label: 'Bibliografía / fuentes' },
  { value: 'other', label: 'Pendiente de clasificar' }
]

function safeExportName(name: string) {
  const stem = name.replace(/\.(docx|pdf)$/i, '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 75)
  return (stem || 'modulo') + '_REVISION_SIN_APROBAR.json'
}

export default function AcademicDraftReview({ preview }: Props) {
  const draft = useMemo(() => buildAcademicDraft(preview), [preview])
  const [adjustments, setAdjustments] = useState<Record<string, Adjustment>>({})
  const [error, setError] = useState('')
  const [downloaded, setDownloaded] = useState(false)
  const [databaseSnapshot, setDatabaseSnapshot] = useState<PreviewDatabaseSnapshot | null>(null)
  const [snapshotState, setSnapshotState] = useState<'loading' | 'verified' | 'unavailable'>('loading')

  useEffect(() => {
    let active = true
    async function readCatalogue() {
      try {
        const client = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )
        const { data: roleAllowed, error: roleError } = await client.rpc('ghc_is_admin')
        if (roleError || roleAllowed !== true) throw new Error('ADMIN_MFA_REQUIRED')
        const [courses, modules] = await Promise.all([
          client.from('courses').select('id,slug,status')
            .in('slug', ['entrenador-personal-nivel-1', 'entrenador-personal-nivel-2', 'entrenador-personal-nivel-3']),
          client.from('modules').select('id,course_id,title,position,sort_order')
        ])
        if (courses.error || modules.error || !courses.data || !modules.data) throw new Error('CATALOGUE_READ_FAILED')
        if (!active) return
        setDatabaseSnapshot({
          courses: courses.data,
          modules: modules.data,
          readComplete: true
        })
        setSnapshotState('verified')
      } catch {
        if (!active) return
        setDatabaseSnapshot(null)
        setSnapshotState('unavailable')
      }
    }
    void readCatalogue()
    return () => { active = false }
  }, [preview.sourceSha256])

  function current(section: AcademicDraftSection): Adjustment {
    return adjustments[section.id] || {
      title: section.title,
      kind: section.kind,
      reviewed: false,
      note: ''
    }
  }

  function update(section: AcademicDraftSection, change: Partial<Adjustment>) {
    const original = current(section)
    const next = { ...original, ...change }
    // A detected answer key can never be demoted by the editor. This is a review,
    // not an authorization to expose answers to students.
    if (section.kind === 'private_answer_key' || section.kind === 'assessment') next.kind = section.kind
    setAdjustments(prev => ({ ...prev, [section.id]: next }))
    setDownloaded(false)
  }

  const simulation = useMemo(() => simulateAcademicImport(preview, databaseSnapshot),
    [preview, databaseSnapshot])
  const reviewed = draft.sections.filter(section => current(section).reviewed).length
  const coverage = draft.sections.reduce((sum, section) => sum + section.blockCount, 0)

  function exportReview() {
    try {
      // No API calls, uploads, persistence or course mutations.
      // The original source hash ties all decisions to the exact Word bytes.
      const packageData = {
        ...academicReviewPackage(preview, Object.fromEntries(
          draft.sections.map(section => [section.id, current(section)])
        )),
        importSimulation: simulation
      }
      const content = JSON.stringify(packageData, null, 2)
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = safeExportName(preview.fileName)
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      setDownloaded(true)
      setError('')
    } catch {
      setError('No se pudo preparar el archivo JSON de revisión. Los documentos originales no se han modificado.')
    }
  }

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <h2>3. Organización editable del módulo — borrador local</h2>
            <p>Nivel {draft.levelNumber === null ? 'por determinar' : draft.levelNumber}
              {' · '}Módulo {draft.moduleNumber === null ? 'por determinar' : draft.moduleNumber}
              {' · '}{draft.moduleTitle}</p>
          </div>
          <span className={styles.reviewStatus}>SIN APROBAR</span>
        </div>
        <div className={styles.metrics}>
          <div><strong>{draft.sections.length}</strong><span>Secciones detectadas</span></div>
          <div><strong>{draft.metrics.lessonCandidates}</strong><span>Lecciones candidatas</span></div>
          <div><strong>{draft.metrics.staffOnly}</strong><span>Reservadas al equipo</span></div>
          <div><strong>{reviewed}/{draft.sections.length}</strong><span>Revisadas manualmente</span></div>
        </div>
        <p className={styles.note}>
          Puedes ajustar los títulos y el tipo de sección. Todos los cambios se mantienen solamente en esta pantalla,
          hasta que descargues un archivo de revisión. <strong>Revisado no significa aprobado ni publicado.</strong>
        </p>
        <p className={styles.note}>
          Cobertura de origen: {coverage}/{preview.blocks.length} bloques ·
          SHA-256 del documento: <code>{preview.sourceSha256}</code>
        </p>
        {draft.metadataTitleMismatch && (
          <p className={styles.error}>
            La portada y el título interno de Word indican módulos diferentes. Revisa la identidad
            antes de proponer una importación real.
          </p>
        )}
        {draft.sourceMetadataTitle && <p className={styles.note}>Metadatos internos: {draft.sourceMetadataTitle}</p>}
        {preview.format === 'PDF' && (
          <p className={styles.warning}>Un PDF no garantiza la reconstrucción de la jerarquía de lecciones. La organización de esta fuente solo puede revisarse como referencia preliminar.</p>
        )}
        <div className={styles.warning}>
          <strong>Simulación sin escrituras en Supabase</strong>
          <p>
            Destino del programa oficial: {simulation.target
              ? 'Nivel ' + simulation.target.level + ' · módulo ' + simulation.target.moduleNumber +
                ' · ' + simulation.target.title + ' · posición ' + simulation.target.position
              : 'Número de módulo no identificado'}
          </p>
          <p>Estado de la comprobación del campus: {
            snapshotState === 'verified' ? 'consultado en modo lectura' :
            snapshotState === 'loading' ? 'consultando…' : 'no disponible; no se supone que esté vacío'
          }</p>
          <p>
            Lecciones temáticas candidatas: {simulation.candidateLessonTitles.length} ·
            Secciones reservadas: {simulation.reservedSections.length} ·
            Apartados complementarios: {simulation.supplementarySections.length}
          </p>
          {simulation.blockers.length > 0
            ? <div>
                <strong>Condiciones pendientes de resolver</strong>
                <ul className={styles.checkList}>
                  {simulation.blockers.map((reason, index) => <li key={index}>{reason}</li>)}
                </ul>
              </div>
            : <p>Sin conflictos estructurales detectados. Aún se necesita revisión editorial y aprobación del staging.</p>}
          {simulation.positionConflicts.map(conflict => (
            <p key={conflict.id}>Módulo ya existente en esa posición: {conflict.title}. No se reemplazará.</p>
          ))}
          <p className={styles.note}>La simulación no contiene botones de creación, actualización ni publicación.</p>
        </div>

        <div className={styles.sectionList}>
          {draft.sections.map(section => {
            const a = current(section)
            const locked = section.kind === 'private_answer_key' || section.kind === 'assessment'
            return (
              <article key={section.id} className={locked || a.kind === 'assessment' || a.kind === 'private_answer_key' ? styles.sectionPrivate : styles.sectionDraft}>
                <div className={styles.sectionTop}>
                  <strong>{section.id} · {section.title}</strong>
                  <span>{locked ? 'RESERVADO · DOCENTE' : section.kindLabel}</span>
                </div>
                <div className={styles.editorGrid}>
                  <label className={styles.editorField}>
                    <span>Título editorial propuesto</span>
                    <input
                      value={a.title}
                      onChange={e => update(section, { title: e.target.value.slice(0, 200) })}
                      maxLength={200}
                      aria-label={'Título de ' + section.title}
                    />
                  </label>
                  <label className={styles.editorField}>
                    <span>Clasificación</span>
                    <select
                      value={locked ? 'private_answer_key' : a.kind}
                      onChange={e => update(section, { kind: e.target.value as DraftKind })}
                      disabled={locked}
                      aria-label={'Clasificación de ' + section.title}
                    >
                      {OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
                <label className={styles.editorField}>
                  <span>Observaciones para la revisión final (opcional)</span>
                  <textarea
                    rows={2}
                    value={a.note}
                    maxLength={600}
                    onChange={e => update(section, { note: e.target.value })}
                    placeholder="Ej.: unir esta sección con la anterior, revisar figura, separar rúbrica…"
                  />
                </label>
                <div className={styles.sectionFooter}>
                  <label className={styles.reviewCheck}>
                    <input type="checkbox" checked={a.reviewed} onChange={e => update(section, { reviewed: e.target.checked })}/>
                    <span>He revisado la clasificación (no es aprobación de publicación)</span>
                  </label>
                  <small>Bloques {section.blockStart + 1}–{section.blockEnd} · {section.textCharacters.toLocaleString('es-ES')} caracteres · {section.mediaIds.length} figuras asociadas</small>
                </div>
                {locked && <p className={styles.privateNote}>Este material permanece reservado al equipo docente y no puede reclasificarse como lección desde esta herramienta.</p>}
              </article>
            )
          })}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={exportReview}>Descargar borrador de revisión (.json)</button>
          {downloaded && <span>Archivo de revisión preparado en tu navegador. No se ha enviado al campus.</span>}
        </div>
        <p className={styles.note}>El archivo contiene texto académico y debe almacenarse de forma privada. No contiene imágenes embebidas, solo sus identificadores y huellas de integridad. Para usarlo posteriormente será necesario el Word original y una aprobación específica.</p>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <h2>4. Inventario de recursos originales</h2>
            <p>{preview.media.length} figuras vinculadas al cuerpo · {preview.mediaFilesInPackage} archivos en el paquete.</p>
          </div>
          <span className={styles.reviewStatus}>REVISAR IMÁGENES</span>
        </div>
        {draft.metrics.mediaUnassigned > 0 && (
          <div className={styles.warning}>
            <strong>Archivos internos sin vínculo de posición en el cuerpo</strong>
            <p>{draft.metrics.mediaUnassigned} archivos multimedia internos no aparecen vinculados a una posición del cuerpo del Word. Pueden proceder de recursos no utilizados, cabeceras u otros elementos; no se colocarán ni eliminarán automáticamente. Requieren revisión documental antes de publicar.</p>
          </div>
        )}
        {preview.media.length > 0
          ? <div className={styles.mediaGrid}>
              {preview.media.map(media => {
                const section = draft.sections.find(s => s.mediaIds.includes(media.id))
                return (
                  <article key={media.id} className={styles.mediaCard}>
                    <div className={styles.mediaVisual}>
                      {media.previewDataUrl
                        ? <img src={media.previewDataUrl} alt={media.altNeedsReview ? 'Figura pendiente de descripción accesible' : media.altText || 'Figura del documento'}/>
                        : <span>Imagen original sin miniatura por límite de tamaño</span>}
                    </div>
                    <strong>{media.path.split('/').pop()}</strong>
                    <small>{(media.bytes / 1024).toFixed(1)} KB · {media.mimeType}</small>
                    <small>Sección: {section?.title || 'Pendiente de asignar'}</small>
                    <small>SHA-256: {media.sha256.slice(0, 20)}…</small>
                    {media.altNeedsReview && <p>Descripción accesible pendiente de revisión.</p>}
                  </article>
                )
              })}
            </div>
          : <p>No se han detectado figuras vinculadas al cuerpo del documento.</p>}
        <p className={styles.note}>Las miniaturas proceden únicamente del Word original. No se han generado imágenes ni subido recursos a Supabase.</p>
      </section>
    </>
  )
}
