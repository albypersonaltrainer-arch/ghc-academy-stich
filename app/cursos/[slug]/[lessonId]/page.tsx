'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const SAMPLE_VIDEO_URL =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

const COURSE_ASSETS_BUCKET = 'ghc-course-assets'

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
  const [signedAssets, setSignedAssets] = useState<{ video: string; audio: string; pdf: string }>({
    video: '',
    audio: '',
    pdf: ''
  })
  const [assetLoading, setAssetLoading] = useState(false)
  const [pdfFullscreen, setPdfFullscreen] = useState(false)
  const [videoFullscreen, setVideoFullscreen] = useState(false)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [completionSaving, setCompletionSaving] = useState(false)
  const [completionMessage, setCompletionMessage] = useState('')
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
            lessons: [...(module.lessons || [])].sort(sortLessonsPremium)
          }))
          .sort(sortModulesPremium)

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

  const currentModule = useMemo(() => {
    if (!currentLesson) return null

    return (
      modules.find((module: AnyRecord) =>
        (module.lessons || []).some((lesson: AnyRecord) => String(lesson.id) === lessonId)
      ) || null
    )
  }, [modules, currentLesson, lessonId])

  const currentModuleLessons = useMemo(() => {
    if (!currentModule) return []
    return [...(currentModule.lessons || [])].sort(sortLessonsPremium)
  }, [currentModule])

  const currentIndex = allLessons.findIndex((lesson: AnyRecord) => String(lesson.id) === lessonId)

  const currentIndexInModule = currentModuleLessons.findIndex(
    (lesson: AnyRecord) => String(lesson.id) === lessonId
  )

  const previousLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null

  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null

  const isLastLessonOfModule =
    currentModuleLessons.length > 0 &&
    currentIndexInModule === currentModuleLessons.length - 1

  const progress =
    allLessons.length > 0
      ? Math.round((completedLessons.length / allLessons.length) * 100)
      : 0

  const currentLessonCompleted = currentLesson?.id
    ? completedLessons.includes(String(currentLesson.id))
    : false


  useEffect(() => {
    const resolveLessonAssets = async () => {
      if (!currentLesson) {
        setSignedAssets({ video: '', audio: '', pdf: '' })
        return
      }

      try {
        setAssetLoading(true)

        const [video, audio, pdf] = await Promise.all([
          resolvePrivateAssetUrl(getRawVideoPath(currentLesson), 'vídeo'),
          resolvePrivateAssetUrl(getRawAudioPath(currentLesson), 'audio'),
          resolvePrivateAssetUrl(getRawPdfPath(currentLesson), 'PDF')
        ])

        setSignedAssets({ video, audio, pdf })
      } catch (error) {
        console.error(error)
        setErrorMessage(getErrorText(error, 'No se pudieron preparar los archivos privados de la lección.'))
      } finally {
        setAssetLoading(false)
      }
    }

    resolveLessonAssets()
  }, [currentLesson])


  useEffect(() => {
    setCompletionMessage('')
  }, [lessonId])

  const goToLesson = (id: string) => {
    router.push(`/cursos/${slug}/${id}`)
  }

  const goToCourse = () => {
    router.push(`/cursos/${slug}`)
  }

  const goToCatalog = () => {
    router.push('/cursos')
  }

  const goToModuleExam = () => {
    if (!course?.id || !currentModule?.id) return

    router.push(`/exam?courseId=${course.id}&moduleId=${currentModule.id}`)
  }

  const markAsCompleted = async () => {
    if (!currentLesson?.id) return

    if (currentLessonCompleted) {
      setCompletionMessage('Esta lección ya está marcada como completada.')
      return
    }

    if (!user?.id) {
      setCompletionMessage('Para guardar tu progreso real, primero debes iniciar sesión.')
      return
    }

    if (!course?.id) return

    try {
      setCompletionSaving(true)
      setCompletionMessage('Guardando progreso de la lección...')

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
        setCompletionMessage('No se pudo guardar el progreso. Inténtalo otra vez.')
        return
      }

      setCompletedLessons((prev) =>
        prev.includes(String(currentLesson.id))
          ? prev
          : [...prev, String(currentLesson.id)]
      )

      setCompletionMessage('Lección completada correctamente. Tu progreso se ha actualizado.')
    } catch (error) {
      console.error(error)
      setCompletionMessage('Ha ocurrido un error inesperado al guardar el progreso.')
    } finally {
      setCompletionSaving(false)
    }
  }

  const renderContent = () => {
    if (!currentLesson) return null

    const type = getLessonType(currentLesson)
    const isMixed = type === 'mixed' || type === 'mixto'

    const textContent = getTextContent(currentLesson)
    const videoUrl = signedAssets.video || ''
    const audioUrl = signedAssets.audio || ''
    const pdfUrl = signedAssets.pdf || ''
    const hasAnyAsset = Boolean(videoUrl || audioUrl || pdfUrl)

    return (
      <div className="ghc-content-stack">
        {assetLoading && (
          <section className="ghc-content-card ghc-asset-loading">
            Preparando acceso privado a los archivos de la lección...
          </section>
        )}

        {(type === 'video' || isMixed || videoUrl) && videoUrl && (
          <section className="ghc-content-card ghc-media-studio-card">
            <div className="ghc-media-studio-header">
              <div>
                <span className="ghc-media-kicker">Material privado</span>
                <h2>Vídeo de la lección</h2>
                <p>Reproducción privada con acceso temporal. El archivo no queda público.</p>
              </div>

              <button type="button" onClick={() => setVideoFullscreen(true)}>
                Pantalla completa
              </button>
            </div>

            <div className="ghc-video-premium-shell">
              <div className="ghc-media-topbar">
                <span>GHC Academy · vídeo privado</span>
                <strong>{currentLesson?.title || 'Lección'}</strong>
              </div>

              <video src={videoUrl} controls playsInline className="ghc-video-premium-player" />
            </div>
          </section>
        )}

        {videoFullscreen && videoUrl && (
          <div className="ghc-video-premium-fullscreen" role="dialog" aria-modal="true">
            <div className="ghc-video-premium-fullscreen-top">
              <div>
                <span>GHC Academy · vídeo privado</span>
                <strong>{currentLesson?.title || 'Vídeo de la lección'}</strong>
              </div>

              <button type="button" onClick={() => setVideoFullscreen(false)}>
                Cerrar visor
              </button>
            </div>

            <video src={videoUrl} controls autoPlay playsInline />
          </div>
        )}

        {(type === 'audio' || isMixed || audioUrl) && audioUrl && (
          <section className="ghc-content-card ghc-audio-studio-card">
            <div className="ghc-media-studio-header">
              <div>
                <span className="ghc-media-kicker">Material privado</span>
                <h2>Audio de la lección</h2>
                <p>Escucha el audio dentro de GHC Academy sin abrir pestañas externas.</p>
              </div>
            </div>

            <div className="ghc-audio-premium-shell">
              <div className="ghc-audio-orb">
                <span />
                <strong>GHC</strong>
              </div>

              <div className="ghc-audio-player-zone">
                <span>Audio privado · acceso temporal</span>
                <strong>{currentLesson?.title || 'Lección'}</strong>
                <audio controls className="ghc-audio-premium-player">
                  <source src={audioUrl} />
                </audio>
              </div>
            </div>
          </section>
        )}

        {(type === 'pdf' || isMixed || pdfUrl) && pdfUrl && (
          <section className="ghc-content-card ghc-pdf-studio-card">
            <div className="ghc-pdf-studio-header">
              <div className="ghc-pdf-studio-title">
                <span className="ghc-pdf-studio-kicker">Material privado</span>
                <h2>PDF de la lección</h2>
                <p>
                  Visualización protegida con acceso temporal. El archivo no es público y el enlace caduca.
                </p>
              </div>

              <div className="ghc-pdf-studio-actions">
                <button type="button" onClick={() => setPdfFullscreen(true)}>
                  Pantalla completa
                </button>
                <a href={pdfUrl} target="_blank" rel="noreferrer">
                  Abrir aparte
                </a>
              </div>
            </div>

            <div className="ghc-pdf-premium-shell">
              <div className="ghc-pdf-premium-topbar">
                <span>GHC Academy · visor privado</span>
                <strong>{currentLesson?.title || 'Lección'}</strong>
              </div>

              <iframe
                src={decoratePdfUrl(pdfUrl)}
                className="ghc-pdf-premium-frame"
                title="PDF privado de la lección"
              />
            </div>
          </section>
        )}

        {pdfFullscreen && pdfUrl && (
          <div className="ghc-pdf-premium-fullscreen" role="dialog" aria-modal="true">
            <div className="ghc-pdf-premium-fullscreen-top">
              <div>
                <span>GHC Academy · visor privado</span>
                <strong>{currentLesson?.title || 'PDF de la lección'}</strong>
              </div>

              <button type="button" onClick={() => setPdfFullscreen(false)}>
                Cerrar visor
              </button>
            </div>

            <iframe src={decoratePdfUrl(pdfUrl)} title="PDF privado a pantalla completa" />
          </div>
        )}

        {textContent ? (
          <section
            className="ghc-content-card ghc-text-content"
            dangerouslySetInnerHTML={{ __html: textContent }}
          />
        ) : !hasAnyAsset && !assetLoading ? (
          <section className="ghc-empty-content">
            Esta lección no tiene contenido visible cargado todavía.
          </section>
        ) : null}
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
          <button onClick={goToCatalog} className="ghc-primary-button">
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
            <div className="ghc-top-actions">
              <button onClick={goToCourse} className="ghc-top-back">
                ← Volver al curso
              </button>
              <button onClick={goToCatalog} className="ghc-top-back">
                Catálogo de cursos
              </button>
            </div>

            <header className="ghc-hero">
              <p className="ghc-kicker">Plataforma premium</p>
              <h1 className="ghc-title">{currentLesson?.title}</h1>

              <div className="ghc-pills">
                <span className="ghc-pill">{course?.title}</span>
                <span className="ghc-pill">
                  Módulo: {currentModule?.title || '—'}
                </span>
                <span className="ghc-pill">
                  Lección {currentIndexInModule + 1} de {currentModuleLessons.length}
                </span>
                <span className="ghc-pill">Progreso curso {progress}%</span>
              </div>
            </header>

            {renderContent()}

            <section className={currentLessonCompleted ? "ghc-complete-card completed" : "ghc-complete-card"}>
              <div className="ghc-complete-copy">
                <span>{currentLessonCompleted ? "Progreso guardado" : "Finalizar lección"}</span>
                <strong>
                  {currentLessonCompleted
                    ? "Lección completada"
                    : "Marca esta lección cuando hayas terminado el contenido."}
                </strong>
                <p>
                  {currentLessonCompleted
                    ? "Esta lección ya cuenta para tu avance del curso."
                    : "Tu progreso se actualizará automáticamente en el panel de alumno."}
                </p>
              </div>

              <button
                onClick={markAsCompleted}
                className="ghc-primary-button"
                disabled={completionSaving || currentLessonCompleted}
              >
                {completionSaving
                  ? "Guardando progreso..."
                  : currentLessonCompleted
                    ? "Lección completada"
                    : "Marcar lección como completada"}
              </button>

              {completionMessage ? (
                <div className={currentLessonCompleted ? "ghc-completion-message success" : "ghc-completion-message"}>
                  {completionMessage}
                </div>
              ) : null}
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

              {isLastLessonOfModule ? (
                <button onClick={goToModuleExam} className="ghc-exam-card">
                  <span className="ghc-card-title">HACER EXAMEN DEL MÓDULO →</span>
                  <span className="ghc-card-subtitle">
                    Aprueba para desbloquear el siguiente módulo
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

      <style jsx global>{`
        .ghc-pdf-card {
          padding: 18px !important;
        }

        .ghc-content-note {
          display: block;
          margin-top: 6px;
          color: rgba(244,246,242,.52);
          font-size: 12px;
          line-height: 1.45;
        }

        .ghc-pdf-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button.ghc-private-open {
          cursor: pointer;
          font: inherit;
        }

        .ghc-private-open.muted {
          border-color: rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: rgba(244,246,242,.78);
        }

        .ghc-pdf {
          width: 100% !important;
          min-height: min(82vh, 920px) !important;
          height: 82vh !important;
          border: 0;
          border-radius: 18px;
          background: rgba(255,255,255,.04);
        }

        .ghc-pdf-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #050706;
          display: grid;
          grid-template-rows: 72px minmax(0, 1fr);
        }

        .ghc-pdf-fullscreen-top {
          border-bottom: 1px solid rgba(255,255,255,.09);
          background: rgba(8,12,10,.98);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 12px 18px;
        }

        .ghc-pdf-fullscreen-top div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .ghc-pdf-fullscreen-top strong {
          color: #f4f6f2;
          font-size: 15px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ghc-pdf-fullscreen-top span {
          color: rgba(244,246,242,.54);
          font-size: 12px;
        }

        .ghc-pdf-fullscreen-top button {
          min-height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(99,229,70,.26);
          background: rgba(99,229,70,.09);
          color: #63e546;
          padding: 0 16px;
          font-weight: 900;
          cursor: pointer;
        }

        .ghc-pdf-fullscreen iframe {
          width: 100%;
          height: 100%;
          border: 0;
          background: rgba(255,255,255,.04);
        }

        @media (max-width: 760px) {
          .ghc-content-head {
            align-items: stretch;
            flex-direction: column;
          }

          .ghc-pdf-actions {
            justify-content: flex-start;
          }

          .ghc-pdf {
            height: 78vh !important;
            min-height: 640px !important;
          }
        }
      `}</style>


      <style jsx global>{`
        .ghc-pdf-studio-card {
          padding: 0 !important;
          overflow: hidden;
          border: 1px solid rgba(99,229,70,.16) !important;
          background:
            radial-gradient(circle at top right, rgba(99,229,70,.10), transparent 34%),
            linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.018)),
            rgba(7,10,9,.96) !important;
          box-shadow: 0 26px 90px rgba(0,0,0,.28);
        }

        .ghc-pdf-studio-header {
          min-height: 102px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 22px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          background:
            linear-gradient(90deg, rgba(99,229,70,.08), rgba(255,255,255,.02)),
            rgba(5,7,6,.62);
        }

        .ghc-pdf-studio-title {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .ghc-pdf-studio-kicker {
          color: #63e546;
          text-transform: uppercase;
          letter-spacing: .18em;
          font-size: 10px;
          font-weight: 950;
        }

        .ghc-pdf-studio-title h2 {
          margin: 0;
          color: #f4f6f2;
          font-size: clamp(24px, 2.4vw, 36px);
          line-height: .95;
          letter-spacing: -.045em;
          font-weight: 950;
        }

        .ghc-pdf-studio-title p {
          margin: 0;
          color: rgba(244,246,242,.58);
          font-size: 13px;
          line-height: 1.55;
          max-width: 680px;
        }

        .ghc-pdf-studio-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        .ghc-pdf-studio-actions button,
        .ghc-pdf-studio-actions a {
          min-height: 42px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .02em;
          cursor: pointer;
        }

        .ghc-pdf-studio-actions button {
          border: 1px solid rgba(99,229,70,.35);
          background: linear-gradient(135deg, #63e546, #7bee65);
          color: #061008;
          box-shadow: 0 0 30px rgba(99,229,70,.14);
        }

        .ghc-pdf-studio-actions a {
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: rgba(244,246,242,.82);
        }

        .ghc-pdf-premium-shell {
          padding: 18px;
          background:
            radial-gradient(circle at 50% 0%, rgba(99,229,70,.065), transparent 34%),
            #050706;
        }

        .ghc-pdf-premium-topbar {
          min-height: 48px;
          border: 1px solid rgba(255,255,255,.08);
          border-bottom: 0;
          border-radius: 18px 18px 0 0;
          background:
            linear-gradient(90deg, rgba(99,229,70,.10), rgba(255,255,255,.025)),
            rgba(9,13,11,.96);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 16px;
        }

        .ghc-pdf-premium-topbar span {
          color: #63e546;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-size: 10px;
          font-weight: 950;
          white-space: nowrap;
        }

        .ghc-pdf-premium-topbar strong {
          color: rgba(244,246,242,.82);
          font-size: 12px;
          font-weight: 850;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ghc-pdf-premium-frame {
          width: 100%;
          height: 82vh;
          min-height: 760px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 0 0 18px 18px;
          background: rgba(255,255,255,.035);
          display: block;
        }

        .ghc-pdf-premium-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background:
            radial-gradient(circle at top right, rgba(99,229,70,.10), transparent 30%),
            #050706;
          display: grid;
          grid-template-rows: 74px minmax(0, 1fr);
        }

        .ghc-pdf-premium-fullscreen-top {
          border-bottom: 1px solid rgba(255,255,255,.09);
          background:
            linear-gradient(90deg, rgba(99,229,70,.10), rgba(255,255,255,.02)),
            rgba(8,12,10,.98);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 12px 20px;
        }

        .ghc-pdf-premium-fullscreen-top div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .ghc-pdf-premium-fullscreen-top span {
          color: #63e546;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-size: 10px;
          font-weight: 950;
        }

        .ghc-pdf-premium-fullscreen-top strong {
          color: #f4f6f2;
          font-size: 15px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ghc-pdf-premium-fullscreen-top button {
          min-height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(99,229,70,.35);
          background: linear-gradient(135deg, #63e546, #7bee65);
          color: #061008;
          padding: 0 16px;
          font-weight: 950;
          cursor: pointer;
          flex-shrink: 0;
        }

        .ghc-pdf-premium-fullscreen iframe {
          width: 100%;
          height: 100%;
          border: 0;
          background: rgba(255,255,255,.035);
        }

        @media (max-width: 820px) {
          .ghc-pdf-studio-header {
            align-items: stretch;
            flex-direction: column;
          }

          .ghc-pdf-studio-actions {
            justify-content: flex-start;
          }

          .ghc-pdf-premium-topbar {
            align-items: flex-start;
            justify-content: center;
            flex-direction: column;
            padding: 10px 14px;
          }

          .ghc-pdf-premium-frame {
            height: 78vh;
            min-height: 640px;
          }
        }
      `}</style>


      <style jsx global>{`
        .ghc-media-studio-card,
        .ghc-audio-studio-card {
          padding: 0 !important;
          overflow: hidden;
          border: 1px solid rgba(99,229,70,.16) !important;
          background:
            radial-gradient(circle at top right, rgba(99,229,70,.10), transparent 34%),
            linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.018)),
            rgba(7,10,9,.96) !important;
          box-shadow: 0 26px 90px rgba(0,0,0,.28);
        }

        .ghc-media-studio-header {
          min-height: 94px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 22px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          background:
            linear-gradient(90deg, rgba(99,229,70,.08), rgba(255,255,255,.02)),
            rgba(5,7,6,.62);
        }

        .ghc-media-studio-header > div {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .ghc-media-kicker {
          color: #63e546;
          text-transform: uppercase;
          letter-spacing: .18em;
          font-size: 10px;
          font-weight: 950;
        }

        .ghc-media-studio-header h2 {
          margin: 0;
          color: #f4f6f2;
          font-size: clamp(24px, 2.4vw, 36px);
          line-height: .95;
          letter-spacing: -.045em;
          font-weight: 950;
        }

        .ghc-media-studio-header p {
          margin: 0;
          color: rgba(244,246,242,.58);
          font-size: 13px;
          line-height: 1.55;
          max-width: 680px;
        }

        .ghc-media-studio-header button {
          min-height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(99,229,70,.35);
          background: linear-gradient(135deg, #63e546, #7bee65);
          color: #061008;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 0 30px rgba(99,229,70,.14);
          flex-shrink: 0;
        }

        .ghc-video-premium-shell {
          padding: 18px;
          background:
            radial-gradient(circle at 50% 0%, rgba(99,229,70,.065), transparent 34%),
            #050706;
        }

        .ghc-media-topbar {
          min-height: 48px;
          border: 1px solid rgba(255,255,255,.08);
          border-bottom: 0;
          border-radius: 18px 18px 0 0;
          background:
            linear-gradient(90deg, rgba(99,229,70,.10), rgba(255,255,255,.025)),
            rgba(9,13,11,.96);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 16px;
        }

        .ghc-media-topbar span {
          color: #63e546;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-size: 10px;
          font-weight: 950;
          white-space: nowrap;
        }

        .ghc-media-topbar strong {
          color: rgba(244,246,242,.82);
          font-size: 12px;
          font-weight: 850;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ghc-video-premium-player {
          width: 100%;
          max-height: 72vh;
          min-height: 420px;
          display: block;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 0 0 18px 18px;
          background: #000;
          object-fit: contain;
        }

        .ghc-video-premium-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background:
            radial-gradient(circle at top right, rgba(99,229,70,.10), transparent 30%),
            #050706;
          display: grid;
          grid-template-rows: 74px minmax(0, 1fr);
        }

        .ghc-video-premium-fullscreen-top {
          border-bottom: 1px solid rgba(255,255,255,.09);
          background:
            linear-gradient(90deg, rgba(99,229,70,.10), rgba(255,255,255,.02)),
            rgba(8,12,10,.98);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 12px 20px;
        }

        .ghc-video-premium-fullscreen-top div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .ghc-video-premium-fullscreen-top span {
          color: #63e546;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-size: 10px;
          font-weight: 950;
        }

        .ghc-video-premium-fullscreen-top strong {
          color: #f4f6f2;
          font-size: 15px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ghc-video-premium-fullscreen-top button {
          min-height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(99,229,70,.35);
          background: linear-gradient(135deg, #63e546, #7bee65);
          color: #061008;
          padding: 0 16px;
          font-weight: 950;
          cursor: pointer;
          flex-shrink: 0;
        }

        .ghc-video-premium-fullscreen video {
          width: 100%;
          height: 100%;
          background: #000;
          object-fit: contain;
        }

        .ghc-audio-premium-shell {
          min-height: 172px;
          padding: 22px;
          display: grid;
          grid-template-columns: 118px minmax(0, 1fr);
          gap: 22px;
          align-items: center;
          background:
            radial-gradient(circle at 12% 50%, rgba(99,229,70,.12), transparent 24%),
            #050706;
        }

        .ghc-audio-orb {
          width: 112px;
          height: 112px;
          border-radius: 999px;
          position: relative;
          display: grid;
          place-items: center;
          color: #63e546;
          border: 1px solid rgba(99,229,70,.24);
          background:
            radial-gradient(circle, rgba(99,229,70,.18), rgba(99,229,70,.04) 62%),
            rgba(255,255,255,.035);
          box-shadow: 0 0 52px rgba(99,229,70,.12);
          overflow: hidden;
        }

        .ghc-audio-orb span {
          position: absolute;
          inset: 18px;
          border-radius: inherit;
          border: 1px solid rgba(99,229,70,.18);
          animation: ghcAudioPulse 2.8s ease-in-out infinite;
        }

        .ghc-audio-orb strong {
          font-size: 20px;
          letter-spacing: .12em;
          font-weight: 950;
        }

        @keyframes ghcAudioPulse {
          0%, 100% { transform: scale(.92); opacity: .45; }
          50% { transform: scale(1.18); opacity: .12; }
        }

        .ghc-audio-player-zone {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .ghc-audio-player-zone span {
          color: #63e546;
          text-transform: uppercase;
          letter-spacing: .15em;
          font-size: 10px;
          font-weight: 950;
        }

        .ghc-audio-player-zone strong {
          color: #f4f6f2;
          font-size: clamp(20px, 2vw, 30px);
          line-height: 1.05;
          letter-spacing: -.035em;
          font-weight: 950;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ghc-audio-premium-player {
          width: 100%;
          min-height: 48px;
          accent-color: #63e546;
          filter: saturate(.85);
        }

        @media (max-width: 820px) {
          .ghc-media-studio-header {
            align-items: stretch;
            flex-direction: column;
          }

          .ghc-video-premium-player {
            min-height: 260px;
            max-height: 62vh;
          }

          .ghc-media-topbar {
            align-items: flex-start;
            justify-content: center;
            flex-direction: column;
            padding: 10px 14px;
          }

          .ghc-audio-premium-shell {
            grid-template-columns: 1fr;
          }
        }
      `}</style>


      <style jsx global>{`
        .ghc-complete-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
          border: 1px solid rgba(99,229,70,.16);
          background:
            radial-gradient(circle at top right, rgba(99,229,70,.11), transparent 34%),
            linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.018)),
            rgba(7,10,9,.96);
          border-radius: 24px;
          padding: 22px;
          box-shadow: 0 22px 70px rgba(0,0,0,.22);
        }

        .ghc-complete-card.completed {
          border-color: rgba(99,229,70,.32);
          background:
            radial-gradient(circle at top right, rgba(99,229,70,.18), transparent 34%),
            linear-gradient(145deg, rgba(99,229,70,.075), rgba(255,255,255,.018)),
            rgba(7,10,9,.96);
        }

        .ghc-complete-copy {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .ghc-complete-copy span {
          color: #63e546;
          text-transform: uppercase;
          letter-spacing: .18em;
          font-size: 10px;
          font-weight: 950;
        }

        .ghc-complete-copy strong {
          color: #f4f6f2;
          font-size: clamp(22px, 2vw, 32px);
          line-height: 1;
          letter-spacing: -.04em;
          font-weight: 950;
        }

        .ghc-complete-copy p {
          margin: 0;
          color: rgba(244,246,242,.58);
          font-size: 13px;
          line-height: 1.5;
        }

        .ghc-complete-card .ghc-primary-button:disabled {
          opacity: .72;
          cursor: default;
          transform: none;
          filter: saturate(.88);
        }

        .ghc-completion-message {
          grid-column: 1 / -1;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 16px;
          background: rgba(255,255,255,.045);
          color: rgba(244,246,242,.76);
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 800;
        }

        .ghc-completion-message.success {
          border-color: rgba(99,229,70,.26);
          background: rgba(99,229,70,.08);
          color: #dfffd8;
        }

        @media (max-width: 760px) {
          .ghc-complete-card {
            grid-template-columns: 1fr;
          }

          .ghc-complete-card .ghc-primary-button {
            width: 100%;
          }
        }
      `}</style>

    </main>
  )
}

function decoratePdfUrl(url: string) {
  if (!url) return ''

  const separator = url.includes('#') ? '&' : '#'
  return `${url}${separator}toolbar=0&navpanes=0&scrollbar=1&view=FitH`
}

function getLessonType(lesson: AnyRecord) {
  return String(
    lesson.type ||
    lesson.content_type ||
    lesson.lesson_type ||
    'text'
  ).toLowerCase()
}

function getTextContent(lesson: AnyRecord) {
  return (
    lesson.text_content ||
    lesson.html_content ||
    lesson.body ||
    lesson.text ||
    lesson.description ||
    (isProbablyText(lesson.content) ? lesson.content : '') ||
    ''
  )
}

function getRawVideoPath(lesson: AnyRecord) {
  return findAssetPath([
    lesson.video_url,
    lesson.videoUrl,
    lesson.video,
    lesson.video_file,
    lesson.video_file_url,
    lesson.media_video_url,
    lesson.video_src,
    lesson.content_url,
    lesson.media_url,
    lesson.url,
    lesson.file_url,
    lesson.content
  ], ['.mp4', '.webm', '.mov', '.m4v'])
}

function getRawAudioPath(lesson: AnyRecord) {
  return findAssetPath([
    lesson.audio_url,
    lesson.audioUrl,
    lesson.audio,
    lesson.audio_file,
    lesson.audio_file_url,
    lesson.media_audio_url,
    lesson.audio_src,
    lesson.content_url,
    lesson.media_url,
    lesson.url,
    lesson.file_url,
    lesson.content
  ], ['.mp3', '.wav', '.m4a', '.ogg', '.aac'])
}

function getRawPdfPath(lesson: AnyRecord) {
  return findAssetPath([
    lesson.pdf_url,
    lesson.pdfUrl,
    lesson.pdf,
    lesson.pdf_file,
    lesson.pdf_file_url,
    lesson.file_url,
    lesson.document_url,
    lesson.content_url,
    lesson.media_url,
    lesson.url,
    lesson.content
  ], ['.pdf'])
}

async function resolvePrivateAssetUrl(pathValue: any, label: string) {
  const path = cleanAssetPath(pathValue)

  if (!path) return ''

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const { data, error } = await withLessonTimeout(
    supabase.storage.from(COURSE_ASSETS_BUCKET).createSignedUrl(path, 60 * 10),
    12000,
    `Supabase Storage no respondió al preparar el acceso privado para ${label}.`
  )

  if (error || !data?.signedUrl) {
    throw new Error(
      `${error?.message || `No se pudo generar el acceso privado para ${label}.`} Revisa que el archivo exista en ${COURSE_ASSETS_BUCKET}.`
    )
  }

  return data.signedUrl
}

function cleanAssetPath(value: any) {
  const path = String(value || '').trim()
  if (!path || path.toLowerCase() === 'null' || path.toLowerCase() === 'undefined') return ''
  return path
}

function findAssetPath(values: any[], extensions: string[]) {
  const cleanValues = values
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter((value) => value && value.toLowerCase() !== 'null' && value.toLowerCase() !== 'undefined')

  const storagePath = cleanValues.find((value) => {
    if (value.startsWith('http://') || value.startsWith('https://')) return false
    return extensions.some((extension) => value.toLowerCase().includes(extension))
  })

  if (storagePath) return storagePath

  const externalUrl = cleanValues.find((value) =>
    (value.startsWith('http://') || value.startsWith('https://')) &&
    extensions.some((extension) => value.toLowerCase().includes(extension))
  )

  return externalUrl || ''
}

function withLessonTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs)

    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timer)
        reject(error)
      })
  })
}

function getErrorText(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return fallback
}

function findUrlByExtension(values: any[], extensions: string[]) {
  const cleanValues = values
    .filter(Boolean)
    .map((value) => String(value).trim())

  const exact = cleanValues.find((value) =>
    extensions.some((extension) => value.toLowerCase().includes(extension))
  )

  return exact || ''
}

function isProbablyText(value: any) {
  if (!value) return false
  const text = String(value)

  if (text.startsWith('http://') || text.startsWith('https://')) {
    return false
  }

  return true
}

function sortModulesPremium(a: AnyRecord, b: AnyRecord) {
  const aNumber = extractModuleNumber(a.title)
  const bNumber = extractModuleNumber(b.title)

  if (aNumber !== bNumber) return aNumber - bNumber

  const aOrder = Number(a.order ?? a.position ?? a.order_index ?? a.sort_order ?? 999)
  const bOrder = Number(b.order ?? b.position ?? b.order_index ?? b.sort_order ?? 999)

  return aOrder - bOrder
}

function sortLessonsPremium(a: AnyRecord, b: AnyRecord) {
  const aNumber = extractLessonNumber(a.title)
  const bNumber = extractLessonNumber(b.title)

  if (aNumber !== bNumber) return aNumber - bNumber

  const aOrder = Number(a.order ?? a.position ?? a.order_index ?? a.sort_order ?? 999)
  const bOrder = Number(b.order ?? b.position ?? b.order_index ?? b.sort_order ?? 999)

  return aOrder - bOrder
}

function extractLessonNumber(title: string = '') {
  const match = title.match(/lecci[oó]n\s*(\d+)/i)
  return match ? Number(match[1]) : 999
}

function extractModuleNumber(title: string = '') {
  const match = title.match(/m[oó]dulo\s*(\d+)/i)
  return match ? Number(match[1]) : 999
}
