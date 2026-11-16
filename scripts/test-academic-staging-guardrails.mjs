import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { classifySourceReplay } from '../lib/academy/staging-replay.ts'

const id='41cbbce0-e779-44cb-9403-60672d33b899'
const original = {
  id, name: 'MODULO_1.docx', size: 12345, sha256: 'a'.repeat(64),
  format: 'DOCX'
}
const path='originals/'+id+'/source.docx'
const saved={
  id,
  original_file_name: original.name,
  original_file_bytes: original.size,
  source_format: original.format,
  source_sha256: original.sha256,
  source_storage_path: path
}
assert.equal(classifySourceReplay(original, null, path), 'new')
assert.equal(classifySourceReplay(original, saved, path), 'same_source')
assert.equal(classifySourceReplay(original, { ...saved, source_sha256:'b'.repeat(64) }, path), 'conflict')
assert.equal(classifySourceReplay(original, { ...saved, original_file_name:'OTRO.docx' }, path), 'conflict')
assert.equal(classifySourceReplay(original, { ...saved, source_storage_path:'other.docx' }, path), 'conflict')
assert.equal(classifySourceReplay(original, { ...saved, id: '94f090e0-e64d-431f-b53e-69d1762a5bea' }, path), 'conflict')
assert.equal(classifySourceReplay(original, { ...saved, original_file_bytes: 12346 }, path), 'conflict')

const commit = readFileSync('app/api/academy/import/staging/commit/route.ts', 'utf8')
const health = readFileSync('app/api/academy/import/staging/health/route.ts', 'utf8')
const server = readFileSync('lib/academy/staging-server.ts', 'utf8')
const client = readFileSync('app/ghc-control-center/importador/page.tsx','utf8')
assert.match(commit,/classifySourceReplay\(/)
assert.match(commit,/savePrivateBatch\(/)
assert.doesNotMatch(commit,/\.remove\s*\(/)
assert.doesNotMatch(commit,/\.update\s*\(/)
assert.match(health,/stageAuthorization\(request, false\)/)
assert.match(server,/ghc_is_admin/)
assert.match(server,/VERCEL_GIT_COMMIT_REF/)
assert.match(server,/SUPABASE_SERVICE_ROLE_KEY/)
assert.doesNotMatch(client,/SUPABASE_SERVICE_ROLE_KEY|sb_secret_|service_role/i)
console.log('[staging-guardrails-test] OK: idempotent retries, conflict detection, no automatic deletion, guarded private APIs')
