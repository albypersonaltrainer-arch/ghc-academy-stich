'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type Answer = {
  id: string
  answer: string
  is_correct: boolean
  sort_order: number
}

type Question = {
  id: string
  question: string
  explanation?: string | null
  question_type: string
  sort_order: number
  exam_answers: Answer[]
}

type Exam = {
  id: string
  course_id: string
  module_id?: string | null
  exam_scope?: string | null
  title: string
  description?: string | null
  pass_score: number
  status: string
  exam_questions: Question[]
}

type Course = {
  id: string
  title: string
  slug: string
}

type Module = {
  id: string
  title: string
}

export default function ExamPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const courseId = String(params.courseId || '')
  const moduleId = searchParams.get('moduleId')

  const [user, setUser] = useState<any>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [module, setModule] = useState<Module | null>(null)
  const [exam, setExam] = useState<Exam | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0)
  const [passed, setPassed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const isModuleExam = Boolean(moduleId)

  useEffect(() => {
    const loadExam = async () => {
      try {
        setLoading(true)
        setErrorMessage('')
        setSaveMessage('')

        const { data: userData } = await supabase.auth.getUser()
        setUser(userData?.user || null)

        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title, slug')
          .eq('id', courseId)
          .maybeSingle()

        if (courseError || !courseData) {
          setErrorMessage('No se ha podido cargar el curso asociado al examen.')
          setLoading(false)
          return
        }

        setCourse(courseData as Course)

        if (moduleId) {
          const { data: moduleData } = await supabase
            .from('modules')
            .select('id, title')
            .eq('id', moduleId)
            .maybeSingle()

          setModule((moduleData as Module) || null)
        }

        let examQuery = supabase
          .from('exams')
          .select(`
            id,
            course_id,
            module_id,
            exam_scope,
            title,
            description,
            pass_score,
            status,
            exam_questions (
              id,
              question,
              explanation,
              question_type,
              sort_order,
              exam_answers (
                id,
                answer,
                is_correct,
                sort_order
              )
            )
          `)
          .eq('course_id', courseId)
          .eq('status', 'published')
          .limit(1)

        if (moduleId) {
          examQuery = examQuery
            .eq('module_id', moduleId)
            .eq('exam_scope', 'module')
        } else {
          examQuery = examQuery
            .eq('exam_scope', 'course')
            .is('module_id', null)
        }

        const { data: examData, error: examError } = await examQuery.maybeSingle()

        if (examError) {
          console.error(examError)
          setErrorMessage('No se ha podido cargar el examen.')
          setLoading(false)
          return
        }

        if (!examData) {
          setErrorMessage(
            moduleId
              ? 'Este módulo todavía no tiene un examen publicado.'
              : 'Este curso todavía no tiene un examen final publicado.'
          )
          setLoading(false)
          return
        }

        const orderedExam = normalizeExam(examData as Exam)

        if (!orderedExam.exam_questions.length) {
          setErrorMessage('Este examen no tiene preguntas todavía.')
          setLoading(false)
          return
        }

        setExam(orderedExam)
        setLoading(false)
      } catch (error) {
        console.error(error)
        setErrorMessage('Ha ocurrido un error inesperado cargando el examen.')
        setLoading(false)
      }
    }

    if (courseId) {
      loadExam()
    }
  }, [courseId, moduleId])

  const questions = useMemo(() => {
    return exam?.exam_questions || []
  }, [exam])

  const allAnswered = questions.every((question) => Boolean(answers[question.id]))
  const selectedAnswersCount = Object.keys(answers).length

  const progress =
    questions.length > 0
      ? Math.round((selectedAnswersCount / questions.length) * 100)
      : 0

  const selectAnswer = (questionId: string, answerId: string) => {
    if (submitted) return

    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerId
    }))
  }

  const savePreviewModuleCompletion = (finalScore: number) => {
    if (!courseId || !moduleId) return

    const storageKey = `ghc_preview_module_completions_${courseId}`

    const currentRaw = window.localStorage.getItem(storageKey)
    const current: Record<string, any> = currentRaw ? JSON.parse(currentRaw) : {}

    current[moduleId] = {
      course_id: courseId,
      module_id: moduleId,
      completed: true,
      final_score: finalScore,
      completed_at: new Date().toISOString()
    }

    window.localStorage.setItem(storageKey, JSON.stringify(current))
  }

  const submitExam = async () => {
    if (!exam) return

    setSaving(true)
    setSaveMessage('')

    let correct = 0

    questions.forEach((question) => {
      const selectedAnswerId = answers[question.id]
      const selectedAnswer = question.exam_answers.find(
        (answer) => answer.id === selectedAnswerId
      )

      if (selectedAnswer?.is_correct) {
        correct += 1
      }
    })

    const finalScore = Math.round((correct / questions.length) * 100)
    const hasPassed = finalScore >= exam.pass_score

    setCorrectAnswersCount(correct)
    setScore(finalScore)
    setPassed(hasPassed)
    setSubmitted(true)

    if (!user?.id) {
      if (hasPassed && isModuleExam && moduleId) {
        savePreviewModuleCompletion(finalScore)
        setSaving(false)
        setSaveMessage(
          'Examen aprobado. Módulo desbloqueado en modo preview. Cuando activemos login, esto se guardará oficialmente en Supabase.'
        )
        return
      }

      setSaving(false)
      setSaveMessage(
        hasPassed
          ? 'Resultado mostrado en pantalla. Cuando activemos login, quedará guardado oficialmente.'
          : 'Resultado mostrado en pantalla. Debes repetir el examen para aprobar.'
      )
      return
    }

    const { data: attemptData, error: attemptError } = await supabase
      .from('exam_attempts')
      .insert({
        user_id: user.id,
        course_id: courseId,
        exam_id: exam.id,
        score: finalScore,
        total_questions: questions.length,
        correct_answers: correct,
        passed: hasPassed,
        answers,
        completed_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (attemptError) {
      console.error(attemptError)
      setSaving(false)
      setSaveMessage('El resultado se calculó, pero no se pudo guardar el intento.')
      return
    }

    if (hasPassed && isModuleExam && moduleId) {
      const { error: moduleCompletionError } = await supabase
        .from('module_completions')
        .upsert(
          {
            user_id: user.id,
            course_id: courseId,
            module_id: moduleId,
            exam_id: exam.id,
            exam_attempt_id: attemptData?.id || null,
            completed: true,
            final_score: finalScore,
            completed_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,module_id'
          }
        )

      if (moduleCompletionError) {
        console.error(moduleCompletionError)
        setSaving(false)
        setSaveMessage(
          'Examen aprobado y resultado guardado, pero no se pudo registrar la finalización del módulo.'
        )
        return
      }

      setSaving(false)
      setSaveMessage('Examen aprobado. Módulo completado oficialmente.')
      return
    }

    if (hasPassed && !isModuleExam) {
      const { error: courseCompletionError } = await supabase
        .from('course_completions')
        .upsert(
          {
            user_id: user.id,
            course_id: courseId,
            exam_id: exam.id,
            exam_attempt_id: attemptData?.id || null,
            completed: true,
            final_score: finalScore,
            completed_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,course_id'
          }
        )

      if (courseCompletionError) {
        console.error(courseCompletionError)
        setSaving(false)
        setSaveMessage(
          'Examen aprobado y resultado guardado, pero no se pudo registrar la finalización oficial del curso.'
        )
        return
      }

      setSaving(false)
      setSaveMessage('Examen aprobado. Curso completado oficialmente.')
      return
    }

    setSaving(false)
    setSaveMessage(
      isModuleExam
        ? 'Resultado guardado. Módulo no aprobado, debes repetirlo.'
        : 'Resultado guardado. Examen final no aprobado, debes repetirlo.'
    )
  }

  const resetExam = () => {
    setAnswers({})
    setSubmitted(false)
    setScore(0)
    setCorrectAnswersCount(0)
    setPassed(false)
    setSaving(false)
    setSaveMessage('')
  }

  const goBackToCourse = () => {
    if (course?.slug) {
      router.push(`/cursos/${course.slug}`)
      return
    }

    router.push('/cursos')
  }

  const goToCatalog = () => {
    router.push('/cursos')
  }

  if (loading) {
    return (
      <main className="ghc-center-page">
        <div className="ghc-loading-box">Cargando examen...</div>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main className="ghc-center-page">
        <div className="ghc-error-box">
          <h1>Error de examen</h1>
          <p>{errorMessage}</p>

          <button onClick={goToCatalog} className="ghc-primary-button">
            Volver a cursos
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="ghc-exam-page">
      <div className="ghc-exam-wrap">
        <div className="ghc-top-actions">
          <button onClick={goBackToCourse} className="ghc-top-back">
            ← Volver al curso
          </button>

          <button onClick={goToCatalog} className="ghc-top-back">
            Catálogo de cursos
          </button>
        </div>

        <section className="ghc-exam-panel">
          <p className="ghc-kicker">
            {isModuleExam ? 'Evaluación del módulo' : 'Evaluación final'}
          </p>

          <h1 className="ghc-title">
            {exam?.title || (isModuleExam ? 'Examen del módulo' : 'Examen final')}
          </h1>

          {exam?.description && (
            <p className="ghc-exam-description">
              {exam.description}
            </p>
          )}

          <div className="ghc-pills">
            <span className="ghc-pill">{course?.title || 'Curso GHC Academy'}</span>

            {module && (
              <span className="ghc-pill">
                Módulo: {module.title}
              </span>
            )}

            <span className="ghc-pill">Aprobado mínimo {exam?.pass_score || 70}%</span>

            <span className="ghc-pill">
              Estado: {submitted ? (passed ? 'Aprobado' : 'Suspendido') : 'Pendiente'}
            </span>

            <span className="ghc-pill">
              Progreso examen {progress}%
            </span>
          </div>

          <div className="ghc-exam-stats">
            <div className="ghc-exam-stat">
              <span>Preguntas</span>
              <strong>{questions.length}</strong>
            </div>

            <div className="ghc-exam-stat">
              <span>Respondidas</span>
              <strong>{selectedAnswersCount}/{questions.length}</strong>
            </div>

            <div className="ghc-exam-stat">
              <span>Aprobado mínimo</span>
              <strong>{exam?.pass_score || 70}%</strong>
            </div>
          </div>

          <div className="ghc-progress-card">
            <div className="ghc-progress-top">
              <span>Progreso del examen</span>
              <strong>{progress}%</strong>
            </div>

            <div className="ghc-progress-track">
              <div className="ghc-progress-fill" style={{ width: `${progress}%` }} />
            </div>

            <p className="ghc-progress-small">
              {selectedAnswersCount} de {questions.length} preguntas respondidas
            </p>
          </div>

          {questions.map((question, index) => (
            <section key={question.id} className="ghc-question-card">
              <h2 className="ghc-question-title">
                {index + 1}. {question.question}
              </h2>

              <div className="ghc-options-grid">
                {question.exam_answers.map((answer) => {
                  const selected = answers[question.id] === answer.id
                  const correct = submitted && answer.is_correct
                  const wrong = submitted && selected && !answer.is_correct

                  let className = 'ghc-option'

                  if (correct) className += ' ghc-option-correct'
                  else if (wrong) className += ' ghc-option-wrong'
                  else if (selected) className += ' ghc-option-selected'

                  return (
                    <button
                      key={answer.id}
                      onClick={() => selectAnswer(question.id, answer.id)}
                      className={className}
                    >
                      {answer.answer}
                    </button>
                  )
                })}
              </div>

              {submitted && question.explanation && (
                <div className="ghc-question-explanation">
                  <strong>Explicación:</strong> {question.explanation}
                </div>
              )}
            </section>
          ))}

          {!submitted ? (
            <button
              disabled={!allAnswered || saving}
              onClick={submitExam}
              className="ghc-primary-button"
            >
              {allAnswered
                ? saving
                  ? 'Guardando resultado...'
                  : 'Enviar examen'
                : `Responde todas las preguntas (${selectedAnswersCount}/${questions.length})`}
            </button>
          ) : (
            <section className="ghc-result-card">
              <p className="ghc-kicker">Resultado</p>

              <div className="ghc-result-score">{score}%</div>

              <h2>
                {passed
                  ? isModuleExam
                    ? 'Examen aprobado. Módulo completado.'
                    : 'Examen aprobado. Curso completado.'
                  : 'Examen no aprobado. Debes repetirlo.'}
              </h2>

              <p>
                Has acertado {correctAnswersCount} de {questions.length} preguntas.
              </p>

              <p>
                {saving ? 'Guardando resultado...' : saveMessage}
              </p>

              <div className="ghc-result-actions">
                {!passed && (
                  <button onClick={resetExam} className="ghc-top-back">
                    Repetir examen
                  </button>
                )}

                <button onClick={goBackToCourse} className="ghc-primary-button">
                  Volver al curso
                </button>
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  )
}

function normalizeExam(exam: Exam): Exam {
  const orderedQuestions = [...(exam.exam_questions || [])]
    .map((question) => ({
      ...question,
      exam_answers: [...(question.exam_answers || [])].sort(sortByOrder)
    }))
    .sort(sortByOrder)

  return {
    ...exam,
    exam_questions: orderedQuestions
  }
}

function sortByOrder(a: { sort_order?: number }, b: { sort_order?: number }) {
  const aOrder = Number(a.sort_order ?? 999)
  const bOrder = Number(b.sort_order ?? 999)

  return aOrder - bOrder
}
