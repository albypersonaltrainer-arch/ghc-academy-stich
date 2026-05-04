'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const questions = [
  {
    id: 'q1',
    question: '¿Cuál es el objetivo principal de este curso?',
    options: [
      'Memorizar conceptos sin aplicarlos',
      'Comprender y aplicar conocimientos de forma práctica',
      'Ver vídeos sin evaluación',
      'Completar lecciones sin seguimiento'
    ],
    correct: 1
  },
  {
    id: 'q2',
    question: '¿Qué representa el progreso dentro de una plataforma premium?',
    options: [
      'Una decoración visual',
      'Un sistema de motivación y control del aprendizaje',
      'Un elemento sin importancia',
      'Solo una barra estética'
    ],
    correct: 1
  },
  {
    id: 'q3',
    question: '¿Qué debe ocurrir antes de considerar un curso como completado?',
    options: [
      'Ver solo la primera lección',
      'Aprobar el examen final',
      'Entrar una vez al curso',
      'Cerrar la página'
    ],
    correct: 1
  }
]

export default function ExamPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = String(params.courseId || '')

  const [user, setUser] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [passed, setPassed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData?.user || null)

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle()

      setCourse(courseData || null)
    }

    if (courseId) {
      loadData()
    }
  }, [courseId])

  const selectAnswer = (questionId: string, optionIndex: number) => {
    if (submitted) return

    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }))
  }

  const submitExam = async () => {
    let correctAnswers = 0

    questions.forEach((question) => {
      if (answers[question.id] === question.correct) {
        correctAnswers++
      }
    })

    const finalScore = Math.round((correctAnswers / questions.length) * 100)
    const hasPassed = finalScore >= 70

    setScore(finalScore)
    setPassed(hasPassed)
    setSubmitted(true)

    if (user?.id) {
      setSaving(true)

      await supabase.from('exam_attempts').insert({
        user_id: user.id,
        course_id: courseId,
        score: finalScore,
        total_questions: questions.length,
        correct_answers: correctAnswers,
        passed: hasPassed,
        answers,
        completed_at: new Date().toISOString()
      })

      setSaving(false)
    }
  }

  const allAnswered = questions.every((question) => answers[question.id] !== undefined)

  const goBackToCourse = () => {
    if (course?.slug) {
      router.push(`/cursos/${course.slug}`)
      return
    }

    router.push('/cursos')
  }

  return (
    <main className="ghc-exam-page">
      <div className="ghc-exam-wrap">
        <div className="ghc-top-actions">
          <button onClick={goBackToCourse} className="ghc-top-back">
            ← Volver al curso
          </button>

          <button onClick={() => router.push('/cursos')} className="ghc-top-back">
            Catálogo de cursos
          </button>
        </div>

        <section className="ghc-exam-panel">
          <p className="ghc-kicker">Evaluación final</p>

          <h1 className="ghc-title">Examen final</h1>

          <div className="ghc-pills">
            <span className="ghc-pill">{course?.title || 'Curso GHC Academy'}</span>
            <span className="ghc-pill">Aprobado mínimo 70%</span>
            <span className="ghc-pill">
              Estado: {submitted ? (passed ? 'Aprobado' : 'Suspendido') : 'Pendiente'}
            </span>
          </div>

          <div className="ghc-exam-stats">
            <div className="ghc-exam-stat">
              <span>Preguntas</span>
              <strong>{questions.length}</strong>
            </div>

            <div className="ghc-exam-stat">
              <span>Aprobado mínimo</span>
              <strong>70%</strong>
            </div>

            <div className="ghc-exam-stat">
              <span>Estado</span>
              <strong>{submitted ? (passed ? 'OK' : 'Repetir') : 'Pendiente'}</strong>
            </div>
          </div>

          {questions.map((question, index) => (
            <section key={question.id} className="ghc-question-card">
              <h2 className="ghc-question-title">
                {index + 1}. {question.question}
              </h2>

              <div className="ghc-options-grid">
                {question.options.map((option, optionIndex) => {
                  const selected = answers[question.id] === optionIndex
                  const correct = submitted && question.correct === optionIndex
                  const wrong = submitted && selected && question.correct !== optionIndex

                  let className = 'ghc-option'

                  if (correct) className += ' ghc-option-correct'
                  else if (wrong) className += ' ghc-option-wrong'
                  else if (selected) className += ' ghc-option-selected'

                  return (
                    <button
                      key={optionIndex}
                      onClick={() => selectAnswer(question.id, optionIndex)}
                      className={className}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}

          {!submitted ? (
            <button
              disabled={!allAnswered}
              onClick={submitExam}
              className="ghc-primary-button"
            >
              Enviar examen
            </button>
          ) : (
            <section className="ghc-result-card">
              <p className="ghc-kicker">Resultado final</p>

              <div className="ghc-result-score">{score}%</div>

              <h2>
                {passed
                  ? 'Examen aprobado. Curso completado.'
                  : 'Examen no aprobado. Debes repetirlo.'}
              </h2>

              <p>
                {saving
                  ? 'Guardando resultado...'
                  : user?.id
                    ? 'Resultado guardado en tu historial.'
                    : 'Resultado mostrado en pantalla. Cuando actives login, quedará asociado al alumno.'}
              </p>

              <button onClick={goBackToCourse} className="ghc-primary-button">
                Volver al curso
              </button>
            </section>
          )}
        </section>
      </div>
    </main>
  )
}
