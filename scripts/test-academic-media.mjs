import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isSafePrivateAula, isAulaVisibleImage } from '../lib/academy/aula-safety.ts'

const block = {kind:'image',text:'Figura de evaluación biomecánica',mediaId:'rId15'}
const section = {id:'s1',kind:'lesson_candidate',title:'Biomecánica básica',blocks:[block]}
const base = {
  id:'7de72c9d-27f1-46a0-b739-1a51950c9c28',source_name:'original.docx',
  source_sha256:'a'.repeat(64),level:1,module:2,
  title:'Biomecánica',status:'awaiting_review',source_format:'DOCX',
  created_at:'2026-11-23',sections:[section],video_placeholder:false,
  assessment_placeholder:false,staff_only_content_included:false,
  publication_allowed:false,academic_approval:false
}
assert.equal(isSafePrivateAula(base),true)
assert.equal(isAulaVisibleImage(base,'rId15'),true)
assert.equal(isAulaVisibleImage(base,'rId42'),false)
assert.equal(isSafePrivateAula({...base,staff_only_content_included:true}),false)
assert.equal(isSafePrivateAula({...base,sections:[{...section,title:'Solucionario privado'}]}),false)
assert.equal(isSafePrivateAula({...base,sections:[{...section,blocks:[{...block,text:'RESPUESTAS: A,B,C'}]}]}),false)
assert.equal(isSafePrivateAula({...base,publication_allowed:true}),false)

const route=readFileSync('app/api/academy/import/staging/media/route.ts','utf8')
const middleware=readFileSync('middleware.ts','utf8')
const client=readFileSync('app/ghc-control-center/aula-modelo/page.tsx','utf8')
assert.match(route,/stageAuthorization\(request, false\)/)
assert.match(route,/isAulaVisibleImage\(model, mediaId\)/)
assert.match(route,/source\.source_sha256/)
assert.match(route,/extractOriginalDocxImage\(bytes, mediaId\)/)
assert.match(middleware,/pathname === '\/api\/academy\/import\/staging\/media'/)
assert.match(client,/URL\.revokeObjectURL\(blobUrl\)/)
assert.doesNotMatch(client,/SUPABASE_SERVICE_ROLE_KEY|sb_secret_/i)
console.log('[academic-media-test] OK: private image gates, staff isolation, original-source SHA and cleanup')
