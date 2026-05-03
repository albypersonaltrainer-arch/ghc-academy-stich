'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()

  const slug = params.slug as string
  const lessonId = params.lessonId as string

  const [user, setUser] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }

    loadUser()
  }, [])

  useEffect(() => {
    const loadCourse = async () => {
      setLoading(true)

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (courseError || !courseData) {
        console.error(courseError)
        setLoading(false)
        return
      }

      setCourse(courseData)

      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          lessons (*)
        `)
        .eq('course_id', courseData.id)
        .order('order', { ascending: true })

      if (modulesError) {
        console.error(modulesError)
        setLoading(false)
        return
      }

      const orderedModules = (modulesData || []).map((module: any) => ({
        ...module,
        lessons: [...(module.lessons || [])].sort(
          (a: any, b: any) => (a.order || 0) - (b.order || 0)
        )
      }))

      setModules(orderedModules)

      const lesson = orderedModules
        .flatMap((module: any) => module.lessons)
        .find((lesson: any) => lesson.id === lessonId)

      setCurrentLesson(lesson || null)
      setLoading(false)
    }

    if (slug && lessonId) {
      loadCourse()
    }
  }, [slug, lessonId])

  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !course) return

      const { data, error } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .eq('completed', true)

      if (error) {
        console.error(error)
        return
      }

      setCompletedLessons((data || []).map((item: any) => item.lesson_id))
    }

    loadProgress()
  }, [user, course])

  const allLessons = useMemo(() => {
    return modules.flatMap((module: any) => module.lessons || [])
  }, [modules])

  const currentIndex = allLessons.findIndex((lesson: any) => lesson.id === lessonId)
  const previousLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null

  const isLastLesson =
    allLessons.length > 0 && currentIndex === allLessons.length - 1

  const completedCount = completedLessons.length
  const progress =
    allLessons.length > 0
      ? Math.round((completedCount / allLessons.length) * 100)
      : 0

  const markAsCompleted = async () => {
    if (!user) {
      alert('Para guardar tu progreso, primero debes iniciar sesión.')
      return
    }

    if (!course || !currentLesson) return

    const { error } = await supabase.from('lesson_progress').upsert(
      {
        user_id: user.id,
        course_id: course.id,
        module_id: currentLesson.module_id,
        lesson_id: currentLesson.id,
        completed: true,
        completed_at: new Date().toISOString(),
        last_opened_at: new Date().toISOString()
      },
      {
        onConflict: 'user_id,lesson_id'
      }
    )

    if (error) {
      console.error(error)
      alert('No se pudo guardar el progreso.')
      return
    }

    setCompletedLessons((prev) =>
      prev.includes(currentLesson.id) ? prev : [...prev, currentLesson.id]
    )
  }

  const goToLesson = (id: string) => {
    router.push(`/cursos/${slug}/${id}`)
  }

  const goToExam = () => {
    if (!course?.id) return
    router.push(`/exam/${course.id}`)
  }

  const renderContent = () => {
    if (!currentLesson) return null

    const type = currentLesson.type || currentLesson.content_type

    const textContent =
      currentLesson.content ||
      currentLesson.text ||
      currentLesson.description ||
      ''

    const videoUrl =
      currentLesson.video_url ||
      currentLesson.video ||
      (type === 'video' ? currentLesson.content : null)

    const audioUrl =
      currentLesson.audio_url ||
      currentLesson.audio ||
      (type === 'audio' ? currentLesson.content : null)

    const pdfUrl =
      currentLesson.pdf_url ||
      currentLesson.pdf ||
      (type === 'pdf' ? currentLesson.content : null)

    return (
      <div className="space-y-8">
        {(type === 'video' || type === 'mixed' || type === 'mixto') && videoUrl && (
          <div className="rounded-3xl border border-[#00FF41]/20 bg-white/5 p-4">
            <video
              src={videoUrl}
              controls
              className="w-full rounded-2xl bg-black"
            />
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
            <iframe
              src={pdfUrl}
              className="h-[650px] w-full rounded-2xl bg-white"
            />
          </div>
        )}

        {(type === 'text' || type === 'texto' || type === 'mixed' || type === 'mixto' || textContent) && (
          <div
            className="rounded-3xl border border-[#00FF41]/20 bg-white/5 p-8 text-lg leading-8 text-gray-200"
            dangerouslySetInnerHTML={{ __html: textContent }}
          />
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

  if (!currentLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="max-w-xl rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <h1 className="mb-4 text-2xl font-black">Lección no encontrada</h1>
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

            <h2 className="mb-6 text-2xl font-black">
              {course?.title}
            </h2>

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
                {completedCount} de {allLessons.length} lecciones completadas
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
                      const active = lesson.id === lessonId
                      const completed = completedLessons.includes(lesson.id)

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => goToLesson(lesson.id)}
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
                            <span className="text-sm font-semibold">
                              {lesson.title}
                            </span>
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
                {currentLesson.title}
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
                  onClick={() => goToLesson(previousLesson.id)}
                  className="rounded-3xl border border-[#00FF41]/30 bg-white/5 p-6 text-left transition hover:border-[#00FF41]"
                >
                  <p className="mb-2 text-xl font-black text-[#00FF41]">
                    ← ANTERIOR
                  </p>
                  <p className="text-sm text-gray-400">
                    {previousLesson.title}
                  </p>
                </button>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 opacity-50">
                  <p className="mb-2 text-xl font-black">Inicio del curso</p>
                  <p className="text-sm text-gray-400">
                    No hay lección anterior
                  </p>
                </div>
              )}

              {isLastLesson ? (
                <button
                  onClick={goToExam}
                  className="rounded-3xl border border-[#00FF41] bg-[#00FF41] p-6 text-left text-black transition hover:scale-[1.01] hover:bg-[#39ff6a]"
                >
                  <p className="mb-2 text-xl font-black">
                    HACER EXAMEN FINAL →
                  </p>
                  <p className="text-sm font-semibold text-black/70">
                    Último paso para completar el curso
                  </p>
                </button>
              ) : nextLesson ? (
                <button
                  onClick={() => goToLesson(nextLesson.id)}
                  className="rounded-3xl border border-[#00FF41]/30 bg-white/5 p-6 text-left transition hover:border-[#00FF41]"
                >
                  <p className="mb-2 text-xl font-black text-[#00FF41]">
                    SIGUIENTE →
                  </p>
                  <p className="text-sm text-gray-400">
                    {nextLesson.title}
                  </p>
                </button>
              ) : (
                <button
                  onClick={goToExam}
                  className="rounded-3xl border border-[#00FF41] bg-[#00FF41] p-6 text-left text-black transition hover:scale-[1.01] hover:bg-[#39ff6a]"
                >
                  <p className="mb-2 text-xl font-black">
                    HACER EXAMEN FINAL →
                  </p>
                  <p className="text-sm font-semibold text-black/70">
                    Último paso para completar el curso
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
