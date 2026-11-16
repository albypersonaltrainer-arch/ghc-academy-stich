import type { AcademicBlock, AcademicPreview } from './import-preview'

export type DraftKind =
  | 'lesson_candidate'
  | 'orientation'
  | 'practice'
  | 'assessment'
  | 'private_answer_key'
  | 'video_script'
  | 'glossary'
  | 'references'
  | 'other'

export type AcademicDraftSection = {
  id: string
  title: string
  kind: DraftKind
  kindLabel: string
  visibility: 'student_candidate' | 'staff_only' | 'needs_decision'
  status: 'pending_human_review'
  blockStart: number
  blockEnd: number
  blockCount: number
  textCharacters: number
  mediaIds: string[]
  suggestedReason: string
}

export type AcademicModuleDraft = {
  status: 'unapproved_local_preview'
  sourceFileName: string
  levelNumber: number | null
  moduleNumber: number | null
  moduleTitle: string
  sourceMetadataTitle?: string
  metadataTitleMismatch: boolean
  sections: AcademicDraftSection[]
  warnings: string[]
  metrics: {
    lessonCandidates: number
    staffOnly: number
    reviewSections: number
    mediaPlaced: number
    mediaUnassigned: number
  }
}

const KIND_LABELS: Record<DraftKind, string> = {
  lesson_candidate: 'Lección propuesta',
  orientation: 'Introducción y orientación',
  practice: 'Actividad o caso práctico',
  assessment: 'Material de evaluación',
  private_answer_key: 'Respuestas · solo equipo docente',
  video_script: 'Guion de vídeo (pendiente de producir)',
  glossary: 'Glosario',
  references: 'Fuentes y referencias',
  other: 'Revisión manual'
}

function classify(title: string, isPreamble: boolean): {
  kind: DraftKind
  visibility: AcademicDraftSection['visibility']
  reason: string
} {
  if (isPreamble) return { kind: 'orientation', visibility: 'needs_decision', reason: 'Portada, metadatos y orientación sin encabezado de primer nivel.' }
  const t = title.toLocaleLowerCase('es-ES').replace(/^\s*\d+[.)]\s*/, '').trim()
  if (/(respuestas?\s+(orientativas?|correctas?)|solucionario|clave de respuestas|answer key)/i.test(t)) {
    return { kind: 'private_answer_key', visibility: 'staff_only', reason: 'Puede contener soluciones. No debe mostrarse al alumnado ni incorporarse a una lección pública.' }
  }
  if (/^(?:auto\s*evaluaci[oó]n\b|test\s+(?:de\s+)?autoevaluaci[oó]n\b|evaluaci[oó]n\s+(?:te[oó]rica|final|pr[aá]ctica|del\s+(?:m[oó]dulo|curso))|ex[aá]menes?\b|examen\b|r[uú]brica\b|criterios?\s+de\s+calificaci[oó]n|cuestionario\s+(?:final|evaluador))/i.test(t)) {
    return { kind: 'assessment', visibility: 'staff_only', reason: 'Fuente para diseñar y revisar un examen; no crea ni publica preguntas automáticamente.' }
  }
  if (/((?:guion|gui[oó]n|script).*(?:v[ií]deo|documental)|v[ií]deo.*resumen|storyboard)/i.test(t)) {
    return { kind: 'video_script', visibility: 'needs_decision', reason: 'Guion para un recurso audiovisual futuro; no equivale a un vídeo terminado.' }
  }
  if (/(bibliograf[ií]a|referencias|fuentes|autor[ií]a|propiedad intelectual|registro de tablas|citas?)/i.test(t)) {
    return { kind: 'references', visibility: 'needs_decision', reason: 'Material de consulta o trazabilidad, normalmente asociado al módulo.' }
  }
  if (/\bglosario\b/i.test(t)) {
    return { kind: 'glossary', visibility: 'needs_decision', reason: 'Glosario complementario; requiere definir ubicación en el campus.' }
  }
  if (/(casos?|herramientas?|laboratorios?|aplicaci[oó]n pr[aá]ctica|pr[aá]cticas?|proyecto final)/i.test(t)) {
    return { kind: 'practice', visibility: 'needs_decision', reason: 'Actividad práctica o caso; verificar si es lección, ejercicio o material complementario.' }
  }
  if (/(nota editorial|mapa del m[oó]dulo|c[oó]mo utilizar|resultados de aprendizaje|prop[oó]sito del m[oó]dulo)/i.test(t)) {
    return { kind: 'orientation', visibility: 'needs_decision', reason: 'Contexto y objetivos del módulo; no se presupone una lección independiente.' }
  }
  return { kind: 'lesson_candidate', visibility: 'student_candidate', reason: 'Sección temática principal. Su división final requiere aprobación editorial.' }
}

function inspectNumber(label: string, prefix: string): number | null {
  const re = new RegExp('\\b' + prefix + '\\s*[:#\\-–]?\\s*(\\d{1,2})\\b', 'i')
  const value = re.exec(label)?.[1]
  const n = value ? Number(value) : NaN
  return Number.isInteger(n) && n > 0 && n <= 99 ? n : null
}

function finishSection(
  id: number, title: string, start: number, end: number, blocks: AcademicBlock[],
  isPreamble: boolean
): AcademicDraftSection | null {
  if (end <= start) return null
  const sectionBlocks = blocks.slice(start, end)
  const { kind, visibility, reason } = classify(title, isPreamble)
  return {
    id: 'section-' + String(id).padStart(3, '0'),
    title,
    kind,
    kindLabel: KIND_LABELS[kind],
    visibility,
    status: 'pending_human_review',
    blockStart: start,
    blockEnd: end,
    blockCount: sectionBlocks.length,
    textCharacters: sectionBlocks.reduce((sum, block) => sum + (block.kind === 'image' ? 0 : block.text.length), 0),
    mediaIds: Array.from(new Set(sectionBlocks.filter(b => b.kind === 'image').map(b => b.mediaId).filter((id): id is string => Boolean(id)))),
    suggestedReason: reason
  }
}

// A section may contain both exam questions and their solutions under a
// paragraph marker instead of separate Word headings. Split these ranges
// before anybody can mark the original section as student-facing.
const ANSWER_HEADING = /^(?:respuestas?(?:\s+(?:correctas?|orientativas?))?|soluciones|solucionario|clave de respuestas|answer key)\s*[:：–.\-]?$/i

function isolateAnswerKeys(
  original: AcademicDraftSection[],
  blocks: AcademicBlock[]
): AcademicDraftSection[] {
  const result: AcademicDraftSection[] = []
  for (const section of original) {
    const index = blocks.findIndex((block, i) =>
      i > section.blockStart && i < section.blockEnd &&
      (block.kind === 'paragraph' || block.kind === 'heading') &&
      ANSWER_HEADING.test(block.text.trim())
    )
    if (index < 0) {
      result.push(section)
      continue
    }
    const first = blocks.slice(section.blockStart, index)
    const answer = blocks.slice(index, section.blockEnd)
    const safeFirstKind: DraftKind = section.kind === 'private_answer_key'
      ? 'private_answer_key' : section.kind === 'assessment' ? 'assessment' : section.kind
    result.push({
      ...section,
      kind: safeFirstKind,
      kindLabel: KIND_LABELS[safeFirstKind],
      visibility: safeFirstKind === 'assessment' || safeFirstKind === 'private_answer_key'
        ? 'staff_only' : section.visibility,
      blockEnd: index,
      blockCount: first.length,
      textCharacters: first.reduce((sum, b) => sum + (b.kind === 'image' ? 0 : b.text.length), 0),
      mediaIds: Array.from(new Set(first.filter(b => b.kind === 'image')
        .map(b => b.mediaId).filter((id): id is string => Boolean(id))))
    })
    result.push({
      ...section,
      title: 'Respuestas reservadas · ' + section.title,
      kind: 'private_answer_key',
      kindLabel: KIND_LABELS.private_answer_key,
      visibility: 'staff_only',
      blockStart: index,
      blockCount: answer.length,
      textCharacters: answer.reduce((sum, b) => sum + (b.kind === 'image' ? 0 : b.text.length), 0),
      mediaIds: Array.from(new Set(answer.filter(b => b.kind === 'image')
        .map(b => b.mediaId).filter((id): id is string => Boolean(id)))),
      suggestedReason: 'El original incluye un marcador de respuestas dentro de otra sección. Se separan de forma preventiva para no revelar el solucionario.'
    })
  }
  return result.map((s, index) => ({
    ...s,
    id: 'section-' + String(index + 1).padStart(3, '0')
  }))
}

export function buildAcademicDraft(preview: AcademicPreview): AcademicModuleDraft {
  const blocks = preview.blocks
  const sections: AcademicDraftSection[] = []
  const cover = blocks.slice(0, 45).map(b => b.text).join('\n')
  const levelNumber = inspectNumber(cover, 'NIVEL')
  const moduleNumber = inspectNumber(cover, 'M[ÓO]DULO')
  const metadataTitle = preview.sourceMetadataTitle || ''
  const metadataModuleNumber = inspectNumber(metadataTitle, 'M[ÓO]DULO')
  const metadataTitleMismatch = Boolean(
    metadataTitle && moduleNumber !== null &&
    metadataModuleNumber !== null && moduleNumber !== metadataModuleNumber
  )
  // DOCX core properties can be stale after cloning a previous module.
  // Use the metadata title ONLY if it identifies the same module number as the visible cover.
  const titleMatch = metadataModuleNumber === moduleNumber && moduleNumber !== null
    ? /m[oó]dulo\s*\d+\s*[-·:—]\s*(.+)$/i.exec(metadataTitle)
    : null
  const moduleTitle = titleMatch?.[1]?.trim()
    || (moduleNumber ? 'Módulo ' + moduleNumber + ' · título pendiente de revisión' : 'Título pendiente de revisión')

  let start = 0
  let title = 'Portada y contexto previo'
  let isPreamble = true
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index]
    if (block.kind !== 'heading' || block.level !== 1) continue
    const section = finishSection(sections.length + 1, title, start, index, blocks, isPreamble)
    if (section) sections.push(section)
    start = index
    title = block.text
    isPreamble = false
  }
  const last = finishSection(sections.length + 1, title, start, blocks.length, blocks, isPreamble)
  if (last) sections.push(last)

  const protectedSections = isolateAnswerKeys(sections, blocks)
  const isolatedKeys = protectedSections.length - sections.length
  const warnings = [
    ...(isolatedKeys ? ['PROTECCIÓN DOCENTE: se han separado ' + isolatedKeys +
      ' bloques de respuestas insertados dentro de secciones; no son lecciones del alumnado.'] : []),
    ...(metadataTitleMismatch ? ['AVISO DE IDENTIDAD: el cuerpo del Word indica Módulo ' + moduleNumber + ', pero sus metadatos internos indican Módulo ' + metadataModuleNumber + '. Revisa el archivo antes de vincularlo a un curso.'] : []),
    'Propuesta automática de estructura, no currículo aprobado. Compara el orden y las divisiones con el documento maestro.',
    'Los contenidos de evaluación y las respuestas permanecen marcados para uso docente y no se publicarán automáticamente.',
    ...preview.warnings
  ]
  if (moduleNumber === null || levelNumber === null) {
    warnings.unshift('No se ha identificado de forma segura el número de nivel o módulo: seleccionarlo manualmente en una fase posterior.')
  }
  if (preview.truncated) {
    warnings.unshift('Documento truncado por los límites de seguridad: esta propuesta no es apta para importación final.')
  }
  return {
    status: 'unapproved_local_preview',
    sourceFileName: preview.fileName,
    levelNumber,
    moduleNumber,
    moduleTitle,
    sourceMetadataTitle: metadataTitle || undefined,
    metadataTitleMismatch,
    sections: protectedSections,
    warnings,
    metrics: {
      lessonCandidates: protectedSections.filter(s => s.kind === 'lesson_candidate').length,
      staffOnly: protectedSections.filter(s => s.visibility === 'staff_only').length,
      reviewSections: protectedSections.filter(s => s.visibility === 'needs_decision').length,
      mediaPlaced: preview.media.reduce((sum, m) => sum + m.blockIndexes.length, 0),
      mediaUnassigned: Math.max(0, preview.mediaFilesInPackage - preview.media.length)
    }
  }
}
