import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildAulaUnits } from '../lib/academy/aula-units.ts'

const read = p => readFileSync(p, 'utf8')
const middleware = read('middleware.ts')
const page = read('app/ghc-control-center/aula-modelo/page.tsx')
const api = read('app/api/academy/import/staging/aula/route.ts')
const types = read('lib/academy/aula-model-types.ts')
const importer = read('app/ghc-control-center/importador/page.tsx')
const progressApi = read('app/api/academy/import/staging/progress/route.ts')

assert.match(middleware, /pathname === '\/ghc-control-center\/aula-modelo'/)
assert.match(middleware, /pathname === '\/api\/academy\/import\/staging\/aula'/)
assert.match(middleware, /request.method !== 'GET'/)
assert.match(api, /stageAuthorization\(request, false\)/)
assert.match(api, /ghc_academic_stage_learning_model/)
assert.match(api, /staff_only_content_included !== false/)
assert.match(api, /publication_allowed !== false/)
assert.match(api, /academic_approval !== false/)
assert.match(api, /SAFE_KINDS/)
assert.match(api, /RESPUESTAS/)
assert.doesNotMatch(api, /from\('ghc_academic_staging'\)/)
assert.doesNotMatch(page, /service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/)
assert.doesNotMatch(page, /dangerouslySetInnerHTML/)
assert.doesNotMatch(page, /\.from\('modules'\)|\.from\('lessons'\)|\.insert\(/)
assert.match(page, /buildAulaUnits/)
assert.match(page, /progreso de lectura se guarda solo|progreso de lectura se guarda|progreso de lectura/i)
assert.match(page, /progressState === 'saved'/)
assert.match(progressApi, /stageAuthorization\(request, true\)/)
assert.match(progressApi, /stageAuthorization\(request, false\)/)
assert.match(progressApi, /ghc_academic_stage_learning_model/)
assert.match(progressApi, /allowed\.has\(key\)/)
assert.match(progressApi, /gate\.identity\.userId/)
assert.doesNotMatch(progressApi, /SUPABASE_SERVICE_ROLE_KEY|\.from\('lessons'\)/)
assert.match(page, /NO ES EL EXAMEN OFICIAL/)
assert.match(importer, /Ver aula interactiva de demostración/)
assert.match(types, /export const DEMO_QUIZ/)
assert.doesNotMatch(types, /R[uú]brica de evaluación|21\. Respuestas orientativas/)

const parent = '5be17000-d662-472f-a115-e90dca626ac6'
const mockSections = [{
  id: parent,
  heading: 'Desarrollo teórico',
  title: 'Desarrollo teórico',
  kind: 'lesson_candidate',
  sequence: 1,
  blocks: [
    { kind: 'heading', text: 'Desarrollo teórico', level: 1 },
    { kind: 'paragraph', text: 'Presentación de la unidad' },
    { kind: 'heading', text: '1. Concepto', level: 2 },
    { kind: 'paragraph', text: 'Texto del concepto' },
    { kind: 'heading', text: '2. Aplicación', level: 2 },
    { kind: 'paragraph', text: 'Texto de la aplicación' }
  ]
}, {
  id: '1be17000-d662-472f-a115-e90dca626ac6',
  heading: 'Referencias',
  title: 'Referencias',
  kind: 'references',
  sequence: 2,
  blocks: [{ kind: 'heading', level: 1, text: 'Referencias' }]
}]
const units = buildAulaUnits(mockSections)
assert.equal(units.length, 4)
assert.deepEqual(units.map(x => x.id), [
  parent + ':intro', parent + ':h2:1', parent + ':h2:2',
  '1be17000-d662-472f-a115-e90dca626ac6'
])
assert.deepEqual(units.flatMap(u => u.blocks), mockSections.flatMap(s => s.blocks))
assert.equal(new Set(units.map(u => u.id)).size, units.length)
const noIntro = buildAulaUnits([{
  ...mockSections[0],
  blocks: [
    { kind: 'heading', level: 1, text: 'Teoría' },
    { kind: 'heading', level: 2, text: '1. Primer concepto' },
    { kind: 'paragraph', text: 'Información' }
  ]
}])
assert.equal(noIntro.length, 1)
assert.equal(noIntro[0].id, parent + ':h2:1')
assert.equal(noIntro[0].blocks[0].text, '1. Primer concepto')

console.log('[academic-aula-test] OK: MFA admin gate, staff-only exclusion, demonstration quiz, ephemeral progress and Preview isolation')
