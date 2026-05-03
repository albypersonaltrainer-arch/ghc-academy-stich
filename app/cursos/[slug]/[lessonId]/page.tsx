'use client'

import { useEffect, useState } from 'react'
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

  // =========================================
  // 1. OBTENER USUARIO
  // =========================================
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }

    getUser()
  }, [])

  // =========================================
  // 2. CARGAR CURSO + MÓDULOS + LECCIONES
  // =========================================
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .single()

      setCourse(courseData)

      const { data: modulesData } = await supabase
        .from('modules')
        .select(`
          *,
          lessons (*)
        `)
        .eq('course_id', courseData.id)
        .order('order', { ascending: true })

      modulesData?.forEach((m: any) => {
        m.lessons.sort((a: any, b: any) => a.order - b.order)
      })

      setModules(modulesData || [])

      const lesson = modulesData
        ?.flatMap((m: any) => m.lessons)
        .find((l: any) => l.id === lessonId)

      setCurrentLesson(lesson)
    }

    fetchData()
  }, [slug, lessonId])

  // =========================================
  // 3. CARGAR PROGRESO REAL
  // =========================================
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return

      const { data } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)

      if (data) {
        setCompletedLessons(data.map((p: any) => p.lesson_id))
      }
    }

    fetchProgress()
  }, [user])

  // =========================================
  // 4. MARCAR COMO COMPLETADA
  // =========================================
  const markAsCompleted = async () => {
    if (!user || !currentLesson || !course) return

    await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        course_id: course.id,
        module_id: currentLesson.module_id,
        lesson_id: currentLesson.id,
        completed: true,
        completed_at: new Date().toISOString()
      })

    setCompletedLessons((prev) => [...prev, currentLesson.id])
  }

  // =========================================
  // 5. NAVEGACIÓN
  // =========================================
  const allLessons = modules.flatMap((m: any) => m.lessons)

  const currentIndex = allLessons.findIndex(
    (l: any) => l.id === lessonId
  )

  const prevLesson = allLessons[currentIndex - 1]
  const nextLesson = allLessons[currentIndex + 1]

  const goToLesson = (lessonId: string) => {
    router.push(`/cursos/${slug}/${lessonId}`)
  }

  // =========================================
  // 6. PROGRESO %
  // =========================================
  const totalLessons = allLessons.length
  const completedCount = completedLessons.length

  const progress =
    totalLessons > 0
      ? Math.round((completedCount / totalLessons) * 100)
      : 0

  // =========================================
  // LOADING
  // =========================================
  if (loading || !currentLesson) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        Cargando...
      </div>
    )
  }

  // =========================================
  // RENDER CONTENIDO
  // =========================================
  const renderContent = () => {
    switch (currentLesson.type) {
      case 'video':
        return (
          <video
            src={currentLesson.content}
            controls
            className="w-full rounded-xl"
          />
        )

      case 'audio':
        return (
          <audio controls className="w-full">
            <source src={currentLesson.content} />
          </audio>
        )

      case 'pdf':
        return (
          <iframe
            src={currentLesson.content}
            className="w-full h-[600px]"
          />
        )

      case 'text':
        return (
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: currentLesson.content
            }}
          />
        )

      default:
        return <p>Contenido no soportado</p>
    }
  }

  // =========================================
  // UI
  // =========================================
  return (
    <div className="flex h-screen bg-black text-white">

      {/* SIDEBAR */}
      <div className="w-80 border-r border-gray-800 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{course?.title}</h2>

        {modules.map((module: any) => (
          <div key={module.id} className="mb-4">
            <h3 className="text-green-400 font-semibold mb-2">
              {module.title}
            </h3>

            {module.lessons.map((lesson: any) => {
              const isActive = lesson.id === lessonId
              const isCompleted = completedLessons.includes(lesson.id)

              return (
                <div
                  key={lesson.id}
                  onClick={() => goToLesson(lesson.id)}
                  className={`cursor-pointer p-2 rounded-lg mb-1 ${
                    isActive
                      ? 'bg-green-600'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  {isCompleted ? '✓ ' : '▶ '}
                  {lesson.title}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* CONTENIDO */}
      <div className="flex-1 p-8 overflow-y-auto">

        {/* PROGRESO */}
        <div className="mb-6">
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm mt-2">{progress}% completado</p>
        </div>

        <h1 className="text-3xl font-bold mb-6">
          {currentLesson.title}
        </h1>

        {renderContent()}

        {/* BOTÓN COMPLETAR */}
        <button
          onClick={markAsCompleted}
          className="mt-8 bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-xl font-bold"
        >
          Marcar como completada
        </button>

        {/* NAVEGACIÓN */}
        <div className="flex justify-between mt-10">
          {prevLesson && (
            <button
              onClick={() => goToLesson(prevLesson.id)}
              className="px-4 py-2 bg-gray-800 rounded"
            >
              ← Anterior
            </button>
          )}

          {nextLesson && (
            <button
              onClick={() => goToLesson(nextLesson.id)}
              className="px-4 py-2 bg-gray-800 rounded"
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
