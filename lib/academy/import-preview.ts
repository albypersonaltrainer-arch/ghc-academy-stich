import { inflateRawSync, inflateSync } from 'node:zlib'

export type AcademicBlock = {
  kind: 'heading' | 'paragraph' | 'table'
  text: string
  level?: number
  cells?: string[][]
}

export type AcademicPreview = {
  fileName: string
  format: 'DOCX' | 'PDF'
  blocks: AcademicBlock[]
  stats: { headings: number; paragraphs: number; tables: number; characters: number; pages?: number }
  warnings: string[]
  truncated: boolean
}

const MAX_XML_BYTES = 8 * 1024 * 1024
const MAX_BLOCKS = 1800
const MAX_TEXT_CHARS = 400000

function decodeXml(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
    if (entity.startsWith('#')) {
      const n = entity[1]?.toLowerCase() === 'x'
        ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[entity.toLowerCase()] || ''
  })
}

function wordText(xml: string) {
  const tokens = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab(?:\s[^>]*)?\/>|<w:(?:br|cr)(?:\s[^>]*)?\/>/g
  let result = ''
  let match: RegExpExecArray | null
  while ((match = tokens.exec(xml)) !== null) {
    if (match[1] !== undefined) result += decodeXml(match[1])
    else result += match[0].startsWith('<w:tab') ? '\t' : '\n'
  }
  return result.trim()
}

function headingLevel(xml: string) {
  const style = /<w:pStyle\b[^>]*\bw:val=["']([^"']+)["'][^>]*\/?>/i.exec(xml)?.[1] || ''
  const heading = /^(?:heading|titulo|título|berschrift|überschrift)\s*([1-6])$/i.exec(style)
  if (heading) return Number(heading[1])
  if (/^title$/i.test(style)) return 1
  return null
}

function unzipDocumentXml(data: Buffer) {
  // Use the ZIP central directory, not an unbounded inflate of attacker-supplied data.
  if (data.length < 22 || data.readUInt32LE(0) !== 0x04034b50) throw new Error('DOCX_INVALIDO')
  let eocd = -1
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
    if (data.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd === -1) throw new Error('DOCX_INVALIDO')
  const count = data.readUInt16LE(eocd + 10)
  const start = data.readUInt32LE(eocd + 16)
  if (count > 500 || start >= data.length) throw new Error('DOCX_DEMASIADOS_ARCHIVOS')
  let pos = start
  for (let i = 0; i < count; i++) {
    if (pos + 46 > data.length || data.readUInt32LE(pos) !== 0x02014b50) throw new Error('DOCX_INVALIDO')
    const method = data.readUInt16LE(pos + 10)
    const flags = data.readUInt16LE(pos + 8)
    const compressed = data.readUInt32LE(pos + 20)
    const expanded = data.readUInt32LE(pos + 24)
    const nameLength = data.readUInt16LE(pos + 28)
    const extraLength = data.readUInt16LE(pos + 30)
    const commentLength = data.readUInt16LE(pos + 32)
    const offset = data.readUInt32LE(pos + 42)
    const next = pos + 46 + nameLength + extraLength + commentLength
    if (next > data.length) throw new Error('DOCX_INVALIDO')
    const name = data.toString('utf8', pos + 46, pos + 46 + nameLength)
    pos = next
    if (name !== 'word/document.xml') continue
    if (flags & 1) throw new Error('DOCX_CIFRADO')
    if (expanded > MAX_XML_BYTES || compressed > MAX_XML_BYTES || offset + 30 > data.length) {
      throw new Error('DOCX_DEMASIADO_GRANDE')
    }
    if (data.readUInt32LE(offset) !== 0x04034b50) throw new Error('DOCX_INVALIDO')
    const localName = data.readUInt16LE(offset + 26)
    const localExtra = data.readUInt16LE(offset + 28)
    const bodyStart = offset + 30 + localName + localExtra
    if (bodyStart + compressed > data.length) throw new Error('DOCX_INVALIDO')
    const raw = data.subarray(bodyStart, bodyStart + compressed)
    const xml = method === 0 ? raw : method === 8
      ? inflateRawSync(raw, { maxOutputLength: MAX_XML_BYTES }) : null
    if (!xml || xml.length > MAX_XML_BYTES) throw new Error('DOCX_COMPRESION_NO_ADMITIDA')
    return xml.toString('utf8')
  }
  throw new Error('DOCX_SIN_DOCUMENTO')
}

function parseDocx(data: Buffer) {
  const xml = unzipDocumentXml(data)
  if (!xml.includes('<w:document') || !xml.includes('<w:body')) throw new Error('DOCX_INVALIDO')
  const body = xml.split(/<w:body(?:\s[^>]*)?>/)[1]?.split('</w:body>')[0] || ''
  const blockRe = /<w:(p|tbl)(?:\s[^>]*)?>[\s\S]*?<\/w:\1>/g
  const blocks: AcademicBlock[] = []
  let match: RegExpExecArray | null
  let textChars = 0
  let truncated = false
  while ((match = blockRe.exec(body)) !== null) {
    if (blocks.length >= MAX_BLOCKS || textChars >= MAX_TEXT_CHARS) { truncated = true; break }
    const source = match[0]
    if (match[1] === 'p') {
      let text = wordText(source)
      if (!text) continue
      if (/<w:numPr\b/.test(source)) text = '• ' + text
      const level = headingLevel(source)
      blocks.push(level ? { kind: 'heading', text, level } : { kind: 'paragraph', text })
      textChars += text.length
    } else {
      const cells: string[][] = []
      const rowRe = /<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g
      let row: RegExpExecArray | null
      while ((row = rowRe.exec(source)) !== null && cells.length < 250) {
        const columns: string[] = []
        const cellRe = /<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g
        let cell: RegExpExecArray | null
        while ((cell = cellRe.exec(row[0])) !== null && columns.length < 30) {
          columns.push(wordText(cell[0]))
        }
        if (columns.length) cells.push(columns)
      }
      if (!cells.length) continue
      const text = cells.map(r => r.join(' | ')).join('\n')
      blocks.push({ kind: 'table', text, cells })
      textChars += text.length
    }
  }
  if (!blocks.length) throw new Error('DOCX_SIN_TEXTO')
  const warnings = [
    'Vista previa documental: no se han importado imágenes, fórmulas, gráficos, notas al pie ni archivos adjuntos.',
    'Comprueba manualmente encabezados, listas y tablas con el Word original antes de aprobar su estructura.'
  ]
  if (/<w:drawing\b|<w:pict\b/.test(xml)) warnings.unshift('Este Word contiene elementos gráficos que todavía no se incluyen en la vista previa.')
  return { blocks, warnings, truncated }
}

function pdfString(raw: string) {
  if (raw.startsWith('<') && raw.endsWith('>')) {
    const hex = raw.slice(1, -1).replace(/\s/g, '')
    if (!hex || hex.length % 2) return ''
    const b = Buffer.from(hex, 'hex')
    if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) return b.subarray(2).toString('utf16le').split('').reverse().join('')
    return b.toString('latin1')
  }
  const body = raw.slice(1, -1)
  return body.replace(/\\([0-7]{1,3}|[nrtbf()\\]|(?:\r\n|\r|\n))/g, (_m, escaped: string) => {
    if (/^[0-7]/.test(escaped)) return String.fromCharCode(parseInt(escaped, 8))
    return ({ n: '\n', r: '\r', t: '\t', b: '', f: '', '(': '(', ')': ')', '\\': '\\' } as Record<string, string>)[escaped] ?? ''
  })
}

function parsePdf(data: Buffer) {
  if (data.toString('latin1', 0, 5) !== '%PDF-') throw new Error('PDF_INVALIDO')
  const source = data.toString('latin1')
  if (/\/Encrypt\b/.test(source)) throw new Error('PDF_CIFRADO')
  const pageCount = (source.match(/\/Type\s*\/Page\b/g) || []).length
  const streams: string[] = []
  const streamRe = /\bstream\r?\n([\s\S]*?)\r?\nendstream/g
  let stream: RegExpExecArray | null
  while ((stream = streamRe.exec(source)) !== null && streams.length < 180) {
    const dictionary = source.slice(Math.max(0, stream.index - 300), stream.index)
    const raw = Buffer.from(stream[1], 'latin1')
    try {
      const decoded = /\/FlateDecode/.test(dictionary)
        ? inflateSync(raw, { maxOutputLength: MAX_XML_BYTES })
        : raw
      if (decoded.length <= MAX_XML_BYTES) streams.push(decoded.toString('latin1'))
    } catch {
      // Unsupported or damaged stream: the Preview will report incomplete extraction.
    }
  }
  const blocks: AcademicBlock[] = []
  for (const content of streams) {
    const sequences = content.match(/\bBT\b[\s\S]*?\bET\b/g) || []
    for (const sequence of sequences) {
      if (blocks.length >= MAX_BLOCKS) break
      const commands = sequence.match(/\((?:\\[\s\S]|[^\\)])*\)|<[\dA-Fa-f\s]+>/g) || []
      const text = commands.map(pdfString).join(' ').replace(/\s+/g, ' ').trim()
      if (text && /[\p{L}\p{N}]/u.test(text)) blocks.push({ kind: 'paragraph', text })
    }
  }
  if (!blocks.length) throw new Error('PDF_SIN_TEXTO_EXTRAIBLE')
  return {
    blocks,
    pages: pageCount || undefined,
    truncated: blocks.length >= MAX_BLOCKS,
    warnings: [
      'Extracción preliminar de PDF: el orden de lectura y los caracteres pueden ser incorrectos con fuentes codificadas o varias columnas.',
      'No se extraen imágenes, gráficos ni fórmulas; compara siempre esta vista con el PDF original.',
      'Para máxima fidelidad utiliza el Word original. Este análisis no crea ni modifica cursos.'
    ]
  }
}

export function previewAcademicFile(filename: string, bytes: Uint8Array): AcademicPreview {
  const name = filename.trim().slice(0, 160)
  const format = /\.docx$/i.test(name) ? 'DOCX' : /\.pdf$/i.test(name) ? 'PDF' : null
  if (!format) throw new Error('FORMATO_NO_ADMITIDO')
  if (bytes.byteLength < 30 || bytes.byteLength > 12 * 1024 * 1024) throw new Error('TAMANO_NO_ADMITIDO')
  const data = Buffer.from(bytes)
  const result = format === 'DOCX' ? parseDocx(data) : parsePdf(data)
  const totalChars = result.blocks.reduce((n, b) => n + b.text.length, 0)
  return {
    fileName: name,
    format,
    blocks: result.blocks,
    stats: {
      headings: result.blocks.filter(b => b.kind === 'heading').length,
      paragraphs: result.blocks.filter(b => b.kind === 'paragraph').length,
      tables: result.blocks.filter(b => b.kind === 'table').length,
      characters: totalChars,
      ...('pages' in result && result.pages ? { pages: result.pages } : {})
    },
    warnings: result.warnings,
    truncated: result.truncated || totalChars >= MAX_TEXT_CHARS
  }
}
