import type { AcademicPreview } from './import-preview'
import { buildAcademicDraft } from './draft-plan.ts'
import { resolveCurriculumModule } from './curriculum-map.ts'

export type CourseSnapshot = { id: string; slug: string; status: string }
export type ModuleSnapshot = {
  id: string
  course_id: string | null
  title: string
  position: number | null
  sort_order: number | null
}

export type PreviewDatabaseSnapshot = {
  courses: CourseSnapshot[]
  modules: ModuleSnapshot[]
  readComplete: boolean
}

export function simulateAcademicImport(
  preview: AcademicPreview,
  snapshot: PreviewDatabaseSnapshot | null
) {
  const draft = buildAcademicDraft(preview)
  const target = resolveCurriculumModule(draft.moduleNumber)
  const checks: string[] = []
  const warnings: string[] = []

  if (!target) checks.push('No hay un número de módulo válido dentro del programa oficial 1–30.')
  if (target && draft.levelNumber !== target.level) {
    checks.push('El nivel indicado en la portada no coincide con el número de módulo oficial.')
  }
  if (preview.format !== 'DOCX') checks.push('La importación estructural solo está prevista para Word DOCX.')
  if (preview.truncated) checks.push('El documento fue truncado durante la extracción.')
  if (draft.metadataTitleMismatch) checks.push('Los metadatos y la portada del Word no coinciden.')
  if (draft.metrics.mediaUnassigned) {
    checks.push('Hay ' + draft.metrics.mediaUnassigned + ' archivos multimedia sin ubicar y revisar.')
  }
  if (!snapshot || !snapshot.readComplete) {
    checks.push('No se ha verificado completamente el inventario actual de cursos y módulos.')
  }

  let course: CourseSnapshot | null = null
  let positionConflicts: ModuleSnapshot[] = []
  if (target && snapshot?.readComplete) {
    course = snapshot.courses.find(c => c.slug === target.courseSlug) || null
    if (!course) checks.push('El curso de destino no se ha encontrado en Supabase.')
    if (course && course.status !== 'draft') {
      checks.push('El curso de destino no está en estado borrador.')
    }
    if (course) {
      positionConflicts = snapshot.modules.filter(m => m.course_id === course!.id
        && (m.position ?? m.sort_order) === target.position)
      if (positionConflicts.length) checks.push(
        'La posición ' + target.position + ' ya está ocupada por ' +
        positionConflicts.length + ' módulo(s) en el campus. No se debe sobrescribir.'
      )
    }
  }

  const studentCandidates = draft.sections.filter(s => s.kind === 'lesson_candidate')
  const staffOnly = draft.sections.filter(s => s.visibility === 'staff_only')
  const otherContent = draft.sections.filter(s => s.visibility === 'needs_decision')

  if (!studentCandidates.length) {
    checks.push('No se han detectado lecciones candidatas; requiere estructura editorial.')
  }
  if (staffOnly.length) warnings.push(
    'Hay ' + staffOnly.length + ' secciones de evaluación o respuestas que deben quedar fuera de las lecciones públicas.'
  )
  if (otherContent.length) warnings.push(
    'Hay ' + otherContent.length + ' secciones complementarias cuya ubicación requiere decisión editorial.'
  )
  if (draft.metrics.mediaPlaced) warnings.push(
    'Las figuras necesitan rutas privadas, revisión de texto alternativo y asignación explícita antes de publicar.'
  )

  return {
    status: 'simulation_only' as const,
    writesPerformed: false as const,
    automaticPublicationAllowed: false as const,
    sourceSha256: preview.sourceSha256,
    target,
    destination: course ? { courseId: course.id, courseSlug: course.slug, courseStatus: course.status } : null,
    candidateLessonTitles: studentCandidates.map(s => s.title),
    reservedSections: staffOnly.map(s => s.title),
    supplementarySections: otherContent.map(s => s.title),
    positionConflicts: positionConflicts.map(m => ({ id: m.id, title: m.title, position: m.position ?? m.sort_order })),
    blockers: checks,
    warnings,
    nextStep: 'Revisar el borrador editorial, resolver conflictos y aprobar un área privada de staging antes de cualquier importación.',
    readyToWrite: false as const
  }
}
