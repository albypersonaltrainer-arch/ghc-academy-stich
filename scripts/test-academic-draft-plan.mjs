import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import { previewAcademicFile } from '../lib/academy/import-preview.ts'
import { buildAcademicDraft } from '../lib/academy/draft-plan.ts'
import { academicReviewPackage } from '../lib/academy/review-export.ts'
import { simulateAcademicImport } from '../lib/academy/import-dry-run.ts'
import { resolveCurriculumModule, MODULE_TITLES } from '../lib/academy/curriculum-map.ts'

function zipDocument(entries) {
  const locals = []
  const central = []
  let start = 0
  for (const [name, data] of entries) {
    const filename = Buffer.from(name)
    const source = Buffer.from(data)
    const packed = deflateRawSync(source)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(packed.length, 18)
    local.writeUInt32LE(source.length, 22)
    local.writeUInt16LE(filename.length, 26)
    const header = Buffer.alloc(46)
    header.writeUInt32LE(0x02014b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(20, 6)
    header.writeUInt16LE(8, 10)
    header.writeUInt32LE(packed.length, 20)
    header.writeUInt32LE(source.length, 24)
    header.writeUInt16LE(filename.length, 28)
    header.writeUInt32LE(start, 42)
    locals.push(local, filename, packed)
    central.push(header, filename)
    start += local.length + filename.length + packed.length
  }
  const centralBuffer = Buffer.concat(central)
  const directory = Buffer.alloc(22)
  directory.writeUInt32LE(0x06054b50, 0)
  directory.writeUInt16LE(entries.length, 8)
  directory.writeUInt16LE(entries.length, 10)
  directory.writeUInt32LE(centralBuffer.length, 12)
  directory.writeUInt32LE(start, 16)
  return Buffer.concat([...locals, centralBuffer, directory])
}

const body = [
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ',
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ',
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>',
  '<w:p><w:r><w:t>NIVEL 2</w:t></w:r></w:p>',
  '<w:p><w:r><w:t>MÓDULO 20</w:t></w:r></w:p>',
  '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>1. Ciencia aplicada</w:t></w:r></w:p>',
  '<w:p><w:r><w:t>La fuerza se adapta.</w:t></w:r></w:p>',
  '<w:p><w:r><w:drawing><wp:docPr id="1" name="Picture 1" descr="Image: image1.png"/>',
  '<a:blip r:embed="rId99"/></w:drawing></w:r></w:p>',
  '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>21. Respuestas orientativas</w:t></w:r></w:p>',
  '<w:p><w:r><w:t>Clave de corrección exclusiva de docentes.</w:t></w:r></w:p>',
  '</w:body></w:document>'
].join('')

// Internal minimal magic header is not a user-facing image or generated asset.
const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3])
const archive = zipDocument([
  ['word/document.xml', Buffer.from(body)],
  ['word/_rels/document.xml.rels', Buffer.from('<Relationships><Relationship Id="rId99" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>')],
  ['docProps/core.xml', Buffer.from('<cp:coreProperties><dc:title>GHC Academy · Nivel 2 · Módulo 19 · Título anterior</dc:title></cp:coreProperties>')],
  ['word/media/image1.png', pngHeader],
  ['word/media/orphan.png', pngHeader]
])

const preview = previewAcademicFile('modulo-20.docx', archive)
assert.equal(preview.media.length, 1)
assert.equal(preview.mediaFilesInPackage, 2)
assert.equal(preview.media[0].altNeedsReview, true)
assert.equal(preview.media[0].id, 'rId99')
assert.equal(preview.blocks.filter(b => b.kind === 'image').length, 1)
assert.equal(preview.media[0].blockIndexes.length, 1)
assert.equal(preview.sourceMetadataTitle.includes('Módulo 19'), true)

const draft = buildAcademicDraft(preview)
assert.equal(draft.moduleNumber, 20)
assert.equal(draft.levelNumber, 2)
assert.equal(draft.metadataTitleMismatch, true)
assert.equal(draft.metrics.lessonCandidates, 1)
assert.equal(draft.metrics.staffOnly, 1)
assert.equal(draft.metrics.mediaUnassigned, 1)
assert.equal(draft.sections.find(s => s.kind === 'lesson_candidate')?.mediaIds[0], 'rId99')
assert.equal(draft.sections.find(s => s.kind === 'private_answer_key')?.visibility, 'staff_only')
assert.equal(draft.status, 'unapproved_local_preview')
assert.ok(draft.warnings.some(w => w.includes('AVISO DE IDENTIDAD')))

const privateSection = draft.sections.find(s => s.kind === 'private_answer_key')
assert.ok(privateSection)
const exported = academicReviewPackage(preview, {
  [privateSection.id]: {
    title: 'Intento de revelar las soluciones',
    kind: 'lesson_candidate',
    reviewed: true,
    note: 'Debe permanecer reservado'
  }
}, '2026-11-16T12:00:00.000Z')
assert.equal(exported.schemaVersion, 'GHC_EDITORIAL_REVIEW_V1')
assert.equal(exported.source.sourceSha256, preview.sourceSha256)
assert.match(exported.source.sourceSha256, /^[a-f0-9]{64}$/)
assert.equal(exported.writeToCampusAllowed, false)
assert.equal(exported.qualityGate.humanPublicationApproval, false)
assert.equal(exported.qualityGate.metadataTitleMismatch, true)
assert.equal(exported.qualityGate.suitableForStructuralReview, false)
assert.equal(exported.qualityGate.fullBlockCoverage, true)
assert.equal(exported.originalBlocks.length, preview.blocks.length)
assert.ok(exported.sections.every(s => s.editorial.approvalStatus === 'not_approved'))
assert.equal(exported.sections.find(s => s.id === privateSection.id).editorial.kind, 'private_answer_key')
assert.equal(exported.sections.find(s => s.id === privateSection.id).editorial.visibility, 'staff_only')
assert.ok(!JSON.stringify(exported.imageManifest).includes('data:image/png;base64'))
const invalidSource = { ...preview, sourceSha256: 'bad' }
assert.throws(() => academicReviewPackage(invalidSource, {}), /INVALID_SOURCE_FINGERPRINT/)

assert.equal(MODULE_TITLES.length, 30)
assert.equal(resolveCurriculumModule(1)?.courseSlug, 'entrenador-personal-nivel-1')
assert.equal(resolveCurriculumModule(20)?.position, 10)
assert.equal(resolveCurriculumModule(20)?.level, 2)
assert.equal(resolveCurriculumModule(30)?.courseSlug, 'entrenador-personal-nivel-3')
assert.equal(resolveCurriculumModule(0), null)
assert.equal(resolveCurriculumModule(31), null)
const snapshot = {
  readComplete: true,
  courses: [{ id: 'c2', slug: 'entrenador-personal-nivel-2', status: 'draft' }],
  modules: [
    { id: 'demo-collision', course_id: 'c2', title: 'Material antiguo de prueba', position: 10, sort_order: 10 }
  ]
}
const simulated = simulateAcademicImport(preview, snapshot)
assert.equal(simulated.writesPerformed, false)
assert.equal(simulated.automaticPublicationAllowed, false)
assert.equal(simulated.readyToWrite, false)
assert.equal(simulated.target?.moduleNumber, 20)
assert.equal(simulated.destination?.courseId, 'c2')
assert.equal(simulated.positionConflicts.length, 1)
assert.ok(simulated.blockers.some(t => t.includes('ya está ocupada')))
assert.ok(simulated.blockers.some(t => t.includes('metadatos')))
const unknownSnapshot = simulateAcademicImport(preview, null)
assert.ok(unknownSnapshot.blockers.some(t => t.includes('No se ha verificado completamente')))


// Regression: a real GHC Module 1 format has no separate Word heading for
// its solutions. "Autoevaluación" and "RESPUESTAS:" must never be lessons.
const realShapeBlocks = [
  { kind: 'paragraph', text: 'NIVEL 1: Fundamentos' },
  { kind: 'paragraph', text: 'MÓDULO 1' },
  { kind: 'heading', level: 1, text: 'Introducción' },
  { kind: 'paragraph', text: 'Fundamentos del PT.' },
  { kind: 'heading', level: 1, text: 'Script para Video (4-5 minutos)' },
  { kind: 'paragraph', text: 'INICIO DEL SCRIPT:' },
  { kind: 'heading', level: 1, text: 'Autoevaluación' },
  { kind: 'paragraph', text: '1. ¿Cuál es la función del entrenador personal?' },
  { kind: 'paragraph', text: 'RESPUESTAS:' },
  { kind: 'paragraph', text: '1. Evaluación y personalización.' },
  { kind: 'heading', level: 1, text: 'Bibliografía y Referencias' },
  { kind: 'paragraph', text: 'Bibliografía de ejemplo' }
]
const realShapePreview = {
  fileName: 'MODULO_1_NIVEL_1_COMPLETO.docx',
  format: 'DOCX',
  sourceSha256: 'c'.repeat(64),
  sourceMetadataTitle: undefined,
  blocks: realShapeBlocks,
  media: [],
  mediaFilesInPackage: 0,
  stats: { headings: 4, paragraphs: 8, lists: 0, tables: 0, characters: 180 },
  warnings: [],
  truncated: false
}
const sensitive = buildAcademicDraft(realShapePreview)
assert.equal(sensitive.levelNumber, 1)
assert.equal(sensitive.moduleNumber, 1)
assert.equal(sensitive.sections.filter(s => s.kind === 'video_script').length, 1)
assert.equal(sensitive.sections.filter(s => s.kind === 'assessment').length, 1)
assert.equal(sensitive.sections.filter(s => s.kind === 'private_answer_key').length, 1)
assert.equal(sensitive.sections.filter(s => s.visibility === 'staff_only').length, 2)
assert.equal(sensitive.sections.reduce((n,s) => n+s.blockCount,0), realShapeBlocks.length)
const exam = sensitive.sections.find(s => s.kind === 'assessment')
const key = sensitive.sections.find(s => s.kind === 'private_answer_key')
assert.equal(exam.blockEnd, key.blockStart)
assert.equal(realShapeBlocks[key.blockStart].text, 'RESPUESTAS:')
const protectedExport = academicReviewPackage(realShapePreview, {
  [exam.id]: { title: 'Intento de lección', kind: 'lesson_candidate', reviewed: true, note: '' },
  [key.id]: { title: 'Intento de publicar respuestas', kind: 'lesson_candidate', reviewed: true, note: '' }
}, '2026-11-16T16:00:00.000Z')
assert.equal(protectedExport.sections.find(s => s.id === exam.id).editorial.visibility, 'staff_only')
assert.equal(protectedExport.sections.find(s => s.id === key.id).editorial.visibility, 'staff_only')
assert.equal(protectedExport.sections.find(s => s.id === key.id).editorial.kind, 'private_answer_key')

console.log('[academic-draft-test] OK: section drafts, protected inline assessment keys, video scripts, media placement and metadata warnings')
