import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import { previewAcademicFile } from '../lib/academy/import-preview.ts'
import { buildAcademicDraft } from '../lib/academy/draft-plan.ts'

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
console.log('[academic-draft-test] OK: section drafts, answer-key separation, media location and stale metadata detection')
