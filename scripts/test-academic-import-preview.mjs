import assert from 'node:assert/strict'
import { deflateRawSync, deflateSync } from 'node:zlib'
import { previewAcademicFile } from '../lib/academy/import-preview.ts'

function exampleDocx(xmlText) {
  const original = Buffer.from(xmlText, 'utf8')
  const zipped = deflateRawSync(original)
  const filename = Buffer.from('word/document.xml', 'utf8')
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(20, 4)
  local.writeUInt16LE(8, 8)
  local.writeUInt32LE(zipped.length, 18)
  local.writeUInt32LE(original.length, 22)
  local.writeUInt16LE(filename.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0)
  central.writeUInt16LE(20, 4)
  central.writeUInt16LE(20, 6)
  central.writeUInt16LE(8, 10)
  central.writeUInt32LE(zipped.length, 20)
  central.writeUInt32LE(original.length, 24)
  central.writeUInt16LE(filename.length, 28)
  central.writeUInt32LE(0, 42)
  const centralStart = local.length + filename.length + zipped.length
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(1, 8)
  eocd.writeUInt16LE(1, 10)
  eocd.writeUInt32LE(central.length + filename.length, 12)
  eocd.writeUInt32LE(centralStart, 16)
  return Buffer.concat([local, filename, zipped, central, filename, eocd])
}

const xml = [
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>',
  '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Módulo 1</w:t></w:r></w:p>',
  '<w:p><w:r><w:t>Fundamentos del entrenamiento científico.</w:t></w:r></w:p>',
  '<w:p><w:pPr><w:pStyle w:val="ListNumber"/></w:pPr><w:r><w:t>Primera fase</w:t></w:r></w:p>',
  '<w:p><w:pPr><w:pStyle w:val="GHCCompactNumber"/></w:pPr><w:r><w:t>Segunda fase GHC</w:t></w:r></w:p>',
  '<w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr><w:r><w:t>Objetivo GHC</w:t></w:r></w:p>',
  '<w:tbl><w:tr>',
  '<w:tc><w:p><w:r><w:t>Variable</w:t></w:r></w:p></w:tc>',
  '<w:tc><w:p><w:r><w:t>Valor</w:t></w:r></w:p><w:p><w:r><w:t>Segunda línea</w:t></w:r></w:p></w:tc>',
  '</w:tr></w:tbl></w:body></w:document>'
].join('')

const parsedWord = previewAcademicFile('ejemplo.docx', exampleDocx(xml))
assert.equal(parsedWord.format, 'DOCX')
assert.equal(parsedWord.stats.headings, 1)
assert.equal(parsedWord.stats.paragraphs, 1)
assert.equal(parsedWord.stats.lists, 3)
assert.equal(parsedWord.stats.tables, 1)
assert.equal(parsedWord.blocks[0].text, 'Módulo 1')
assert.equal(parsedWord.blocks[2].kind, 'list_item')
assert.equal(parsedWord.blocks[2].listType, 'numbered')
assert.equal(parsedWord.blocks[3].kind, 'list_item')
assert.equal(parsedWord.blocks[3].listType, 'numbered')
assert.equal(parsedWord.blocks[4].kind, 'list_item')
assert.equal(parsedWord.blocks[4].listType, 'bulleted')
assert.deepEqual(parsedWord.blocks[5].cells, [['Variable', 'Valor\nSegunda línea']])

const compressedText = deflateSync(Buffer.from('BT /F1 12 Tf (Fundamentos de fuerza) Tj ET'))
const examplePdf = Buffer.concat([
  Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nendobj\n2 0 obj\n<< /Filter /FlateDecode /Length ' + compressedText.length + ' >>\nstream\n'),
  compressedText,
  Buffer.from('\nendstream\nendobj\n%%EOF')
])
const parsedPdf = previewAcademicFile('ejemplo.pdf', examplePdf)
assert.equal(parsedPdf.format, 'PDF')
assert.ok(parsedPdf.blocks.some(block => block.text.includes('Fundamentos de fuerza')))
assert.ok(parsedPdf.warnings.some(w => w.includes('preliminar')))

assert.throws(() => previewAcademicFile('archivo.exe', exampleDocx(xml)), /FORMATO_NO_ADMITIDO/)
assert.throws(() => previewAcademicFile('escaneado.pdf', Buffer.from('%PDF-1.4\n%%EOF\n' + '0'.repeat(40))), /PDF_SIN_TEXTO_EXTRAIBLE/)
console.log('[import-preview-test] OK: DOCX headings/paragraphs/list styles/multiline tables, simple PDF text, invalid and unextractable files')
