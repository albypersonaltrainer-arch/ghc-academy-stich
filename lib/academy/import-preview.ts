import { inflateRawSync, inflateSync } from 'node:zlib'
import { createHash } from 'node:crypto'

export type AcademicBlock = {
  kind: 'heading' | 'paragraph' | 'list_item' | 'table' | 'image'
  mediaId?: string
  listType?: 'numbered' | 'bulleted' | 'unknown'
  text: string
  level?: number
  cells?: string[][]
}

export type AcademicMedia = {
  id: string
  path: string
  mimeType: string
  bytes: number
  sha256: string
  altText: string | null
  altNeedsReview: boolean
  blockIndexes: number[]
  previewDataUrl?: string
}

export type AcademicPreview = {
  fileName: string
  format: 'DOCX' | 'PDF'
  sourceSha256: string
  blocks: AcademicBlock[]
  media: AcademicMedia[]
  mediaFilesInPackage: number
  sourceMetadataTitle?: string
  stats: { headings: number; paragraphs: number; lists: number; tables: number; characters: number; pages?: number }
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

function paragraphStyle(xml: string) {
  const pPr = /<w:pPr(?:\s[^>]*)?>[\s\S]*?<\/w:pPr>/.exec(xml)?.[0] || ''
  return /<w:pStyle\b[^>]*\bw:val=["']([^"']+)["'][^>]*\/?>/i.exec(pPr)?.[1] || ''
}

function headingLevel(xml: string) {
  const style = paragraphStyle(xml)
  const heading = /^(?:heading|titulo|título|berschrift|überschrift)\s*([1-6])$/i.exec(style)
  if (heading) return Number(heading[1])
  if (/^title$/i.test(style)) return 1
  return null
}

type ZipPart = {
  name: string
  compressed: number
  expanded: number
  flags: number
  method: number
  offset: number
}

function listZipParts(data: Buffer): Map<string, ZipPart> {
  // Central directory limits prevent zip bombs, path traversal and unsupported ZIP64.
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
  let accumulated = 0
  const parts = new Map<string, ZipPart>()
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
    if (name.includes('..') || name.startsWith('/') || name.includes('\\') || parts.has(name)) {
      throw new Error('DOCX_ENTRADA_NO_SEGURA')
    }
    accumulated += expanded
    if (accumulated > 60 * 1024 * 1024 || expanded > 20 * 1024 * 1024) {
      throw new Error('DOCX_DEMASIADO_GRANDE')
    }
    parts.set(name, { name, compressed, expanded, flags, method, offset })
  }
  return parts
}

function readZipPart(data: Buffer, entry: ZipPart | undefined, maxBytes: number): Buffer | null {
  if (!entry) return null
  const { offset, compressed, expanded, flags, method } = entry
  if ((flags & 1) !== 0) throw new Error('DOCX_CIFRADO')
  if (expanded > maxBytes || compressed > maxBytes || offset + 30 > data.length) {
    throw new Error('DOCX_DEMASIADO_GRANDE')
  }
  if (data.readUInt32LE(offset) !== 0x04034b50) throw new Error('DOCX_INVALIDO')
  const localName = data.readUInt16LE(offset + 26)
  const localExtra = data.readUInt16LE(offset + 28)
  const bodyStart = offset + 30 + localName + localExtra
  if (bodyStart + compressed > data.length) throw new Error('DOCX_INVALIDO')
  const raw = data.subarray(bodyStart, bodyStart + compressed)
  const output = method === 0 ? raw : method === 8
    ? inflateRawSync(raw, { maxOutputLength: maxBytes }) : null
  if (!output || output.length !== expanded || output.length > maxBytes) {
    throw new Error('DOCX_COMPRESION_NO_ADMITIDA')
  }
  return output
}

function xmlAttribute(tag: string, attribute: string) {
  // Trusted only as a parser token; returned values are never used as HTML.
  const re = new RegExp('(?:^|\\s)' + attribute.replace(':', '\\:') + '\\s*=\\s*["\\x27]([^"\\x27]*)["\\x27]')
  return decodeXml(re.exec(tag)?.[1] || '')
}

function imageMime(path: string): string | null {
  const ext = path.split('.').pop()?.toLowerCase()
  return ext === 'png' ? 'image/png'
    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : null
}

function matchesImageHeader(bytes: Buffer, mime: string): boolean {
  if (mime === 'image/png') {
    return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  }
  if (mime === 'image/jpeg') {
    return bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9
  }
  if (mime === 'image/webp') return bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  if (mime === 'image/gif') return bytes.length > 6 && (bytes.toString('ascii', 0, 6) === 'GIF87a' || bytes.toString('ascii', 0, 6) === 'GIF89a')
  return false
}

function parseDocx(data: Buffer) {
  const parts = listZipParts(data)
  const doc = readZipPart(data, parts.get('word/document.xml'), MAX_XML_BYTES)
  if (!doc) throw new Error('DOCX_SIN_DOCUMENTO')
  const xml = doc.toString('utf8')
  if (!xml.includes('<w:document') || !xml.includes('<w:body')) throw new Error('DOCX_INVALIDO')
  const body = xml.split(/<w:body(?:\s[^>]*)?>/)[1]?.split('</w:body>')[0] || ''
  const props = readZipPart(data, parts.get('docProps/core.xml'), 128 * 1024)
  const metadataTitle = props ? decodeXml(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/.exec(props.toString('utf8'))?.[1] || '').trim() : ''
  const blockRe = /<w:(p|tbl)(?:\s[^>]*)?>[\s\S]*?<\/w:\1>/g

  // Relationships reference only local embedded pictures; external images are not fetched.
  const relsRaw = readZipPart(data, parts.get('word/_rels/document.xml.rels'), 1024 * 1024)
  const rels = new Map<string, string>()
  if (relsRaw) {
    const xmlRels = relsRaw.toString('utf8')
    const relationshipRe = /<Relationship\b[^>]*\/>/g
    let relation: RegExpExecArray | null
    while ((relation = relationshipRe.exec(xmlRels)) !== null) {
      const tag = relation[0]
      if (!/\/image["']/.test(tag) || /TargetMode\s*=\s*["']External["']/.test(tag)) continue
      const id = xmlAttribute(tag, 'Id')
      const target = xmlAttribute(tag, 'Target')
      if (/^media\/[a-z0-9_.-]+$/i.test(target) && id && parts.has('word/' + target)) {
        rels.set(id, 'word/' + target)
      }
    }
  }

  const blocks: AcademicBlock[] = []
  const used = new Map<string, AcademicMedia>()
  const warnings = [
    'Vista previa documental: no se han incorporado automáticamente fórmulas, gráficos editables, notas al pie ni archivos adjuntos.',
    'Revisa los niveles de encabezado, listas, tablas y el orden del contenido con el Word original.'
  ]
  let match: RegExpExecArray | null
  let textChars = 0
  let truncated = false
  let previewImageBytes = 0
  const MAX_PREVIEW_IMAGE_BYTES = 210 * 1024
  const MAX_TOTAL_PREVIEW_IMAGE_BYTES = 1250 * 1024
  while ((match = blockRe.exec(body)) !== null) {
    if (blocks.length >= MAX_BLOCKS || textChars >= MAX_TEXT_CHARS) { truncated = true; break }
    const source = match[0]
    if (match[1] === 'p') {
      const text = wordText(source)
      if (text) {
        const level = headingLevel(source)
        const style = paragraphStyle(source)
        const listType = /^(?:ListNumber|ListNum|Numbered|NumList|GHCCompactNumber)/i.test(style)
          ? 'numbered'
          : /^(?:ListBullet|Bullet|Bulleted)/i.test(style)
            ? 'bulleted'
            : /<w:numPr\b/.test(source) ? 'unknown' : null
        if (level) blocks.push({ kind: 'heading', text, level })
        else if (listType) blocks.push({ kind: 'list_item', text, listType })
        else blocks.push({ kind: 'paragraph', text })
        textChars += text.length
      }
    } else {
      const cells: string[][] = []
      const rowRe = /<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g
      let row: RegExpExecArray | null
      while ((row = rowRe.exec(source)) !== null && cells.length < 250) {
        const columns: string[] = []
        const cellRe = /<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g
        let cell: RegExpExecArray | null
        while ((cell = cellRe.exec(row[0])) !== null && columns.length < 30) {
          const paras = cell[0].match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) || []
          columns.push(paras.length
            ? paras.map(wordText).filter(Boolean).join('\n')
            : wordText(cell[0]))
        }
        if (columns.length) cells.push(columns)
      }
      if (cells.length) {
        const text = cells.map(r => r.join(' | ')).join('\n')
        blocks.push({ kind: 'table', text, cells })
        textChars += text.length
      }
    }

    // Record actual placements, in document order, even when a paragraph has no text.
    // Images in table cells are associated after that table block.
    const pictureRe = /<a:blip\b[^>]*\/?>/g
    let picture: RegExpExecArray | null
    while ((picture = pictureRe.exec(source)) !== null) {
      if (blocks.length >= MAX_BLOCKS) { truncated = true; break }
      const relId = xmlAttribute(picture[0], 'r:embed')
      const path = rels.get(relId)
      if (!path) continue
      const mimeType = imageMime(path)
      if (!mimeType) continue
      const item = parts.get(path)
      if (!item) continue
      const documentProperty = /<wp:docPr\b[^>]*\/?>/.exec(source)?.[0] || ''
      const alt = xmlAttribute(documentProperty, 'descr') || xmlAttribute(documentProperty, 'title')
      const meaningfulAlt = alt && !/^(Image:|Picture\s*\d+|image\d+\.\w+)/i.test(alt)
      let media = used.get(relId)
      if (!media) {
        const raw = readZipPart(data, item, 8 * 1024 * 1024)
        if (!raw) continue
        if (!matchesImageHeader(raw, mimeType)) {
          warnings.push('Se omitió una imagen con formato inconsistente: ' + path.split('/').pop())
          continue
        }
        media = {
          id: relId,
          path,
          mimeType,
          bytes: raw.length,
          sha256: createHash('sha256').update(raw).digest('hex'),
          altText: alt || null,
          altNeedsReview: !meaningfulAlt,
          blockIndexes: []
        }
        if (used.size < 12 && raw.length <= MAX_PREVIEW_IMAGE_BYTES &&
            previewImageBytes + raw.length <= MAX_TOTAL_PREVIEW_IMAGE_BYTES) {
          previewImageBytes += raw.length
          media.previewDataUrl = 'data:' + mimeType + ';base64,' + raw.toString('base64')
        }
        used.set(relId, media)
      }
      media.blockIndexes.push(blocks.length)
      blocks.push({ kind: 'image', mediaId: relId, text: alt || path.split('/').pop() || 'Imagen' })
    }
  }
  if (!blocks.length) throw new Error('DOCX_SIN_TEXTO')

  const mediaFilesInPackage = Array.from(parts.keys()).filter(x => /^word\/media\//.test(x)).length
  if (mediaFilesInPackage > used.size) {
    warnings.push(
      'Este Word contiene ' + mediaFilesInPackage + ' archivos multimedia internos y ' +
      used.size + ' imágenes vinculadas al cuerpo detectadas. Los demás elementos no se han asignado automáticamente.'
    )
  }
  if (used.size > 0) {
    warnings.push('Las imágenes mostradas son copias temporales e idénticas al original; antes de publicar hay que revisar su descripción accesible y la sección correcta.')
  }
  if (/<m:oMath\b|<m:oMathPara\b/.test(xml)) {
    warnings.push('Se han detectado fórmulas matemáticas que requieren tratamiento independiente.')
  }
  return {
    blocks, media: Array.from(used.values()), mediaFilesInPackage, sourceMetadataTitle: metadataTitle || undefined,
    warnings, truncated
  }
}

function pdfString(raw: string) {
  if (raw.startsWith('<') && raw.endsWith('>')) {
    const hex = raw.slice(1, -1).replace(/\s/g, '')
    if (!hex || hex.length % 2) return ''
    const b = Buffer.from(hex, 'hex')
    if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) {
      const payload = b.subarray(2)
      if (payload.length % 2) return ''
      const le = Buffer.alloc(payload.length)
      for (let i = 0; i < payload.length; i += 2) { le[i] = payload[i + 1]; le[i + 1] = payload[i] }
      return le.toString('utf16le')
    }
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
  let totalExpanded = 0
  const streamRe = /\bstream\r?\n([\s\S]*?)\r?\nendstream/g
  let stream: RegExpExecArray | null
  while ((stream = streamRe.exec(source)) !== null && streams.length < 180) {
    const dictionary = source.slice(Math.max(0, stream.index - 300), stream.index)
    const raw = Buffer.from(stream[1], 'latin1')
    try {
      const decoded = /\/FlateDecode/.test(dictionary)
        ? inflateSync(raw, { maxOutputLength: MAX_XML_BYTES })
        : raw
      if (totalExpanded + decoded.length > 16 * 1024 * 1024) break
      totalExpanded += decoded.length
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
      if (text && /[A-Za-zÀ-ÿ0-9]/.test(text)) blocks.push({ kind: 'paragraph', text })
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
    sourceSha256: createHash('sha256').update(data).digest('hex'),
    blocks: result.blocks,
    media: 'media' in result ? result.media as AcademicMedia[] : [],
    mediaFilesInPackage: 'mediaFilesInPackage' in result ? result.mediaFilesInPackage as number : 0,
    sourceMetadataTitle: 'sourceMetadataTitle' in result ? result.sourceMetadataTitle : undefined,
    stats: {
      headings: result.blocks.filter(b => b.kind === 'heading').length,
      paragraphs: result.blocks.filter(b => b.kind === 'paragraph').length,
      lists: result.blocks.filter(b => b.kind === 'list_item').length,
      tables: result.blocks.filter(b => b.kind === 'table').length,
      characters: totalChars,
      ...('pages' in result && typeof result.pages === 'number' ? { pages: result.pages } : {})
    },
    warnings: result.warnings,
    truncated: result.truncated || totalChars >= MAX_TEXT_CHARS
  }
}
