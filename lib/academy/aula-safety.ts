import type { AulaModel, AulaSection } from './aula-model-types'

// Shared fail-closed validation for classroom JSON and original embedded media.
// Staff-only materials must never be reachable via either private preview endpoint.
const SAFE_KINDS: AulaSection['kind'][] = [
  'lesson_candidate', 'orientation', 'practice', 'glossary', 'references'
]
const RESERVED_TITLE = /autoevaluaci[oó]n|evaluaci[oó]n|examen|respuestas|solucionario|clave de respuestas|answer key|r[uú]brica|guion|gui[oó]n|script|v[ií]deo|video/i
const RESERVED_BLOCK = /(?:^|\s)(?:RESPUESTAS\s*:|SOLUCIONARIO\s*:|CLAVE DE RESPUESTAS)/i

export function isSafePrivateAula(model: AulaModel | null): model is AulaModel {
  return Boolean(model &&
    model.staff_only_content_included === false &&
    model.publication_allowed === false &&
    model.academic_approval === false &&
    Array.isArray(model.sections) &&
    model.sections.length > 0 && model.sections.length <= 80 &&
    model.sections.every(section =>
      typeof section.title === 'string' &&
      SAFE_KINDS.includes(section.kind) &&
      !RESERVED_TITLE.test(section.title) &&
      Array.isArray(section.blocks) &&
      section.blocks.length > 0 && section.blocks.length <= 1800 &&
      section.blocks.every(block => typeof block.text === 'string' && !RESERVED_BLOCK.test(block.text))
    )
  )
}
export function isAulaVisibleImage(model: AulaModel, relationId: string) {
  return model.sections.some(section =>
    section.blocks.some(block => block.kind === 'image' && block.mediaId === relationId)
  )
}
