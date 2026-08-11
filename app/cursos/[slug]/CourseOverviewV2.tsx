'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../../components/GHCLogo'
import styles from './CourseOverviewV2.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type AnyRecord = Record<string, any>

type CatalogLesson = {
  id: string
  title: string
  content_type?: string | null
  duration_minutes?: number | null
  position?: number | null
}

type CatalogModule = {
  id: string
  title: string
  description?: string | null
  position?: number | null
  lessons: CatalogLesson[]
}

type Catalog = {
  id: string
  title: string
  slug: string
  subtitle?: string | null
  description?: string | null
  course_type?: string | null
  level?: string | null
  cover_image?: string | null
  duration_minutes?: number | null
  has_certificate?: boolean
  requires_exam?: boolean
  modules: CatalogModule[]
}

type EnrollmentCourse = {
  id: string
  slug: string
  title: string
  next_action_lesson_id?: string | null
  last_opened_lesson_id?: string | null
  final_exam_unlocked?: boolean
  progress?: {
    percent?: number
    total_lessons?: number
    completed_lessons?: number
    total_modules?: number
    completed_modules?: number
  }
}

function routeParam(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || '')
  return String(value || '')
}

function studentFacingText(value: unknown) {
  return String(value || '').replace(/\bPDF\b/gi, 'Manual')
}

function contentTypeLabel(value: unknown) {
  const type = String(value || '').toLowerCase()
  if (type.includes('video')) return 'Vídeo'
  if (type.includes('audio')) return 'Audio'
  if (type.includes('pdf') || type.includes('document')) return 'Manual'
  if (type.includes('mixt') || type.includes('mixed')) return 'Clase mixta'
  return 'Lección'
}

function formatHours(minutes: number) {
  if (!minutes || minutes < 1) return '—'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round((minutes / 60) * 10) / 10
  return `${hours.toLocaleString('es-ES')} h`
}

export default function CourseOverviewV2() {
  const params = useParams()
  const router = useRouter()
  const slug = routeParam(params?.slug)

  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [enrollment, setEnrollment] = useState<EnrollmentCourse | null>(null)
  const [learningExperience, setLearningExperience] = useState<AnyRecord | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!slug) return

      try {
        setLoading(true)
        setError('')

        const { data: catalogData, error: catalogError } = await supabase.rpc('ghc_public_get_course_catalog', {
          p_course_slug: slug
        })

        if (catalogError) throw new Error(catalogError.message)
        if (!catalogData) throw new Error('No se encontró este curso.')

        if (!active) return
        setCatalog(catalogData as Catalog)

        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user || null
        if (!user) {
          setAuthenticated(false)
          setEnrollment(null)
          setLearningExperience(null)
          return
        }

        setAuthenticated(true)

        const { data: myCoursesData, error: myCoursesError } = await supabase.rpc('ghc_student_get_my_courses')
        if (myCoursesError) throw new Error(myCoursesError.message)

        const course = (Array.isArray(myCoursesData) ? myCoursesData : []).find((item: AnyRecord) => item.slug === slug) || null
        if (!active) return
        setEnrollment(course)

        if (course?.next_action_lesson_id) {
          const { data: experienceData, error: experienceError } = await supabase.rpc('ghc_student_get_lesson_experience', {
            p_course_slug: slug,
            p_lesson_id: course.next_action_lesson_id
          })

          if (!experienceError && experienceData?.allowed && active) {
            setLearningExperience(experienceData)
          }
        }
      } catch (loadError: any) {
        if (active) setError(loadError?.message || 'No se pudo cargar el curso.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [slug])

  const lessonState = useMemo(() => {
    const map = new Map<string, { completed: boolean; accessible: boolean }>()
    const modules = learningExperience?.modules || []
    modules.forEach((module: AnyRecord) => {
      ;(module.lessons || []).forEach((lesson: AnyRecord) => {
        map.set(String(lesson.id), {
          completed: Boolean(lesson.completed),
          accessible: Boolean(lesson.accessible)
        })
      })
    })
    return map
  }, [learningExperience])

  const totals = useMemo(() => {
    const modules = catalog?.modules || []
    const lessons = modules.reduce((sum, module) => sum + (module.lessons || []).length, 0)
    return { modules: modules.length, lessons }
  }, [catalog])

  const progress = Number(enrollment?.progress?.percent || 0)

  const openNextAction = () => {
    if (!catalog) return
    if (enrollment?.next_action_lesson_id) {
      router.push(`/cursos/${catalog.slug}/${enrollment.next_action_lesson_id}`)
      return
    }
    router.push('/alumno')
  }

  const openLesson = (lesson: CatalogLesson) => {
    if (!enrollment) return
    const state = lessonState.get(lesson.id)
    if (!state?.accessible && !state?.completed) return
    router.push(`/cursos/${catalog?.slug}/${lesson.id}`)
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <header className={styles.topbar}>
          <GHCLogo size="md" showText tagline={false} />
        </header>
        <section className={styles.loading}>
          <div className={styles.stateCard}>
            <h1>Preparando el curso</h1>
            <p>Cargando estructura y estado de acceso.</p>
          </div>
        </section>
      </main>
    )
  }

  if (error || !catalog) {
    return (
      <main className={styles.page}>
        <header className={styles.topbar}>
          <GHCLogo size="md" showText tagline={false} />
          <div className={styles.topbarActions}>
            <button className={styles.ghostButton} type="button" onClick={() => router.push('/')}>
              Inicio
            </button>
          </div>
        </header>
        <section className={styles.error}>
          <div className={styles.stateCard}>
            <h1>Curso no disponible</h1>
            <p>{error || 'No se encontró este curso.'}</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <GHCLogo size="md" showText tagline={false} />
        <div className={styles.topbarActions}>
          {authenticated && (
            <button className={styles.ghostButton} type="button" onClick={() => router.push('/alumno')}>
              Área de alumno
            </button>
          )}
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => router.push(authenticated ? '/alumno' : '/acceso')}
          >
            {authenticated ? 'Mi área' : 'Acceder'}
          </button>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroMain}>
            <p className={styles.eyebrow}>GHC Academy · {studentFacingText(catalog.level || 'Formación')}</p>
            <h1>{studentFacingText(catalog.title)}</h1>
            {catalog.subtitle && <p className={styles.subtitle}>{studentFacingText(catalog.subtitle)}</p>}
            {catalog.description && <p className={styles.description}>{studentFacingText(catalog.description)}</p>}

            <div className={styles.heroActions}>
              {enrollment ? (
                <button className={styles.primaryButton} type="button" onClick={openNextAction}>
                  {progress > 0 ? 'Continuar formación' : 'Empezar formación'}
                </button>
              ) : authenticated ? (
                <button className={styles.secondaryButton} type="button" onClick={() => router.push('/alumno')}>
                  Ver mis cursos
                </button>
              ) : (
                <button className={styles.primaryButton} type="button" onClick={() => router.push('/acceso')}>
                  Iniciar sesión
                </button>
              )}
            </div>
          </div>

          <aside className={styles.heroSide}>
            <h2>{enrollment ? 'Tu estado' : 'Programa formativo'}</h2>
            <span className={enrollment ? styles.successPill : styles.statusPill}>
              {enrollment ? 'Matrícula activa' : 'Vista del programa'}
            </span>
            {enrollment ? (
              <>
                <strong className={styles.progressNumber}>{progress}%</strong>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
                <p>{Number(enrollment.progress?.completed_lessons || 0)} de {Number(enrollment.progress?.total_lessons || totals.lessons)} lecciones completadas.</p>
              </>
            ) : (
              <>
                <strong className={styles.progressNumber}>{totals.modules}</strong>
                <p>Módulos visibles como estructura. El contenido académico requiere una matrícula activa.</p>
              </>
            )}
          </aside>
        </section>

        <section className={styles.metaGrid}>
          <article className={styles.metaCard}>
            <small>Módulos</small>
            <strong>{totals.modules}</strong>
          </article>
          <article className={styles.metaCard}>
            <small>Lecciones</small>
            <strong>{totals.lessons}</strong>
          </article>
          <article className={styles.metaCard}>
            <small>Duración orientativa</small>
            <strong>{formatHours(Number(catalog.duration_minutes || 0))}</strong>
          </article>
          <article className={styles.metaCard}>
            <small>Certificación</small>
            <strong>{catalog.has_certificate ? 'Incluida' : 'No incluida'}</strong>
          </article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Ruta de aprendizaje</h2>
              <p>{enrollment ? 'Avanza en orden. Puedes volver a lo ya completado, pero no saltarte los prerrequisitos.' : 'Puedes consultar la estructura del programa; el material y las evaluaciones quedan protegidos.'}</p>
            </div>
          </div>

          <div className={styles.moduleList}>
            {(catalog.modules || []).map((module, moduleIndex) => {
              const completedInModule = (module.lessons || []).filter((lesson) => lessonState.get(lesson.id)?.completed).length
              return (
                <article className={styles.moduleCard} key={module.id}>
                  <header className={styles.moduleHeader}>
                    <div>
                      <small>Módulo {moduleIndex + 1}</small>
                      <h3>{studentFacingText(module.title)}</h3>
                      {module.description && <p>{studentFacingText(module.description)}</p>}
                    </div>
                    <span>{enrollment ? `${completedInModule}/${module.lessons.length} lecciones` : `${module.lessons.length} lecciones`}</span>
                  </header>

                  <div className={styles.lessons}>
                    {(module.lessons || []).map((lesson, lessonIndex) => {
                      const state = lessonState.get(lesson.id)
                      const clickable = Boolean(enrollment && (state?.accessible || state?.completed))
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          className={clickable ? styles.lessonRowClickable : styles.lessonRow}
                          onClick={() => openLesson(lesson)}
                          disabled={!clickable}
                        >
                          <span className={styles.lessonIndex}>{moduleIndex + 1}.{lessonIndex + 1}</span>
                          <span className={styles.lessonCopy}>
                            <strong>{studentFacingText(lesson.title)}</strong>
                            <small>{contentTypeLabel(lesson.content_type)}{Number(lesson.duration_minutes || 0) > 0 ? ` · ${Number(lesson.duration_minutes)} min` : ''}</small>
                          </span>
                          <span className={state?.completed ? styles.lessonStateDone : styles.lessonState}>
                            {state?.completed ? 'Completada' : clickable ? 'Disponible' : enrollment ? 'Bloqueada' : 'Contenido protegido'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <div className={styles.footerNote}>
          El acceso a material, evaluaciones, progreso y certificación depende de una matrícula activa. La estructura pública no contiene las rutas ni el contenido protegido de las lecciones.
        </div>
      </div>
    </main>
  )
}
