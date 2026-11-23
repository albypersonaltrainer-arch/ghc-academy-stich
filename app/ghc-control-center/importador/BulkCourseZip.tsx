'use client'
import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { inspectCourseZip, extractCourseZipEntry } from '../../../lib/academy/bulk-zip'
import type { CourseZipPlan, CourseZipEntry } from '../../../lib/academy/bulk-zip'
import styles from './importador.module.css'

type Row = { n: number; name: string; detail: string; batchId?: string }
type Props = { client: SupabaseClient; onCompleted: () => Promise<void> }
const messages: Record<string,string> = {
  ZIP_REQUIERE_DIEZ_MODULOS:'El ZIP debe contener exactamente diez Word DOCX.',
  ZIP_MODULO_SIN_NUMERO:'Un Word no contiene número de módulo en el nombre.',
  ZIP_MODULO_DUPLICADO:'Hay dos Word con el mismo número de módulo.',
  ZIP_NIVEL_INCOMPLETO:'Solo se aceptan niveles completos: 1–10, 11–20 o 21–30.',
  ZIP_SOLO_WORD:'El ZIP contiene archivos que no son DOCX.',
  ZIP_DOCUMENTO_NO_DOCX:'El archivo no es un documento Word válido.',
  ZIP_EXTENSION_INVALIDA:'Selecciona un archivo ZIP.',
  SOURCE_ALREADY_STAGED:'Ya se había guardado un Word idéntico: no se ha duplicado.',
  SESSION_REQUIRED:'La sesión ha caducado: vuelve a entrar con MFA.',
  ADMIN_AAL2_REQUIRED:'Se necesita acceso administrativo con MFA.',
  ZIP_TAMANO_INVALIDO:'El ZIP no es válido o supera los 45 MB.',
  ZIP_COMPRESION_NO_ADMITIDA:'El ZIP no admite archivos cifrados ni compresión no compatible.'
}
function message(cause: unknown) {
  const code = cause instanceof Error ? cause.message : String(cause)
  return messages[code] || code || 'Error al procesar el archivo.'
}
export default function BulkCourseZip({ client, onCompleted }: Props) {
  const [file,setFile]=useState<File|null>(null)
  const [plan,setPlan]=useState<CourseZipPlan|null>(null)
  const [rows,setRows]=useState<Row[]>([])
  const [checking,setChecking]=useState(false)
  const [busy,setBusy]=useState(false)
  const [done,setDone]=useState(false)
  const [status,setStatus]=useState('')
  const [error,setError]=useState('')
  const update=(entry:CourseZipEntry, changes:Partial<Row>)=>
    setRows(previous=>previous.map(item=>item.n===entry.moduleNumber?{...item,...changes}:item))

  async function inspect() {
    if (!file || busy || checking) return
    setChecking(true);setError('');setPlan(null);setRows([]);setDone(false)
    try {
      const result=await inspectCourseZip(file)
      setPlan(result)
      setRows(result.entries.map(e=>({n:e.moduleNumber,name:e.fileName,detail:'Pendiente de subida privada'})))
    } catch(cause) { setError(message(cause)) }
    finally { setChecking(false) }
  }
  async function upload() {
    if (!plan || !file || busy || done) return
    setBusy(true);setError('')
    let saved=0,dupes=0,failed=0
    try {
      const {data}=await client.auth.getSession()
      const token=data.session?.access_token
      if (!token) throw Error('SESSION_REQUIRED')
      const post=async(path:string,meta:object)=>{
        const response=await fetch(path,{
          method:'POST',cache:'no-store',
          headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
          body:JSON.stringify(meta)
        })
        const payload=await response.json().catch(()=>({}))
        if (!response.ok || payload.ok!==true)
          throw Error(String(payload.code||'El servidor no confirmó el guardado.'))
        return payload
      }
      for (const [index,entry] of plan.entries.entries()) {
        setStatus('Procesando '+(index+1)+'/10 · Módulo '+entry.moduleNumber)
        update(entry,{detail:'Verificando DOCX y SHA-256…'})
        try {
          const original=await extractCourseZipEntry(file,entry)
          const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',await original.arrayBuffer()))
          const meta={
            id:crypto.randomUUID(),name:original.name,size:original.size,
            sha256:Array.from(hash,v=>v.toString(16).padStart(2,'0')).join('')
          }
          const signed=await post('/api/academy/import/staging/init',meta)
          const {error:uploadError}=await client.storage.from('ghc-academic-staging')
            .uploadToSignedUrl(signed.path,signed.token,original,{
              contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              upsert:false
            })
          if (uploadError) throw Error('El servidor no pudo guardar el Word en el depósito privado.')
          const result=await post('/api/academy/import/staging/commit',meta)
          const batchId=String(result.result?.id||'')
          if (Number(result.moduleNumber)!==entry.moduleNumber || Number(result.levelNumber)!==plan.level) {
            failed++
            update(entry,{batchId,detail:'Guardado como borrador, pero la numeración interior no coincide: revisión manual obligatoria.'})
          } else {
            saved++
            update(entry,{batchId,detail:result.status==='needs_correction'
              ?'Original privado: incidencias editoriales por revisar'
              :'Original privado: pendiente de revisión editorial'})
          }
        } catch(cause) {
          const code=cause instanceof Error?cause.message:''
          if(code==='SOURCE_ALREADY_STAGED') dupes++
          else failed++
          update(entry,{detail:message(cause)})
          if (code==='SESSION_INVALID' || code==='ADMIN_AAL2_REQUIRED' || code==='SESSION_REQUIRED') {
            setError('Sesión caducada: lote interrumpido para proteger la operación.')
            break
          }
        }
      }
      setDone(true)
      setStatus('Terminado: '+saved+' nuevos, '+dupes+' ya existentes, '+failed+' incidencias.')
      await onCompleted()
    } catch(cause) {
      setError(message(cause))
      setStatus('Operación detenida. No se ha publicado ningún curso.')
    } finally {setBusy(false)}
  }
  return <section className={styles.panel} aria-label="Importación por lotes de Word">
    <div className={styles.sectionHead}><div>
      <h2>Subir un nivel completo · 10 módulos en ZIP</h2>
      <p>Selecciona un ZIP con diez Word DOCX numerados 1–10, 11–20 o 21–30.
        Se organizan por número y nivel; cada Word se verifica y guarda en privado,
        sin publicar ni modificar los cursos de alumnos.</p>
    </div><span className={styles.reviewStatus}>PRIVADO · SIN PUBLICAR</span></div>
    <label className={styles.fileField}>
      <span>ZIP de un nivel de Entrenador Personal</span>
      <input type="file" accept=".zip,application/zip" disabled={checking||busy}
        onChange={event=>{
          setFile(event.target.files?.[0]||null);setPlan(null);setRows([])
          setError('');setStatus('');setDone(false)
        }}/>
      {file && <strong>{file.name} · {(file.size/1048576).toFixed(2)} MB</strong>}
    </label>
    <div className={styles.actions}>
      <button type="button" disabled={!file||busy||checking} onClick={()=>void inspect()}>
        {checking?'Comprobando ZIP…':'Comprobar y ordenar los diez módulos'}</button>
      {plan && <button type="button" className={styles.secondary}
        disabled={busy||checking||done} onClick={()=>void upload()}>
        {busy?'Guardando borradores privados…':done?'Lote procesado':'Guardar los diez módulos privados'}</button>}
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {status && <p role="status" className={styles.note}>{status}</p>}
    {plan && <>
      <p className={styles.savedNotice}>Nivel {plan.level} reconocido · 10 módulos en orden.
        La carga no concede aprobación académica.</p>
      <div className={styles.sectionList}>{plan.entries.map(entry=>{
        const row=rows.find(item=>item.n===entry.moduleNumber)
        return <article className={styles.sectionDraft} key={entry.name}>
          <strong>Módulo {entry.moduleNumber} · {entry.fileName}</strong>
          <small>Word: {Math.round(entry.uncompressedSize/1024)} KB · {row?.detail}</small>
          {row?.batchId && <a className={styles.demoLink}
            href={'/ghc-control-center/aula-modelo?id='+encodeURIComponent(row.batchId)}>
            Abrir aula privada del módulo</a>}
        </article>
      })}</div>
    </>}
    <p className={styles.note}>Cada documento conserva su estado editorial independiente.
      Los exámenes oficiales, la aprobación y la publicación no se activan con este botón.</p>
  </section>
}
