'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type AnyRecord = Record<string, any>

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()

  const slug = String(params.slug || '')
  const lessonId = String(params.lessonId || '')

  const [user, setUser] = useState<any>(null)
  const [course, setCourse] = useState<AnyRecord | null>(null)
  const [modules, setModules] = useState<AnyRecord[]>([])
  const [currentLesson, setCurrentLesson] = useState<AnyRecord | null>(null)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadLessonPage = async () => {
      try {
        setLoading(true)
        setErrorMessage('')

        const { data: userData } = await supabase.auth.getUser()
        setUser(userData?.user || null)

        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('slug', slug)
          .maybeSingle()

        if (courseError || !courseData) {
          setErrorMessage('No se ha podido cargar el curso.')
          setLoading(false)
          return
        }

        setCourse(courseData)

        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*, lessons(*)')
          .eq('course_id', courseData.id)

        if (modulesError) {
          setErrorMessage('No se han podido cargar los módulos del curso.')
          setLoading(false)
          return
        }

        const orderedModules = (modulesData || [])
          .map((module: AnyRecord) => ({
            ...module,
            lessons: [...(module.lessons || [])].sort(sortLessons)
          }))
          .sort(sortItems)

        setModules(orderedModules)

        const lessons = orderedModules.flatMap((module: AnyRecord) => module.lessons || [])
        const activeLesson = lessons.find((lesson: AnyRecord) => String(lesson.id) === lessonId)

        if (!activeLesson) {
          setErrorMessage('No se ha encontrado esta lección.')
          setLoading(false)
          return
        }

        setCurrentLesson(activeLesson)

        if (userData?.user?.id) {
          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', userData.user.id)
            .eq('course_id', courseData.id)
            .eq('completed', true)

          setCompletedLessons((progressData || []).map((item: AnyRecord) => String(item.lesson_id)))
        }

        setLoading(false)
      } catch (error) {
        console.error(error)
        setErrorMessage('Ha ocurrido un error inesperado al cargar la lección.')
        setLoading(false)
      }
    }

    if (slug && lessonId) {
      loadLessonPage()
    }
  }, [slug, lessonId])

  const allLessons = useMemo(() => {
    return modules.flatMap((module: AnyRecord) => module.lessons || [])
  }, [modules])

  const currentIndex = allLessons.findIndex((lesson: AnyRecord) => String(lesson.id) === lessonId)
  const previousLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null

  const isLastLesson = allLessons.length > 0 && currentIndex === allLessons.length - 1

  const progress =
    allLessons.length > 0
      ? Math.round((completedLessons.length / allLessons.length) * 100)
      : 0

  const goToLesson = (id: string) => {
    router.push(`/cursos/${slug}/${id}`)
  }

  const goToExam = () => {
    if (!course?.id) return
    router.push(`/exam/${course.id}`)
  }

  const markAsCompleted = async () => {
    if (!user?.id) {
      alert('Para guardar tu progreso real, primero debes iniciar sesión.')
      return
    }

    if (!course?.id || !currentLesson?.id) return

    const { error } = await supabase.from('lesson_progress').upsert(
      {
        user_id: user.id,
        course_id: course.id,
        module_id: currentLesson.module_id || null,
        lesson_id: currentLesson.id,
        completed: true,
        completed_at: new Date().toISOString(),
        last_opened_at: new Date().toISOString()
      },
      { onConflict: 'user_id,lesson_id' }
    )

    if (error) {
      console.error(error)
      alert('No se pudo guardar el progreso.')
      return
    }

    setCompletedLessons((prev) =>
      prev.includes(String(currentLesson.id))
        ? prev
        : [...prev, String(currentLesson.id)]
    )
  }

  const renderContent = () => {
    if (!currentLesson) return null

    const type = getLessonType(currentLesson)

    const textContent =
      currentLesson.content ||
      currentLesson.body ||
      currentLesson.text ||
      currentLesson.description ||
      ''

    const videoUrl =
      currentLesson.video_url ||
      currentLesson.video ||
      currentLesson.url ||
      (type === 'video' ? currentLesson.content : '')

    const audioUrl =
      currentLesson.audio_url ||
      currentLesson.audio ||
      (type === 'audio' ? currentLesson.content : '')

    const pdfUrl =
      currentLesson.pdf_url ||
      currentLesson.pdf ||
      currentLesson.file_url ||
      (type === 'pdf' ? currentLesson.content : '')

    const isMixed = type === 'mixed' || type === 'mixto'

    return (
      <div className="ghc-content-stack">
        {(type === 'video' || isMixed) && videoUrl && (
          <section className="ghc-content-card">
            <p className="ghc-content-label">Vídeo de la lección</p>
            <video src={videoUrl} controls className="ghc-video" />
          </section>
        )}

        {(type === 'audio' || isMixed) && audioUrl && (
          <section className="ghc-content-card">
            <p className="ghc-content-label">Audio de la lección</p>
            <audio controls className="ghc-audio">
              <source src={audioUrl} />
            </audio>
          </section>
        )}

        {(type === 'pdf' || isMixed) && pdfUrl && (
          <section className="ghc-content-card">
            <p className="ghc-content-label">PDF de la lección</p>
            <iframe src={pdfUrl} className="ghc-pdf" />
          </section>
        )}

        {textContent ? (
          <section
            className="ghc-content-card ghc-text-content"
            dangerouslySetInnerHTML={{ __html: textContent }}
          />
        ) : (
          <section className="ghc-empty-content">
            Esta lección no tiene contenido visible cargado todavía.
          </section>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <main className="ghc-center-page">
        <div className="ghc-loading-box">Cargando lección...</div>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main className="ghc-center-page">
        <div className="ghc-error-box">
          <h1>Error de lección</h1>
          <p>{errorMessage}</p>
          <button onClick={() => router.push('/cursos')} className="ghc-primary-button">
            Volver a cursos
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="ghc-lesson-page">
      <div className="ghc-lesson-shell">
        <aside className="ghc-sidebar">
          <p className="ghc-kicker">GHC Academy</p>
          <h2 className="ghc-sidebar-title">{course?.title || 'Curso'}</h2>

          <div className="ghc-progress-card">
            <div className="ghc-progress-top">
              <span>Progreso del curso</span>
              <strong>{progress}%</strong>
            </div>

            <div className="ghc-progress-track">
              <div className="ghc-progress-fill" style={{ width: `${progress}%` }} />
            </div>

            <p className="ghc-progress-small">
              {completedLessons.length} de {allLessons.length} lecciones completadas
            </p>
          </div>

          <div className="ghc-module-list">
            {modules.map((module: AnyRecord, moduleIndex: number) => (
              <section key={module.id}>
                <h3 className="ghc-module-title">
                  Módulo {moduleIndex + 1}: {module.title}
                </h3>

                <div className="ghc-lessons-list">
                  {(module.lessons || []).map((lesson: AnyRecord) => {
                    const active = String(lesson.id) === lessonId
                    const completed = completedLessons.includes(String(lesson.id))

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => goToLesson(String(lesson.id))}
                        className={`ghc-lesson-item ${active ? 'ghc-lesson-item-active' : ''}`}
                      >
                        <span className="ghc-lesson-status">
                          {completed ? '✓' : active ? '▶' : '○'}
                        </span>
                        <span className="ghc-lesson-name">{lesson.title}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <section className="ghc-main">
          <div className="ghc-main-inner">
            <header className="ghc-hero">
              <p className="ghc-kicker">Plataforma premium</p>
              <h1 className="ghc-title">{currentLesson?.title}</h1>

              <div className="ghc-pills">
                <span className="ghc-pill">{course?.title}</span>
                <span className="ghc-pill">
                  Lección {currentIndex + 1} de {allLessons.length}
                </span>
                <span className="ghc-pill">Progreso {progress}%</span>
              </div>
            </header>

            {renderContent()}

            <section className="ghc-complete-card">
              <button onClick={markAsCompleted} className="ghc-primary-button">
                Marcar lección como completada
              </button>
            </section>

            <section className="ghc-navigation-grid">
              {previousLesson ? (
                <button
                  onClick={() => goToLesson(String(previousLesson.id))}
                  className="ghc-nav-card"
                >
                  <span className="ghc-card-title">← ANTERIOR</span>
                  <span className="ghc-card-subtitle">{previousLesson.title}</span>
                </button>
              ) : (
                <div className="ghc-nav-card-muted">
                  <span className="ghc-card-title">Inicio del curso</span>
                  <span className="ghc-card-subtitle">No hay lección anterior</span>
                </div>
              )}

              {isLastLesson ? (
                <button onClick={goToExam} className="ghc-exam-card">
                  <span className="ghc-card-title">HACER EXAMEN FINAL →</span>
                  <span className="ghc-card-subtitle">
                    Último paso para completar el curso
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => nextLesson && goToLesson(String(nextLesson.id))}
                  className="ghc-nav-card"
                >
                  <span className="ghc-card-title">SIGUIENTE →</span>
                  <span className="ghc-card-subtitle">
                    {nextLesson?.title || 'Continuar'}
                  </span>
                </button>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

function getLessonType(lesson: AnyRecord) {
  return String(
    lesson.type ||
    lesson.content_type ||
    lesson.lesson_type ||
    'text'
  ).toLowerCase()
}

function sortItems(a: AnyRecord, b: AnyRecord) {
  const aOrder = a.order ?? a.position ?? a.order_index ?? 0
  const bOrder = b.order ?? b.position ?? b.order_index ?? 0
  return aOrder - bOrder
}

function sortLessons(a: AnyRecord, b: AnyRecord) {
  const aOrder = a.order ?? a.position ?? a.order_index
  const bOrder = b.order ?? b.position ?? b.order_index

  if (typeof aOrder === 'number' && typeof bOrder === 'number') {
    return aOrder - bOrder
  }

  return extractLessonNumber(a.title) - extractLessonNumber(b.title)
}

function extractLessonNumber(title: string = '') {
  const match = title.match(/lecci[oó]n\s*(\d+)/i)
  return match ? Number(match[1]) : 999
}
