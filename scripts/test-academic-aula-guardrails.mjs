import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildAulaUnits, groupAulaChapters, chapterNavigationLabel } from '../lib/academy/aula-units.ts'

const read = p => readFileSync(p, 'utf8')
const middleware = read('middleware.ts')
const page = read('app/ghc-control-center/aula-modelo/page.tsx')
const api = read('app/api/academy/import/staging/aula/route.ts')
const safety = read('lib/academy/aula-safety.ts')
const types = read('lib/academy/aula-model-types.ts')
const importer = read('app/ghc-control-center/importador/page.tsx')
const progressApi = read('app/api/academy/import/staging/progress/route.ts')

assert.match(middleware, /pathname === '\/ghc-control-center\/aula-modelo'/)
assert.match(middleware, /pathname === '\/api\/academy\/import\/staging\/aula'/)
assert.match(middleware, /request.method !== 'GET'/)
assert.match(api, /stageAuthorization\(request, false\)/)
assert.match(api, /ghc_academic_stage_learning_model/)
assert.match(api, /isSafePrivateAula/)
assert.match(safety, /staff_only_content_included === false/)
assert.match(safety, /publication_allowed === false/)
assert.match(safety, /academic_approval === false/)
assert.match(safety, /SAFE_KINDS/)
assert.match(safety, /RESPUESTAS/)
assert.doesNotMatch(api, /from\('ghc_academic_staging'\)/)
assert.doesNotMatch(page, /service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/)
assert.doesNotMatch(page, /dangerouslySetInnerHTML/)
assert.doesNotMatch(page, /\.from\('modules'\)|\.from\('lessons'\)|\.insert\(/)
assert.match(page, /buildAulaUnits/)
assert.match(page, /progreso de lectura se guarda solo|progreso de lectura se guarda|progreso de lectura/i)
assert.match(page, /progressState !== 'saved'/)
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
assert.equal(noIntro[0].blocks[0].text, 'Teoría')
assert.equal(noIntro[0].blocks[1].text, '1. Primer concepto')
assert.equal(noIntro[0].blocks.length, 3)

const grouped = groupAulaChapters(units)
assert.equal(grouped.length, 2)
assert.deepEqual(grouped.map(group => group.units.length), [3, 1])
assert.deepEqual(grouped.flatMap(group => group.units.map(item => item.unit.id)), units.map(unit => unit.id))
assert.deepEqual(grouped.flatMap(group => group.units.map(item => item.index)), [0,1,2,3])
assert.match(page, /scrollIntoView/)
assert.match(page, /lessonStartRef/)
assert.match(page, /Nivel \{model\.level \?\? '—'\}/)
assert.match(page, /chapterNavigationLabel\(chapter\)/)
assert.match(page, /Lecciones/)
assert.match(page, /aria-expanded=\{expanded\}/)
assert.doesNotMatch(page, /sections\.map\(\(item, i\) =>/)
// Ensure source numbering becomes legible, without promoting an H2 or an appendix.
const academicModules = [
  { id:'intro',kind:'orientation',title:'Mapa del módulo',heading:'Mapa del módulo',
    blocks:[{kind:'paragraph',text:'Introducción'}],sequence:0 },
  { id:'lesson-1',kind:'lesson_candidate',title:'1. El músculo esquelético como órgano',
    heading:'1. El músculo esquelético como órgano',
    blocks:[{kind:'heading',level:1,text:'1. El músculo esquelético como órgano'},
      {kind:'heading',level:2,text:'1.1. Definición'},{kind:'paragraph',text:'Contenido'}],sequence:1 },
  { id:'lesson-2',kind:'lesson_candidate',title:'2. Organización del músculo: del órgano al sarcómero',
    heading:'2. Organización del músculo: del órgano al sarcómero',
    blocks:[{kind:'heading',level:1,text:'2. Organización del músculo: del órgano al sarcómero'},
      {kind:'heading',level:2,text:'2.1. Fibra muscular'},{kind:'paragraph',text:'Contenido'}],sequence:2 },
  { id:'appendix',kind:'practice',title:'27. Registro de figuras, tablas y herramientas',
    heading:'27. Registro de figuras, tablas y herramientas',
    blocks:[{kind:'paragraph',text:'Índice'}],sequence:3 },
  { id:'references',kind:'references',title:'25. Referencias citadas',
    heading:'25. Referencias citadas',blocks:[{kind:'paragraph',text:'Fuentes'}],sequence:4 }
]
const academicUnits = buildAulaUnits(academicModules)
const academicChapters = groupAulaChapters(academicUnits)
assert.deepEqual(academicChapters.map(chapter => chapter.type),
  ['introduction','lesson','lesson','resources','resources'])
assert.deepEqual(academicChapters.map(chapter => chapter.lessonNumber),
  [null,1,2,null,null])
assert.equal(chapterNavigationLabel(academicChapters[2]),'Lección 2')
assert.equal(academicChapters[2].displayTitle,'Organización del músculo: del órgano al sarcómero')
assert.equal(academicChapters[2].units[0].unit.title,'2.1. Fibra muscular')
assert.deepEqual(academicChapters.flatMap(c=>c.units.map(u=>u.unit.id)),academicUnits.map(u=>u.id))
console.log('[academic-aula-test] OK: lossless H2 split, MFA admin gate, staff-only exclusion, saved demo progress and Preview isolation')
