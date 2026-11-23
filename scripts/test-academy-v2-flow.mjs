import assert from 'node:assert/strict'
import test from 'node:test'
import {
  deriveV2AcademicState, allV2QuestionsAnswered, passesExactThreshold
} from '../lib/academy/v2-academic-flow.ts'

const question = {
  id: 'question-1', question: 'Pregunta de ejemplo',
  options: [{ value: 'A', text: 'Opción A' }, { value: 'B', text: 'Opción B' }]
}
const exam = {
  id: 'exam-one', title: 'Evaluación de ejemplo', questions: [question],
  block_advance: true
}
const experience = {
  allowed: true,
  module: { id: 'mod-1', title: 'Módulo inicial', completed: false },
  lesson: { id: 'lesson-1', title: 'Lección inicial', completed: false },
  modules: [
    { id: 'mod-1', title: 'Módulo inicial', lessons: [{ id: 'lesson-1', title: 'Lección', accessible: true }] },
    { id: 'mod-2', title: 'Módulo siguiente', lessons: [{ id: 'lesson-2', title: 'Siguiente', accessible: false }] }
  ],
  lesson_exam: exam,
  module_exam: { ...exam, id: 'exam-module', unlocked: false }
}

test('bloqueo por defecto cuando faltan identidad académica o acceso', () => {
  assert.equal(deriveV2AcademicState(null).allowed, false)
  assert.equal(deriveV2AcademicState({ ...experience, allowed: false }).canCompleteLesson, false)
  assert.equal(deriveV2AcademicState({ ...experience, lesson: undefined }).canAttemptModuleExam, false)
})

test('lección con evaluación obligatoria no se completa antes de aprobarla', () => {
  const result = deriveV2AcademicState(experience)
  assert.equal(result.lessonExamRequired, true)
  assert.equal(result.canCompleteLesson, false)
  assert.equal(result.canAttemptLessonExam, true)
  assert.equal(result.canAttemptModuleExam, false)
})

test('evaluación de módulo solo se habilita tras desbloqueo del servidor', () => {
  const ready = deriveV2AcademicState({
    ...experience, module_exam: { ...experience.module_exam, unlocked: true }
  })
  assert.equal(ready.canAttemptModuleExam, true)
  const exhausted = deriveV2AcademicState({
    ...experience, module_exam: {
      ...experience.module_exam, unlocked: true,
      attempts_mode: 'limited', max_attempts: 1, attempt_count: 1
    }
  })
  assert.equal(exhausted.canAttemptModuleExam, false)
})

test('siguiente módulo exige finalización y permiso del servidor', () => {
  const before = deriveV2AcademicState({
    ...experience, module: { ...experience.module, completed: true }
  })
  assert.equal(before.nextModuleUnlocked, false)
  const verified = deriveV2AcademicState({
    ...experience, module: { ...experience.module, completed: true },
    modules: [
      experience.modules[0],
      { ...experience.modules[1], lessons: [
        { ...experience.modules[1].lessons[0], accessible: true }
      ] }
    ]
  })
  assert.equal(verified.nextModuleUnlocked, true)
  assert.equal(verified.nextLessonId, 'lesson-2')
})

test('respuestas deben existir dentro de las opciones públicas válidas', () => {
  assert.equal(allV2QuestionsAnswered([question], {}), false)
  assert.equal(allV2QuestionsAnswered([question], { 'question-1': 'Z' }), false)
  assert.equal(allV2QuestionsAnswered([question], { 'question-1': 'B' }), true)
})

test('80 por ciento exacto, sin aprobación por redondeo de 79.5', () => {
  assert.equal(passesExactThreshold(4, 5), true)
  assert.equal(passesExactThreshold(159, 200), false)
  assert.equal(passesExactThreshold(160, 200), true)
  assert.equal(passesExactThreshold(0, 0), false)
})
