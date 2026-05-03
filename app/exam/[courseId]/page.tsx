'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
  const courseId = params.courseId as string

  const [user, setUser] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [passed, setPassed] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData.user)

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()

      setCourse(courseData)
    }

    loadData()
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

    questions.forEach((q) => {
      if (answers[q.id] === q.correct) {
        correctAnswers++
      }
    })

    const finalScore = Math.round((correctAnswers / questions.length) * 100)
    const hasPassed = finalScore >= 70

    setScore(finalScore)
    setPassed(hasPassed)
    setSubmitted(true)

    if (user) {
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
    }
  }

  const allAnswered = questions.every((q) => answers[q.id] !== undefined)

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">

        <button
          onClick={() => router.back()}
          className="mb-8 text-sm text-green-400 hover:text-green-300"
        >
          ← Volver al curso
        </button>

        <div className="border border-green-500/30 bg-white/5 rounded-3xl p-8 shadow-2xl">
          <p className="text-green-400 uppercase tracking-[0.3em] text-sm mb-3">
            Evaluación final
          </p>

          <h1 className="text-4xl font-black mb-3">
            Examen final
          </h1>

          <p className="text-gray-400 mb-6">
            {course?.title || 'Curso GHC Academy'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="bg-black/60 border border-white/10 rounded-2xl p-4">
              <p className="text-gray-400 text-sm">Preguntas</p>
              <p className="text-2xl font-bold">{questions.length}</p>
            </div>

            <div className="bg-black/60 border border-white/10 rounded-2xl p-4">
              <p className="text-gray-400 text-sm">Aprobado mínimo</p>
              <p className="text-2xl font-bold">70%</p>
            </div>

            <div className="bg-black/60 border border-white/10 rounded-2xl p-4">
              <p className="text-gray-400 text-sm">Estado</p>
              <p className="text-2xl font-bold">
                {submitted ? (passed ? 'Aprobado' : 'Suspendido') : 'Pendiente'}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className="bg-black/70 border border-white/10 rounded-2xl p-6"
              >
                <h2 className="text-xl font-bold mb-5">
                  {index + 1}. {q.question}
                </h2>

                <div className="space-y-3">
                  {q.options.map((option, optionIndex) => {
                    const selected = answers[q.id] === optionIndex
                    const isCorrect = submitted && q.correct === optionIndex
                    const isWrong =
                      submitted &&
                      selected &&
                      q.correct !== optionIndex

                    return (
                      <button
                        key={optionIndex}
                        onClick={() => selectAnswer(q.id, optionIndex)}
                        className={`w-full text-left p-4 rounded-xl border transition ${
                          isCorrect
                            ? 'border-green-500 bg-green-500/20 text-green-300'
                            : isWrong
                            ? 'border-red-500 bg-red-500/20 text-red-300'
                            : selected
                            ? 'border-green-400 bg-green-400/10'
                            : 'border-white/10 hover:border-green-400'
                        }`}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {!submitted ? (
            <button
              disabled={!allAnswered}
              onClick={submitExam}
              className={`mt-10 w-full py-4 rounded-2xl font-black text-lg ${
                allAnswered
                  ? 'bg-green-500 text-black hover:bg-green-400'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Enviar examen
            </button>
          ) : (
            <div className="mt-10 border border-green-500/30 rounded-3xl p-8 bg-black/70 text-center">
              <p className="text-gray-400 mb-2">Resultado final</p>

              <p className="text-6xl font-black text-green-400 mb-4">
                {score}%
              </p>

              <p className="text-xl font-bold mb-6">
                {passed
                  ? 'Examen aprobado. Curso completado.'
                  : 'Examen no aprobado. Debes repetirlo.'}
              </p>

              <button
                onClick={() => router.push('/cursos')}
                className="bg-green-500 text-black px-8 py-4 rounded-2xl font-black hover:bg-green-400"
              >
                Volver a cursos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
