'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../components/GHCLogo'
import styles from './FinalExamV2.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type Option = { id?: string | null; label: string; text: string; sort_order?: number | null }
type Question = {
  id: string
  question: string
  question_type?: string | null
  difficulty?: string | null
  evaluated_objective?: string | null
  options: Option[]
}
type Exam = {
  id: string
  course_id: string
  title: string
  description?: string | null
  pass_percentage?: number | null
  attempts_mode?: string | null
  max_attempts?: number | null
}
type Payload = {
  exam?: Exam | null
  questions?: Question[]
  unlocked?: boolean
  module_count?: number
  completed_module_count?: number
  attempt_count?: number
  best_score?: number | null
  has_passed?: boolean
  certificate?: Record<string, any> | null
}

type Result = {
  score: number
  passed: boolean
  correct_answers: number
  total_questions: number
  pass_percentage: number
  attempt_number: number
  certificate?: Record<string, any> | null
}

function shuffled<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function attemptsLabel(payload: Payload) {
  const exam = payload.exam
  const used = Number(payload.attempt_count || 0)
  const max = Number(exam?.max_attempts || 0)

  if (exam?.attempts_mode === 'limited' && max > 0) {
    return `${used} de ${max} intentos utilizados`
  }
  return used > 0 ? `${used} intento${used === 1 ? '' : 's'} registrado${used === 1 ? '' : 's'}` : 'Sin intentos registrados'
}

export default function FinalExamV2() {
  const router = useRouter()
  const [courseId, setCourseId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<Payload | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const moduleId = params.get('moduleId')
    const id = String(params.get('courseId') || '').trim()

    if (moduleId) {
      router.replace('/alumno')
      return
    }

    setCourseId(id)
  }, [router])

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!courseId) {
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('courseId')) {
          setError('No se encontró el curso del examen final.')
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        setError('')

        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) {
          router.replace('/acceso')
          return
        }

        const { data, error: rpcError } = await supabase.rpc('ghc_student_get_published_course_exam', {
          p_course_id: courseId
        })

        if (rpcError) throw new Error(rpcError.message)
        if (!active) return

        setPayload((data || {}) as Payload)
      } catch (loadError: any) {
        if (active) setError(loadError?.message || 'No se pudo cargar el examen final.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [courseId, router])

  const questions = useMemo(() => {
    return (payload?.questions || []).map((question) => ({
      ...question,
      options: shuffled(question.options || [])
    }))
  }, [payload?.exam?.id])

  const answered = Object.keys(answers).length
  const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0
  const allAnswered = questions.length > 0 && questions.every((question) => Boolean(answers[question.id]))
  const exam = payload?.exam || null
  const max = Number(exam?.max_attempts || 0)
  const used = Number(payload?.attempt_count || 0)
  const exhausted = Boolean(exam?.attempts_mode === 'limited' && max > 0 && used >= max && !payload?.has_passed)

  const submit = async () => {
    if (!exam?.id || !allAnswered) return

    try {
      setSaving(true)
      setError('')
      const { data, error: rpcError } = await supabase.rpc('ghc_student_submit_course_exam', {
        p_exam_id: exam.id,
        p_answers: answers
      })
      if (rpcError) throw new Error(rpcError.message)
      setResult(data as Result)

      const { data: refreshed } = await supabase.rpc('ghc_student_get_published_course_exam', {
        p_course_id: courseId
      })
      if (refreshed) setPayload(refreshed as Payload)
    } catch (submitError: any) {
      setError(submitError?.message || 'No se pudo guardar el examen final.')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setAnswers({})
    setResult(null)
    setError('')
  }

  const certificate = result?.certificate || payload?.certificate || null

  if (loading) {
    return (
      <main className={styles.page}>
        <header className={styles.topbar}><GHCLogo size="md" showText tagline={false} /></header>
        <section className={styles.statePage}>
          <div className={styles.stateCard}>
            <p className={styles.eyebrow}>Evaluación final</p>
            <h1>Preparando tu examen</h1>
            <p>Comprobando matrícula, módulos superados e intentos registrados.</p>
          </div>
        </section>
      </main>
    )
  }

  if (!payload?.unlocked && !payload?.has_passed) {
    return (
      <main className={styles.page}>
        <header className={styles.topbar}>
          <GHCLogo size="md" showText tagline={false} />
          <button className={styles.ghostButton} type="button" onClick={() => router.push('/alumno')}>Mi área</button>
        </header>
        <section className={styles.statePage}>
          <div className={styles.stateCard}>
            <p className={styles.eyebrow}>Evaluación final</p>
            <h1>Todavía no está desbloqueada</h1>
            <p>El examen final aparece únicamente cuando has completado y superado todos los módulos del curso.</p>
            <div className={styles.lockProgress}>
              <strong>{Number(payload?.completed_module_count || 0)} / {Number(payload?.module_count || 0)}</strong>
              <span>Módulos superados</span>
            </div>
            {error && <div className={styles.noticeError} style={{ marginTop: 16 }}>{error}</div>}
            <button className={styles.primaryButton} type="button" onClick={() => router.push('/alumno')} style={{ marginTop: 18 }}>
              Continuar formación
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (error && !exam && !payload?.has_passed) {
    return (
      <main className={styles.page}>
        <header className={styles.topbar}><GHCLogo size="md" showText tagline={false} /></header>
        <section className={styles.statePage}>
          <div className={styles.stateCard}>
            <p className={styles.eyebrow}>Evaluación final</p>
            <h1>No se puede abrir el examen</h1>
            <p>{error}</p>
            <button className={styles.primaryButton} type="button" onClick={() => router.push('/alumno')} style={{ marginTop: 18 }}>Volver a mi área</button>
          </div>
        </section>
      </main>
    )
  }

  if (result || payload?.has_passed) {
    const score = Number(result?.score ?? payload?.best_score ?? 0)
    const passed = Boolean(result?.passed ?? payload?.has_passed)
    return (
      <main className={styles.page}>
        <header className={styles.topbar}>
          <GHCLogo size="md" showText tagline={false} />
          <button className={styles.ghostButton} type="button" onClick={() => router.push('/alumno')}>Mi área</button>
        </header>
        <div className={styles.shell}>
          <section className={styles.resultCard}>
            <p className={styles.eyebrow}>Resultado guardado</p>
            <h1>{passed ? 'Examen final superado' : 'Aún no has alcanzado el mínimo'}</h1>
            <strong className={styles.score}>{score}%</strong>
            <p>{passed ? 'El resultado se ha validado en servidor y la finalización del curso queda registrada.' : 'Tu intento se ha guardado. Revisa el contenido antes de volver a intentarlo.'}</p>
            {error && <div className={styles.noticeError}>{error}</div>}
            <div className={styles.resultActions}>
              {!passed && !exhausted && <button className={styles.primaryButton} type="button" onClick={reset}>Repetir examen</button>}
              {passed && certificate?.verification_slug && (
                <button className={styles.primaryButton} type="button" onClick={() => router.push(`/certificados/${certificate.verification_slug}`)}>
                  Ver certificado
                </button>
              )}
              <button className={styles.secondaryButton} type="button" onClick={() => router.push('/alumno')}>Volver a mi área</button>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <GHCLogo size="md" showText tagline={false} />
        <button className={styles.ghostButton} type="button" onClick={() => router.push('/alumno')}>Salir del examen</button>
      </header>

      <div className={styles.shell}>
        <section className={styles.examCard}>
          <header className={styles.examHeader}>
            <p className={styles.eyebrow}>Evaluación final del curso</p>
            <h1>{exam?.title || 'Examen final'}</h1>
            {exam?.description && <p>{exam.description}</p>}
            <div className={styles.examMeta}>
              <span className={styles.pill}>Mínimo {Number(exam?.pass_percentage || 70)}%</span>
              <span className={styles.pill}>{questions.length} preguntas</span>
              <span className={styles.pill}>{attemptsLabel(payload)}</span>
            </div>
            <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${progress}%` }} /></div>
          </header>

          {error && <div className={styles.noticeError}>{error}</div>}
          {exhausted && <div className={styles.noticeInfo}>Has agotado los intentos configurados para este examen.</div>}

          {questions.map((question, index) => (
            <section className={styles.question} key={question.id}>
              <h2>{index + 1}. {question.question}</h2>
              <div className={styles.options}>
                {(question.options || []).map((option) => {
                  const selected = answers[question.id] === option.label
                  return (
                    <button
                      key={`${question.id}-${option.label}-${option.text}`}
                      type="button"
                      className={selected ? styles.optionSelected : styles.option}
                      disabled={saving || exhausted}
                      onClick={() => setAnswers((previous) => ({ ...previous, [question.id]: option.label }))}
                    >
                      <span className={styles.optionDot} aria-hidden="true" />
                      <span>{option.text}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}

          <footer className={styles.examFooter}>
            <span>{answered} de {questions.length} preguntas respondidas</span>
            <button className={styles.primaryButton} type="button" onClick={submit} disabled={!allAnswered || saving || exhausted}>
              {saving ? 'Guardando…' : 'Enviar examen final'}
            </button>
          </footer>
        </section>
      </div>
    </main>
  )
}
