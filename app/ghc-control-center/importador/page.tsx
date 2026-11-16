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
  PREVIEW_UNAVAILABLE: 'El importador no está disponible en este entorno.'
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

  async function inspectFile() {
    if (!file || busy) return
    if (file.size > 12 * 1024 * 1024 || !/\.(pdf|docx)$/i.test(file.name)) {
      setError('Selecciona un archivo .docx o .pdf de hasta 12 MB.')
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
        <span className={styles.tag}>PREVIEW · SOLO LECTURA</span>
      </header>

      <section className={styles.panel}>
        <h2>1. Selecciona el documento fuente</h2>
        <p>Admite DOCX y PDF con texto seleccionable, hasta 12 MB. Se analiza temporalmente; no se guarda en Supabase, ni se publica, ni se envía a un modelo de IA.</p>
        <label className={styles.fileField}>
          <span>Documento original</span>
          <input
            type="file" accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={busy}
            onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); setError(''); setCopied(false) }}
          />
          {file && <strong>{file.name} · {documentSize}</strong>}
        </label>
        <div className={styles.actions}>
          <button type="button" disabled={!file || busy} onClick={inspectFile}>{busy ? 'Analizando…' : 'Analizar sin importar'}</button>
          <span>Sin creación de cursos, módulos, lecciones ni archivos.</span>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
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
