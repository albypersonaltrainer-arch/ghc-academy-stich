/**
 * Criterio académico GHC para pruebas de opción única.
 * Esta función es pura: NO registra calificaciones, NO autoriza
 * desbloqueos y NO acredita identidad. En exámenes reales,
 * invocarla exclusivamente en el servidor con respuestas privadas.
 */
export const GHC_PASS_PERCENT = 80 as const

export type SingleChoiceQuestion = {
  choices: readonly string[]
  answer: number
}

export type AssessmentScore = {
  correct: number
  total: number
  percentage: number
  completed: boolean
  passed: boolean
}

export function scoreSingleChoice(
  questions: readonly SingleChoiceQuestion[],
  answers: Readonly<Record<number, number>>
): AssessmentScore {
  const total = questions.length
  const completed = total > 0 && questions.every((question, i) =>
    Number.isInteger(question.answer) &&
    question.answer >= 0 && question.answer < question.choices.length &&
    Number.isInteger(answers[i]) &&
    answers[i] >= 0 && answers[i] < question.choices.length
  )
  const correct = questions.reduce((sum, question, i) =>
    sum + (Number.isInteger(answers[i]) &&
      question.answer >= 0 && question.answer < question.choices.length &&
      answers[i] === question.answer ? 1 : 0), 0)
  const percentage = total > 0 ? Math.round(correct * 1000 / total) / 10 : 0

  // La aprobación compara enteros, sin errores de redondeo.
  const passed = completed && correct * 100 >= GHC_PASS_PERCENT * total
  return { correct, total, percentage, completed, passed }
}
