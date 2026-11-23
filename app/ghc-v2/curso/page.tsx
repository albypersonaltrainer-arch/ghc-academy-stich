'use client'

/**
 * Experiencia académica V2: conectada SOLO A LECTURAS protegidas.
 * El trabajo real de evaluación/guardado debe activarse más adelante
 * tras revisión del 80 % estricto en Supabase y aprobación humana.
 * No contiene textos ni solucionarios académicos en el repositorio.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import GHCLogoBase from '../../components/GHCLogoBase'
import {
  allV2QuestionsAnswered, deriveV2AcademicState
} from '../../../lib/academy/v2-academic-flow'
import type {
  V2Exam, V2ExamQuestion, V2Experience
} from '../../../lib/academy/v2-academic-flow'
import styles from '../../ghc-control-center/aula-modelo/aula.module.css'

// CIERRE DE SEGURIDAD: no habilitar hasta aprobar migración, ensayo E2E
// con matrícula de prueba y permiso explícito del propietario.
const V2_ACADEMIC_WRITES_APPROVED = false

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type Course = {
  id: string
  title: string
  slug: string
  next_action_lesson_id?: string | null
}

type Status = 'loading' | 'ready' | 'login' | 'empty' | 'error'
type ExamKind = 'lesson' | 'module'

export default function CursoAlumnoV2() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [course, setCourse] = useState<Course | null>(null)
  const [experience, setExperience] = useState<V2Experience | null>(null)
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({ lesson: {}, module: {} })
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      setStatus('loading')
      setError('')
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        setStatus('login')
        return
      }
      const { data: rawCourses, error: courseError } = await supabase.rpc('ghc_student_get_my_courses')
      if (courseError) throw new Error(courseError.message)
      if (!Array.isArray(rawCourses) || !rawCourses.length) {
        setStatus('empty')
        return
      }
      const items = rawCourses as Course[]
      setCourses(items)
      const params = new URLSearchParams(window.location.search)
      const selected = items.find(item => item.slug === params.get('curso')) || items[0]
      setCourse(selected)
      const lessonId = params.get('leccion') || selected.next_action_lesson_id
      if (!lessonId) {
        setStatus('empty')
        return
      }
      const { data, error: experienceError } = await supabase.rpc('ghc_student_get_lesson_experience', {
        p_course_slug: selected.slug,
        p_lesson_id: lessonId
      })
      if (experienceError) throw new Error(experienceError.message)
      setExperience(data as V2Experience)
      setAnswers({ lesson: {}, module: {} })
      setStatus('ready')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo recuperar la experiencia académica.')
      setStatus('error')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const academic = useMemo(() => deriveV2AcademicState(experience), [experience])

  const openLesson = (lessonId: string) => {
    if (!course) return
    const url = '/ghc-v2/curso?curso=' + encodeURIComponent(course.slug) +
      '&leccion=' + encodeURIComponent(lessonId)
    window.location.assign(url)
  }

  async function submitRealExam(kind: ExamKind) {
    if (!V2_ACADEMIC_WRITES_APPROVED) {
      setNotice('La evaluación oficial todavía no está activada en V2. No se ha registrado ningún intento.')
      return
    }
    const exam = kind === 'lesson' ? experience?.lesson_exam : experience?.module_exam
    if (!exam?.id || !allV2QuestionsAnswered(exam.questions || [], answers[kind] || {})) return
    const { error: submitError } = await supabase.rpc('ghc_student_submit_learning_exam', {
      p_exam_id: exam.id,
      p_answers: answers[kind]
    })
    if (submitError) {
      setNotice(submitError.message)
      return
    }
    await load()
  }

  async function saveRealProgress() {
    if (!V2_ACADEMIC_WRITES_APPROVED) {
      setNotice('El guardado oficial de progreso todavía no está activado en V2.')
      return
    }
    if (!academic.canCompleteLesson || !experience?.lesson?.id) return
    const { error: saveError } = await supabase.rpc('ghc_student_complete_lesson', {
      p_lesson_id: experience.lesson.id
    })
    if (saveError) {
      setNotice(saveError.message)
      return
    }
    await load()
  }

  function renderExam(exam: V2Exam | null | undefined, kind: ExamKind) {
    if (!exam) return null
    const questions = exam.questions || []
    const canAttempt = kind === 'lesson' ? academic.canAttemptLessonExam : academic.canAttemptModuleExam
    const selection = answers[kind] || {}
    const allAnswered = allV2QuestionsAnswered(questions, selection)
    const attempted = exam.latest_attempt?.passed === true

    return (
      <article className={styles.lesson} key={kind}>
        <div className={styles.lessonHeader}>
          <span className={styles.chapterMark}>
            {kind === 'lesson' ? 'EVALUACIÓN DE LECCIÓN' : 'EVALUACIÓN DE MÓDULO'}
          </span>
          <h2>{exam.title}</h2>
          <p>Calificación y desbloqueos autorizados exclusivamente por el servidor.
            El umbral académico será del 80 %, pendiente de validar en Supabase.</p>
        </div>
        {attempted && <div className={styles.feedback} role="status">Evaluación previamente superada según el registro del servidor.</div>}
        {!canAttempt && !attempted && (
          <div className={styles.feedback} role="status">
            Evaluación aún bloqueada o sin intentos disponibles. No se mostrarán soluciones reservadas.
          </div>
        )}
        {canAttempt && questions.map((question: V2ExamQuestion, i: number) => (
          <fieldset className={styles.question} key={question.id}>
            <legend><span>{String(i + 1).padStart(2, '0')}</span>{question.question}</legend>
            {question.options.map(option => (
              <label key={option.value} className={styles.quizOption}>
                <input type="radio" name={kind + '-' + question.id}
                  checked={selection[question.id] === option.value}
                  disabled={!V2_ACADEMIC_WRITES_APPROVED}
                  onChange={() => setAnswers(prev => ({
                    ...prev,
                    [kind]: { ...prev[kind], [question.id]: option.value }
                  }))} />
                <span>{option.text}</span>
              </label>
            ))}
          </fieldset>
        ))}
        <div className={styles.lessonBottom}>
          <button type="button" className={styles.primaryButton}
            disabled={!V2_ACADEMIC_WRITES_APPROVED || !canAttempt || !allAnswered}
            onClick={() => { void submitRealExam(kind) }}>
            {V2_ACADEMIC_WRITES_APPROVED ? 'Enviar evaluación oficial' : 'Evaluación oficial pendiente de activar'}
          </button>
        </div>
      </article>
    )
  }

  if (status !== 'ready' || !academic.allowed || !experience) {
    return (
      <main className={styles.loading}>
        <GHCLogoBase size="md" />
        <h1>{status === 'loading' ? 'Preparando aula V2' :
          status === 'login' ? 'Acceso académico protegido' :
          status === 'empty' ? 'No hay una lección disponible' :
          status === 'error' ? 'No se puede abrir el aula' : 'Contenido restringido'}</h1>
        <p>{error || experience?.reason ||
          (status === 'login'
            ? 'Inicia sesión con una cuenta que disponga de acceso académico.'
            : 'La plataforma solo muestra lecciones autorizadas por el servidor.')}</p>
        {status === 'login' && <a href="/acceso">Iniciar sesión</a>}
        {status !== 'login' && <button type="button" className={styles.secondaryButton} onClick={() => { void load() }}>Volver a comprobar</button>}
      </main>
    )
  }

  const module = experience.module
  const lesson = experience.lesson
  const percentage = Math.min(100, Math.max(0, Number(experience.progress?.percent || 0)))
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <GHCLogoBase size="sm" />
        <div className={styles.topRight}>
          <span className={styles.topMeta}>SPORT THROUGH SCIENCE</span>
          <span className={styles.privateTag}>V2 · AULA AUTENTICADA · SOLO LECTURA</span>
        </div>
      </header>
      <div className={styles.breadcrumb}>
        GHC Academy <span>›</span> {course?.title || experience.course?.title}
        <span>›</span> {module?.title}
      </div>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>EXPERIENCIA ACADÉMICA V2</span>
          <h1>{lesson?.title || 'Lección'} <span>{module?.title}</span></h1>
          <p>Consulta protegida de contenido y progreso reales. Hasta la validación del 80 % en servidor,
            esta versión no permite guardar notas ni completar módulos.</p>
        </div>
        <div className={styles.heroMetric}>
          <span>Progreso del servidor</span><strong>{percentage}%</strong>
          <div className={styles.progressTrack}><span style={{ width: percentage + '%' }} /></div>
          <small>Progreso leído desde la matrícula, sin modificaciones.</small>
        </div>
      </section>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>
            <strong>Ruta formativa</strong>
            <small>{courses.length} programas accesibles en esta cuenta</small>
          </div>
          <nav className={styles.navigation} aria-label="Itinerario autorizado">
            {(experience.modules || []).flatMap((entry, i) =>
              (entry.lessons || []).map(lessonItem => (
                <button key={lessonItem.id} type="button"
                  disabled={!lessonItem.accessible && !lessonItem.completed}
                  className={[styles.navButton, lessonItem.id === lesson?.id ? styles.activeNav : ''].filter(Boolean).join(' ')}
                  onClick={() => openLesson(lessonItem.id)}>
                  <span className={styles.navNumber}>{lessonItem.completed ? '✓' : String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.navLabel}>
                    <small>{entry.title}</small><strong>{lessonItem.title}</strong>
                  </span>
                </button>
              ))
            )}
          </nav>
          <div className={styles.sideNote}>Los bloqueos y desbloqueos provienen del estado de acceso devuelto por Supabase.</div>
        </aside>
        <section className={styles.main}>
          <article className={styles.lesson}>
            <div className={styles.lessonHeader}>
              <span className={styles.chapterMark}>LECCIÓN · CONTENIDO PROTEGIDO</span>
              <h2>{lesson?.title}</h2>
              <p>Texto obtenido de una lección autorizada, no de material incorporado al repositorio público.</p>
            </div>
            <div className={styles.reading}>
              {typeof lesson?.content === 'string' && lesson.content.trim()
                ? <p className={styles.prose}>{lesson.content}</p>
                : <p className={styles.prose}>El contenido íntegro del Word todavía no está incorporado a esta lección.</p>}
            </div>
            {notice && <div className={styles.feedback} role="status">{notice}</div>}
            <div className={styles.lessonBottom}>
              <button type="button" className={styles.primaryButton}
                disabled={!V2_ACADEMIC_WRITES_APPROVED || !academic.canCompleteLesson}
                onClick={() => { void saveRealProgress() }}>
                {V2_ACADEMIC_WRITES_APPROVED ? 'Guardar lección completada' : 'Guardado oficial pendiente de activar'}
              </button>
            </div>
          </article>
          {renderExam(experience.lesson_exam, 'lesson')}
          {renderExam(experience.module_exam, 'module')}
          <article className={styles.lesson}>
            <div className={styles.lessonHeader}>
              <span className={styles.chapterMark}>PROGRESO Y DESBLOQUEO</span>
              <h2>{academic.nextModuleUnlocked ? 'Siguiente módulo disponible' : 'Siguiente módulo todavía bloqueado'}</h2>
              <p>Esta decisión se basa en la finalización y accesibilidad confirmadas por el servidor,
                no en respuestas o porcentajes calculados en el navegador.</p>
            </div>
            <button className={styles.secondaryButton} type="button"
              disabled={!academic.nextModuleUnlocked || !academic.nextLessonId}
              onClick={() => { if (academic.nextLessonId) openLesson(academic.nextLessonId) }}>
              Ir al siguiente módulo
            </button>
          </article>
        </section>
      </div>
      <footer className={styles.footer}>
        <span>GHC ACADEMY · SPORT THROUGH SCIENCE</span>
        <p>Vista privada de V2, solo lectura hasta autorización. La página pública de seguimiento utiliza datos ficticios.</p>
      </footer>
    </main>
  )
}
