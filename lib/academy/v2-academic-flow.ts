/**
 * Adaptador de solo lectura para el flujo académico V2.
 * Su resultado gobierna la PRESENTACIÓN; los permisos definitivos, el
 * cálculo de notas y el desbloqueo solo pueden concederse en servidor.
 * No incorpora soluciones de exámenes.
 */
export type V2ExamOption = { value: string; text: string }
export type V2ExamQuestion = {
  id: string
  question: string
  options: V2ExamOption[]
}
export type V2Exam = {
  id: string
  title: string
  pass_percentage?: number | null
  attempts_mode?: string | null
  max_attempts?: number | null
  attempt_count?: number | null
  block_advance?: boolean | null
  unlocked?: boolean | null
  latest_attempt?: { passed?: boolean; score?: number } | null
  questions?: V2ExamQuestion[]
}
export type V2Lesson = {
  id: string
  title: string
  content?: string | null
  completed?: boolean
  accessible?: boolean
}
export type V2Module = {
  id: string
  title: string
  completed?: boolean
  lessons: V2Lesson[]
}
export type V2Experience = {
  allowed: boolean
  reason?: string | null
  course?: { id: string; slug: string; title: string }
  module?: { id: string; title: string; completed?: boolean }
  lesson?: V2Lesson
  modules?: V2Module[]
  progress?: { percent?: number; completed_lessons?: number; total_lessons?: number }
  lesson_exam?: V2Exam | null
  module_exam?: V2Exam | null
}
export type V2AcademicState = {
  allowed: boolean
  lessonCompleted: boolean
  moduleCompleted: boolean
  lessonExamPassed: boolean
  lessonExamRequired: boolean
  canCompleteLesson: boolean
  canAttemptLessonExam: boolean
  canAttemptModuleExam: boolean
  moduleExamUnlocked: boolean
  nextModuleUnlocked: boolean
  nextLessonId: string | null
}

function validQuestions(exam: V2Exam | null | undefined) {
  return Boolean(exam && Array.isArray(exam.questions) && exam.questions.length > 0 &&
    exam.questions.every(q =>
      Boolean(q.id && q.question && Array.isArray(q.options) && q.options.length >= 2) &&
      q.options.every(o => Boolean(o.value && o.text))
    ))
}

function exhausted(exam: V2Exam | null | undefined) {
  if (!exam || exam.attempts_mode !== 'limited') return false
  const max = Number(exam.max_attempts)
  return Number.isFinite(max) && max > 0 && Number(exam.attempt_count || 0) >= max
}

export function allV2QuestionsAnswered(
  questions: readonly V2ExamQuestion[],
  answers: Readonly<Record<string, string>>
) {
  return questions.length > 0 && questions.every(question =>
    Boolean(question.id && question.options.some(option => option.value === answers[question.id]))
  )
}

export function deriveV2AcademicState(experience: V2Experience | null): V2AcademicState {
  const denied: V2AcademicState = {
    allowed: false, lessonCompleted: false, moduleCompleted: false,
    lessonExamPassed: false, lessonExamRequired: false, canCompleteLesson: false,
    canAttemptLessonExam: false, canAttemptModuleExam: false,
    moduleExamUnlocked: false, nextModuleUnlocked: false, nextLessonId: null
  }
  if (!experience?.allowed || !experience.lesson?.id || !experience.module?.id) return denied

  const lessonCompleted = experience.lesson.completed === true
  const moduleCompleted = experience.module.completed === true
  const lessonExam = experience.lesson_exam
  const moduleExam = experience.module_exam
  const lessonExamRequired = validQuestions(lessonExam) &&
    lessonExam?.block_advance !== false
  const lessonExamPassed = lessonExam?.latest_attempt?.passed === true
  const moduleExamUnlocked = Boolean(moduleExam?.unlocked && validQuestions(moduleExam))
  const canCompleteLesson = !lessonCompleted && (!lessonExamRequired || lessonExamPassed)
  const canAttemptLessonExam = Boolean(
    validQuestions(lessonExam) && !lessonExamPassed && !exhausted(lessonExam)
  )
  const canAttemptModuleExam = Boolean(
    moduleExamUnlocked && !moduleCompleted && !exhausted(moduleExam)
  )

  // Solo aceptar desbloqueos informados por los RPCs, nunca el porcentaje
  // calculado en el navegador ni el mero envío de un cuestionario.
  const modules = experience.modules || []
  const index = modules.findIndex(module => module.id === experience.module?.id)
  const nextModule = index < 0 ? undefined : modules[index + 1]
  const nextLesson = nextModule?.lessons.find(lesson => lesson.accessible === true)
  const nextModuleUnlocked = Boolean(moduleCompleted && nextLesson?.id)

  return {
    allowed: true, lessonCompleted, moduleCompleted, lessonExamPassed,
    lessonExamRequired, canCompleteLesson, canAttemptLessonExam,
    canAttemptModuleExam, moduleExamUnlocked, nextModuleUnlocked,
    nextLessonId: nextModuleUnlocked ? nextLesson?.id || null : null
  }
}

// Política exacta para auditar resultados recibidos del servidor.
// La nota oficial se registra exclusivamente en la base de datos.
export function passesExactThreshold(correct: number, total: number, passPercent = 80) {
  return Number.isInteger(correct) && Number.isInteger(total) &&
    total > 0 && correct >= 0 && correct <= total &&
    Number.isFinite(passPercent) && passPercent > 0 && passPercent <= 100 &&
    correct * 100 >= total * passPercent
}
