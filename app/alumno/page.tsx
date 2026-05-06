'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import GHCLogo from '../components/GHCLogo';

type AnyRecord = Record<string, any>;
type Tab = 'resumen' | 'cursos' | 'progreso' | 'certificados' | 'perfil';

type DashboardCard = {
  course: AnyRecord;
  courseModules: AnyRecord[];
  courseLessons: AnyRecord[];
  completedLessonCount: number;
  completedModuleCount: number;
  completion: AnyRecord | undefined;
  certificate: AnyRecord | undefined;
  progressPercent: number;
  nextLesson: AnyRecord | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const green = '#22D65B';
const white = '#F2F4F1';
const steel = '#A7B0AB';
const bg = '#050706';
const graphite = '#0B0E0D';

const tabs: { id: Tab; label: string; helper: string }[] = [
  { id: 'resumen', label: 'Resumen', helper: 'Vista general' },
  { id: 'cursos', label: 'Mis cursos', helper: 'Formación activa' },
  { id: 'progreso', label: 'Progreso', helper: 'Datos reales' },
  { id: 'certificados', label: 'Certificados', helper: 'Credenciales' },
  { id: 'perfil', label: 'Perfil', helper: 'Cuenta y acceso' },
];

export default function AlumnoPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('resumen');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<AnyRecord | null>(null);

  const [courses, setCourses] = useState<AnyRecord[]>([]);
  const [modules, setModules] = useState<AnyRecord[]>([]);
  const [lessons, setLessons] = useState<AnyRecord[]>([]);
  const [lessonProgress, setLessonProgress] = useState<AnyRecord[]>([]);
  const [moduleCompletions, setModuleCompletions] = useState<AnyRecord[]>([]);
  const [courseCompletions, setCourseCompletions] = useState<AnyRecord[]>([]);
  const [certificates, setCertificates] = useState<AnyRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [systemMessage, setSystemMessage] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setSystemMessage('');

        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
          router.replace('/acceso');
          return;
        }

        const activeUser = userData.user;
        setUser(activeUser);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeUser.id)
          .maybeSingle();

        setProfile(profileData || null);

        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*');

        if (coursesError) {
          console.error(coursesError);
          setSystemMessage('No se pudieron cargar los cursos.');
          setCourses([]);
          return;
        }

        const visibleCourses = Array.isArray(coursesData)
          ? coursesData
              .filter(isVisibleCourse)
              .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
          : [];

        setCourses(visibleCourses);

        const courseIds = visibleCourses.map((course) => course.id).filter(Boolean);

        if (courseIds.length > 0) {
          const { data: modulesData } = await supabase
            .from('modules')
            .select('*')
            .in('course_id', courseIds);

          const finalModules = Array.isArray(modulesData)
            ? [...modulesData].sort(sortModules)
            : [];

          setModules(finalModules);

          const moduleIds = finalModules.map((module) => module.id).filter(Boolean);

          if (moduleIds.length > 0) {
            const { data: lessonsData } = await supabase
              .from('lessons')
              .select('*')
              .in('module_id', moduleIds);

            setLessons(Array.isArray(lessonsData) ? [...lessonsData].sort(sortLessons) : []);
          } else {
            setLessons([]);
          }
        } else {
          setModules([]);
          setLessons([]);
        }

        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('completed', true);

        setLessonProgress(Array.isArray(progressData) ? progressData : []);

        const { data: moduleCompletionData } = await supabase
          .from('module_completions')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('completed', true);

        setModuleCompletions(Array.isArray(moduleCompletionData) ? moduleCompletionData : []);

        const { data: courseCompletionData } = await supabase
          .from('course_completions')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('completed', true);

        setCourseCompletions(Array.isArray(courseCompletionData) ? courseCompletionData : []);

        const { data: certificatesData } = await supabase
          .from('certificates')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('status', 'valid');

        setCertificates(Array.isArray(certificatesData) ? certificatesData : []);
      } catch (error) {
        console.error(error);
        setSystemMessage('Error cargando el panel del alumno.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    'Alumno GHC Academy';

  const courseCards = useMemo<DashboardCard[]>(() => {
    return courses.map((course) => {
      const courseModules = modules
        .filter((module) => String(module.course_id) === String(course.id))
        .sort(sortModules);

      const courseLessons = lessons
        .filter((lesson) =>
          courseModules.some((module) => String(module.id) === String(lesson.module_id))
        )
        .sort(sortLessons);

      const completedLessonCount = courseLessons.filter((lesson) =>
        lessonProgress.some(
          (progress) =>
            String(progress.lesson_id) === String(lesson.id) &&
            String(progress.course_id) === String(course.id)
        )
      ).length;

      const completedModuleCount = courseModules.filter((module) =>
        moduleCompletions.some(
          (completion) => String(completion.module_id) === String(module.id)
        )
      ).length;

      const completion = courseCompletions.find(
        (item) => String(item.course_id) === String(course.id)
      );

      const certificate = certificates.find(
        (item) => String(item.course_id) === String(course.id)
      );

      const progressPercent =
        courseLessons.length > 0
          ? Math.round((completedLessonCount / courseLessons.length) * 100)
          : 0;

      const nextLesson = findNextLesson({
        courseModules,
        courseLessons,
        lessonProgress,
        moduleCompletions,
      });

      return {
        course,
        courseModules,
        courseLessons,
        completedLessonCount,
        completedModuleCount,
        completion,
        certificate,
        progressPercent,
        nextLesson,
      };
    });
  }, [
    courses,
    modules,
    lessons,
    lessonProgress,
    moduleCompletions,
    courseCompletions,
    certificates,
  ]);

  const activeCourses = courseCards.filter((card) => !card.completion);
  const completedCourses = courseCards.filter((card) => card.completion);

  const totalLessons = courseCards.reduce((sum, card) => sum + card.courseLessons.length, 0);
  const completedLessonsInsideVisibleCourses = courseCards.reduce(
    (sum, card) => sum + card.completedLessonCount,
    0
  );

  const globalProgress =
    totalLessons > 0 ? Math.round((completedLessonsInsideVisibleCourses / totalLessons) * 100) : 0;

  const stats = {
    courses: courses.length,
    lessons: completedLessonsInsideVisibleCourses,
    modules: moduleCompletions.length,
    completedCourses: courseCompletions.length,
    certificates: certificates.length,
    globalProgress,
  };

  const mainCourse = activeCourses[0] || completedCourses[0] || null;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/acceso');
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <AmbientBackground />

        <section style={styles.loadingWrap}>
          <div style={styles.loadingGlass}>
            <div style={styles.loadingTopLine} />
            <GHCLogo size="md" showText tagline={false} />
            <p style={styles.kicker}>Portal privado</p>
            <h1 style={styles.loadingTitle}>Cargando tu dashboard</h1>
            <p style={styles.loadingText}>
              Estamos preparando cursos, módulos, progreso, certificados y perfil real del alumno.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <AmbientBackground />

      <aside style={styles.sidebar}>
        <div>
          <div style={styles.sidebarTop}>
            <GHCLogo size="md" showText tagline={false} />
          </div>

          <div style={styles.studentCard}>
            <div style={styles.avatar}>{getInitials(displayName)}</div>

            <div style={styles.studentText}>
              <p style={styles.studentName}>{displayName}</p>
              <p style={styles.studentRole}>Alumno GHC Academy</p>
            </div>
          </div>

          <div style={styles.sidebarProgressCard}>
            <div style={styles.sidebarProgressTop}>
              <span style={styles.sidebarProgressLabel}>Progreso global</span>
              <strong style={styles.sidebarProgressValue}>{globalProgress}%</strong>
            </div>

            <div style={styles.progressTrackSoft}>
              <div style={{ ...styles.progressFill, width: `${globalProgress}%` }} />
            </div>

            <p style={styles.sidebarSmallText}>
              Datos calculados con lecciones, módulos y cursos reales del alumno.
            </p>
          </div>

          <nav style={styles.nav}>
            {tabs.map((tab) => (
              <SidebarTab
                key={tab.id}
                label={tab.label}
                helper={tab.helper}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </nav>
        </div>

        <div style={styles.sidebarFooter}>
          <Link href="/cursos" style={styles.sidebarPrimaryLink}>
            Catálogo
          </Link>

          <button onClick={handleLogout} style={styles.sidebarDangerButton}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <section style={styles.content}>
        <header style={styles.header}>
          <div style={styles.headerCopy}>
            <p style={styles.kicker}>Dashboard del alumno</p>
            <h1 style={styles.title}>Bienvenido, {shortName(displayName)}</h1>
            <p style={styles.subtitle}>
              Área premium conectada a Supabase para visualizar cursos, progreso académico,
              módulos aprobados, certificados emitidos y estado del perfil.
            </p>
          </div>

          <div style={styles.headerActions}>
            <Link href="/" style={styles.ghostButton}>
              Inicio
            </Link>

            <Link href="/cursos" style={styles.secondaryButton}>
              Explorar cursos
            </Link>
          </div>
        </header>

        <div style={styles.topTabBar}>
          {tabs.map((tab) => (
            <TopTab
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {systemMessage && <div style={styles.notice}>{systemMessage}</div>}

        {activeTab === 'resumen' && (
          <div style={styles.stack}>
            <section style={styles.summaryGrid}>
              <article
                style={{
                  ...styles.spotlightCard,
                  ...(mainCourse ? getSpotlightBackground(mainCourse.course) : {}),
                }}
              >
                <div style={styles.spotlightOverlay} />

                <div style={styles.spotlightContent}>
                  <div style={styles.spotlightBadgeRow}>
                    <span style={styles.spotlightMiniBadge}>GHC Academy</span>
                    <span style={styles.spotlightMiniGhost}>Resumen premium</span>
                  </div>

                  {mainCourse ? (
                    <>
                      <p style={styles.spotlightKicker}>Continuar aprendizaje</p>
                      <h2 style={styles.spotlightTitle}>{mainCourse.course.title}</h2>

                      <p style={styles.spotlightText}>
                        {mainCourse.course.subtitle ||
                          'Sigue avanzando dentro de tu ruta de formación científica aplicada al rendimiento.'}
                      </p>

                      <div style={styles.spotlightMetaRow}>
                        <MetricChip
                          label="Progreso"
                          value={`${mainCourse.progressPercent}%`}
                        />
                        <MetricChip
                          label="Módulos"
                          value={`${mainCourse.completedModuleCount}/${mainCourse.courseModules.length}`}
                        />
                        <MetricChip
                          label="Lecciones"
                          value={`${mainCourse.completedLessonCount}/${mainCourse.courseLessons.length}`}
                        />
                      </div>

                      <div style={styles.spotlightProgressWrap}>
                        <div style={styles.progressTrackStrong}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${mainCourse.progressPercent}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div style={styles.spotlightActions}>
                        <Link
                          href={
                            mainCourse.nextLesson
                              ? `/cursos/${mainCourse.course.slug}/${mainCourse.nextLesson.id}`
                              : `/cursos/${mainCourse.course.slug}`
                          }
                          style={styles.primaryButton}
                        >
                          Continuar →
                        </Link>

                        <Link
                          href={`/cursos/${mainCourse.course.slug}`}
                          style={styles.inlineLinkLight}
                        >
                          Ver detalle
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={styles.spotlightKicker}>Sin cursos activos</p>
                      <h2 style={styles.spotlightTitle}>Todavía no has iniciado tu ruta</h2>
                      <p style={styles.spotlightText}>
                        Accede al catálogo para comenzar tu formación en GHC Academy.
                      </p>

                      <div style={styles.spotlightActions}>
                        <Link href="/cursos" style={styles.primaryButton}>
                          Ir al catálogo →
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </article>

              <div style={styles.sideColumn}>
                <article style={styles.performanceCard}>
                  <div style={styles.cardHeaderRow}>
                    <div>
                      <p style={styles.sectionLabel}>Performance</p>
                      <h3 style={styles.cardTitle}>Progreso académico</h3>
                    </div>
                    <span style={styles.livePill}>Datos reales</span>
                  </div>

                  <div style={styles.ringWrap}>
                    <div
                      style={{
                        ...styles.ring,
                        background: `conic-gradient(${green} ${globalProgress * 3.6}deg, rgba(255,255,255,0.10) 0deg)`,
                      }}
                    >
                      <div style={styles.ringInner}>
                        <strong style={styles.ringNumber}>{globalProgress}%</strong>
                        <span style={styles.ringLabel}>Completado</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.quickStatsGrid}>
                    <QuickStat label="Cursos" value={stats.courses} />
                    <QuickStat label="Módulos" value={stats.modules} />
                    <QuickStat label="Lecciones" value={stats.lessons} />
                    <QuickStat label="Certificados" value={stats.certificates} />
                  </div>
                </article>

                <article style={styles.miniInsightCard}>
                  <p style={styles.sectionLabel}>Insight</p>
                  <h3 style={styles.cardTitle}>Ruta sugerida</h3>
                  <p style={styles.cardText}>
                    Mantén la progresión por módulos y exámenes para consolidar aprendizaje y
                    desbloquear certificados con trazabilidad real.
                  </p>

                  <div style={styles.insightDivider} />

                  <p style={styles.cardMiniNote}>
                    Preparado para futura IA 24/7, recomendaciones y exámenes generados con IA en
                    modo borrador para revisión del admin.
                  </p>
                </article>
              </div>
            </section>

            <section style={styles.statsGrid}>
              <StatCard label="Cursos visibles" value={stats.courses} helper="Catálogo activo" />
              <StatCard
                label="Lecciones completadas"
                value={stats.lessons}
                helper="Progreso trazable"
              />
              <StatCard
                label="Módulos aprobados"
                value={stats.modules}
                helper="Desbloqueos reales"
              />
              <StatCard
                label="Certificados"
                value={stats.certificates}
                helper="Credenciales válidas"
              />
            </section>

            <section style={styles.lowerGrid}>
              <Panel title="Actividad académica" label="Siguiente foco">
                <div style={styles.activityList}>
                  <ActivityItem
                    title={
                      mainCourse?.nextLesson
                        ? `Próxima lección: ${mainCourse.nextLesson.title || 'Lección'}`
                        : 'No hay siguiente lección disponible'
                    }
                    text="Continúa exactamente desde el siguiente punto disponible dentro del itinerario desbloqueado."
                  />
                  <ActivityItem
                    title="Progreso real por usuario"
                    text="El sistema toma datos de lesson_progress, module_completions y course_completions."
                  />
                  <ActivityItem
                    title="Certificados en Supabase"
                    text="Los certificados válidos emitidos se muestran automáticamente cuando existen."
                  />
                </div>
              </Panel>

              <Panel title="Estado de la cuenta" label="Perfil alumno">
                <div style={styles.infoGridTwo}>
                  <InfoCard label="Alumno" value={displayName} />
                  <InfoCard label="Email" value={user?.email || '—'} />
                  <InfoCard label="Rol" value={profile?.role || 'student'} />
                  <InfoCard label="Cursos completados" value={stats.completedCourses} />
                </div>

                <div style={styles.noteCard}>
                  <p style={styles.noteTitle}>Fase futura</p>
                  <p style={styles.cardText}>
                    Este dashboard queda preparado para seguridad avanzada, control de dispositivos,
                    edición de perfil y capa de asistencia inteligente.
                  </p>
                </div>
              </Panel>
            </section>
          </div>
        )}

        {activeTab === 'cursos' && (
          <div style={styles.stack}>
            <Panel title="Mis cursos" label="Formación activa">
              {activeCourses.length === 0 ? (
                <EmptyState text="Todavía no tienes cursos activos. Entra al catálogo para iniciar tu formación." />
              ) : (
                <div style={styles.cardsGrid}>
                  {activeCourses.map((card) => (
                    <CourseCard key={card.course.id} card={card} />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Cursos completados" label="Historial académico">
              {completedCourses.length === 0 ? (
                <EmptyState text="Cuando completes un curso, aparecerá aquí." />
              ) : (
                <div style={styles.cardsGrid}>
                  {completedCourses.map((card) => (
                    <CourseCard key={card.course.id} card={card} completed />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {activeTab === 'progreso' && (
          <div style={styles.stack}>
            <section style={styles.statsGrid}>
              <StatCard
                label="Progreso global"
                value={`${stats.globalProgress}%`}
                helper="Total visible"
              />
              <StatCard
                label="Lecciones completadas"
                value={stats.lessons}
                helper="Historial válido"
              />
              <StatCard
                label="Módulos aprobados"
                value={stats.modules}
                helper="Evaluación real"
              />
              <StatCard
                label="Cursos completados"
                value={stats.completedCourses}
                helper="Ruta cerrada"
              />
            </section>

            <Panel title="Progreso por curso" label="Detalle académico">
              {courseCards.length === 0 ? (
                <EmptyState text="Aún no hay cursos visibles para calcular progreso." />
              ) : (
                <div style={styles.progressList}>
                  {courseCards.map((card) => (
                    <ProgressRow key={card.course.id} card={card} />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {activeTab === 'certificados' && (
          <div style={styles.stack}>
            <Panel title="Mis certificados" label="Credenciales digitales">
              {certificates.length === 0 ? (
                <EmptyState text="Aún no tienes certificados reales emitidos. Completa un curso y emite tu certificado para verlo aquí." />
              ) : (
                <div style={styles.cardsGrid}>
                  {certificates.map((certificate) => (
                    <CertificateCard key={certificate.id} certificate={certificate} />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {activeTab === 'perfil' && (
          <div style={styles.stack}>
            <Panel title={displayName} label="Perfil">
              <div style={styles.profileGrid}>
                <InfoCard label="Email" value={user?.email || '—'} />
                <InfoCard label="Rol" value={profile?.role || 'student'} />
                <InfoCard label="Cursos completados" value={stats.completedCourses} />
                <InfoCard label="Certificados" value={stats.certificates} />
              </div>

              <div style={styles.profileBigCard}>
                <div style={styles.profileBigHeader}>
                  <div>
                    <p style={styles.sectionLabel}>Seguridad y evolución</p>
                    <h3 style={styles.cardTitle}>Cuenta preparada para crecer</h3>
                  </div>
                </div>

                <div style={styles.activityList}>
                  <ActivityItem
                    title="Autenticación real"
                    text="Acceso protegido con Supabase Auth y ruta /alumno protegida."
                  />
                  <ActivityItem
                    title="Escalabilidad"
                    text="Base lista para ampliar control de dispositivos, actividad reciente y preferencias."
                  />
                  <ActivityItem
                    title="IA futura"
                    text="Preparado para tutoría IA, recomendaciones y generación asistida de exámenes."
                  />
                </div>
              </div>
            </Panel>
          </div>
        )}
      </section>
    </main>
  );
}

function AmbientBackground() {
  return (
    <div style={styles.bgLayer} aria-hidden="true">
      <div style={styles.bgOrbA} />
      <div style={styles.bgOrbB} />
      <div style={styles.bgOrbC} />
      <div style={styles.bgGrid} />
    </div>
  );
}

function SidebarTab({
  label,
  helper,
  active,
  onClick,
}: {
  label: string;
  helper: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={active ? styles.navActive : styles.navButton}>
      <span style={styles.navLabel}>{label}</span>
      <span style={styles.navHelper}>{helper}</span>
    </button>
  );
}

function TopTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={active ? styles.topTabActive : styles.topTab}>
      {label}
    </button>
  );
}

function Panel({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <p style={styles.sectionLabel}>{label}</p>
          <h2 style={styles.sectionTitle}>{title}</h2>
        </div>
      </div>

      {children}
    </section>
  );
}

function MetricChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.metricChip}>
      <span style={styles.metricChipLabel}>{label}</span>
      <strong style={styles.metricChipValue}>{value}</strong>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.quickStat}>
      <span style={styles.quickStatLabel}>{label}</span>
      <strong style={styles.quickStatValue}>{value}</strong>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <article style={styles.statCard}>
      <p style={styles.smallLabel}>{label}</p>
      <strong style={styles.statValue}>{value}</strong>
      <p style={styles.statHelper}>{helper}</p>
    </article>
  );
}

function CourseCard({ card, completed = false }: { card: DashboardCard; completed?: boolean }) {
  const course = card.course;
  const nextLesson = card.nextLesson;

  return (
    <article style={styles.courseCard}>
      <div style={{ ...styles.courseImage, ...getCourseImageStyle(course) }}>
        <div style={styles.courseImageOverlay} />
      </div>

      <div style={styles.courseBody}>
        <div style={styles.badgeRow}>
          {course.course_type && <span style={styles.badgeMain}>{course.course_type}</span>}
          {course.level && <span style={styles.badgeSecondary}>{course.level}</span>}
          {completed && <span style={styles.badgeCompleted}>Completado</span>}
          {card.certificate && <span style={styles.badgeSoft}>Certificado</span>}
        </div>

        <h3 style={styles.courseTitle}>{course.title}</h3>

        {course.subtitle && <p style={styles.courseSubtitle}>{course.subtitle}</p>}

        <p style={styles.courseText}>
          {course.description || 'Formación premium basada en ciencia, estructura y rendimiento.'}
        </p>

        <div style={styles.infoGridThree}>
          <InfoMini label="Lecciones" value={`${card.completedLessonCount}/${card.courseLessons.length}`} />
          <InfoMini label="Módulos" value={`${card.completedModuleCount}/${card.courseModules.length}`} />
          <InfoMini label="Progreso" value={`${card.progressPercent}%`} />
        </div>

        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${card.progressPercent}%` }} />
        </div>

        <div style={styles.cardActions}>
          {nextLesson ? (
            <Link href={`/cursos/${course.slug}/${nextLesson.id}`} style={styles.primaryButton}>
              Continuar →
            </Link>
          ) : (
            <Link href={`/cursos/${course.slug}`} style={styles.primaryButton}>
              Ver curso →
            </Link>
          )}

          <Link href={`/cursos/${course.slug}`} style={styles.inlineLink}>
            Detalle
          </Link>
        </div>
      </div>
    </article>
  );
}

function ProgressRow({ card }: { card: DashboardCard }) {
  return (
    <article style={styles.progressRow}>
      <div style={styles.progressLeft}>
        <div style={styles.progressRowTop}>
          <h3 style={styles.progressCourseTitle}>{card.course.title}</h3>
          <span style={styles.progressPercent}>{card.progressPercent}%</span>
        </div>

        <p style={styles.cardText}>
          {card.completedLessonCount}/{card.courseLessons.length} lecciones ·{' '}
          {card.completedModuleCount}/{card.courseModules.length} módulos
        </p>

        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${card.progressPercent}%` }} />
        </div>
      </div>

      <div style={styles.progressRightBox}>
        <InfoMini label="Estado" value={card.completion ? 'Completado' : 'Activo'} />
      </div>
    </article>
  );
}

function CertificateCard({ certificate }: { certificate: AnyRecord }) {
  return (
    <article style={styles.certificateCard}>
      <div style={styles.certificateTop}>
        <div style={styles.certificateIcon}>★</div>
        <span style={styles.badgeSoft}>Certificado válido</span>
      </div>

      <h3 style={styles.certificateTitle}>
        {certificate.course_title || 'Curso completado'}
      </h3>

      <div style={styles.infoGridThree}>
        <InfoMini label="Nota final" value={`${certificate.final_score ?? '—'}%`} />
        <InfoMini label="Estado" value="Válido" />
        <InfoMini label="Código" value={certificate.certificate_code || '—'} />
      </div>

      {certificate.certificate_code && (
        <p style={styles.certificateCode}>{certificate.certificate_code}</p>
      )}

      {certificate.verification_slug ? (
        <Link href={`/certificados/${certificate.verification_slug}`} style={styles.primaryButton}>
          Ver certificado →
        </Link>
      ) : (
        <p style={styles.cardText}>Certificado registrado sin enlace público de verificación.</p>
      )}
    </article>
  );
}

function ActivityItem({ title, text }: { title: string; text: string }) {
  return (
    <article style={styles.activityItem}>
      <div style={styles.activityDot} />
      <div>
        <h3 style={styles.activityTitle}>{title}</h3>
        <p style={styles.cardText}>{text}</p>
      </div>
    </article>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={styles.infoCard}>
      <p style={styles.smallLabel}>{label}</p>
      <strong style={styles.infoCardValue}>{value}</strong>
    </article>
  );
}

function InfoMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.infoMini}>
      <p style={styles.smallLabel}>{label}</p>
      <p style={styles.infoMiniValue}>{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <article style={styles.emptyCard}>
      <p style={styles.cardText}>{text}</p>
    </article>
  );
}

function isVisibleCourse(course: AnyRecord) {
  const status = String(course.status || '').toLowerCase();

  if (!status) return true;

  return ['published', 'publicado', 'active', 'activo', 'preview', 'demo'].includes(status);
}

function findNextLesson({
  courseModules,
  courseLessons,
  lessonProgress,
  moduleCompletions,
}: {
  courseModules: AnyRecord[];
  courseLessons: AnyRecord[];
  lessonProgress: AnyRecord[];
  moduleCompletions: AnyRecord[];
}) {
  const completedLessonIds = new Set(lessonProgress.map((item) => String(item.lesson_id)));
  const completedModuleIds = new Set(moduleCompletions.map((item) => String(item.module_id)));

  for (let index = 0; index < courseModules.length; index++) {
    const module = courseModules[index];

    const moduleUnlocked =
      index === 0 ||
      completedModuleIds.has(String(module.id)) ||
      completedModuleIds.has(String(courseModules[index - 1]?.id));

    if (!moduleUnlocked) continue;

    const moduleLessons = courseLessons
      .filter((lesson) => String(lesson.module_id) === String(module.id))
      .sort(sortLessons);

    const nextLesson = moduleLessons.find((lesson) => !completedLessonIds.has(String(lesson.id)));

    if (nextLesson) return nextLesson;
  }

  return courseLessons[0] || null;
}

function getOrder(item: AnyRecord, fallback: number) {
  return item.position ?? item.sort_order ?? item.order_index ?? item.order ?? fallback;
}

function sortModules(a: AnyRecord, b: AnyRecord) {
  const aNumber = extractModuleNumber(a.title);
  const bNumber = extractModuleNumber(b.title);

  if (aNumber !== bNumber) return aNumber - bNumber;

  return Number(getOrder(a, 999)) - Number(getOrder(b, 999));
}

function sortLessons(a: AnyRecord, b: AnyRecord) {
  const aNumber = extractLessonNumber(a.title);
  const bNumber = extractLessonNumber(b.title);

  if (aNumber !== bNumber) return aNumber - bNumber;

  return Number(getOrder(a, 999)) - Number(getOrder(b, 999));
}

function extractLessonNumber(title: string = '') {
  const match = title.match(/lecci[oó]n\s*(\d+)/i);
  return match ? Number(match[1]) : 999;
}

function extractModuleNumber(title: string = '') {
  const match = title.match(/m[oó]dulo\s*(\d+)/i);
  return match ? Number(match[1]) : 999;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function shortName(name: string) {
  return name.split('@')[0].split(' ')[0];
}

function getImageFromCourse(course: AnyRecord) {
  return (
    course.cover_image ||
    course.cover_image_url ||
    course.image ||
    course.image_url ||
    course.thumbnail ||
    course.thumbnail_url ||
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1600&q=80'
  );
}

function getCourseImageStyle(course: AnyRecord): CSSProperties {
  return {
    backgroundImage: `linear-gradient(180deg, rgba(5,7,6,0.02), rgba(5,7,6,0.92)), url(${getImageFromCourse(
      course
    )})`,
  };
}

function getSpotlightBackground(course: AnyRecord): CSSProperties {
  return {
    backgroundImage: `url(${getImageFromCourse(course)})`,
  };
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '300px minmax(0, 1fr)',
    background: bg,
    color: white,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },

  bgLayer: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
    overflow: 'hidden',
  },

  bgOrbA: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 999,
    top: -180,
    left: -180,
    background: 'rgba(34,214,91,0.10)',
    filter: 'blur(90px)',
  },

  bgOrbB: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 999,
    top: 180,
    right: -180,
    background: 'rgba(130,145,140,0.08)',
    filter: 'blur(90px)',
  },

  bgOrbC: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 999,
    bottom: -240,
    left: '28%',
    background: 'rgba(34,214,91,0.06)',
    filter: 'blur(110px)',
  },

  bgGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
    backgroundSize: '42px 42px',
    opacity: 0.35,
  },

  loadingWrap: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    gridColumn: '1 / -1',
    padding: 24,
  },

  loadingGlass: {
    width: 'min(720px, calc(100vw - 48px))',
    borderRadius: 36,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 30px 120px rgba(0,0,0,0.40)',
    padding: 36,
  },

  loadingTopLine: {
    width: 64,
    height: 4,
    borderRadius: 999,
    background: green,
    boxShadow: '0 0 30px rgba(34,214,91,0.45)',
    marginBottom: 24,
  },

  loadingTitle: {
    margin: '16px 0 0',
    fontSize: 'clamp(42px, 6vw, 74px)',
    lineHeight: 0.95,
    fontWeight: 950,
    letterSpacing: '-0.06em',
  },

  loadingText: {
    marginTop: 16,
    color: 'rgba(242,244,241,0.66)',
    lineHeight: 1.8,
    fontSize: 15,
    maxWidth: 620,
  },

  sidebar: {
    minHeight: '100vh',
    position: 'sticky',
    top: 0,
    alignSelf: 'start',
    zIndex: 2,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    background:
      'linear-gradient(180deg, rgba(8,11,10,0.96), rgba(5,7,6,0.88))',
    backdropFilter: 'blur(18px)',
  },

  sidebarTop: {
    minHeight: 42,
    display: 'flex',
    alignItems: 'center',
  },

  studentCard: {
    marginTop: 24,
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0 20px 70px rgba(0,0,0,0.22)',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(34,214,91,0.12)',
    border: '1px solid rgba(34,214,91,0.28)',
    color: green,
    fontWeight: 950,
    fontSize: 15,
    boxShadow: '0 0 24px rgba(34,214,91,0.12)',
    flexShrink: 0,
  },

  studentText: {
    minWidth: 0,
  },

  studentName: {
    margin: 0,
    fontSize: 13,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 180,
  },

  studentRole: {
    margin: '4px 0 0',
    color: 'rgba(242,244,241,0.50)',
    fontSize: 12,
  },

  sidebarProgressCard: {
    marginTop: 16,
    borderRadius: 22,
    border: '1px solid rgba(34,214,91,0.15)',
    background: 'rgba(34,214,91,0.05)',
    padding: 16,
  },

  sidebarProgressTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },

  sidebarProgressLabel: {
    color: 'rgba(242,244,241,0.52)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontWeight: 900,
  },

  sidebarProgressValue: {
    color: green,
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 950,
    letterSpacing: '-0.04em',
  },

  sidebarSmallText: {
    marginTop: 12,
    color: 'rgba(242,244,241,0.52)',
    fontSize: 12,
    lineHeight: 1.7,
  },

  nav: {
    display: 'grid',
    gap: 10,
    marginTop: 26,
  },

  navButton: {
    width: '100%',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: 'rgba(242,244,241,0.72)',
    borderRadius: 18,
    padding: '14px 15px',
    textAlign: 'left',
    cursor: 'pointer',
  },

  navActive: {
    width: '100%',
    border: '1px solid rgba(34,214,91,0.28)',
    background:
      'linear-gradient(135deg, rgba(34,214,91,0.15), rgba(34,214,91,0.06))',
    color: green,
    borderRadius: 18,
    padding: '14px 15px',
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: '0 0 28px rgba(34,214,91,0.08)',
  },

  navLabel: {
    display: 'block',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.13em',
    fontWeight: 950,
  },

  navHelper: {
    display: 'block',
    marginTop: 4,
    fontSize: 11,
    color: 'rgba(242,244,241,0.44)',
    fontWeight: 600,
  },

  sidebarFooter: {
    display: 'grid',
    gap: 12,
  },

  sidebarPrimaryLink: {
    display: 'block',
    textDecoration: 'none',
    textAlign: 'center',
    border: '1px solid rgba(34,214,91,0.28)',
    background: 'rgba(34,214,91,0.08)',
    color: green,
    borderRadius: 16,
    padding: 14,
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },

  sidebarDangerButton: {
    border: '1px solid rgba(255,80,80,0.34)',
    background: 'rgba(255,80,80,0.10)',
    color: '#ff9f9f',
    borderRadius: 16,
    padding: 14,
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },

  content: {
    position: 'relative',
    zIndex: 1,
    minWidth: 0,
    padding: 30,
    overflow: 'auto',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 24,
    marginBottom: 22,
  },

  headerCopy: {
    maxWidth: 860,
  },

  headerActions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },

  kicker: {
    margin: '0 0 12px',
    color: green,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.28em',
    fontWeight: 950,
  },

  title: {
    margin: 0,
    fontSize: 'clamp(44px, 5.2vw, 78px)',
    lineHeight: 0.92,
    fontWeight: 950,
    letterSpacing: '-0.065em',
  },

  subtitle: {
    marginTop: 16,
    maxWidth: 760,
    color: 'rgba(242,244,241,0.66)',
    fontSize: 15,
    lineHeight: 1.8,
  },

  topTabBar: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 24,
  },

  topTab: {
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.03)',
    color: 'rgba(242,244,241,0.72)',
    borderRadius: 999,
    padding: '11px 16px',
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },

  topTabActive: {
    border: '1px solid rgba(34,214,91,0.28)',
    background: 'rgba(34,214,91,0.10)',
    color: green,
    borderRadius: 999,
    padding: '11px 16px',
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    boxShadow: '0 0 24px rgba(34,214,91,0.08)',
  },

  notice: {
    padding: '18px 20px',
    borderRadius: 22,
    border: '1px solid rgba(34,214,91,0.22)',
    color: 'rgba(242,244,241,0.72)',
    marginBottom: 20,
    background: 'rgba(255,255,255,0.035)',
    backdropFilter: 'blur(16px)',
  },

  stack: {
    display: 'grid',
    gap: 22,
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 0.9fr)',
    gap: 18,
  },

  spotlightCard: {
    position: 'relative',
    minHeight: 460,
    borderRadius: 34,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.10)',
    backgroundColor: graphite,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    boxShadow: '0 28px 120px rgba(0,0,0,0.30)',
  },

  spotlightOverlay: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(90deg, rgba(5,7,6,0.10), rgba(5,7,6,0.72) 42%, rgba(5,7,6,0.95) 100%), linear-gradient(180deg, rgba(34,214,91,0.10), transparent 42%)',
  },

  spotlightContent: {
    position: 'relative',
    zIndex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: 28,
  },

  spotlightBadgeRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },

  spotlightMiniBadge: {
    borderRadius: 999,
    background: green,
    color: '#061008',
    padding: '7px 10px',
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },

  spotlightMiniGhost: {
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.08)',
    color: white,
    padding: '7px 10px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },

  spotlightKicker: {
    margin: 0,
    color: green,
    fontSize: 12,
    letterSpacing: '0.26em',
    textTransform: 'uppercase',
    fontWeight: 950,
  },

  spotlightTitle: {
    margin: '12px 0 0',
    fontSize: 'clamp(34px, 4vw, 58px)',
    lineHeight: 0.95,
    fontWeight: 950,
    letterSpacing: '-0.05em',
    maxWidth: 780,
  },

  spotlightText: {
    marginTop: 14,
    maxWidth: 760,
    color: 'rgba(242,244,241,0.78)',
    fontSize: 15,
    lineHeight: 1.8,
  },

  spotlightMetaRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 20,
  },

  metricChip: {
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.28)',
    padding: '12px 14px',
    minWidth: 118,
  },

  metricChipLabel: {
    display: 'block',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    color: 'rgba(242,244,241,0.48)',
    fontWeight: 900,
  },

  metricChipValue: {
    display: 'block',
    marginTop: 7,
    color: white,
    fontWeight: 950,
    fontSize: 18,
    letterSpacing: '-0.02em',
  },

  spotlightProgressWrap: {
    marginTop: 18,
    maxWidth: 720,
  },

  progressTrackStrong: {
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.12)',
  },

  spotlightActions: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 22,
  },

  sideColumn: {
    display: 'grid',
    gap: 18,
  },

  performanceCard: {
    borderRadius: 30,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
    padding: 22,
    boxShadow: '0 24px 100px rgba(0,0,0,0.22)',
    backdropFilter: 'blur(18px)',
  },

  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },

  livePill: {
    borderRadius: 999,
    border: '1px solid rgba(34,214,91,0.28)',
    background: 'rgba(34,214,91,0.08)',
    color: green,
    padding: '7px 10px',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 950,
    whiteSpace: 'nowrap',
  },

  cardTitle: {
    margin: '8px 0 0',
    fontSize: 24,
    lineHeight: 1.02,
    fontWeight: 950,
    letterSpacing: '-0.03em',
  },

  cardText: {
    marginTop: 10,
    color: 'rgba(242,244,241,0.64)',
    fontSize: 14,
    lineHeight: 1.75,
  },

  miniInsightCard: {
    borderRadius: 30,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.04)',
    padding: 22,
    boxShadow: '0 24px 100px rgba(0,0,0,0.18)',
  },

  insightDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.10)',
    margin: '18px 0',
  },

  cardMiniNote: {
    margin: 0,
    color: steel,
    fontSize: 13,
    lineHeight: 1.75,
  },

  ringWrap: {
    display: 'flex',
    justifyContent: 'center',
    margin: '20px 0 18px',
  },

  ring: {
    width: 176,
    height: 176,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    boxShadow: '0 0 32px rgba(34,214,91,0.10)',
  },

  ringInner: {
    width: 132,
    height: 132,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    background: '#080B0A',
    border: '1px solid rgba(255,255,255,0.10)',
    textAlign: 'center',
  },

  ringNumber: {
    display: 'block',
    fontSize: 36,
    fontWeight: 950,
    lineHeight: 1,
    letterSpacing: '-0.04em',
  },

  ringLabel: {
    display: 'block',
    marginTop: -24,
    color: 'rgba(242,244,241,0.48)',
    fontSize: 12,
  },

  quickStatsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },

  quickStat: {
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.24)',
    padding: 12,
  },

  quickStatLabel: {
    display: 'block',
    color: 'rgba(242,244,241,0.46)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 900,
  },

  quickStatValue: {
    display: 'block',
    marginTop: 8,
    color: white,
    fontWeight: 950,
    fontSize: 24,
    lineHeight: 1,
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 16,
  },

  statCard: {
    borderRadius: 26,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
    padding: 20,
    boxShadow: '0 20px 70px rgba(0,0,0,0.16)',
  },

  smallLabel: {
    margin: 0,
    color: 'rgba(242,244,241,0.44)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    fontWeight: 900,
  },

  statValue: {
    display: 'block',
    marginTop: 12,
    color: green,
    fontSize: 38,
    lineHeight: 1,
    fontWeight: 950,
    letterSpacing: '-0.04em',
  },

  statHelper: {
    marginTop: 10,
    color: 'rgba(242,244,241,0.54)',
    fontSize: 13,
    lineHeight: 1.6,
  },

  lowerGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 18,
  },

  panel: {
    borderRadius: 30,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
    padding: 22,
    boxShadow: '0 24px 90px rgba(0,0,0,0.18)',
  },

  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 18,
    marginBottom: 18,
  },

  sectionLabel: {
    margin: 0,
    color: green,
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
  },

  sectionTitle: {
    margin: '8px 0 0',
    fontSize: 30,
    lineHeight: 1,
    fontWeight: 950,
    letterSpacing: '-0.04em',
  },

  activityList: {
    display: 'grid',
    gap: 14,
  },

  activityItem: {
    display: 'grid',
    gridTemplateColumns: '12px 1fr',
    gap: 14,
    alignItems: 'start',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.22)',
    padding: 16,
  },

  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: green,
    boxShadow: '0 0 18px rgba(34,214,91,0.38)',
    marginTop: 6,
  },

  activityTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 950,
    letterSpacing: '-0.02em',
  },

  infoGridTwo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },

  infoGridThree: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
    marginTop: 18,
  },

  infoCard: {
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.22)',
    padding: 14,
  },

  infoCardValue: {
    display: 'block',
    marginTop: 8,
    color: white,
    fontWeight: 900,
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },

  noteCard: {
    marginTop: 18,
    borderRadius: 22,
    border: '1px solid rgba(34,214,91,0.16)',
    background: 'rgba(34,214,91,0.05)',
    padding: 16,
  },

  noteTitle: {
    margin: 0,
    color: white,
    fontSize: 16,
    fontWeight: 950,
  },

  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 18,
  },

  courseCard: {
    borderRadius: 28,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(255,255,255,0.04)',
    boxShadow: '0 24px 90px rgba(0,0,0,0.18)',
  },

  courseImage: {
    height: 170,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
  },

  courseImageOverlay: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(5,7,6,0.06), rgba(5,7,6,0.88)), radial-gradient(circle at top right, rgba(34,214,91,0.18), transparent 34%)',
  },

  courseBody: {
    padding: 22,
  },

  badgeRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },

  badgeMain: {
    background: green,
    color: '#061008',
    borderRadius: 999,
    padding: '7px 10px',
    fontSize: 10,
    fontWeight: 950,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },

  badgeSecondary: {
    border: '1px solid rgba(255,255,255,0.13)',
    color: 'rgba(242,244,241,0.72)',
    borderRadius: 999,
    padding: '7px 10px',
    fontSize: 10,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },

  badgeCompleted: {
    background: 'rgba(34,214,91,0.12)',
    border: '1px solid rgba(34,214,91,0.32)',
    color: green,
    borderRadius: 999,
    padding: '7px 10px',
    fontSize: 10,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },

  badgeSoft: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: white,
    borderRadius: 999,
    padding: '7px 10px',
    fontSize: 10,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },

  courseTitle: {
    margin: 0,
    fontSize: 26,
    lineHeight: 1.04,
    fontWeight: 950,
    letterSpacing: '-0.03em',
  },

  courseSubtitle: {
    margin: '10px 0 0',
    color: green,
    fontSize: 14,
    fontWeight: 850,
    lineHeight: 1.6,
  },

  courseText: {
    marginTop: 12,
    color: 'rgba(242,244,241,0.64)',
    fontSize: 14,
    lineHeight: 1.75,
    minHeight: 74,
  },

  infoMini: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.22)',
    padding: 12,
  },

  infoMiniValue: {
    margin: '7px 0 0',
    color: white,
    fontWeight: 900,
    lineHeight: 1.35,
    wordBreak: 'break-word',
  },

  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.10)',
    marginTop: 18,
  },

  progressTrackSoft: {
    height: 9,
    borderRadius: 999,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.10)',
    marginTop: 12,
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
    background: green,
    boxShadow: '0 0 18px rgba(34,214,91,0.35)',
  },

  cardActions: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 12,
    alignItems: 'center',
    marginTop: 18,
  },

  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    borderRadius: 15,
    background: green,
    color: '#061008',
    padding: '14px 16px',
    fontSize: 12,
    fontWeight: 950,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    boxShadow: '0 0 28px rgba(34,214,91,0.18)',
    textAlign: 'center',
  },

  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    borderRadius: 15,
    background: 'rgba(34,214,91,0.08)',
    color: green,
    border: '1px solid rgba(34,214,91,0.28)',
    padding: '14px 16px',
    fontSize: 12,
    fontWeight: 950,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    textAlign: 'center',
  },

  ghostButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    borderRadius: 15,
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(242,244,241,0.76)',
    border: '1px solid rgba(255,255,255,0.10)',
    padding: '14px 16px',
    fontSize: 12,
    fontWeight: 950,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    textAlign: 'center',
  },

  inlineLink: {
    color: green,
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
  },

  inlineLinkLight: {
    color: white,
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
  },

  progressList: {
    display: 'grid',
    gap: 14,
  },

  progressRow: {
    borderRadius: 22,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.22)',
    padding: 16,
    display: 'grid',
    gridTemplateColumns: '1fr 180px',
    gap: 16,
    alignItems: 'center',
  },

  progressLeft: {
    minWidth: 0,
  },

  progressRowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  progressCourseTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 950,
    letterSpacing: '-0.02em',
  },

  progressPercent: {
    color: green,
    fontSize: 18,
    fontWeight: 950,
  },

  progressRightBox: {
    minWidth: 0,
  },

  certificateCard: {
    borderRadius: 28,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(34,214,91,0.04))',
    padding: 22,
    boxShadow: '0 24px 90px rgba(0,0,0,0.18)',
  },

  certificateTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  certificateIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(34,214,91,0.08)',
    border: '1px solid rgba(34,214,91,0.26)',
    color: green,
    fontSize: 18,
    boxShadow: '0 0 26px rgba(34,214,91,0.12)',
    flexShrink: 0,
  },

  certificateTitle: {
    margin: '8px 0 0',
    fontSize: 26,
    lineHeight: 1.04,
    fontWeight: 950,
    letterSpacing: '-0.03em',
  },

  certificateCode: {
    marginTop: 16,
    color: green,
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: '0.06em',
    overflowWrap: 'anywhere',
  },

  emptyCard: {
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    padding: 22,
  },

  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 14,
  },

  profileBigCard: {
    marginTop: 18,
    borderRadius: 26,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(255,255,255,0.04)',
    padding: 20,
  },

  profileBigHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
};
