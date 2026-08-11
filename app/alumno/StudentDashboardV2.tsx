'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import GHCLogo from '../components/GHCLogo'
import styles from './StudentDashboardV2.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type Tab = 'inicio' | 'cursos' | 'progreso' | 'certificados'
type AnyRecord = Record<string, any>

type CourseCard = {
  id: string
  slug: string
  title: string
  subtitle?: string | null
  description?: string | null
  level?: string | null
  status?: string | null
  progress?: {
    percent?: number
    total_lessons?: number
    completed_lessons?: number
    total_modules?: number
    completed_modules?: number
  }
  access?: {
    status?: string | null
    source?: string | null
    granted_at?: string | null
    expires_at?: string | null
  }
  next_action_lesson_id?: string | null
  last_opened_lesson_id?: string | null
  final_exam_unlocked?: boolean
}

type CertificateCard = {
  id: string
  certificate_code?: string | null
  verification_slug?: string | null
  status?: string | null
  course_id?: string | null
  course_title?: string | null
  final_score?: number | null
  issued_at?: string | null
  revoked_at?: string | null
}

const NAV_ITEMS: Array<{ id: Tab; label: string; glyph: string }> = [
  { id: 'inicio', label: 'Inicio', glyph: '01' },
  { id: 'cursos', label: 'Mis cursos', glyph: '02' },
  { id: 'progreso', label: 'Mi progreso', glyph: '03' },
  { id: 'certificados', label: 'Certificados', glyph: '04' }
]

function firstName(value: string) {
  const cleaned = String(value || '').trim()
  return cleaned ? cleaned.split(/\s+/)[0] : 'Alumno'
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

function courseStatusLabel(course: CourseCard) {
  const percent = Number(course.progress?.percent || 0)
  if (percent >= 100) return 'Completado'
  if (percent > 0) return 'En curso'
  return 'Por empezar'
}

export default function StudentDashboardV2() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('inicio')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<AnyRecord | null>(null)
  const [courses, setCourses] = useState<CourseCard[]>([])
  const [certificates, setCertificates] = useState<CertificateCard[]>([])

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const { data: userData, error: userError } = await supabase.auth.getUser()
        const user = userData?.user

        if (userError || !user) {
          router.replace('/acceso')
          return
        }

        const [profileResult, coursesResult, certificatesResult] = await Promise.all([
          supabase.from('profiles').select('id, full_name, email, role').eq('id', user.id).maybeSingle(),
          supabase.rpc('ghc_student_get_my_courses'),
          supabase.rpc('ghc_student_get_my_certificates')
        ])

        if (coursesResult.error) throw new Error(coursesResult.error.message)
        if (certificatesResult.error) throw new Error(certificatesResult.error.message)

        if (!active) return

        setProfile(profileResult.data || {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email || 'Alumno',
          email: user.email,
          role: 'student'
        })
        setCourses(Array.isArray(coursesResult.data) ? coursesResult.data : [])
        setCertificates(Array.isArray(certificatesResult.data) ? certificatesResult.data : [])
      } catch (loadError: any) {
        if (active) setError(loadError?.message || 'No se pudo cargar tu área de alumno.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [router])

  const primaryCourse = courses[0] || null

  const totals = useMemo(() => {
    return courses.reduce(
      (acc, course) => {
        acc.lessons += Number(course.progress?.total_lessons || 0)
        acc.completedLessons += Number(course.progress?.completed_lessons || 0)
        acc.modules += Number(course.progress?.total_modules || 0)
        acc.completedModules += Number(course.progress?.completed_modules || 0)
        return acc
      },
      { lessons: 0, completedLessons: 0, modules: 0, completedModules: 0 }
    )
  }, [courses])

  const overallPercent = totals.lessons > 0
    ? Math.round((totals.completedLessons / totals.lessons) * 100)
    : 0

  const validCertificates = certificates.filter((certificate) => certificate.status === 'valid').length

  const openCourse = (course: CourseCard) => {
    if (!course.slug) return
    if (course.next_action_lesson_id) {
      router.push(`/cursos/${course.slug}/${course.next_action_lesson_id}`)
      return
    }
    router.push(`/cursos/${course.slug}`)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/acceso')
  }

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <section className={styles.loadingCard}>
          <GHCLogo size="md" showText tagline={false} />
          <h1>Preparando tu área</h1>
          <p>Cargando tus cursos, progreso y certificados.</p>
        </section>
      </main>
    )
  }

  const renderCourses = () => (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Formación activa</p>
        <h1>Mis cursos</h1>
        <p>Aquí solo aparecen las formaciones para las que tienes una matrícula activa.</p>
      </header>

      {courses.length ? (
        <div className={styles.courseGrid}>
          {courses.map((course) => {
            const percent = Number(course.progress?.percent || 0)
            return (
              <article className={styles.courseCard} key={course.id}>
                <div className={styles.courseTop}>
                  <small>GHC Academy</small>
                  <span>{courseStatusLabel(course)}</span>
                </div>
                <h3>{course.title}</h3>
                <p>{course.subtitle || course.description || 'Formación GHC Academy.'}</p>

                <div className={styles.courseProgress}>
                  <div className={styles.courseProgressRow}>
                    <span>{Number(course.progress?.completed_lessons || 0)} de {Number(course.progress?.total_lessons || 0)} lecciones</span>
                    <strong>{percent}%</strong>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                  </div>
                </div>

                <div className={styles.courseFooter}>
                  <span>{Number(course.progress?.completed_modules || 0)} de {Number(course.progress?.total_modules || 0)} módulos superados</span>
                  <button className={styles.primaryButton} type="button" onClick={() => openCourse(course)}>
                    {percent > 0 ? 'Continuar' : 'Empezar'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <section className={styles.emptyCard}>
          <div>
            <strong>No tienes cursos activos todavía</strong>
            <p>Cuando tu matrícula esté confirmada, tu formación aparecerá aquí automáticamente.</p>
          </div>
        </section>
      )}
    </>
  )

  const renderProgress = () => (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Tu ruta</p>
        <h1>Mi progreso</h1>
        <p>Un único lugar para ver cuánto has avanzado y cuál es tu siguiente paso.</p>
      </header>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <small>Avance global</small>
          <strong>{overallPercent}%</strong>
          <span>Calculado sobre las lecciones de tus cursos activos.</span>
        </article>
        <article className={styles.statCard}>
          <small>Lecciones</small>
          <strong>{totals.completedLessons}/{totals.lessons}</strong>
          <span>Completadas y guardadas en tu cuenta.</span>
        </article>
        <article className={styles.statCard}>
          <small>Módulos</small>
          <strong>{totals.completedModules}/{totals.modules}</strong>
          <span>Un módulo cuenta al superar su evaluación.</span>
        </article>
        <article className={styles.statCard}>
          <small>Certificados válidos</small>
          <strong>{validCertificates}</strong>
          <span>Emitidos tras completar el flujo correspondiente.</span>
        </article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Detalle por curso</h2>
            <p>Sin métricas duplicadas dentro de cada lección.</p>
          </div>
        </div>

        <div className={styles.progressList}>
          {courses.map((course) => {
            const percent = Number(course.progress?.percent || 0)
            return (
              <article className={styles.progressCard} key={course.id}>
                <div className={styles.progressHead}>
                  <div>
                    <h3>{course.title}</h3>
                    <p>{course.final_exam_unlocked ? 'Curso listo para su evaluación final.' : 'Sigue el orden del curso para desbloquear cada paso.'}</p>
                  </div>
                  <span className={styles.progressPercent}>{percent}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                </div>
                <div className={styles.progressDetails}>
                  <div className={styles.progressDetail}>
                    <small>Lecciones</small>
                    <strong>{Number(course.progress?.completed_lessons || 0)} / {Number(course.progress?.total_lessons || 0)}</strong>
                  </div>
                  <div className={styles.progressDetail}>
                    <small>Módulos</small>
                    <strong>{Number(course.progress?.completed_modules || 0)} / {Number(course.progress?.total_modules || 0)}</strong>
                  </div>
                  <div className={styles.progressDetail}>
                    <small>Siguiente paso</small>
                    <strong>{course.final_exam_unlocked ? 'Evaluación final' : 'Continuar curso'}</strong>
                  </div>
                </div>
              </article>
            )
          })}
          {!courses.length && (
            <section className={styles.emptyCard}>
              <div>
                <strong>Aún no hay progreso que mostrar</strong>
                <p>Tu progreso empezará a registrarse al comenzar una formación activa.</p>
              </div>
            </section>
          )}
        </div>
      </section>
    </>
  )

  const renderCertificates = () => (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Acreditación</p>
        <h1>Mis certificados</h1>
        <p>Solo se muestran certificados reales asociados a tu cuenta.</p>
      </header>

      <div className={styles.certificateList}>
        {certificates.map((certificate) => {
          const valid = certificate.status === 'valid'
          return (
            <article className={styles.certificateCard} key={certificate.id}>
              <div className={styles.certificateHead}>
                <div>
                  <h3>{certificate.course_title || 'Certificado GHC Academy'}</h3>
                  <p>{certificate.certificate_code || 'Código pendiente'}</p>
                </div>
                <span className={valid ? styles.certificateValid : styles.certificateInvalid}>
                  {valid ? 'Válido' : certificate.status || 'No válido'}
                </span>
              </div>
              <div className={styles.certificateMeta}>
                <span>Emitido: {formatDate(certificate.issued_at)}</span>
                {typeof certificate.final_score === 'number' && <span>Resultado: {certificate.final_score}%</span>}
              </div>
              {certificate.verification_slug && (
                <div style={{ marginTop: 16 }}>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => router.push(`/certificados/${certificate.verification_slug}`)}
                  >
                    Ver certificado
                  </button>
                </div>
              )}
            </article>
          )
        })}

        {!certificates.length && (
          <section className={styles.emptyCard}>
            <div>
              <strong>Aún no tienes certificados emitidos</strong>
              <p>Cuando completes una formación certificable y superes su evaluación final, aparecerá aquí.</p>
            </div>
          </section>
        )}
      </div>
    </>
  )

  const renderHome = () => (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>GHC Academy</p>
        <h1>Hola, {firstName(profile?.full_name || profile?.email || '')}</h1>
        <p>Tu formación, sin distracciones: qué estás estudiando, qué te falta y qué debes hacer ahora.</p>
      </header>

      {primaryCourse ? (
        <section className={styles.heroCard}>
          <div className={styles.heroMain}>
            <p className={styles.eyebrow}>Continúa tu formación</p>
            <h2>{primaryCourse.title}</h2>
            <p>
              {Number(primaryCourse.progress?.percent || 0) > 0
                ? 'Retoma el curso desde el siguiente paso disponible. Tu progreso se conserva en tu cuenta.'
                : 'Tu matrícula está activa. Empieza por la primera lección y avanza paso a paso.'}
            </p>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton} type="button" onClick={() => openCourse(primaryCourse)}>
                {Number(primaryCourse.progress?.percent || 0) > 0 ? 'Continuar donde lo dejé' : 'Empezar curso'}
              </button>
              <button className={styles.secondaryButton} type="button" onClick={() => setTab('progreso')}>
                Ver mi progreso
              </button>
            </div>
          </div>

          <div className={styles.heroProgress}>
            <small>Avance del curso</small>
            <strong>{Number(primaryCourse.progress?.percent || 0)}%</strong>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${Number(primaryCourse.progress?.percent || 0)}%` }} />
            </div>
            <span>{Number(primaryCourse.progress?.completed_lessons || 0)} de {Number(primaryCourse.progress?.total_lessons || 0)} lecciones completadas</span>
          </div>
        </section>
      ) : (
        <section className={styles.emptyCard}>
          <div>
            <strong>No tienes una matrícula activa</strong>
            <p>Tu cuenta está creada, pero el acceso a una formación se concede solo cuando exista una matrícula válida.</p>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Tu panorama</h2>
            <p>La información global vive aquí, no repetida dentro de cada lección.</p>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <article className={styles.statCard}>
            <small>Cursos activos</small>
            <strong>{courses.length}</strong>
            <span>Solo matrículas activas.</span>
          </article>
          <article className={styles.statCard}>
            <small>Avance global</small>
            <strong>{overallPercent}%</strong>
            <span>Sobre todas tus lecciones activas.</span>
          </article>
          <article className={styles.statCard}>
            <small>Módulos superados</small>
            <strong>{totals.completedModules}</strong>
            <span>Con evaluación de módulo registrada.</span>
          </article>
          <article className={styles.statCard}>
            <small>Certificados válidos</small>
            <strong>{validCertificates}</strong>
            <span>Verificables públicamente.</span>
          </article>
        </div>
      </section>
    </>
  )

  const renderContent = () => {
    if (tab === 'cursos') return renderCourses()
    if (tab === 'progreso') return renderProgress()
    if (tab === 'certificados') return renderCertificates()
    return renderHome()
  }

  return (
    <main className={styles.page}>
      <aside className={styles.desktopNav}>
        <div className={styles.brand}>
          <GHCLogo size="md" showText tagline={false} />
        </div>

        <nav className={styles.navLinks} aria-label="Área de alumno">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? styles.navButtonActive : styles.navButton}
              type="button"
              onClick={() => setTab(item.id)}
            >
              <span className={styles.navGlyph}>{item.glyph}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.navFooter}>
          <div className={styles.userMini}>
            <strong>{profile?.full_name || 'Alumno GHC'}</strong>
            <span>{profile?.email || ''}</span>
          </div>
          <button className={styles.logoutButton} type="button" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>

      <section className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.topbarCopy}>
            <small>Área de alumno</small>
            <strong>{NAV_ITEMS.find((item) => item.id === tab)?.label || 'Inicio'}</strong>
          </div>
          <div className={styles.topbarActions}>
            {['admin', 'owner', 'superadmin'].includes(String(profile?.role || '')) && (
              <button className={styles.ghostButton} type="button" onClick={() => router.push('/ghc-control-center')}>
                Administración
              </button>
            )}
            <button className={styles.secondaryButton} type="button" onClick={logout}>Salir</button>
          </div>
        </header>

        <div className={styles.content}>
          {error && <div className={styles.errorBanner}>{error}</div>}
          {renderContent()}
        </div>
      </section>

      <nav className={styles.mobileNav} aria-label="Navegación móvil">
        {NAV_ITEMS.map((item) => (
          <button key={item.id} type="button" data-active={tab === item.id} onClick={() => setTab(item.id)}>
            <strong>{item.glyph}</strong>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}
