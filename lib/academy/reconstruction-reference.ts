import type { AcademicPreview } from './import-preview'
import type { AcademicModuleDraft } from './draft-plan'

// Only a source fingerprint and audit expectations are stored in the public
// repository. The actual Word and teaching materials remain private.
export const RECONSTRUCTED_M1_REFERENCE = Object.freeze({
  sha256: '8dc645921abfe0fa3ef756d0e56dd9f60f84ace16a33ea42f7756e2112d0c4cf',
  bytes: 73729,
  format: 'DOCX',
  level: 1,
  module: 1,
  heading1: 31,
  heading2: 82,
  heading3: 23,
  tables: 12,
  mediaFilesInPackage: 0,
  title: 'La profesión del entrenador personal',
  documentName: 'GHC_ACADEMY_MODULO_1_RECONSTRUCCION_ACADEMICA_2026.docx'
})

export type ReconstructionAudit = {
  matchesReference: boolean
  complete: boolean
  observed: {
    headings1: number
    headings2: number
    headings3: number
    tables: number
    blocks: number
    sections: number
    staffOnly: number
    answerKeys: number
    assessments: number
    videoScripts: number
  }
  errors: string[]
}

export function checkReconstructedModuleOne(
  preview: AcademicPreview,
  draft: AcademicModuleDraft
): ReconstructionAudit {
  const matchesReference =
    preview.sourceSha256 === RECONSTRUCTED_M1_REFERENCE.sha256
  const levelCount = (level: number) =>
    preview.blocks.filter(b => b.kind === 'heading' && b.level === level).length
  const observed = {
    headings1: levelCount(1),
    headings2: levelCount(2),
    headings3: levelCount(3),
    tables: preview.stats.tables,
    blocks: preview.blocks.length,
    sections: draft.sections.length,
    staffOnly: draft.sections.filter(s => s.visibility === 'staff_only').length,
    answerKeys: draft.sections.filter(s => s.kind === 'private_answer_key').length,
    assessments: draft.sections.filter(s => s.kind === 'assessment').length,
    videoScripts: draft.sections.filter(s => s.kind === 'video_script').length
  }
  if (!matchesReference) return { matchesReference: false, complete: false, observed, errors: [] }

  const errors: string[] = []
  const expect = (ok: boolean, message: string) => { if (!ok) errors.push(message) }
  expect(preview.format === 'DOCX', 'FORMATO_DISTINTO')
  expect(!preview.truncated, 'EXTRACCION_TRUNCADA')
  expect(draft.levelNumber === 1 && draft.moduleNumber === 1, 'IDENTIDAD_DISTINTA')
  expect(!draft.metadataTitleMismatch, 'METADATOS_CONFLICTIVOS')
  expect(observed.headings1 === RECONSTRUCTED_M1_REFERENCE.heading1, 'ENCABEZADOS_1_INCOMPLETOS')
  expect(observed.headings2 === RECONSTRUCTED_M1_REFERENCE.heading2, 'ENCABEZADOS_2_INCOMPLETOS')
  expect(observed.headings3 === RECONSTRUCTED_M1_REFERENCE.heading3, 'ENCABEZADOS_3_INCOMPLETOS')
  expect(observed.tables === RECONSTRUCTED_M1_REFERENCE.tables, 'TABLAS_INCOMPLETAS')
  expect(preview.mediaFilesInPackage === 0, 'RECURSOS_INESPERADOS')
  expect(observed.sections >= 31, 'SECCIONES_INCOMPLETAS')
  expect(observed.staffOnly >= 3, 'MATERIALES_DOCENTES_SIN_SEPARAR')
  expect(observed.answerKeys >= 1, 'RESPUESTAS_NO_PROTEGIDAS')
  expect(observed.assessments >= 2, 'EVALUACIONES_NO_PROTEGIDAS')
  expect(observed.videoScripts >= 1, 'GUION_NO_IDENTIFICADO')
  expect(draft.sections.reduce((sum, s) => sum + s.blockCount, 0) ===
    preview.blocks.length, 'BLOQUES_FUERA_DE_SECCION')
  return { matchesReference, complete: errors.length === 0, observed, errors }
}
