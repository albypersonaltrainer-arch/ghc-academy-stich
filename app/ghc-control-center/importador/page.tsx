'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import type { AcademicPreview } from '../../../lib/academy/import-preview'
import AcademicDraftReview from './DraftReview'
import styles from './importador.module.css'

type Block = AcademicPreview['blocks'][number]
type Preview = AcademicPreview
type State = 'checking' | 'allowed' | 'denied'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const STATUS_MESSAGES: Record<string, string> = {
  SESSION_REQUIRED: 'Inicia sesión y verifica el segundo factor.',
  SESSION_INVALID: 'La sesión ha caducado. Inicia sesión de nuevo.',
  ADMIN_AAL2_REQUIRED: 'Se necesitan permisos de administrador y autenticación AAL2.',
  FILE_REQUIRED: 'Selecciona un documento Word o PDF.',
  FILE_TOO_LARGE: 'El documento debe tener como máximo 12 MB.',
  FORMAT_NOT_SUPPORTED: 'Solo se admiten archivos .docx o .pdf. Los .doc antiguos no son compatibles.',
  PDF_REQUIRES_ORIGINAL_WORD_OR_OCR: 'No se ha podido extraer texto fiable del PDF. Utiliza el Word original o un documento con texto seleccionable.',
  DOCUMENT_CANNOT_BE_READ_SAFELY: 'El documento no pudo analizarse con seguridad. Comprueba que no esté cifrado ni dañado.',
  PREVIEW_PARSE_FAILED: 'No ha sido posible analizar el documento. Prueba con el Word original.',
  PREVIEW_UNAVAILABLE: 'El importador no está disponible en este entorno.',
  INVALID_ORIGIN: 'La petición debe originarse desde esta página del laboratorio.',
  STAGING_UNAVAILABLE: 'El depósito privado todavía no está disponible.',
  INVALID_SOURCE_METADATA: 'Comprueba el nombre, formato y tamaño del Word o PDF.',
  SIGNED_UPLOAD_UNAVAILABLE: 'No se pudo reservar el espacio de subida.',
  SIGNED_UPLOAD_INIT_FAILED: 'No se pudo iniciar la subida privada.',
  ORIGINAL_NOT_UPLOADED: 'El archivo todavía no está disponible en el depósito privado.',
  SOURCE_SIZE_MISMATCH: 'El tamaño almacenado no coincide con el documento elegido.',
  SOURCE_HASH_MISMATCH: 'El archivo almacenado no coincide con el original. No se ha registrado.',
  SOURCE_ALREADY_STAGED: 'Ese documento ya se guardó previamente como borrador.',
  EXTRACTION_TRUNCATED: 'Documento demasiado complejo: la extracción quedó incompleta. No se ha guardado.',
  NO_SECTIONS_DETECTED: 'No hay secciones que guardar. Revisa el documento original.',
  STAGING_DATABASE_REJECTED: 'El depósito ha rechazado el borrador por una comprobación de seguridad.',
  STAGING_FINALIZATION_FAILED: 'No se ha podido registrar el borrador privado.',
  STAGING_LIST_FAILED: 'No se ha podido consultar el inventario privado.',
  STAGING_SOURCE_NOT_FOUND: 'Ese borrador privado no existe.',
  STAGING_SOURCE_REVIEW_FAILED: 'El original guardado no pudo abrirse con seguridad.',
  INVALID_BATCH_ID: 'El identificador del borrador no es válido.'
}

function blockTitle(block: Block, index: number) {
  return block.kind === 'heading' ? 'Encabezado · nivel ' + (block.level || 1)
    : block.kind === 'list_item' ? (block.listType === 'numbered' ? 'Lista numerada' : block.listType === 'bulleted' ? 'Lista con viñetas' : 'Elemento de lista')
    : block.kind === 'image' ? 'Imagen original' : block.kind === 'table' ? 'Tabla' : 'Párrafo ' + (index + 1)
}

export default function AcademicImporterPage() {
  const router = useRouter()
  const [state, setState] = useState<State>('checking')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(35)
  const [copied, setCopied] = useState(false)
  const [stagingBusy, setStagingBusy] = useState(false)
  const [stagingError, setStagingError] = useState('')
  const [saved, setSaved] = useState<{ id: string; status: string; moduleNumber: number | null } | null>(null)
  const [batches, setBatches] = useState<Array<{
    id: string; original_file_name: string; status: string;
    level_number: number | null; module_number: number | null;
    sections: number; media: number; created_at: string
  }>>([])
  const [inventoryState, setInventoryState] = useState<'loading' | 'loaded' | 'error'>('loading')

  useEffect(() => {
    let live = true
    const check = async () => {
      try {
        const { data: identity, error: idError } = await supabase.auth.getUser()
        if (idError || !identity?.user) {
          router.replace('/acceso?next=%2Fghc-control-center%2Fimportador')
          return
        }
        const { data: allowed, error: rpcError } = await supabase.rpc('ghc_is_admin')
        if (!live) return
        if (rpcError || allowed !== true) {
          const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
          if (!assurance.error && assurance.data?.currentLevel !== 'aal2') {
            router.replace('/ghc-control-center/mfa')
            return
          }
          setState('denied')
          return
        }
        setState('allowed')
      } catch {
        if (live) setState('denied')
      }
    }
    void check()
    return () => { live = false }
  }, [router])

  const documentSize = useMemo(() => file ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : '', [file])

  async function getStagingToken() {
    const { data } = await supabase.auth.getSession()
    const value = data.session?.access_token
    if (!value) throw new Error(STATUS_MESSAGES.SESSION_REQUIRED)
    return value
  }

  async function refreshInventory() {
    setInventoryState('loading')
    try {
      const token = await getStagingToken()
      const response = await fetch('/api/academy/import/staging/list', {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok || !Array.isArray(data.batches)) {
        throw new Error(STATUS_MESSAGES[String(data.code || '')] || 'Inventario no disponible')
      }
      setBatches(data.batches)
      setInventoryState('loaded')
    } catch {
      setInventoryState('error')
    }
  }

  useEffect(() => {
    if (state === 'allowed') void refreshInventory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  async function reviewSavedDraft(id: string, existingToken?: string) {
    setError('')
    setVisible(35)
    setBusy(true)
    try {
      const token = existingToken || await getStagingToken()
      const response = await fetch('/api/academy/import/staging/review?id=' + encodeURIComponent(id), {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store'
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok || !data.preview) {
        throw new Error(STATUS_MESSAGES[String(data.code || '')] || 'No se pudo abrir el borrador privado.')
      }
      setPreview(data.preview as Preview)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo revisar el archivo guardado.')
    } finally {
      setBusy(false)
    }
  }

  async function savePrivateDraft() {
    if (!file || stagingBusy || busy) return
    if (file.size < 30 || file.size > 12 * 1024 * 1024 || !/\.(docx|pdf)$/i.test(file.name)) {
      setStagingError('Selecciona un Word o PDF de hasta 12 MB.')
      return
    }
    setStagingBusy(true)
    setStagingError('')
    setSaved(null)
    try {
      const token = await getStagingToken()
      const hashBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))
      const sha256 = Array.from(hashBytes).map(x => x.toString(16).padStart(2, '0')).join('')
      const meta = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        sha256
      }
      const post = async (path: string) => {
        const resp = await fetch(path, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(meta),
          cache: 'no-store'
        })
        const payload = await resp.json().catch(() => ({}))
        if (!resp.ok || !payload.ok) {
          throw new Error(STATUS_MESSAGES[String(payload.code || '')] || 'No se pudo completar la subida privada.')
        }
        return payload
      }
      const signed = await post('/api/academy/import/staging/init')
      const type = /\.docx$/i.test(file.name)
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf'
      const { error: uploadError } = await supabase.storage
        .from('ghc-academic-staging')
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: type,
          upsert: false
        })
      if (uploadError) throw new Error('Supabase no ha podido completar la subida al depósito privado.')
      const committed = await post('/api/academy/import/staging/commit')
      setSaved({
        id: committed.result.id,
        status: committed.status,
        moduleNumber: committed.moduleNumber
      })
      await refreshInventory()
      await reviewSavedDraft(committed.result.id, token)
    } catch (reason) {
      setStagingError(reason instanceof Error ? reason.message : 'Error en la subida privada.')
    } finally {
      setStagingBusy(false)
    }
  }


  async function inspectFile() {
    if (!file || busy) return
    if (file.size > 4 * 1024 * 1024 || !/\.(pdf|docx)$/i.test(file.name)) {
      setError('El análisis sin guardar admite hasta 4 MB por el límite de Vercel. Para documentos mayores utiliza «Guardar original y borrador privado»: se analizarán en Supabase sin publicarse.')
      return
    }
    setBusy(true)
    setError('')
    setPreview(null)
    setVisible(35)
    setCopied(false)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) {
        router.replace('/acceso?next=%2Fghc-control-center%2Fimportador')
        return
      }
      const payload = new FormData()
      payload.append('file', file, file.name)
      const response = await fetch('/api/academy/import/preview', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: payload,
        cache: 'no-store'
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.ok || !result?.preview) {
        throw new Error(STATUS_MESSAGES[String(result?.code || '')] || 'No se pudo analizar el archivo.')
      }
      setPreview(result.preview as Preview)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al leer el documento.')
    } finally {
      setBusy(false)
    }
  }

  async function copyReview() {
    if (!preview) return
    try {
      await navigator.clipboard.writeText(JSON.stringify({
        fileName: preview.fileName, format: preview.format, stats: preview.stats,
        warnings: preview.warnings, blocks: preview.blocks, truncated: preview.truncated
      }, null, 2))
      setCopied(true)
    } catch {
      setError('No se pudo copiar. El navegador puede requerir permiso para usar el portapapeles.')
    }
  }

  if (state === 'checking') return (
    <main className={styles.page}><section className={styles.panel}><p>Comprobando sesión administrativa y AAL2…</p></section></main>
  )
  if (state === 'denied') return (
    <main className={styles.page}><section className={styles.panel}>
      <h1>Acceso restringido</h1>
      <p>El importador solo está disponible para un administrador con MFA verificado.</p>
      <button type="button" onClick={() => router.push('/ghc-control-center/mfa')}>Verificar MFA</button>
    </section></main>
  )

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <GHCLogo size="md" showText tagline={false} />
        <div>
          <span className={styles.eyebrow}>GHC CONTROL CENTER · LABORATORIO ACADÉMICO</span>
          <h1>Importador Word / PDF</h1>
          <p>Analiza la estructura del documento antes de incorporar contenido a los cursos.</p>
        </div>
        <span className={styles.tag}>PREVIEW · BORRADORES PRIVADOS</span>
      </header>

      <section className={styles.panel}>
        <h2>1. Selecciona el documento fuente</h2>
        <p>Admite DOCX y PDF hasta 12 MB. Puedes analizar sin guardar o guardar voluntariamente una copia en el depósito privado. Ninguna de las opciones publica lecciones ni utiliza IA.</p>
        <label className={styles.fileField}>
          <span>Documento original</span>
          <input
            type="file" accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={busy || stagingBusy}
            onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); setError(''); setStagingError(''); setSaved(null); setCopied(false) }}
          />
          {file && <strong>{file.name} · {documentSize}</strong>}
        </label>
        <div className={styles.actions}>
          <button type="button" disabled={!file || busy || stagingBusy || file.size > 4 * 1024 * 1024} onClick={inspectFile}>{busy ? 'Analizando…' : 'Analizar sin importar'}</button>
          <button type="button" className={styles.secondary} disabled={!file || busy || stagingBusy}
            onClick={savePrivateDraft}>{stagingBusy ? 'Guardando borrador privado…' : 'Guardar original y borrador privado'}</button>
          <span>Para documentos mayores de 4 MB utiliza el segundo botón. Los originales se guardan únicamente en staging.</span>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {stagingError && <p role="alert" className={styles.error}>{stagingError}</p>}
        {saved && <p role="status" className={styles.savedNotice}>
          Guardado correctamente en el depósito privado. Identificador: <code>{saved.id}</code>.
          Estado: {saved.status === 'needs_correction' ? 'necesita revisión de incidencias' : 'pendiente de revisión editorial'}.
          Ningún curso se ha modificado.
        </p>}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div><h2>Inventario de borradores privados</h2>
            <p>Documentos guardados en el depósito seguro. No están disponibles para alumnos.</p>
          </div>
          <button type="button" className={styles.secondary} onClick={() => void refreshInventory()}>
            Actualizar inventario
          </button>
        </div>
        {inventoryState === 'loading' ? <p>Consultando el área privada…</p> :
          inventoryState === 'error' ? <p role="alert">No se ha podido verificar el inventario privado.</p> :
          batches.length === 0 ? <p>No hay documentos guardados todavía.</p> :
          <div className={styles.sectionList}>
            {batches.map(batch => <article className={styles.sectionDraft} key={batch.id}>
              <strong>{batch.original_file_name}</strong>
              <small>Nivel {batch.level_number ?? 'pendiente'} · módulo {batch.module_number ?? 'pendiente'} ·
                {batch.sections} secciones · {batch.media} figuras inventariadas</small>
              <small>Estado: {batch.status} · ID: {batch.id}</small>
              <button type="button" className={styles.secondary}
                disabled={busy || stagingBusy}
                onClick={() => void reviewSavedDraft(batch.id)}>
                Abrir original y revisar
              </button>
            </article>)}
          </div>}
      </section>

      {preview && (
        <>
          <section className={styles.panel}>
            <div className={styles.sectionHead}>
              <div><h2>2. Resultado de extracción</h2><p>{preview.fileName} · {preview.format}</p></div>
              <span className={styles.reviewStatus}>REVISIÓN OBLIGATORIA</span>
            </div>
            <div className={styles.metrics}>
              <div><strong>{preview.stats.headings}</strong><span>Encabezados</span></div>
              <div><strong>{preview.stats.paragraphs}</strong><span>Párrafos</span></div>
              <div><strong>{preview.stats.lists}</strong><span>Listas</span></div>
              <div><strong>{preview.stats.tables}</strong><span>Tablas</span></div>
              <div><strong>{preview.stats.characters.toLocaleString('es-ES')}</strong><span>Caracteres</span></div>
            </div>
            {preview.truncated && <p className={styles.error}>La vista se ha limitado por seguridad. Este documento no debe convertirse automáticamente a lecciones.</p>}
            <div className={styles.warning}>
              <strong>Control de fidelidad</strong>
              {preview.warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          </section>

          <AcademicDraftReview preview={preview} />
          <section className={styles.panel}>
            <div className={styles.sectionHead}>
              <div><h2>5. Vista previa del contenido</h2><p>Bloques detectados: {preview.blocks.length}. Sin interpretar ni reescribir el texto.</p></div>
              <button type="button" className={styles.secondary} onClick={copyReview}>{copied ? 'Copiado' : 'Copiar JSON de revisión'}</button>
            </div>
            <div className={styles.blocks}>
              {preview.blocks.slice(0, visible).map((block, idx) => (
                <article className={styles.block} key={idx}>
                  <span className={styles.blockMeta}>{blockTitle(block, idx)}</span>
                  {block.kind === 'heading' ? <h3>{block.text}</h3> :
                    block.kind === 'image' ? <p>Imagen del Word · {block.mediaId} · {block.text}</p> :
                    block.kind === 'table' && block.cells ?
                      <div className={styles.tableScroll}><table><tbody>{block.cells.map((row, ri) => (
                        <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                      ))}</tbody></table></div>
                      : <p>{block.text}</p>}
                </article>
              ))}
            </div>
            {visible < preview.blocks.length && (
              <button type="button" className={styles.secondary} onClick={() => setVisible(v => v + 35)}>
                Mostrar 35 bloques más ({preview.blocks.length - visible} pendientes)
              </button>
            )}
            <p className={styles.note}>No se ha aprobado ni publicado contenido. Los módulos definitivos se crearán únicamente después de verificar el documento fuente y autorizar la importación.</p>
          </section>
        </>
      )}
    </main>
  )
}
