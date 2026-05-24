'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const COURSE_ASSETS_BUCKET = 'ghc-course-assets'
const GREEN = '#63E546'

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

  const progress =
    allLessons.length > 0
      ? Math.round((completedLessons.length / allLessons.length) * 100)
      : 0

  const currentLessonCompleted = currentLesson?.id
    ? completedLessons.includes(String(currentLesson.id))
    : false

  const completedLessonsInCurrentModule = currentModuleLessons.filter((lesson: AnyRecord) =>
    completedLessons.includes(String(lesson.id))
  ).length

  const currentModuleCompleted =
    currentModuleLessons.length > 0 &&
    completedLessonsInCurrentModule >= currentModuleLessons.length

  const moduleProgress =
    currentModuleLessons.length > 0
      ? Math.round((completedLessonsInCurrentModule / currentModuleLessons.length) * 100)
      : 0

  const lessonType = currentLesson ? getLessonTypeLabel(currentLesson, signedAssets) : 'Texto'
  const rawLessonType = currentLesson ? getLessonType(currentLesson) : 'text'
  const textContent = currentLesson ? getTextContent(currentLesson) : ''
  const videoUrl = signedAssets.video || ''
  const audioUrl = signedAssets.audio || ''
  const pdfUrl = signedAssets.pdf || ''
  const hasAnyAsset = Boolean(videoUrl || audioUrl || pdfUrl)
  const isMixed = rawLessonType === 'mixed' || rawLessonType === 'mixto'

  const goToLesson = (id: string) => {
    router.push(`/cursos/${slug}/${id}`)
  }

  const goToCourse = () => {
    router.push(`/cursos/${slug}`)
  }

  const goToCatalog = () => {
    router.push('/cursos')
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

  if (loading) {
    return (
      <main className="lesson-dashboard-page loading">
        <Background />
        <section className="loading-card">
          <p>GHC Academy</p>
          <h1>Cargando lección</h1>
          <span>Preparando acceso privado, progreso y contenido académico.</span>
        </section>
        <GlobalStyles />
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main className="lesson-dashboard-page loading">
        <Background />
        <section className="loading-card">
          <p>Error de lección</p>
          <h1>No se pudo cargar</h1>
          <span>{errorMessage}</span>
          <button onClick={goToCatalog} className="primary-action as-button">
            Volver a cursos
          </button>
        </section>
        <GlobalStyles />
      </main>
    )
  }

  return (
    <main className="lesson-dashboard-page">
      <Background />

      <aside className="icon-rail">
        <button type="button">☰</button>
        <span>⌂</span>
        <span>▤</span>
        <span>▱</span>
        <span>🏆</span>
        <span>⌁</span>
        <span>⚙</span>
      </aside>

      <aside className="lesson-sidebar">
        <div className="brand">
          <strong>GHC</strong>
          <span>Academy</span>
        </div>

        <button type="button" onClick={goToCourse} className="back-link">
          ← Volver al curso
        </button>

        <section className="course-mini">
          <p>Curso actual</p>
          <h2>{course?.title || 'Curso GHC'}</h2>

          <div className="sidebar-progress">
            <div className="progress-copy">
              <span>Progreso del curso</span>
              <strong>{progress}%</strong>
            </div>
            <div className="bar">
              <div style={{ width: `${progress}%` }} />
            </div>
            <small>{completedLessons.length} de {allLessons.length} lecciones completadas</small>
          </div>
        </section>

        <section className="sidebar-modules">
          <p>Módulos del curso</p>

          {modules.map((module: AnyRecord, moduleIndex: number) => {
            const moduleLessons = module.lessons || []
            const completedInModule = moduleLessons.filter((lesson: AnyRecord) =>
              completedLessons.includes(String(lesson.id))
            ).length

            const expanded = currentModule?.id && String(currentModule.id) === String(module.id)

            return (
              <article key={module.id} className={expanded ? 'side-module expanded' : 'side-module'}>
                <div className="side-module-head">
                  <div>
                    <strong>Módulo {moduleIndex + 1}</strong>
                    <span>{module.title || 'Módulo GHC'}</span>
                  </div>
                  <em>{completedInModule}/{moduleLessons.length}</em>
                </div>

                {expanded && (
                  <div className="side-lessons">
                    {moduleLessons.map((lesson: AnyRecord, lessonIndex: number) => {
                      const active = String(lesson.id) === lessonId
                      const completed = completedLessons.includes(String(lesson.id))

                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => goToLesson(String(lesson.id))}
                          className={active ? 'side-lesson active' : 'side-lesson'}
                        >
                          <span>{completed ? '✓' : active ? '▶' : '○'}</span>
                          <div>
                            <small>{moduleIndex + 1}.{lessonIndex + 1}</small>
                            <strong>{lesson.title || 'Lección GHC'}</strong>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </article>
            )
          })}
        </section>

        <section className="support-card">
          <strong>¿Necesitas ayuda?</strong>
          <span>Accede a soporte y recursos del curso.</span>
          <button type="button">Ir a soporte</button>
        </section>
      </aside>

      <section className="lesson-shell">
        <header className="lesson-topbar">
          <div className="breadcrumb">
            <button type="button" onClick={goToCourse}>{course?.title || 'Curso'}</button>
            <span>›</span>
            <strong>{currentModule?.title || 'Módulo'}</strong>
            <span>›</span>
            <b>{formatLessonIndex(currentIndexInModule)} {currentLesson?.title || 'Lección'}</b>
          </div>

          <div className="top-actions">
            <button
              type="button"
              onClick={markAsCompleted}
              className={currentLessonCompleted ? 'complete-top done' : 'complete-top'}
              disabled={completionSaving || currentLessonCompleted}
            >
              {completionSaving
                ? 'Guardando...'
                : currentLessonCompleted
                  ? 'Completada'
                  : 'Marcar como completa'}
            </button>

            <button type="button" onClick={() => previousLesson && goToLesson(String(previousLesson.id))} disabled={!previousLesson}>
              ←
            </button>
            <button type="button" onClick={() => nextLesson && goToLesson(String(nextLesson.id))} disabled={!nextLesson}>
              →
            </button>
          </div>
        </header>

        <div className="lesson-layout">
          <main className="lesson-main">
            <section className="lesson-heading">
              <p>{formatLessonIndex(currentIndexInModule)} {currentLesson?.title || 'Lección'}</p>
              <h1>{currentLesson?.title || 'Lección GHC'}</h1>
              <span>
                {textContent
                  ? stripHtml(textContent).slice(0, 170)
                  : 'Contenido privado de GHC Academy con acceso temporal y seguimiento de progreso.'}
              </span>
            </section>

            <section className="viewer-card">
              {assetLoading && (
                <div className="asset-loading">
                  Preparando acceso privado a los archivos de la lección...
                </div>
              )}

              {(rawLessonType === 'video' || isMixed || videoUrl) && videoUrl ? (
                <div className="video-stage">
                  <video src={videoUrl} controls playsInline />
                  <button type="button" onClick={() => setVideoFullscreen(true)}>
                    Pantalla completa
                  </button>
                </div>
              ) : null}

              {(rawLessonType === 'audio' || isMixed || audioUrl) && audioUrl ? (
                <div className="audio-stage">
                  <div className="audio-brand">GHC</div>
                  <div>
                    <p>Audio privado</p>
                    <strong>{currentLesson?.title || 'Lección'}</strong>
                    <audio controls>
                      <source src={audioUrl} />
                    </audio>
                  </div>
                </div>
              ) : null}

              {(rawLessonType === 'pdf' || isMixed || pdfUrl) && pdfUrl ? (
                <div className="pdf-stage">
                  <div className="pdf-actions">
                    <p>PDF privado de la lección</p>
                    <div>
                      <button type="button" onClick={() => setPdfFullscreen(true)}>
                        Pantalla completa
                      </button>
                      <a href={pdfUrl} target="_blank" rel="noreferrer">
                        Abrir aparte
                      </a>
                    </div>
                  </div>
                  <iframe src={decoratePdfUrl(pdfUrl)} title="PDF privado de la lección" />
                </div>
              ) : null}

              {textContent ? (
                <div className="text-stage" dangerouslySetInnerHTML={{ __html: textContent }} />
              ) : !hasAnyAsset && !assetLoading ? (
                <div className="empty-stage">
                  Esta lección no tiene contenido visible cargado todavía.
                </div>
              ) : null}
            </section>

            <section className="description-card">
              <h2>Descripción</h2>
              <p>
                {textContent
                  ? stripHtml(textContent).slice(0, 280)
                  : 'Revisa el contenido de la lección y marca el avance cuando hayas terminado.'}
              </p>

              <div className="learning-points">
                <strong>Qué trabajarás en esta lección</strong>
                <ul>
                  <li>Comprender el contenido principal del bloque.</li>
                  <li>Aplicarlo dentro del itinerario del curso.</li>
                  <li>Avanzar con seguimiento real del progreso.</li>
                </ul>
              </div>
            </section>

            <section className="bottom-navigation">
              {previousLesson ? (
                <button type="button" onClick={() => goToLesson(String(previousLesson.id))}>
                  <span>← Lección anterior</span>
                  <strong>{previousLesson.title}</strong>
                </button>
              ) : (
                <div>
                  <span>Inicio del curso</span>
                  <strong>No hay lección anterior</strong>
                </div>
              )}

              {nextLesson ? (
                <button type="button" onClick={() => goToLesson(String(nextLesson.id))} className="next">
                  <span>Siguiente lección →</span>
                  <strong>{nextLesson.title}</strong>
                </button>
              ) : (
                <div className="next">
                  <span>Final del curso</span>
                  <strong>No hay siguiente lección</strong>
                </div>
              )}
            </section>
          </main>

          <aside className="lesson-sidepanel">
            <section className="panel-card">
              <h3>Progreso del curso</h3>
              <p><strong>{progress}%</strong> completado</p>
              <div className="bar">
                <div style={{ width: `${progress}%` }} />
              </div>
              <span>{completedLessons.length} de {allLessons.length} lecciones completadas</span>
            </section>

            <section className="panel-card lesson-data">
              <h3>Lección actual</h3>
              <div><span>Tipo</span><strong>{lessonType}</strong></div>
              <div><span>Duración</span><strong>{Number(currentLesson?.duration_minutes || 0) > 0 ? `${Number(currentLesson?.duration_minutes || 0)} min` : '—'}</strong></div>
              <div><span>Estado</span><strong className={currentLessonCompleted ? 'green' : ''}>{currentLessonCompleted ? 'Completada' : 'En progreso'}</strong></div>
            </section>

            <section className="panel-card resources-card">
              <h3>Recursos de la lección</h3>
              <ResourceRow label="PDF" active={Boolean(pdfUrl)} />
              <ResourceRow label="Vídeo" active={Boolean(videoUrl)} />
              <ResourceRow label="Audio" active={Boolean(audioUrl)} />
            </section>

            <section className={currentModuleCompleted ? 'panel-card module-state complete' : 'panel-card module-state'}>
              <h3>Estado del módulo</h3>
              <strong>{currentModule?.title || 'Módulo actual'}</strong>
              <div className="bar">
                <div style={{ width: `${moduleProgress}%` }} />
              </div>
              <p>
                {currentModuleCompleted
                  ? 'Módulo completado. La evaluación quedará disponible en la siguiente fase.'
                  : `${completedLessonsInCurrentModule} de ${currentModuleLessons.length} lecciones completadas.`}
              </p>
              <em>Examen del módulo · Próximamente</em>
            </section>

            <section className="panel-card complete-card">
              <h3>{currentLessonCompleted ? 'Lección completada' : 'Finalizar lección'}</h3>
              <p>
                {currentLessonCompleted
                  ? 'Esta lección ya cuenta para tu avance.'
                  : 'Marca la lección como completada cuando termines el contenido.'}
              </p>
              <button
                type="button"
                onClick={markAsCompleted}
                disabled={completionSaving || currentLessonCompleted}
              >
                {completionSaving
                  ? 'Guardando...'
                  : currentLessonCompleted
                    ? 'Completada'
                    : 'Marcar como completa'}
              </button>
              {completionMessage ? <span className="completion-message">{completionMessage}</span> : null}
            </section>
          </aside>
        </div>
      </section>

      {videoFullscreen && videoUrl && (
        <div className="video-fullscreen" role="dialog" aria-modal="true">
          <div className="fullscreen-top">
            <div>
              <span>GHC Academy · vídeo privado</span>
              <strong>{currentLesson?.title || 'Vídeo de la lección'}</strong>
            </div>
            <button type="button" onClick={() => setVideoFullscreen(false)}>Cerrar visor</button>
          </div>
          <video src={videoUrl} controls autoPlay playsInline />
        </div>
      )}

      {pdfFullscreen && pdfUrl && (
        <div className="pdf-fullscreen" role="dialog" aria-modal="true">
          <div className="fullscreen-top">
            <div>
              <span>GHC Academy · visor privado</span>
              <strong>{currentLesson?.title || 'PDF de la lección'}</strong>
            </div>
            <button type="button" onClick={() => setPdfFullscreen(false)}>Cerrar visor</button>
          </div>
          <iframe src={decoratePdfUrl(pdfUrl)} title="PDF privado a pantalla completa" />
        </div>
      )}

      <GlobalStyles />
    </main>
  )
}

function ResourceRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={active ? 'resource-row active' : 'resource-row'}>
      <span>{label}</span>
      <strong>{active ? 'Disponible' : 'No cargado'}</strong>
    </div>
  )
}

function Background() {
  return (
    <div className="background" aria-hidden="true">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="grid-texture" />
    </div>
  )
}

function formatLessonIndex(index: number) {
  if (index < 0) return 'Lección'
  return `${index + 1}.`
}

function stripHtml(value: string) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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

function getLessonTypeLabel(lesson: AnyRecord, assets: { video: string; audio: string; pdf: string }) {
  const rawType = getLessonType(lesson)
  const hasVideo = Boolean(assets.video) || rawType.includes('video')
  const hasAudio = Boolean(assets.audio) || rawType.includes('audio')
  const hasPdf = Boolean(assets.pdf) || rawType.includes('pdf')
  const isMixed = rawType.includes('mixed') || rawType.includes('mixto')

  if (isMixed || [hasVideo, hasAudio, hasPdf].filter(Boolean).length >= 2) return 'Mixto'
  if (hasVideo) return 'Vídeo'
  if (hasAudio) return 'Audio'
  if (hasPdf) return 'PDF'

  return 'Texto'
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
  const bOrder = Number(b.order ?? b.position ?? b.sort_order ?? b.order_index ?? 999)

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

function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --green: ${GREEN};
        --green-rgb: 99, 229, 70;
        --bg: #050706;
        --panel: rgba(8,12,10,.92);
        --white: #f4f6f2;
        --muted: rgba(244,246,242,.62);
        --soft: rgba(244,246,242,.44);
        --gold: #d6b25e;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: var(--bg);
      }

      body {
        color: var(--white);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      a {
        color: inherit;
      }

      button {
        font: inherit;
      }

      .lesson-dashboard-page {
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 12% -10%, rgba(var(--green-rgb), .075), transparent 32%),
          radial-gradient(circle at 96% 8%, rgba(255,255,255,.035), transparent 28%),
          linear-gradient(135deg, #050706 0%, #070a09 46%, #030404 100%);
        color: var(--white);
      }

      .background {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 0;
      }

      .orb {
        position: absolute;
        border-radius: 999px;
        filter: blur(100px);
      }

      .orb-one {
        width: 520px;
        height: 520px;
        top: -220px;
        left: -180px;
        background: rgba(var(--green-rgb), .10);
      }

      .orb-two {
        width: 520px;
        height: 520px;
        right: -260px;
        top: 110px;
        background: rgba(120,135,130,.09);
      }

      .grid-texture {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
        background-size: 42px 42px;
        opacity: .34;
        mask-image: radial-gradient(circle at center, black 0%, transparent 82%);
      }

      .icon-rail {
        position: fixed;
        z-index: 4;
        left: 0;
        top: 0;
        width: 64px;
        height: 100vh;
        border-right: 1px solid rgba(255,255,255,.07);
        background: rgba(4,6,5,.80);
        display: grid;
        align-content: start;
        justify-items: center;
        gap: 24px;
        padding: 22px 0;
      }

      .icon-rail button,
      .icon-rail span {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        border: 1px solid transparent;
        color: rgba(244,246,242,.48);
        background: transparent;
      }

      .icon-rail span:nth-child(3) {
        color: var(--green);
        border-color: rgba(var(--green-rgb), .18);
        background: rgba(var(--green-rgb), .07);
      }

      .lesson-sidebar {
        position: fixed;
        z-index: 3;
        left: 64px;
        top: 0;
        width: 294px;
        height: 100vh;
        border-right: 1px solid rgba(255,255,255,.075);
        background:
          linear-gradient(180deg, rgba(8,11,10,.985), rgba(3,5,4,.965)),
          #050706;
        padding: 22px 22px 18px;
        display: grid;
        grid-template-rows: auto auto auto 1fr auto;
        gap: 18px;
        box-shadow: 18px 0 80px rgba(0,0,0,.22);
        overflow: hidden;
      }

      .brand strong,
      .brand span {
        display: block;
        text-transform: uppercase;
      }

      .brand strong {
        color: var(--green);
        font-size: 32px;
        line-height: .9;
        letter-spacing: .02em;
        font-weight: 950;
      }

      .brand span {
        color: var(--green);
        font-size: 13px;
        letter-spacing: .18em;
        font-weight: 950;
      }

      .back-link {
        width: fit-content;
        border: 0;
        background: transparent;
        color: var(--green);
        padding: 0;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
      }

      .course-mini p,
      .sidebar-modules > p {
        margin: 0 0 10px;
        color: rgba(244,246,242,.44);
        text-transform: uppercase;
        letter-spacing: .14em;
        font-size: 10px;
        font-weight: 900;
      }

      .course-mini h2 {
        margin: 0 0 18px;
        color: var(--white);
        font-size: 20px;
        line-height: 1.1;
        letter-spacing: -.03em;
      }

      .progress-copy {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        color: rgba(244,246,242,.55);
        font-size: 12px;
      }

      .progress-copy strong {
        color: var(--green);
      }

      .bar {
        height: 8px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255,255,255,.075);
        margin: 9px 0;
      }

      .bar div {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--green), #7bee65);
        box-shadow: 0 0 22px rgba(var(--green-rgb), .26);
      }

      .sidebar-progress small {
        color: rgba(244,246,242,.46);
      }

      .sidebar-modules {
        overflow-y: auto;
        padding-right: 4px;
      }

      .sidebar-modules::-webkit-scrollbar {
        width: 6px;
      }

      .sidebar-modules::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(255,255,255,.08);
      }

      .side-module {
        border-top: 1px solid rgba(255,255,255,.07);
        padding: 14px 0;
      }

      .side-module.expanded {
        border-radius: 14px;
        border: 1px solid rgba(var(--green-rgb), .22);
        background: rgba(var(--green-rgb), .055);
        padding: 12px;
        margin: 8px 0;
      }

      .side-module-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .side-module-head strong,
      .side-module-head span {
        display: block;
      }

      .side-module-head strong {
        color: var(--white);
        font-size: 13px;
      }

      .side-module-head span,
      .side-module-head em {
        color: rgba(244,246,242,.52);
        font-size: 12px;
        font-style: normal;
      }

      .side-lessons {
        display: grid;
        gap: 6px;
        margin-top: 10px;
      }

      .side-lesson {
        min-height: 42px;
        display: grid;
        grid-template-columns: 24px minmax(0, 1fr);
        gap: 8px;
        align-items: center;
        border: 1px solid transparent;
        background: transparent;
        color: rgba(244,246,242,.68);
        text-align: left;
        border-radius: 10px;
        padding: 7px 8px;
        cursor: pointer;
      }

      .side-lesson.active {
        border-color: rgba(var(--green-rgb), .26);
        background: rgba(var(--green-rgb), .08);
        color: var(--white);
      }

      .side-lesson span {
        color: var(--green);
      }

      .side-lesson small,
      .side-lesson strong {
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .side-lesson small {
        color: rgba(244,246,242,.44);
        font-size: 10px;
      }

      .side-lesson strong {
        color: inherit;
        font-size: 12px;
      }

      .support-card {
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.085);
        background: rgba(255,255,255,.026);
        padding: 16px;
        display: grid;
        gap: 8px;
      }

      .support-card strong {
        color: var(--white);
      }

      .support-card span {
        color: rgba(244,246,242,.52);
        font-size: 12px;
      }

      .support-card button {
        min-height: 36px;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .26);
        background: rgba(var(--green-rgb), .08);
        color: var(--green);
        font-weight: 900;
      }

      .lesson-shell {
        position: relative;
        z-index: 1;
        margin-left: 358px;
        min-height: 100vh;
      }

      .lesson-topbar {
        position: sticky;
        top: 0;
        z-index: 2;
        min-height: 64px;
        border-bottom: 1px solid rgba(255,255,255,.075);
        background: rgba(5,7,6,.82);
        backdrop-filter: blur(18px);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 0 28px;
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        color: rgba(244,246,242,.56);
      }

      .breadcrumb button {
        border: 0;
        background: transparent;
        color: rgba(244,246,242,.62);
        padding: 0;
        cursor: pointer;
      }

      .breadcrumb strong,
      .breadcrumb b {
        color: rgba(244,246,242,.78);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .breadcrumb b {
        color: var(--white);
      }

      .top-actions {
        display: flex;
        gap: 10px;
        flex-shrink: 0;
      }

      .top-actions button,
      .complete-top,
      .primary-action {
        min-height: 42px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.035);
        color: rgba(244,246,242,.82);
        padding: 0 14px;
        font-weight: 900;
        cursor: pointer;
      }

      .complete-top,
      .primary-action {
        border-color: rgba(255,255,255,.12);
        background: rgba(255,255,255,.035);
        color: var(--white);
      }

      .complete-top.done,
      .primary-action.as-button {
        border-color: rgba(var(--green-rgb), .30);
        background: rgba(var(--green-rgb), .10);
        color: var(--green);
      }

      .lesson-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 28px;
        padding: 38px 34px 46px;
        align-items: start;
      }

      .lesson-main {
        min-width: 0;
        display: grid;
        gap: 18px;
      }

      .lesson-heading p {
        margin: 0 0 12px;
        color: var(--white);
        font-size: clamp(24px, 2.8vw, 34px);
        font-weight: 950;
        letter-spacing: -.04em;
      }

      .lesson-heading h1 {
        margin: 0;
        color: var(--white);
        font-size: clamp(30px, 4vw, 52px);
        line-height: .96;
        letter-spacing: -.055em;
        font-weight: 950;
      }

      .lesson-heading span {
        display: block;
        max-width: 740px;
        margin-top: 14px;
        color: var(--muted);
        line-height: 1.55;
      }

      .viewer-card,
      .description-card,
      .bottom-navigation button,
      .bottom-navigation div,
      .panel-card,
      .loading-card {
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.085);
        background:
          radial-gradient(circle at top right, rgba(var(--green-rgb), .055), transparent 34%),
          linear-gradient(145deg, rgba(255,255,255,.052), rgba(255,255,255,.018)),
          rgba(8,12,10,.92);
        box-shadow: 0 24px 82px rgba(0,0,0,.22);
      }

      .viewer-card {
        padding: 6px;
        overflow: hidden;
      }

      .asset-loading,
      .empty-stage {
        padding: 24px;
        color: rgba(244,246,242,.66);
      }

      .video-stage {
        position: relative;
        background: #020403;
        border-radius: 14px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.075);
      }

      .video-stage video {
        width: 100%;
        min-height: 430px;
        max-height: 68vh;
        display: block;
        background: #000;
        object-fit: contain;
      }

      .video-stage button,
      .pdf-actions button,
      .pdf-actions a {
        min-height: 38px;
        height: 38px;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .26);
        background: rgba(var(--green-rgb), .10);
        color: var(--green);
        padding: 0 14px;
        font-weight: 900;
        font-size: 13px;
        line-height: 1;
        text-decoration: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
        white-space: nowrap;
        appearance: none;
        -webkit-appearance: none;
      }

      .video-stage > button {
        position: absolute;
        right: 18px;
        top: 18px;
      }

      .audio-stage {
        min-height: 160px;
        display: grid;
        grid-template-columns: 110px minmax(0, 1fr);
        gap: 20px;
        align-items: center;
        padding: 24px;
      }

      .audio-brand {
        width: 92px;
        height: 92px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(var(--green-rgb), .24);
        background: rgba(var(--green-rgb), .08);
        color: var(--green);
        font-size: 22px;
        font-weight: 950;
      }

      .audio-stage p,
      .audio-stage strong {
        display: block;
        margin: 0;
      }

      .audio-stage p {
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: .14em;
        font-size: 10px;
        font-weight: 950;
      }

      .audio-stage strong {
        color: var(--white);
        font-size: 22px;
        margin: 7px 0 12px;
      }

      .audio-stage audio {
        width: 100%;
        accent-color: var(--green);
      }

      .pdf-stage {
        display: grid;
        gap: 0;
      }

      .pdf-actions {
        min-height: 58px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255,255,255,.075);
      }

      .pdf-actions p {
        margin: 0;
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: .14em;
        font-size: 10px;
        font-weight: 950;
      }

      .pdf-actions > div {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }

      .pdf-stage iframe {
        width: 100%;
        min-height: 680px;
        border: 0;
        background: rgba(255,255,255,.035);
      }

      .text-stage {
        padding: 24px;
        color: rgba(244,246,242,.78);
        line-height: 1.7;
      }

      .description-card {
        padding: 24px;
      }

      .description-card h2 {
        margin: 0 0 8px;
        color: var(--white);
        font-size: 20px;
      }

      .description-card p {
        color: var(--muted);
        line-height: 1.65;
      }

      .learning-points {
        margin-top: 18px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.075);
        background: rgba(255,255,255,.026);
        padding: 16px;
      }

      .learning-points strong {
        color: var(--white);
      }

      .learning-points ul {
        display: grid;
        gap: 8px;
        margin: 12px 0 0;
        padding-left: 0;
        list-style: none;
      }

      .learning-points li {
        color: rgba(244,246,242,.70);
      }

      .learning-points li::before {
        content: '✓';
        color: var(--green);
        margin-right: 8px;
      }

      .bottom-navigation {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }

      .bottom-navigation button,
      .bottom-navigation div {
        min-height: 82px;
        padding: 16px;
        text-align: left;
        color: var(--white);
      }

      .bottom-navigation .next {
        border-color: rgba(var(--green-rgb), .26);
      }

      .bottom-navigation span,
      .bottom-navigation strong {
        display: block;
      }

      .bottom-navigation span {
        color: rgba(244,246,242,.46);
        margin-bottom: 6px;
      }

      .lesson-sidepanel {
        position: sticky;
        top: 86px;
        display: grid;
        gap: 18px;
      }

      .panel-card {
        padding: 20px;
      }

      .panel-card h3 {
        margin: 0 0 16px;
        color: var(--white);
        font-size: 18px;
      }

      .panel-card p,
      .panel-card span {
        color: var(--muted);
        line-height: 1.55;
      }

      .panel-card p strong {
        color: var(--green);
        font-size: 20px;
      }

      .lesson-data div,
      .resource-row {
        min-height: 36px;
        border-top: 1px solid rgba(255,255,255,.055);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .lesson-data div span,
      .resource-row span {
        color: rgba(244,246,242,.52);
      }

      .lesson-data div strong,
      .resource-row strong,
      .green {
        color: var(--green) !important;
      }

      .resource-row:not(.active) strong {
        color: rgba(244,246,242,.42) !important;
      }

      .module-state.complete {
        border-color: rgba(var(--green-rgb), .24);
      }

      .module-state > strong {
        display: block;
        color: var(--white);
        margin-bottom: 12px;
      }

      .module-state em {
        display: inline-flex;
        width: fit-content;
        margin-top: 12px;
        border-radius: 999px;
        border: 1px solid rgba(214,178,94,.24);
        background: rgba(214,178,94,.08);
        color: var(--gold);
        padding: 7px 10px;
        font-style: normal;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: .10em;
        text-transform: uppercase;
      }

      .complete-card button {
        width: 100%;
        min-height: 42px;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .30);
        background: linear-gradient(135deg, var(--green), #7bee65);
        color: #061008;
        font-weight: 950;
        cursor: pointer;
      }

      .complete-card button:disabled {
        opacity: .72;
        cursor: default;
      }

      .completion-message {
        display: block;
        margin-top: 12px;
        color: var(--green);
        font-size: 12px;
        font-weight: 850;
      }

      .video-fullscreen,
      .pdf-fullscreen {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: #050706;
        display: grid;
        grid-template-rows: 74px minmax(0, 1fr);
      }

      .fullscreen-top {
        border-bottom: 1px solid rgba(255,255,255,.09);
        background: rgba(8,12,10,.98);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 12px 20px;
      }

      .fullscreen-top div {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      .fullscreen-top span {
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: .16em;
        font-size: 10px;
        font-weight: 950;
      }

      .fullscreen-top strong {
        color: var(--white);
        font-size: 15px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .fullscreen-top button {
        min-height: 42px;
        border-radius: 999px;
        border: 1px solid rgba(var(--green-rgb), .30);
        background: linear-gradient(135deg, var(--green), #7bee65);
        color: #061008;
        padding: 0 16px;
        font-weight: 950;
        cursor: pointer;
      }

      .video-fullscreen video,
      .pdf-fullscreen iframe {
        width: 100%;
        height: 100%;
        border: 0;
        background: #000;
        object-fit: contain;
      }

      .loading {
        display: grid;
        place-items: center;
      }

      .loading-card {
        position: relative;
        z-index: 1;
        width: min(720px, calc(100vw - 40px));
        padding: 34px;
      }

      .loading-card p {
        color: var(--green);
        text-transform: uppercase;
        letter-spacing: .16em;
        font-size: 10px;
        font-weight: 950;
      }

      .loading-card h1 {
        margin: 10px 0;
        font-size: clamp(34px, 5vw, 58px);
        line-height: .95;
        letter-spacing: -.06em;
      }

      .loading-card span {
        color: var(--muted);
        line-height: 1.6;
      }

      @media (max-width: 1320px) {
        .lesson-layout {
          grid-template-columns: 1fr;
        }

        .lesson-sidepanel {
          position: static;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          display: grid;
        }
      }

      @media (max-width: 1040px) {
        .icon-rail,
        .lesson-sidebar {
          display: none;
        }

        .lesson-shell {
          margin-left: 0;
        }

        .lesson-topbar {
          flex-direction: column;
          align-items: flex-start;
          padding: 14px 18px;
        }

        .lesson-layout {
          padding: 22px 18px 34px;
        }
      }

      @media (max-width: 760px) {
        .lesson-sidepanel,
        .bottom-navigation {
          grid-template-columns: 1fr;
        }

        .breadcrumb {
          flex-wrap: wrap;
        }

        .top-actions {
          width: 100%;
          flex-wrap: wrap;
        }

        .top-actions button,
        .complete-top {
          flex: 1;
        }

        .video-stage video {
          min-height: 280px;
        }

        .audio-stage {
          grid-template-columns: 1fr;
        }

        .pdf-stage iframe {
          min-height: 620px;
        }

        .pdf-actions {
          align-items: flex-start;
          flex-direction: column;
        }

        .pdf-actions > div {
          width: 100%;
          flex-wrap: wrap;
        }

        .pdf-actions button,
        .pdf-actions a {
          flex: 1;
          min-width: 150px;
        }
      }
    `}</style>
  )
}
