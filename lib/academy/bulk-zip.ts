/**
 * Lectura local de ZIP clásico para lotes académicos. Sin dependencias externas.
 * Solo acepta 10 DOCX numerados consecutivamente (1–10, 11–20 o 21–30).
 * Nunca extrae rutas al sistema de archivos y nunca sube el ZIP original.
 */
export type CourseZipEntry = {
  name: string
  fileName: string
  moduleNumber: number
  compressedSize: number
  uncompressedSize: number
  crc32: number
  method: number
  flags: number
  localHeaderOffset: number
}
export type CourseZipPlan = { level: number; entries: CourseZipEntry[] }

const MAX_ZIP_BYTES = 45 * 1024 * 1024
const MAX_DOCX_BYTES = 12 * 1024 * 1024
const MAX_TOTAL_BYTES = 120 * 1024 * 1024
const MAX_ZIP_ENTRIES = 100
const td = new TextDecoder('utf-8', { fatal: true })

function readU16(view: DataView, offset: number) {
  if (offset < 0 || offset + 2 > view.byteLength) throw Error('ZIP_TRUNCADO')
  return view.getUint16(offset, true)
}
function readU32(view: DataView, offset: number) {
  if (offset < 0 || offset + 4 > view.byteLength) throw Error('ZIP_TRUNCADO')
  return view.getUint32(offset, true)
}
function error(code: string): never { throw Error(code) }

function moduleFromFileName(name: string): number | null {
  const match = /(?:^|[_\s-])(?:m[oó]dulo|module|mod)[_\s-]*0?(\d{1,2})(?!\d)/i.exec(name)
  if (!match) return null
  const number = Number(match[1])
  return number >= 1 && number <= 30 ? number : null
}

export function inspectCourseZipBytes(bytes: Uint8Array): CourseZipPlan {
  if (bytes.byteLength > MAX_ZIP_BYTES || bytes.byteLength < 22) return error('ZIP_TAMANO_INVALIDO')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let p = bytes.byteLength - 22; p >= Math.max(0, bytes.byteLength - 65557); p--) {
    if (readU32(view, p) === 0x06054b50) { eocd = p; break }
  }
  if (eocd < 0) return error('ZIP_CABECERA_INVALIDA')
  const disk = readU16(view, eocd + 4)
  const centralDisk = readU16(view, eocd + 6)
  const countDisk = readU16(view, eocd + 8)
  const count = readU16(view, eocd + 10)
  const centralSize = readU32(view, eocd + 12)
  const centralOffset = readU32(view, eocd + 16)
  const commentLength = readU16(view, eocd + 20)
  if (disk !== 0 || centralDisk !== 0 || countDisk !== count ||
      count === 0 || count > MAX_ZIP_ENTRIES || count === 0xffff ||
      centralOffset === 0xffffffff || centralSize === 0xffffffff) return error('ZIP_FORMATO_NO_ADMITIDO')
  if (eocd + 22 + commentLength !== bytes.byteLength ||
      centralOffset + centralSize > eocd) return error('ZIP_DIRECTORIO_INVALIDO')

  const seenPaths = new Set<string>()
  const modules = new Set<number>()
  const entries: CourseZipEntry[] = []
  let total = 0
  let p = centralOffset
  for (let i = 0; i < count; i++) {
    if (readU32(view, p) !== 0x02014b50 || p + 46 > bytes.byteLength) return error('ZIP_ENTRADA_INVALIDA')
    const madeBy = readU16(view, p + 4)
    const flags = readU16(view, p + 8)
    const method = readU16(view, p + 10)
    const crc32 = readU32(view, p + 16)
    const compressedSize = readU32(view, p + 20)
    const uncompressedSize = readU32(view, p + 24)
    const nameLength = readU16(view, p + 28)
    const extraLength = readU16(view, p + 30)
    const commentLength = readU16(view, p + 32)
    const externalAttrs = readU32(view, p + 38)
    const localHeaderOffset = readU32(view, p + 42)
    const end = p + 46 + nameLength + extraLength + commentLength
    if (end > centralOffset + centralSize) return error('ZIP_ENTRADA_INVALIDA')
    let name: string
    try { name = td.decode(bytes.subarray(p + 46, p + 46 + nameLength)) }
    catch { return error('ZIP_NOMBRE_INVALIDO') }
    p = end
    const path = name.normalize('NFC')
    if (!path || path.startsWith('/') || path.includes('\\') ||
        path.split('/').some(part => part === '..' || part === '.' || part === '') ||
        /[\u0000-\u001f]/.test(path)) return error('ZIP_RUTA_INSEGURA')
    const canonical = path.toLowerCase()
    if (seenPaths.has(canonical)) return error('ZIP_RUTA_DUPLICADA')
    seenPaths.add(canonical)
    if (flags & 1 || flags & 0x40 || (method !== 8 && method !== 0) ||
        compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) return error('ZIP_COMPRESION_NO_ADMITIDA')
    if ((madeBy >> 8) === 3 && ((externalAttrs >>> 16) & 0xf000) === 0xa000) return error('ZIP_ENLACE_NO_ADMITIDO')
    if (name.endsWith('/') || path.startsWith('__MACOSX/') ||
        /(?:^|\/)\.DS_Store$/i.test(path)) continue

    if (!/\.docx$/i.test(path)) return error('ZIP_SOLO_WORD')
    const fileName = path.split('/').pop() || ''
    const moduleNumber = moduleFromFileName(fileName)
    if (moduleNumber === null) return error('ZIP_MODULO_SIN_NUMERO')
    if (modules.has(moduleNumber)) return error('ZIP_MODULO_DUPLICADO')
    if (uncompressedSize < 30 || uncompressedSize > MAX_DOCX_BYTES ||
        (uncompressedSize > 0 && compressedSize === 0) ||
        (compressedSize > 0 && uncompressedSize / compressedSize > 300)) return error('ZIP_WORD_TAMANO_INVALIDO')
    total += uncompressedSize
    if (total > MAX_TOTAL_BYTES) return error('ZIP_TAMANO_DESCOMPRIMIDO_EXCESIVO')
    modules.add(moduleNumber)
    entries.push({ name: path, fileName, moduleNumber, compressedSize,
      uncompressedSize, crc32, flags, method, localHeaderOffset })
  }
  if (p !== centralOffset + centralSize) return error('ZIP_DIRECTORIO_INVALIDO')
  if (entries.length !== 10) return error('ZIP_REQUIERE_DIEZ_MODULOS')
  const first = Math.min(...modules)
  const level = first <= 10 ? 1 : first <= 20 ? 2 : 3
  const start = (level - 1) * 10 + 1
  if (entries.some(entry => entry.moduleNumber < start || entry.moduleNumber > start + 9)) {
    return error('ZIP_NIVEL_INCOMPLETO')
  }
  return { level, entries: entries.sort((a, b) => a.moduleNumber - b.moduleNumber) }
}
export async function inspectCourseZip(file: File) {
  if (!/\.zip$/i.test(file.name)) throw Error('ZIP_EXTENSION_INVALIDA')
  return inspectCourseZipBytes(new Uint8Array(await file.arrayBuffer()))
}
function crc32(bytes: Uint8Array): number {
  let result = 0xffffffff
  for (const b of bytes) {
    result ^= b
    for (let i = 0; i < 8; i++) result = (result >>> 1) ^ ((result & 1) ? 0xedb88320 : 0)
  }
  return (result ^ 0xffffffff) >>> 0
}
export async function extractCourseZipEntry(zip: File, entry: CourseZipEntry): Promise<File> {
  // Decodificación por entrada bajo límites ya comprobados; nunca extraer a disco.
  const bytes = new Uint8Array(await zip.arrayBuffer())
  const view = new DataView(bytes.buffer)
  const at = entry.localHeaderOffset
  if (readU32(view, at) !== 0x04034b50) return error('ZIP_CABECERA_LOCAL_INVALIDA')
  const localFlags = readU16(view, at + 6)
  const method = readU16(view, at + 8)
  const nameLength = readU16(view, at + 26)
  const extraLength = readU16(view, at + 28)
  if (localFlags !== entry.flags || method !== entry.method) return error('ZIP_METADATOS_INCOHERENTES')
  const localName = td.decode(bytes.subarray(at + 30, at + 30 + nameLength))
  if (localName !== entry.name) return error('ZIP_NOMBRE_INCOHERENTE')
  const dataStart = at + 30 + nameLength + extraLength
  const dataEnd = dataStart + entry.compressedSize
  if (dataStart < 0 || dataEnd > bytes.byteLength) return error('ZIP_TRUNCADO')
  const chunk = bytes.subarray(dataStart, dataEnd)
  let content: Uint8Array
  if (entry.method === 0) content = chunk
  else {
    try {
      const stream = new Blob([Uint8Array.from(chunk)]).stream()
        .pipeThrough(new DecompressionStream('deflate-raw'))
      // El límite se comprueba DURANTE la descompresión, antes de construir el DOCX.
      const reader = stream.getReader()
      const parts: Uint8Array[] = []
      let size = 0
      while (true) {
        const result = await reader.read()
        if (result.done) break
        size += result.value.byteLength
        if (size > entry.uncompressedSize || size > MAX_DOCX_BYTES) {
          await reader.cancel().catch(() => {})
          return error('ZIP_BOMBA_DE_COMPRESION')
        }
        parts.push(result.value)
      }
      content = new Uint8Array(size)
      let offset = 0
      for (const part of parts) { content.set(part, offset); offset += part.byteLength }
    } catch { return error('ZIP_DESCOMPRESION_FALLIDA') }
  }
  if (content.byteLength !== entry.uncompressedSize || crc32(content) !== entry.crc32) {
    return error('ZIP_INTEGRIDAD_FALLIDA')
  }
  if (content.byteLength < 4 || content[0] !== 0x50 || content[1] !== 0x4b ||
      content[2] !== 0x03 || content[3] !== 0x04) return error('ZIP_DOCUMENTO_NO_DOCX')
  return new File([Uint8Array.from(content)], entry.fileName, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  })
}
