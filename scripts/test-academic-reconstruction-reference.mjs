import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  RECONSTRUCTED_M1_REFERENCE, checkReconstructedModuleOne
} from '../lib/academy/reconstruction-reference.ts'

const r = RECONSTRUCTED_M1_REFERENCE
assert.equal(r.bytes, 73729)
assert.match(r.sha256, /^[a-f0-9]{64}$/)
assert.equal(r.tables, 12)
assert.equal(r.heading1, 31)
assert.equal(r.heading2, 82)
assert.equal(r.heading3, 23)

// Synthetic metadata without embedding any copyrighted or private lesson
// text in the public GitHub repository.
const blocks = [
  ...Array.from({length:31}, (_,n)=>({kind:'heading',level:1,text:'Sección '+n})),
  ...Array.from({length:82}, (_,n)=>({kind:'heading',level:2,text:'Subsección '+n})),
  ...Array.from({length:23}, (_,n)=>({kind:'heading',level:3,text:'Subapartado '+n})),
  ...Array.from({length:12}, (_,n)=>({kind:'table',cells:[['Tabla',String(n)]],text:'Tabla '+n}))
]
const sections = Array.from({length:32},(_,i)=>({
  id:'section-'+i,
  title:'Parte '+i,
  kind: i===20 ? 'private_answer_key' :
    i===19 || i===21 ? 'assessment' :
    i===22 ? 'video_script' : 'lesson_candidate',
  visibility:i===19||i===20||i===21?'staff_only':'student_candidate',
  blockStart:0,
  blockEnd:0,
  blockCount:i===0?blocks.length:0,
  mediaIds:[]
}))
const preview = {
  sourceSha256:r.sha256,
  format:'DOCX',truncated:false,
  stats:{headings:136,tables:12,paragraphs:0,lists:0,characters:1200},
  blocks,media:[],mediaFilesInPackage:0
}
const draft={levelNumber:1,moduleNumber:1,metadataTitleMismatch:false,sections}
assert.equal(checkReconstructedModuleOne(preview,draft).complete,true)
assert.deepEqual(checkReconstructedModuleOne(preview,{...draft,metadataTitleMismatch:true}).errors,['METADATOS_CONFLICTIVOS'])
assert.ok(checkReconstructedModuleOne(
  {...preview,stats:{...preview.stats,tables:11}},draft
).errors.includes('TABLAS_INCOMPLETAS'))
assert.ok(checkReconstructedModuleOne(
  {...preview,blocks:blocks.filter(b=>!(b.kind==='heading'&&b.level===2))},draft
).errors.includes('ENCABEZADOS_2_INCOMPLETOS'))
assert.ok(checkReconstructedModuleOne(
  preview,{...draft,sections:sections.map(s=>s.kind==='private_answer_key'?{...s,visibility:'student_candidate'}:s)}
).errors.includes('MATERIALES_DOCENTES_SIN_SEPARAR')===false)
// A robust regression requires the answer-key category itself, not just a
// count of staff-only generic sections.
assert.ok(checkReconstructedModuleOne(
  preview,{...draft,sections:sections.map(s=>s.kind==='private_answer_key'?{...s,kind:'lesson_candidate'}:s)}
).errors.includes('RESPUESTAS_NO_PROTEGIDAS'))
assert.equal(checkReconstructedModuleOne(
  {...preview,sourceSha256:'b'.repeat(64)},draft
).matchesReference,false)
const commit=readFileSync('app/api/academy/import/staging/commit/route.ts','utf8')
const importer=readFileSync('app/ghc-control-center/importador/page.tsx','utf8')
assert.match(commit,/checkReconstructedModuleOne/)
assert.match(commit,/RECONSTRUCTION_INTEGRITY_FAILED/)
assert.match(commit,/publicationAllowed: false/)
assert.match(importer,/reconstructionMatch === 'matched'/)
assert.match(importer,/Control de reconstrucción 2026/)
assert.doesNotMatch(commit,/\.from\('lessons'\)|\.from\('modules'\)/)
console.log('[academic-reconstruction-test] OK: original fingerprint, tables, headings, staff-only materials and fail-closed import quality gate')
