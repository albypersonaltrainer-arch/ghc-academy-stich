'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../../components/GHCLogo'
import LessonStreamingPlayer from './LessonStreamingPlayer'
import styles from './LessonExperience.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const COURSE_ASSETS_BUCKET = 'ghc-course-assets'

type AnyRecord = Record<string, any>
type ExamKind = 'lesson' | 'module'

type Option = {
  value: string
  text: string
}

type Question = {
  id: string
  question: string
  question_type?: string | null
  sort_order?: number | null
  options: Option[]
}

type Exam = {
  id: string
  title: string
  description?: string | null
  pass_percentage?: number | null
  attempts_mode?: string | null
  max_attempts?: number | null
  attempt_count?: number | null
  block_advance?: boolean | null
  unlocked?: boolean | null
  latest_attempt?: AnyRecord | null
  questions?: Question[]
}

type LessonNav = {
  id: string
  title: string
  content_type?: string | null
  duration_minutes?: number | null
  completed?: boolean
  accessible?: boolean
}

type ModuleNav = {
  id: string
  title: string
  description?: string | null
  completed?: boolean
  lessons: LessonNav[]
}

type Experience = {
  allowed: boolean
  reason?: string | null
  redirect_lesson_id?: string | null
  course?: AnyRecord
  module?: AnyRecord
  lesson?: AnyRecord
  modules?: ModuleNav[]
  progress?: AnyRecord
  lesson_exam?: Exam | null
  module_exam?: Exam | null
}

type Notice = {
  type: 'success' | 'error' | 'info'
  text: string
} | null

function routeParam(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || '')
  return String(value || '')
}

function assetPath(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return raw.replace(/^\/+/, '')
}

function shuffled<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function decorateManualUrl(url: string) {
  if (!url) return ''
  return `${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`
}

function contentTypeLabel(value: unknown) {
  const type = String(value || '').toLowerCase()
  if (type.includes('video')) return 'Vídeo'
  if (type.includes('audio')) return 'Audio'
  if (type.includes('pdf') || type.includes('document')) return 'Manual'
  if (type.includes('mixt') || type.includes('mixed')) return 'Clase mixta'
  return 'Lección'
}

function attemptLabel(exam?: Exam | null) {
  if (!exam) return ''
  const max = Number(exam.max_attempts || 0)
  const used = Number(exam.attempt_count || 0)

  if (exam.attempts_mode === 'limited' && max > 0) {
    return `${used} de ${max} intentos utilizados`
  }

  if (used > 0) return `${used} intento${used === 1 ? '' : 's'} registrado${used === 1 ? '' : 's'}`
  return 'Sin intentos registrados'
}

export default function LessonExperience() {
  const params = useParams()
  const router = useRouter()

  const slug = routeParam(params?.slug)
  const lessonId = routeParam(params?.lessonId)

  const [experience, setExperience] = useState<Experience | null>(null)
  const [loading, setLoading] = useState(true)
  const [fatalError, setFatalError] = useState('')
  const [notice, setNotice] = useState<Notice>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [answers, setAnswers] = useState<Record<ExamKind, Record<string, string>>>(
    { lesson: {}, module: {} }
  )
  const [videoUrl, setVideoUrl] = useState('')
  const [streamingAvailable, setStreamingAvailable] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState('')
  const [manualFullscreen, setManualFullscreen] = useState(false)

  const loadPrivateAsset = useCallback(async (value: unknown) => {
    const raw = assetPath(value)
    if (!raw) return ''
    if (/^https?:\/\//i.test(raw)) return raw

    const { data, error } = await supabase.storage
      .from(COURSE_ASSETS_BUCKET)
      .createSignedUrl(raw, 60 * 10)

    if (error || !data?.signedUrl) return ''
    return data.signedUrl
  }, [])

  const loadExperience = useCallback(async () => {
    if (!slug || !lessonId) return

    try {
      setLoading(true)
      setFatalError('')

      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase.rpc('ghc_student_get_lesson_experience', {
        p_course_slug: slug,
        p_lesson_id: lessonId
      })

      if (error) {
        throw new Error(error.message || 'No se pudo cargar la lección.')
      }

      const nextExperience = data as Experience

      if (!nextExperience?.allowed) {
        const redirectLessonId = String(nextExperience?.redirect_lesson_id || '')
        if (redirectLessonId && redirectLessonId !== lessonId) {
          setNotice({
            type: 'info',
            text: nextExperience?.reason || 'Continúa desde la lección que tienes pendiente.'
          })
          router.replace(`/cursos/${slug}/${redirectLessonId}`)
          return
        }

        setFatalError(nextExperience?.reason || 'Esta lección todavía está bloqueada.')
        return
      }

      setExperience(nextExperience)
      setAnswers({ lesson: {}, module: {} })
      setStreamingAvailable(false)

      const [nextVideoUrl, nextAudioUrl] = await Promise.all([
        loadPrivateAsset(nextExperience?.lesson?.video_path),
        loadPrivateAsset(nextExperience?.lesson?.audio_path)
      ])

      setVideoUrl(nextVideoUrl)
      setAudioUrl(nextAudioUrl)
    } catch (error: any) {
      setFatalError(error?.message || 'No se pudo cargar la experiencia de aprendizaje.')
    } finally {
      setLoading(false)
    }
  }, [lessonId, loadPrivateAsset, router, slug])

  useEffect(() => {
    loadExperience()
  }, [loadExperience])

  useEffect(() => {
    let active = true
    let objectUrl = ''

    const loadManual = async () => {
      setManualUrl('')
      setManualError('')

      if (!experience?.lesson?.manual_path || !experience?.lesson?.id || !experience?.course?.slug) {
        setManualLoading(false)
        return
      }

      try {
        setManualLoading(true)
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token || ''
        if (!token) throw new Error('La sesión ha caducado.')

        const query = new URLSearchParams({
          courseSlug: String(experience.course.slug),
          lessonId: String(experience.lesson.id)
        })

        const response = await fetch(`/api/academy/manual?${query.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || 'No se pudo abrir el Manual.')
        }

        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        if (active) setManualUrl(objectUrl)
      } catch (error: any) {
        if (active) setManualError(error?.message || 'No se pudo abrir el Manual.')
      } finally {
        if (active) setManualLoading(false)
      }
    }

    loadManual()

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [experience?.course?.slug, experience?.lesson?.id, experience?.lesson?.manual_path])

  const lessonQuestions = useMemo(() => {
    const questions = experience?.lesson_exam?.questions || []
    return questions.map((question) => ({
      ...question,
      options: shuffled(question.options || [])
    }))
  }, [experience?.lesson?.id, experience?.lesson_exam?.id])

  const moduleQuestions = useMemo(() => {
    const questions = experience?.module_exam?.questions || []
    return questions.map((question) => ({
      ...question,
      options: shuffled(question.options || [])
    }))
  }, [experience?.module?.id, experience?.module_exam?.id, experience?.module_exam?.unlocked])

  const allLessons = useMemo(() => {
    const result: Array<LessonNav & { moduleId: string; moduleTitle: string; moduleIndex: number; lessonIndex: number }> = []

    ;(experience?.modules || []).forEach((module, moduleIndex) => {
      ;(module.lessons || []).forEach((lesson, lessonIndex) => {
        result.push({
          ...lesson,
          moduleId: module.id,
          moduleTitle: module.title,
          moduleIndex,
          lessonIndex
        })
      })
    })

    return result
  }, [experience?.modules])

  const currentIndex = allLessons.findIndex((lesson) => String(lesson.id) === lessonId)
  const previousLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null
  const currentLessonNav = currentIndex >= 0 ? allLessons[currentIndex] : null

  const currentModuleLessons = useMemo(
    () => (experience?.modules || []).find((module) => module.id === experience?.module?.id)?.lessons || [],
    [experience?.module?.id, experience?.modules]
  )

  const moduleCompletedLessons = currentModuleLessons.filter((lesson) => lesson.completed).length
  const moduleTotalLessons = currentModuleLessons.length

  const lessonExam = experience?.lesson_exam || null
  const moduleExam = experience?.module_exam || null
  const lessonHasExam = Boolean(lessonExam && lessonQuestions.length > 0)
  const lessonCompleted = Boolean(experience?.lesson?.completed)
  const lessonPassed = Boolean(lessonExam?.latest_attempt?.passed)
  const modulePassed = Boolean(moduleExam?.latest_attempt?.passed || experience?.module?.completed)
  const moduleExamUnlocked = Boolean(moduleExam?.unlocked)

  const goToLesson = (lesson: LessonNav | null) => {
    if (!lesson?.id) return
    if (!lesson.accessible && !lesson.completed) {
      setNotice({ type: 'info', text: 'Completa el paso anterior antes de abrir esta lección.' })
      return
    }

    setNavOpen(false)
    router.push(`/cursos/${slug}/${lesson.id}`)
  }

  const selectAnswer = (kind: ExamKind, questionId: string, value: string) => {
    setAnswers((previous) => ({
      ...previous,
      [kind]: {
        ...previous[kind],
        [questionId]: value
      }
    }))
  }

  const submitExam = async (kind: ExamKind) => {
    const exam = kind === 'lesson' ? lessonExam : moduleExam
    const questions = kind === 'lesson' ? lessonQuestions : moduleQuestions
    if (!exam?.id || !questions.length) return

    const selected = answers[kind]
    if (!questions.every((question) => Boolean(selected[question.id]))) {
      setNotice({ type: 'error', text: 'Responde todas las preguntas antes de enviar la evaluación.' })
      return
    }

    try {
      setSaving(true)
      setNotice({ type: 'info', text: 'Guardando y corrigiendo la evaluación de forma segura…' })

      const { data, error } = await supabase.rpc('ghc_student_submit_learning_exam', {
        p_exam_id: exam.id,
        p_answers: selected
      })

      if (error) throw new Error(error.message || 'No se pudo guardar la evaluación.')

      const score = Number(data?.score || 0)
      const passed = Boolean(data?.passed)

      setNotice({
        type: passed ? 'success' : 'error',
        text: passed
          ? kind === 'lesson'
            ? `Evaluación superada con ${score}%. La lección ha quedado completada y guardada.`
            : `Examen de módulo superado con ${score}%. El siguiente módulo ya puede desbloquearse.`
          : `Resultado guardado: ${score}%. Aún no alcanzas el mínimo para superar esta evaluación.`
      })

      await loadExperience()
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No se pudo guardar la evaluación.' })
    } finally {
      setSaving(false)
    }
  }

  const completeLesson = async () => {
    if (!experience?.lesson?.id || lessonHasExam) return

    try {
      setSaving(true)
      setNotice({ type: 'info', text: 'Guardando tu progreso…' })
      const { error } = await supabase.rpc('ghc_student_complete_lesson', {
        p_lesson_id: experience.lesson.id
      })

      if (error) throw new Error(error.message || 'No se pudo completar la lección.')

      setNotice({ type: 'success', text: 'Lección completada. Tu progreso se ha guardado.' })
      await loadExperience()
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No se pudo completar la lección.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading && !experience) {
    return (
      <main className={styles.loadingPage}>
        <section className={styles.stateCard}>
          <GHCLogo size="md" showText tagline={false} />
          <h1>Preparando tu lección</h1>
          <p>Comprobando progreso, acceso y material de estudio.</p>
        </section>
      </main>
    )
  }

  if (fatalError || !experience?.allowed) {
    return (
      <main className={styles.errorPage}>
        <section className={styles.stateCard}>
          <GHCLogo size="md" showText tagline={false} />
          <h1>Esta lección no está disponible</h1>
          <p>{fatalError || experience?.reason || 'Continúa desde el punto que tienes pendiente.'}</p>
          <button className={styles.primaryButton} onClick={() => router.push(`/cursos/${slug}`)}>
            Volver a mi curso
          </button>
        </section>
      </main>
    )
  }

  const renderExam = (kind: ExamKind, exam: Exam, questions: Question[]) => {
    const selected = answers[kind]
    const latest = exam.latest_attempt
    const passed = Boolean(latest?.passed)
    const maxAttempts = Number(exam.max_attempts || 0)
    const attemptCount = Number(exam.attempt_count || 0)
    const attemptsExhausted = exam.attempts_mode === 'limited' && maxAttempts > 0 && attemptCount >= maxAttempts && !passed

    return (
      <section className={styles.examCard}>
        <div className={styles.examTop}>
          <div>
            <p className={styles.eyebrow}>{kind === 'lesson' ? 'Cierre de lección' : 'Hito del módulo'}</p>
            <h2>{exam.title}</h2>
            <p>{exam.description || 'Comprueba lo aprendido antes de continuar.'}</p>
          </div>
          <span className={passed ? styles.successPill : styles.statusPill}>
            {passed ? `Superado · ${Number(latest?.score || 0)}%` : `Mínimo ${Number(exam.pass_percentage || 70)}%`}
          </span>
        </div>

        {passed ? (
          <div className={styles.noticeSuccess}>
            Resultado guardado correctamente. Puedes revisar esta lección cuando quieras sin perder el progreso.
          </div>
        ) : (
          <>
            {questions.map((question, index) => (
              <div className={styles.question} key={question.id}>
                <h3>{index + 1}. {question.question}</h3>
                <div className={styles.options}>
                  {(question.options || []).map((option) => {
                    const isSelected = selected[question.id] === option.value
                    return (
                      <button
                        key={`${question.id}-${option.value}-${option.text}`}
                        type="button"
                        className={isSelected ? styles.optionSelected : styles.option}
                        onClick={() => selectAnswer(kind, question.id, option.value)}
                        disabled={saving || attemptsExhausted}
                      >
                        <span className={styles.optionDot} aria-hidden="true" />
                        <span>{option.text}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className={styles.examFooter}>
              <span>{attemptLabel(exam)}</span>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => submitExam(kind)}
                disabled={saving || attemptsExhausted || !questions.length}
              >
                {saving ? 'Guardando…' : attemptsExhausted ? 'Sin intentos disponibles' : 'Enviar evaluación'}
              </button>
            </div>
          </>
        )}
      </section>
    )
  }

  return (
    <main className={styles.page}>
      {navOpen && <button className={styles.mobileDrawerBackdrop} aria-label="Cerrar menú" onClick={() => setNavOpen(false)} />}

      <aside className={navOpen ? styles.desktopSidebarOpen : styles.desktopSidebar}>
        <div className={styles.sidebarHeader}>
          <GHCLogo size="md" showText tagline={false} />
          <h2>{experience.course?.title || 'GHC Academy'}</h2>
          <div className={styles.progressRow}>
            <span>Tu avance</span>
            <strong>{Number(experience.progress?.percent || 0)}%</strong>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${Number(experience.progress?.percent || 0)}%` }} />
          </div>
        </div>

        <nav className={styles.moduleList} aria-label="Contenido del curso">
          {(experience.modules || []).map((module, moduleIndex) => {
            const done = (module.lessons || []).filter((lesson) => lesson.completed).length
            return (
              <section className={styles.moduleBlock} key={module.id}>
                <div className={styles.moduleHead}>
                  <div>
                    <span>Módulo {moduleIndex + 1}</span>
                    <strong>{module.title}</strong>
                  </div>
                  <em>{module.completed ? '✓' : `${done}/${module.lessons.length}`}</em>
                </div>

                {(module.lessons || []).map((lesson, lessonIndex) => {
                  const active = lesson.id === experience.lesson?.id
                  const locked = !lesson.accessible && !lesson.completed
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      disabled={locked}
                      onClick={() => goToLesson(lesson)}
                      className={active ? styles.lessonLinkActive : styles.lessonLink}
                    >
                      <span className={styles.lessonState}>{lesson.completed ? '✓' : locked ? '×' : active ? '•' : ''}</span>
                      <span className={styles.lessonText}>
                        <small>{moduleIndex + 1}.{lessonIndex + 1}</small>
                        <strong>{lesson.title}</strong>
                      </span>
                    </button>
                  )
                })}
              </section>
            )
          })}
        </nav>
      </aside>

      <section className={styles.shell}>
        <header className={styles.topbar}>
          <button className={styles.mobileMenuButton} type="button" onClick={() => setNavOpen(true)} aria-label="Abrir contenido del curso">
            ☰
          </button>
          <div className={styles.topbarTitle}>
            <small>{experience.module?.title || 'Módulo'}</small>
            <strong>{experience.lesson?.title || 'Lección'}</strong>
          </div>
          <button className={styles.ghostButton} type="button" onClick={() => router.push(`/cursos/${slug}`)}>
            Mi curso
          </button>
        </header>

        <div className={styles.main}>
          <header className={styles.lessonHeader}>
            <p className={styles.eyebrow}>
              {currentLessonNav ? `Módulo ${currentLessonNav.moduleIndex + 1} · Lección ${currentLessonNav.lessonIndex + 1}` : 'Lección'}
            </p>
            <h1>{experience.lesson?.title || 'Lección GHC Academy'}</h1>
            <div className={styles.lessonMeta}>
              <span>{contentTypeLabel(experience.lesson?.content_type)}</span>
              {Number(experience.lesson?.duration_minutes || 0) > 0 && <span>{Number(experience.lesson?.duration_minutes)} min</span>}
              <span>{Number(experience.progress?.completed_lessons || 0)} de {Number(experience.progress?.total_lessons || 0)} lecciones completadas</span>
            </div>
          </header>

          <section className={styles.focusCard}>
            <div>
              <p>Tu siguiente acción</p>
              <strong>
                {lessonCompleted
                  ? moduleExam && moduleExamUnlocked && !modulePassed
                    ? 'Supera el examen del módulo para continuar.'
                    : nextLesson
                      ? 'Continúa con la siguiente lección.'
                      : 'Has completado este bloque.'
                  : lessonHasExam
                    ? 'Estudia el contenido y supera la evaluación de la lección.'
                    : 'Estudia el contenido y finaliza la lección.'}
              </strong>
            </div>
            <span className={lessonCompleted ? styles.successPill : styles.statusPill}>
              {lessonCompleted ? 'Lección completada' : 'En curso'}
            </span>
          </section>

          <section className={styles.contentCard}>
            <div className={styles.contentToolbar}>
              <div>
                <strong>{contentTypeLabel(experience.lesson?.content_type)}</strong>
                <span>Material de estudio de esta lección</span>
              </div>
              {manualUrl && (
                <button className={styles.secondaryButton} type="button" onClick={() => setManualFullscreen(true)}>
                  Pantalla completa
                </button>
              )}
            </div>

            <div className={styles.viewer}>
              <LessonStreamingPlayer
                lessonId={lessonId}
                title={String(experience.lesson?.title || 'GHC Academy')}
                fallbackUrl={videoUrl}
                onAvailabilityChange={setStreamingAvailable}
              />

              {audioUrl && (
                <div className={styles.audioStage}>
                  <div className={styles.audioPanel}>
                    <div className={styles.audioMark}>GHC</div>
                    <div>
                      <strong>{experience.lesson?.title}</strong>
                      <audio controls preload="metadata" src={audioUrl} />
                    </div>
                  </div>
                </div>
              )}

              {experience.lesson?.manual_path && manualLoading && <div className={styles.viewerLoading}>Preparando el Manual…</div>}
              {experience.lesson?.manual_path && manualError && <div className={styles.viewerError}>{manualError}</div>}
              {manualUrl && (
                <iframe
                  className={styles.manualFrame}
                  src={decorateManualUrl(manualUrl)}
                  title={`Manual · ${experience.lesson?.title || 'GHC Academy'}`}
                />
              )}

              {experience.lesson?.content && (
                <article className={styles.textContent} dangerouslySetInnerHTML={{ __html: String(experience.lesson.content) }} />
              )}

              {!streamingAvailable && !videoUrl && !audioUrl && !experience.lesson?.manual_path && !experience.lesson?.content && (
                <div className={styles.emptyContent}>Esta lección todavía no tiene material visible.</div>
              )}
            </div>
          </section>

          {notice && (
            <div className={notice.type === 'success' ? styles.noticeSuccess : notice.type === 'error' ? styles.noticeError : styles.noticeInfo}>
              {notice.text}
            </div>
          )}

          {lessonHasExam && lessonExam && renderExam('lesson', lessonExam, lessonQuestions)}

          {!lessonHasExam && !lessonCompleted && (
            <section className={styles.milestoneCard}>
              <p className={styles.eyebrow}>Cierre de lección</p>
              <h2>¿Has terminado este contenido?</h2>
              <p>Finaliza la lección para guardar el progreso y desbloquear el siguiente paso.</p>
              <button className={styles.primaryButton} type="button" onClick={completeLesson} disabled={saving} style={{ marginTop: 16 }}>
                {saving ? 'Guardando…' : 'Finalizar lección'}
              </button>
            </section>
          )}

          {moduleExam && moduleExamUnlocked && !modulePassed && renderExam('module', moduleExam, moduleQuestions)}

          {moduleExam && !moduleExamUnlocked && (
            <section className={styles.milestoneCard}>
              <p className={styles.eyebrow}>Examen de módulo</p>
              <h2>Se desbloquea al terminar el módulo</h2>
              <p>{moduleCompletedLessons} de {moduleTotalLessons} lecciones completadas. Cuando completes todas, el examen aparecerá aquí.</p>
            </section>
          )}

          {moduleExam && modulePassed && (
            <section className={styles.milestoneCard}>
              <p className={styles.eyebrow}>Módulo completado</p>
              <h2>Hito superado</h2>
              <p>Tu examen de módulo está aprobado y registrado. Ya puedes continuar con el siguiente bloque.</p>
            </section>
          )}

          <nav className={styles.navigationCard} aria-label="Navegación entre lecciones">
            {previousLesson ? (
              <button className={styles.navButton} type="button" onClick={() => goToLesson(previousLesson)}>
                <span>← Anterior</span>
                <strong>{previousLesson.title}</strong>
              </button>
            ) : (
              <button className={styles.navButtonDisabled} type="button" disabled>
                <span>Inicio del curso</span>
                <strong>Primera lección</strong>
              </button>
            )}

            {nextLesson ? (
              <button
                className={nextLesson.accessible || nextLesson.completed ? styles.navButton : styles.navButtonDisabled}
                type="button"
                disabled={!nextLesson.accessible && !nextLesson.completed}
                onClick={() => goToLesson(nextLesson)}
              >
                <span>Siguiente →</span>
                <strong>{nextLesson.accessible || nextLesson.completed ? nextLesson.title : 'Completa el paso actual para continuar'}</strong>
              </button>
            ) : (
              <button className={styles.navButtonDisabled} type="button" disabled>
                <span>Final del curso</span>
                <strong>No hay más lecciones</strong>
              </button>
            )}
          </nav>
        </div>
      </section>

      {manualFullscreen && manualUrl && (
        <div className={styles.manualFullscreen} role="dialog" aria-modal="true">
          <div className={styles.fullscreenBar}>
            <strong>Manual · {experience.lesson?.title}</strong>
            <button className={styles.secondaryButton} type="button" onClick={() => setManualFullscreen(false)}>
              Cerrar
            </button>
          </div>
          <iframe src={decorateManualUrl(manualUrl)} title={`Manual a pantalla completa · ${experience.lesson?.title || 'GHC Academy'}`} />
        </div>
      )}
    </main>
  )
}
