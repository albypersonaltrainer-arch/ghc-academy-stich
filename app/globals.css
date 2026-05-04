'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()

  const slug = String(params.slug || '')
  const lessonId = String(params.lessonId || '')

  const [user, setUser] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadAll = async () => {
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
          setErrorMessage('No se han podido cargar los módulos.')
          setLoading(false)
          return
        }

        const orderedModules = (modulesData || [])
          .map((module: any) => ({
            ...module,
            lessons: [...(module.lessons || [])].sort((a: any, b: any) => {
              return (
                (a.order || a.position || a.order_index || 0) -
                (b.order || b.position || b.order_index || 0)
              )
            })
          }))
          .sort((a: any, b: any) => {
            return (
              (a.order || a.position || a.order_index || 0) -
              (b.order || b.position || b.order_index || 0)
            )
          })

        setModules(orderedModules)

        const all = orderedModules.flatMap((m: any) => m.lessons || [])
        const activeLesson = all.find((lesson: any) => String(lesson.id) === lessonId)

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

          setCompletedLessons((progressData || []).map((p: any) => String(p.lesson_id)))
        }

        setLoading(false)
      } catch (error) {
        console.error(error)
        setErrorMessage('Ha ocurrido un error al cargar la lección.')
        setLoading(false)
      }
    }

    if (slug && lessonId) {
      loadAll()
    }
  }, [slug, lessonId])

  const allLessons = useMemo(() => {
    return modules.flatMap((module: any) => module.lessons || [])
  }, [modules])

  const currentIndex = allLessons.findIndex((lesson: any) => String(lesson.id) === lessonId)
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
    const type = String(
      currentLesson?.type ||
      currentLesson?.content_type ||
      currentLesson?.lesson_type ||
      'text'
    ).toLowerCase()

    const textContent =
      currentLesson?.content ||
      currentLesson?.body ||
      currentLesson?.text ||
      currentLesson?.description ||
      ''

    const videoUrl =
      currentLesson?.video_url ||
      currentLesson?.video ||
      currentLesson?.url ||
      (type === 'video' ? currentLesson?.content : '')

    const audioUrl =
      currentLesson?.audio_url ||
      currentLesson?.audio ||
      (type === 'audio' ? currentLesson?.content : '')

    const pdfUrl =
      currentLesson?.pdf_url ||
      currentLesson?.pdf ||
      currentLesson?.file_url ||
      (type === 'pdf' ? currentLesson?.content : '')

    return (
      <div className="space-y-8">
        {(type === 'video' || type === 'mixed' || type === 'mixto') && videoUrl && (
          <div className="rounded-3xl border border-[#00FF41]/20 bg-white/5 p-4">
            <video src={videoUrl} controls className="w-full rounded-2xl bg-black" />
          </div>
        )}

        {(type === 'audio' || type === 'mixed' || type === 'mixto') && audioUrl && (
          <div className="rounded-3xl border border-[#00FF41]/20 bg-white/5 p-6">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-[#00FF41]">
              Audio de la lección
            </p>
            <audio controls className="w-full">
              <source src={audioUrl} />
            </audio>
          </div>
        )}

        {(type === 'pdf' || type === 'mixed' || type === 'mixto') && pdfUrl && (
          <div className="overflow-hidden rounded-3xl border border-[#00FF41]/20 bg-white/5 p-4">
            <iframe src={pdfUrl} className="h-[650px] w-full rounded-2xl bg-white" />
          </div>
        )}

        {textContent ? (
          <div
            className="rounded-3xl border border-[#00FF41]/20 bg-white/5 p-8 text-lg leading-8 text-gray-200"
            dangerouslySetInnerHTML={{ __html: textContent }}
          />
        ) : (
          <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-yellow-200">
            Esta lección no tiene contenido visible cargado todavía.
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-3xl border border-[#00FF41]/30 bg-white/5 px-8 py-6 text-[#00FF41]">
          Cargando lección...
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="max-w-xl rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <h1 className="mb-4 text-2xl font-black">Error de lección</h1>
          <p className="mb-6 text-gray-300">{errorMessage}</p>
          <button
            onClick={() => router.push('/cursos')}
            className="rounded-2xl bg-[#00FF41] px-6 py-3 font-black text-black"
          >
            Volver a cursos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-96 border-r border-[#00FF41]/20 bg-black/90 p-6 lg:block">
          <div className="sticky top-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-[#00FF41]">
              GHC Academy
            </p>

            <h2 className="mb-6 text-2xl font-black">{course?.title}</h2>

            <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-gray-400">Progreso del curso</span>
                <span className="font-bold text-[#00FF41]">{progress}%</span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#00FF41]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="mt-3 text-xs text-gray-500">
                {completedLessons.length} de {allLessons.length} lecciones completadas
              </p>
            </div>

            <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-2">
              {modules.map((module: any, moduleIndex: number) => (
                <div key={module.id}>
                  <h3 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                    Módulo {moduleIndex + 1}: {module.title}
                  </h3>

                  <div className="space-y-2">
                    {(module.lessons || []).map((lesson: any) => {
                      const active = String(lesson.id) === lessonId
                      const completed = completedLessons.includes(String(lesson.id))

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => goToLesson(String(lesson.id))}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            active
                              ? 'border-[#00FF41] bg-[#00FF41]/15 text-white'
                              : 'border-white/10 bg-white/5 text-gray-300 hover:border-[#00FF41]/60'
                          }`}
                        >
                          <div className="flex gap-3">
                            <span className="text-[#00FF41]">
                              {completed ? '✓' : active ? '▶' : '○'}
                            </span>
                            <span className="text-sm font-semibold">{lesson.title}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 px-5 py-8 md:px-10 lg:px-14">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 rounded-3xl border border-[#00FF41]/20 bg-gradient-to-br from-[#00FF41]/10 to-white/5 p-6 md:p-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-[#00FF41]">
                Plataforma premium
              </p>

              <h1 className="mb-4 text-3xl font-black md:text-5xl">
                {currentLesson?.title}
              </h1>

              <div className="flex flex-wrap gap-3 text-sm text-gray-300">
                <span className="rounded-full border border-white/10 bg-black/50 px-4 py-2">
                  {course?.title}
                </span>
                <span className="rounded-full border border-white/10 bg-black/50 px-4 py-2">
                  Progreso: {progress}%
                </span>
                <span className="rounded-full border border-white/10 bg-black/50 px-4 py-2">
                  Lección {currentIndex + 1} de {allLessons.length}
                </span>
              </div>
            </div>

            {renderContent()}

            <div className="mt-10 rounded-3xl border border-[#00FF41]/20 bg-white/5 p-6">
              <button
                onClick={markAsCompleted}
                className="w-full rounded-2xl bg-[#00FF41] px-6 py-4 text-lg font-black text-black transition hover:scale-[1.01] hover:bg-[#39ff6a]"
              >
                Marcar lección como completada
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
              {previousLesson ? (
                <button
                  onClick={() => goToLesson(String(previousLesson.id))}
                  className="rounded-3xl border border-[#00FF41]/30 bg-white/5 p-6 text-left transition hover:border-[#00FF41]"
                >
                  <p className="mb-2 text-xl font-black text-[#00FF41]">← ANTERIOR</p>
                  <p className="text-sm text-gray-400">{previousLesson.title}</p>
                </button>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 opacity-50">
                  <p className="mb-2 text-xl font-black">Inicio del curso</p>
                  <p className="text-sm text-gray-400">No hay lección anterior</p>
                </div>
              )}

              {isLastLesson ? (
                <button
                  onClick={goToExam}
                  className="rounded-3xl border border-[#00FF41] bg-[#00FF41] p-6 text-left text-black transition hover:scale-[1.01] hover:bg-[#39ff6a]"
                >
                  <p className="mb-2 text-xl font-black">HACER EXAMEN FINAL →</p>
                  <p className="text-sm font-semibold text-black/70">
                    Último paso para completar el curso
                  </p>
                </button>
              ) : (
                <button
                  onClick={() => nextLesson && goToLesson(String(nextLesson.id))}
                  className="rounded-3xl border border-[#00FF41]/30 bg-white/5 p-6 text-left transition hover:border-[#00FF41]"
                >
                  <p className="mb-2 text-xl font-black text-[#00FF41]">SIGUIENTE →</p>
                  <p className="text-sm text-gray-400">
                    {nextLesson?.title || 'Continuar'}
                  </p>
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
