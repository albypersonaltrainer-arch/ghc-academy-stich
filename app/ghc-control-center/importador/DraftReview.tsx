'use client'

import { useMemo, useState } from 'react'
import type { AcademicPreview } from '../../../lib/academy/import-preview'
import { buildAcademicDraft } from '../../../lib/academy/draft-plan'
import styles from './importador.module.css'

type Props = { preview: AcademicPreview }

export default function AcademicDraftReview({ preview }: Props) {
  const draft = useMemo(() => buildAcademicDraft(preview), [preview])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function copyDraft() {
    const manifest = {
      draft,
      source: {
        fileName: preview.fileName,
        format: preview.format,
        sourceMetadataTitle: preview.sourceMetadataTitle,
        stats: preview.stats,
        truncated: preview.truncated
      },
      imageManifest: preview.media.map(({ previewDataUrl: _data, ...item }) => item)
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(manifest, null, 2))
      setCopied(true)
      setError('')
    } catch {
      setError('No se pudo copiar el borrador. Comprueba los permisos del portapapeles.')
    }
  }

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <h2>3. Propuesta de organización académica</h2>
            <p>Nivel {draft.levelNumber === null ? 'por determinar' : draft.levelNumber}
              {' · '}Módulo {draft.moduleNumber === null ? 'por determinar' : draft.moduleNumber}
              {' · '}{draft.moduleTitle}</p>
          </div>
          <span className={styles.reviewStatus}>BORRADOR SIN APROBAR</span>
        </div>
        {draft.metadataTitleMismatch && (
          <p className={styles.error}>
            La portada no coincide con los metadatos internos de Word.
            Hemos evitado utilizar el título antiguo para asignar automáticamente el módulo.
          </p>
        )}
        {draft.sourceMetadataTitle && <p className={styles.note}>Título interno del documento: {draft.sourceMetadataTitle}</p>}
        <div className={styles.metrics}>
          <div><strong>{draft.sections.length}</strong><span>Secciones propuestas</span></div>
          <div><strong>{draft.metrics.lessonCandidates}</strong><span>Lecciones candidatas</span></div>
          <div><strong>{draft.metrics.staffOnly}</strong><span>Solo equipo docente</span></div>
          <div><strong>{draft.metrics.reviewSections}</strong><span>Ubicación por decidir</span></div>
        </div>
        <p className={styles.note}>
          La estructura se ha separado por encabezados de primer nivel.
          Todavía no se han creado lecciones ni se ha aprobado ningún contenido.
        </p>
        <div className={styles.sectionList}>
          {draft.sections.map(section => (
            <article key={section.id} className={section.visibility === 'staff_only' ? styles.sectionPrivate : styles.sectionDraft}>
              <div className={styles.sectionTop}>
                <strong>{section.title}</strong>
                <span>{section.kindLabel}</span>
              </div>
              <p>{section.suggestedReason}</p>
              <small>
                {'Bloques ' + (section.blockStart + 1) + '–' + section.blockEnd}
                {' · ' + section.textCharacters.toLocaleString('es-ES') + ' caracteres'}
                {section.mediaIds.length ? ' · ' + section.mediaIds.length + ' imágenes' : ''}
              </small>
              {section.visibility === 'staff_only' && <small className={styles.privateNote}>Separado de las lecciones del alumno</small>}
            </article>
          ))}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={copyDraft}>{copied ? 'Propuesta copiada' : 'Copiar propuesta de estructura (JSON)'}</button>
          <span>Este JSON no incluye las miniaturas ni cambia el contenido de la academia.</span>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <h2>4. Inventario de imágenes originales</h2>
            <p>{preview.media.length} imágenes vinculadas al cuerpo del Word · {preview.mediaFilesInPackage} archivos multimedia dentro del paquete.</p>
          </div>
          <span className={styles.reviewStatus}>REVISAR RECURSOS</span>
        </div>

        {draft.metrics.mediaUnassigned > 0 && (
          <div className={styles.warning}>
            <strong>Archivos pendientes de asociación</strong>
            <p>Hay {draft.metrics.mediaUnassigned} archivos multimedia internos sin una ubicación de imagen detectada en el cuerpo.
              No se importarán ni eliminarán automáticamente.</p>
          </div>
        )}

        {preview.media.length > 0 ? (
          <div className={styles.mediaGrid}>
            {preview.media.map(media => {
              const section = draft.sections.find(s => s.mediaIds.includes(media.id))
              return <article key={media.id} className={styles.mediaCard}>
                <div className={styles.mediaVisual}>
                  {media.previewDataUrl
                    ? <img src={media.previewDataUrl}
                        alt={media.altNeedsReview ? 'Imagen del Word pendiente de descripción accesible' : media.altText || 'Imagen original'} />
                    : <span>Vista previa no disponible por límites de tamaño.</span>}
                </div>
                <strong>{media.path.split('/').pop()}</strong>
                <small>{(media.bytes / 1024).toFixed(1)} KB · {media.mimeType}</small>
                <small>Sección: {section?.title || 'Pendiente de revisar'}</small>
                <small>SHA-256: {media.sha256.slice(0, 20)}…</small>
                {media.altNeedsReview && <p>Descripción accesible pendiente de revisar.</p>}
              </article>
            })}
          </div>
        ) : <p>No se han detectado imágenes colocadas en el cuerpo del documento.</p>}
        <p className={styles.note}>
          Las miniaturas, cuando aparecen, son reproducciones de los archivos originales sin generación ni edición.
          Las imágenes no se han subido a Supabase ni se han incorporado a lecciones.
        </p>
      </section>
    </>
  )
}
