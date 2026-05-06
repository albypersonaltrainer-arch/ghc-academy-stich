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

const tabs: { id: Tab; label: string; helper: string }[] = [
  { id: 'resumen', label: 'Resumen', helper: 'Vista general' },
  { id: 'cursos', label: 'Mis cursos', helper: 'Formación activa' },
  { id: 'progreso', label: 'Progreso', helper: 'Evolución real' },
  { id: 'certificados', label: 'Certificados', helper: 'Credenciales' },
  { id: 'perfil', label: 'Perfil', helper: 'Cuenta alumno' },
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
        <BackgroundOrbs />

        <section style={styles.loadingCard}>
          <GHCLogo size="md" showText tagline={false} />

          <div style={styles.loadingPulse} />

          <p style={styles.kicker}>Portal privado</p>
          <h1 style={styles.loadingTitle}>Cargando tu dashboard</h1>
          <p style={styles.muted}>
            Estamos preparando tus cursos, progreso, módulos y certificados reales.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <BackgroundOrbs />

      <aside style={styles.sidebar}>
        <div>
          <div style={styles.logoWrap}>
            <GHCLogo size="md" showText tagline={false} />
          </div>

          <div style={styles.studentCard}>
            <div style={styles.avatar}>{getInitials(displayName)}</div>

            <div style={styles.studentMeta}>
              <p style={styles.studentName}>{displayName}</p>
              <p style={styles.studentRole}>Alumno GHC Academy</p>
            </div>
          </div>

          <div style={styles.sidebarMetric}>
            <span style={styles.sidebarMetricLabel}>Progreso global</span>
            <strong style={styles.sidebarMetricValue}>{globalProgress}%</strong>
            <div style={styles.progressTrackSoft}>
              <div style={{ ...styles.progressFill, width: `${globalProgress}%` }} />
            </div>
          </div>

          <nav style={styles.nav}>
            {tabs.map((tab) => (
              <TabButton
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
          <Link href="/cursos" style={styles.sidebarLink}>
            Catálogo de cursos
          </Link>

          <button onClick={handleLogout} style={styles.logoutButton}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <section style={styles.content}>
        <header style={styles.header}>
          <div style={styles.headerText}>
            <p style={styles.kicker}>Portal del alumno</p>
            <h1 style={styles.title}>Bienvenido, {shortName(displayName)}</h1>
            <p style={styles.headerSubtitle}>
              Dashboard premium conectado a Supabase: cursos reales, progreso real, módulos,
              exámenes, certificados y perfil del alumno.
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

        {systemMessage && <div style={styles.notice}>{systemMessage}</div>}

        {activeTab === 'resumen' && (
          <div style={styles.stack}>
            <section style={styles.heroGrid}>
              <article style={styles.progressPanel}>
                <div style={styles.panelTopLine}>
                  <p style={styles.sectionLabel}>Progreso general</p>
                  <span style={styles.liveBadge}>Live data</span>
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
                      <span style={styles.ringText}>Completado</span>
                    </div>
                  </div>
                </div>

                <div style={styles.microStatsGrid}>
                  <MicroStat label="Cursos" value={stats.courses} />
                  <MicroStat label="Certificados" value={stats.certificates} />
                </div>

                <p style={styles.muted}>
                  Resumen global calculado sobre las lecciones completadas dentro de los cursos
                  visibles actualmente.
                </p>
              </article>

              <article style={styles.nextPanel}>
                <div style={styles.nextImage}>
                  <div style={styles.imageOverlayText}>
                    <span>Sport</span>
                    <strong>Through Science</strong>
                  </div>
                </div>

                <div style={styles.nextBody}>
                  <p style={styles.sectionLabel}>Continuar formación</p>

                  {mainCourse ? (
                    <>
                      <h2 style={styles.smallTitle}>{mainCourse.course.title}</h2>

                      <p style={styles.muted}>
                        Progreso: {mainCourse.progressPercent}% · Módulos aprobados:{' '}
                        {mainCourse.completedModuleCount}/{mainCourse.courseModules.length}
                      </p>

                      <div style={styles.progressTrack}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${mainCourse.progressPercent}%`,
                          }}
                        />
                      </div>

                      <div style={styles.nextMetaGrid}>
                        <InfoBox
                          label="Lecciones"
                          value={`${mainCourse.completedLessonCount}/${mainCourse.courseLessons.length}`}
                        />
                        <InfoBox
                          label="Módulos"
                          value={`${mainCourse.completedModuleCount}/${mainCourse.courseModules.length}`}
                        />
                        <InfoBox
                          label="Certificado"
                          value={mainCourse.certificate ? 'Emitido' : 'Pendiente'}
                        />
                      </div>

                      <Link
                        href={
                          mainCourse.nextLesson
                            ? `/cursos/${mainCourse.course.slug}/${mainCourse.nextLesson.id}`
                            : `/cursos/${mainCourse.course.slug}`
                        }
                        style={styles.primaryButton}
                      >
                        Continuar ruta →
                      </Link>
                    </>
                  ) : (
                    <>
                      <h2 style={styles.smallTitle}>Aún no hay cursos activos</h2>
                      <p style={styles.muted}>
                        Entra al catálogo para iniciar tu itinerario dentro de GHC Academy.
                      </p>
                      <Link href="/cursos" style={styles.primaryButton}>
                        Ir al catálogo →
                      </Link>
                    </>
                  )}
                </div>
              </article>
            </section>

            <section style={styles.statsGrid}>
              <Stat label="Cursos visibles" value={stats.courses} />
              <Stat label="Lecciones completadas" value={stats.lessons} />
              <Stat label="Módulos aprobados" value={stats.modules} />
              <Stat label="Certificados" value={stats.certificates} />
            </section>

            <Panel title="Actividad académica" label="Resumen operativo">
              <div style={styles.timelineGrid}>
                <TimelineItem
                  title="Acceso protegido"
                  text="El alumno entra mediante Supabase Auth y la ruta /alumno permanece protegida."
                />
                <TimelineItem
                  title="Progreso trazable"
                  text="Las lecciones, módulos y cursos completados se calculan desde las tablas reales."
                />
                <TimelineItem
                  title="Certificados"
                  text="Los certificados válidos se leen desde Supabase y se enlazan a su ruta de verificación."
                />
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'cursos' && (
          <div style={styles.stack}>
            <Panel title="Mis cursos" label="Formación activa">
              {activeCourses.length === 0 ? (
                <Empty text="Todavía no tienes cursos activos. Entra al catálogo para iniciar tu formación." />
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
                <Empty text="Cuando completes un curso, aparecerá aquí." />
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
              <Stat label="Progreso global" value={`${stats.globalProgress}%`} />
              <Stat label="Lecciones completadas" value={stats.lessons} />
              <Stat label="Módulos aprobados" value={stats.modules} />
              <Stat label="Cursos completados" value={stats.completedCourses} />
            </section>

            <Panel title="Progreso académico" label="Detalle por curso">
              {courseCards.length === 0 ? (
                <Empty text="Aún no hay cursos visibles para calcular progreso." />
              ) : (
                <div style={styles.progressList}>
                  {courseCards.map((card) => (
                    <article key={card.course.id} style={styles.progressRow}>
                      <div style={styles.progressMain}>
                        <h3 style={styles.progressCourseTitle}>{card.course.title}</h3>
                        <p style={styles.muted}>
                          {card.completedLessonCount}/{card.courseLessons.length} lecciones ·{' '}
                          {card.completedModuleCount}/{card.courseModules.length} módulos
                        </p>
                      </div>

                      <div style={styles.progressRight}>
                        <strong style={styles.progressPercent}>{card.progressPercent}%</strong>
                        <div style={styles.progressTrackMini}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${card.progressPercent}%`,
                            }}
                          />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {activeTab === 'certificados' && (
          <Panel title="Mis certificados" label="Credenciales digitales">
            {certificates.length === 0 ? (
              <Empty text="Aún no tienes certificados reales emitidos. Completa un curso y emite tu certificado para verlo aquí." />
            ) : (
              <div style={styles.cardsGrid}>
                {certificates.map((certificate) => (
                  <CertificateCard key={certificate.id} certificate={certificate} />
                ))}
              </div>
            )}
          </Panel>
        )}

        {activeTab === 'perfil' && (
          <Panel title={displayName} label="Perfil">
            <div style={styles.profileGrid}>
              <InfoBox label="Email" value={user?.email || '—'} />
              <InfoBox label="Rol" value={profile?.role || 'student'} />
              <InfoBox label="Cursos completados" value={stats.completedCourses} />
              <InfoBox label="Certificados" value={stats.certificates} />
            </div>

            <div style={styles.profileNote}>
              <p style={styles.profileNoteTitle}>Siguiente fase prevista</p>
              <p style={styles.muted}>
                Más adelante añadiremos edición de perfil, foto, dispositivos autorizados,
                preferencias, actividad reciente, protección antiuso compartido y asistencia IA 24/7.
              </p>
            </div>
          </Panel>
        )}
      </section>
    </main>
  );
}

function BackgroundOrbs() {
  return (
    <div style={styles.backgroundLayer} aria-hidden="true">
      <div style={styles.orbOne} />
      <div style={styles.orbTwo} />
      <div style={styles.orbThree} />
      <div style={styles.gridOverlay} />
    </div>
  );
}

function TabButton({
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
      <div style={styles.sectionHeader}>
        <div>
          <p style={styles.sectionLabel}>{label}</p>
          <h2 style={styles.sectionTitle}>{title}</h2>
        </div>
      </div>

      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={styles.statCard}>
      <p style={styles.smallLabel}>{label}</p>
      <strong style={styles.statValue}>{value}</strong>
    </article>
  );
}

function MicroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={styles.microStat}>
      <p style={styles.smallLabel}>{label}</p>
      <strong style={styles.microValue}>{value}</strong>
    </article>
  );
}

function CourseCard({ card, completed = false }: { card: DashboardCard; completed?: boolean }) {
  const course = card.course;
  const nextLesson = card.nextLesson;

  return (
    <article style={styles.courseCard}>
      <div style={styles.courseImage}>
        <div style={styles.courseImageShade} />
      </div>

      <div style={styles.courseBody}>
        <div style={styles.badgeRow}>
          {course.course_type && <span style={styles.badgeMain}>{course.course_type}</span>}
          {course.level && <span style={styles.badgeSecondary}>{course.level}</span>}
          {completed && <span style={styles.badgeCompleted}>Completado</span>}
          {card.certificate && <span style={styles.badgeCompleted}>Certificado</span>}
        </div>

        <h3 style={styles.courseTitle}>{course.title}</h3>

        {course.subtitle && <p style={styles.courseSubtitle}>{course.subtitle}</p>}

        <p style={styles.courseText}>
          {course.description || 'Formación premium basada en ciencia real.'}
        </p>

        <div style={styles.miniGrid}>
          <InfoBox
            label="Lecciones"
            value={`${card.completedLessonCount}/${card.courseLessons.length}`}
          />
          <InfoBox
            label="Módulos"
            value={`${card.completedModuleCount}/${card.courseModules.length}`}
          />
          <InfoBox label="Progreso" value={`${card.progressPercent}%`} />
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

          <Link href={`/cursos/${course.slug}`} style={styles.textLink}>
            Detalle
          </Link>
        </div>
      </div>
    </article>
  );
}

function CertificateCard({ certificate }: { certificate: AnyRecord }) {
  return (
    <article style={styles.certificateCard}>
      <div style={styles.certificateIcon}>★</div>

      <p style={styles.smallLabel}>Certificado válido</p>
      <h3 style={styles.certificateTitle}>
        {certificate.course_title || 'Curso completado'}
      </h3>

      <div style={styles.miniGrid}>
        <InfoBox label="Nota final" value={`${certificate.final_score ?? '—'}%`} />
        <InfoBox label="Estado" value="Válido" />
        <InfoBox label="Código" value={certificate.certificate_code || '—'} />
      </div>

      {certificate.certificate_code && (
        <p style={styles.certificateCode}>{certificate.certificate_code}</p>
      )}

      {certificate.verification_slug ? (
        <Link href={`/certificados/${certificate.verification_slug}`} style={styles.primaryButton}>
          Ver certificado →
        </Link>
      ) : (
        <p style={styles.muted}>Certificado registrado sin enlace de verificación pública.</p>
      )}
    </article>
  );
}

function TimelineItem({ title, text }: { title: string; text: string }) {
  return (
    <article style={styles.timelineItem}>
      <div style={styles.timelineDot} />
      <h3 style={styles.timelineTitle}>{title}</h3>
      <p style={styles.muted}>{text}</p>
    </article>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.infoBox}>
      <p style={styles.smallLabel}>{label}</p>
      <p style={styles.infoValue}>{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <article style={styles.emptyCard}>
      <p style={styles.muted}>{text}</p>
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

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '292px minmax(0, 1fr)',
    background: '#050706',
    color: '#F2F4F1',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },

  backgroundLayer: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
    overflow: 'hidden',
  },

  orbOne: {
    position: 'absolute',
    width: 560,
    height: 560,
    borderRadius: '999px',
    left: -220,
    top: -180,
    background: 'rgba(34,214,91,0.14)',
    filter: 'blur(90px)',
  },

  orbTwo: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: '999px',
    right: -240,
    top: 180,
    background: 'rgba(148,163,184,0.10)',
    filter: 'blur(100px)',
  },

  orbThree: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: '999px',
    left: '40%',
    bottom: -300,
    background: 'rgba(34,214,91,0.07)',
    filter: 'blur(110px)',
  },

  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
    backgroundSize: '46px 46px',
    maskImage: 'radial-gradient(circle at top, black, transparent 72%)',
  },

  loadingCard: {
    width: 'min(620px, calc(100vw - 40px))',
    margin: '22vh auto 0',
    borderRadius: '34px',
    border: '1px solid rgba(255,255,255,0.10)',
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.025))',
    padding: '34px',
    position: 'relative',
    zIndex: 1,
    boxShadow: '0 30px 120px rgba(0,0,0,0.42)',
    backdropFilter: 'blur(22px)',
  },

  loadingPulse: {
    width: 54,
    height: 4,
    borderRadius: 999,
    background: green,
    boxShadow: '0 0 30px rgba(34,214,91,0.45)',
    marginTop: 28,
  },

  loadingTitle: {
    fontSize: 'clamp(38px, 6vw, 68px)',
    lineHeight: '0.95',
    fontWeight: 900,
    letterSpacing: '-0.055em',
    margin: '18px 0 0',
  },

  sidebar: {
    minHeight: '100vh',
    position: 'sticky',
    top: 0,
    alignSelf: 'start',
    borderRight: '1px solid rgba(255,255,255,0.075)',
    background:
      'linear-gradient(180deg, rgba(8,11,10,0.92), rgba(0,0,0,0.74))',
    backdropFilter: 'blur(22px)',
    padding: '26px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    zIndex: 2,
  },

  logoWrap: {
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
  },

  studentCard: {
    marginTop: '26px',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.10)',
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.070), rgba(255,255,255,0.028))',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 20px 70px rgba(0,0,0,0.25)',
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: '999px',
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(34,214,91,0.12)',
    border: '1px solid rgba(34,214,91,0.30)',
    color: green,
    fontWeight: 950,
    boxShadow: '0 0 26px rgba(34,214,91,0.12)',
    flexShrink: 0,
  },

  studentMeta: {
    minWidth: 0,
  },

  studentName: {
    margin: 0,
    fontSize: 13,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 170,
  },

  studentRole: {
    margin: '4px 0 0',
    color: 'rgba(242,244,241,0.48)',
    fontSize: 12,
  },

  sidebarMetric: {
    marginTop: 16,
    borderRadius: 22,
    border: '1px solid rgba(34,214,91,0.16)',
    background: 'rgba(34,214,91,0.055)',
    padding: 16,
  },

  sidebarMetricLabel: {
    display: 'block',
    color: 'rgba(242,244,241,0.50)',
    fontSize: 11,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    fontWeight: 900,
  },

  sidebarMetricValue: {
    display: 'block',
    color: green,
    fontSize: 32,
    lineHeight: 1,
    marginTop: 10,
    fontWeight: 950,
  },

  nav: {
    display: 'grid',
    gap: '9px',
    marginTop: '28px',
    marginBottom: '34px',
  },

  navButton: {
    width: '100%',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.035)',
    color: 'rgba(242,244,241,0.66)',
    borderRadius: '17px',
    padding: '13px 14px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: '160ms ease',
  },

  navActive: {
    width: '100%',
    border: '1px solid rgba(34,214,91,0.38)',
    background:
      'linear-gradient(135deg, rgba(34,214,91,0.14), rgba(34,214,91,0.055))',
    color: green,
    borderRadius: '17px',
    padding: '13px 14px',
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: '0 0 28px rgba(34,214,91,0.08)',
  },

  navLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 950,
    letterSpacing: '0.13em',
    textTransform: 'uppercase',
  },

  navHelper: {
    display: 'block',
    marginTop: 5,
    color: 'rgba(242,244,241,0.42)',
    fontSize: 11,
    letterSpacing: 0,
    textTransform: 'none',
    fontWeight: 650,
  },

  sidebarFooter: {
    display: 'grid',
    gap: '12px',
  },

  sidebarLink: {
    display: 'block',
    textDecoration: 'none',
    textAlign: 'center',
    border: '1px solid rgba(34,214,91,0.28)',
    background: 'rgba(34,214,91,0.08)',
    color: green,
    borderRadius: '16px',
    padding: '13px',
    fontSize: '12px',
    fontWeight: 950,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },

  logoutButton: {
    border: '1px solid rgba(255,80,80,0.34)',
    background: 'rgba(255,80,80,0.10)',
    color: '#ff9f9f',
    borderRadius: '16px',
    padding: '13px',
    fontSize: '12px',
    fontWeight: 950,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },

  content: {
    minWidth: 0,
    padding: '34px',
    position: 'relative',
    zIndex: 1,
    overflow: 'auto',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '24px',
    alignItems: 'flex-start',
    marginBottom: '28px',
  },

  headerText: {
    maxWidth: 850,
  },

  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },

  kicker: {
    color: green,
    fontSize: '12px',
    letterSpacing: '0.30em',
    fontWeight: 950,
    textTransform: 'uppercase',
    margin: '0 0 14px',
  },

  title: {
    fontSize: 'clamp(42px, 5.4vw, 74px)',
    lineHeight: '0.92',
    fontWeight: 950,
    letterSpacing: '-0.065em',
    margin: 0,
  },

  headerSubtitle: {
    color: 'rgba(242,244,241,0.66)',
    fontSize: '15px',
    lineHeight: 1.75,
    margin: '18px 0 0',
    maxWidth: 760,
  },

  muted: {
    color: 'rgba(242,244,241,0.64)',
    fontSize: '14px',
    lineHeight: 1.7,
    marginTop: 10,
  },

  notice: {
    padding: '18px 20px',
    borderRadius: '22px',
    border: '1px solid rgba(34,214,91,0.22)',
    color: 'rgba(242,244,241,0.72)',
    marginBottom: '20px',
    background: 'rgba(255,255,255,0.035)',
    backdropFilter: 'blur(18px)',
  },

  stack: {
    display: 'grid',
    gap: '24px',
  },

  heroGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(290px, 0.82fr) minmax(0, 1.5fr)',
    gap: '18px',
  },

  progressPanel: {
    borderRadius: '34px',
    border: '1px solid rgba(255,255,255,0.10)',
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.078), rgba(255,255,255,0.025))',
    padding: '24px',
    boxShadow: '0 28px 100px rgba(0,0,0,0.30)',
    backdropFilter: 'blur(20px)',
  },

  panelTopLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  liveBadge: {
    border: '1px solid rgba(34,214,91,0.28)',
    color: green,
    background: 'rgba(34,214,91,0.08)',
    borderRadius: 999,
    padding: '7px 10px',
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: '0.13em',
    textTransform: 'uppercase',
  },

  nextPanel: {
    borderRadius: '34px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.045)',
    display: 'grid',
    gridTemplateColumns: '0.92fr 1fr',
    overflow: 'hidden',
    boxShadow: '0 28px 100px rgba(0,0,0,0.30)',
    backdropFilter: 'blur(20px)',
  },

  nextImage: {
    minHeight: 340,
    backgroundImage:
      'linear-gradient(90deg, rgba(5,7,6,0.12), rgba(5,7,6,0.92)), url(https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1200&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'grayscale(1) contrast(1.08) brightness(0.72)',
    position: 'relative',
  },

  imageOverlayText: {
    position: 'absolute',
    left: 24,
    bottom: 24,
    display: 'grid',
    gap: 4,
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    fontSize: 11,
    fontWeight: 850,
  },

  nextBody: {
    padding: '26px',
  },

  smallTitle: {
    margin: '12px 0 12px',
    fontSize: 'clamp(28px, 3vw, 44px)',
    lineHeight: 0.98,
    fontWeight: 950,
    letterSpacing: '-0.045em',
  },

  ringWrap: {
    display: 'flex',
    justifyContent: 'center',
    margin: '24px 0',
  },

  ring: {
    width: 178,
    height: 178,
    borderRadius: '999px',
    display: 'grid',
    placeItems: 'center',
    boxShadow: '0 0 44px rgba(34,214,91,0.13)',
  },

  ringInner: {
    width: 134,
    height: 134,
    borderRadius: '999px',
    background: '#080B0A',
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.10)',
  },

  ringNumber: {
    display: 'block',
    color: 'white',
    fontSize: 36,
    lineHeight: 1,
    fontWeight: 950,
  },

  ringText: {
    display: 'block',
    color: 'rgba(242,244,241,0.48)',
    fontSize: 12,
    marginTop: -26,
  },

  microStatsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginTop: 18,
  },

  microStat: {
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.085)',
    background: 'rgba(0,0,0,0.24)',
    padding: 13,
  },

  microValue: {
    display: 'block',
    marginTop: 8,
    color: 'white',
    fontSize: 24,
    fontWeight: 950,
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '16px',
  },

  statCard: {
    borderRadius: '26px',
    border: '1px solid rgba(255,255,255,0.095)',
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.060), rgba(255,255,255,0.020))',
    padding: '20px',
    boxShadow: '0 22px 70px rgba(0,0,0,0.18)',
    backdropFilter: 'blur(18px)',
  },

  smallLabel: {
    margin: 0,
    color: 'rgba(242,244,241,0.44)',
    fontSize: '11px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontWeight: 900,
  },

  statValue: {
    display: 'block',
    marginTop: '12px',
    color: green,
    fontSize: '38px',
    lineHeight: 1,
    fontWeight: 950,
    letterSpacing: '-0.04em',
  },

  panel: {
    borderRadius: '34px',
    border: '1px solid rgba(255,255,255,0.095)',
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.060), rgba(255,255,255,0.020))',
    padding: '24px',
    boxShadow: '0 28px 100px rgba(0,0,0,0.22)',
    backdropFilter: 'blur(20px)',
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '18px',
    alignItems: 'flex-end',
    marginBottom: '18px',
  },

  sectionLabel: {
    margin: 0,
    color: green,
    fontSize: '12px',
    fontWeight: 950,
    letterSpacing: '0.26em',
    textTransform: 'uppercase',
  },

  sectionTitle: {
    margin: '8px 0 0',
    fontSize: '32px',
    lineHeight: 1,
    fontWeight: 950,
    letterSpacing: '-0.04em',
  },

  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
    gap: '18px',
  },

  courseCard: {
    borderRadius: '30px',
    border: '1px solid rgba(255,255,255,0.095)',
    background: 'rgba(255,255,255,0.040)',
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0,0,0,0.20)',
  },

  courseImage: {
    height: 158,
    backgroundImage:
      'linear-gradient(180deg, rgba(5,7,6,0.05), rgba(5,7,6,0.92)), url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'grayscale(1) brightness(0.78) contrast(1.04)',
    position: 'relative',
  },

  courseImageShade: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at top right, rgba(34,214,91,0.18), transparent 36%)',
  },

  courseBody: {
    padding: '22px',
  },

  certificateCard: {
    borderRadius: '30px',
    border: '1px solid rgba(255,255,255,0.18)',
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.10), rgba(34,214,91,0.045))',
    padding: '22px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.20)',
  },

  certificateIcon: {
    width: 58,
    height: 58,
    borderRadius: '999px',
    display: 'grid',
    placeItems: 'center',
    border: '1px solid rgba(34,214,91,0.32)',
    background: 'rgba(34,214,91,0.08)',
    color: green,
    marginBottom: 16,
    boxShadow: '0 0 26px rgba(34,214,91,0.14)',
  },

  badgeRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },

  badgeMain: {
    background: green,
    color: '#061008',
    borderRadius: '999px',
    padding: '7px 10px',
    fontSize: '10px',
    fontWeight: 950,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },

  badgeSecondary: {
    border: '1px solid rgba(255,255,255,0.13)',
    color: 'rgba(242,244,241,0.70)',
    borderRadius: '999px',
    padding: '7px 10px',
    fontSize: '10px',
    fontWeight: 850,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },

  badgeCompleted: {
    background: 'rgba(34,214,91,0.12)',
    border: '1px solid rgba(34,214,91,0.35)',
    color: green,
    borderRadius: '999px',
    padding: '7px 10px',
    fontSize: '10px',
    fontWeight: 850,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },

  courseTitle: {
    margin: '0 0 10px',
    fontSize: '25px',
    lineHeight: 1.05,
    fontWeight: 950,
    letterSpacing: '-0.035em',
  },

  certificateTitle: {
    margin: '8px 0 10px',
    fontSize: '25px',
    lineHeight: 1.05,
    fontWeight: 950,
    letterSpacing: '-0.035em',
  },

  courseSubtitle: {
    color: green,
    fontSize: '14px',
    fontWeight: 850,
    lineHeight: 1.5,
    margin: '0 0 10px',
  },

  courseText: {
    color: 'rgba(242,244,241,0.62)',
    fontSize: '14px',
    lineHeight: 1.65,
    minHeight: '70px',
  },

  miniGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '10px',
    margin: '18px 0',
  },

  nextMetaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '10px',
    margin: '18px 0',
  },

  infoBox: {
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.085)',
    background: 'rgba(0,0,0,0.24)',
    padding: '12px',
  },

  infoValue: {
    margin: '7px 0 0',
    color: 'white',
    fontWeight: 900,
    lineHeight: 1.25,
  },

  progressTrack: {
    height: '10px',
    borderRadius: '999px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.10)',
    margin: '16px 0',
  },

  progressTrackSoft: {
    height: '9px',
    borderRadius: '999px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.10)',
    margin: '13px 0 0',
  },

  progressTrackMini: {
    height: '10px',
    borderRadius: '999px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.10)',
    width: '170px',
    margin: '8px 0 0',
  },

  progressFill: {
    height: '100%',
    borderRadius: '999px',
    background: green,
    boxShadow: '0 0 20px rgba(34,214,91,0.38)',
  },

  cardActions: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '10px',
    alignItems: 'center',
  },

  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '15px',
    background: green,
    color: '#061008',
    padding: '14px 16px',
    fontSize: '12px',
    fontWeight: 950,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    textAlign: 'center',
    boxShadow: '0 0 28px rgba(34,214,91,0.20)',
  },

  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '15px',
    background: 'rgba(34,214,91,0.09)',
    color: green,
    border: '1px solid rgba(34,214,91,0.30)',
    padding: '14px 16px',
    fontSize: '12px',
    fontWeight: 950,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    textAlign: 'center',
    boxShadow: '0 0 24px rgba(34,214,91,0.10)',
  },

  ghostButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '15px',
    background: 'rgba(255,255,255,0.045)',
    color: 'rgba(242,244,241,0.72)',
    border: '1px solid rgba(255,255,255,0.10)',
    padding: '14px 16px',
    fontSize: '12px',
    fontWeight: 950,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    textAlign: 'center',
  },

  textLink: {
    color: green,
    fontSize: '12px',
    fontWeight: 950,
    textTransform: 'uppercase',
    textDecoration: 'none',
    letterSpacing: '0.08em',
  },

  emptyCard: {
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.030)',
    padding: '22px',
  },

  progressList: {
    display: 'grid',
    gap: '12px',
  },

  progressRow: {
    borderRadius: '22px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.24)',
    padding: '17px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '18px',
    alignItems: 'center',
  },

  progressMain: {
    minWidth: 0,
  },

  progressCourseTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 950,
    letterSpacing: '-0.02em',
  },

  progressRight: {
    textAlign: 'right',
    flexShrink: 0,
  },

  progressPercent: {
    color: green,
    fontSize: '22px',
    fontWeight: 950,
  },

  certificateCode: {
    color: green,
    fontSize: '13px',
    fontWeight: 850,
    letterSpacing: '0.06em',
    marginTop: '12px',
    overflowWrap: 'anywhere',
  },

  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '14px',
    margin: '22px 0',
  },

  profileNote: {
    borderRadius: 24,
    border: '1px solid rgba(34,214,91,0.18)',
    background: 'rgba(34,214,91,0.055)',
    padding: 18,
    marginTop: 18,
  },

  profileNoteTitle: {
    margin: 0,
    color: 'white',
    fontWeight: 950,
    fontSize: 17,
  },

  timelineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 14,
  },

  timelineItem: {
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.085)',
    background: 'rgba(0,0,0,0.22)',
    padding: 18,
  },

  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: green,
    boxShadow: '0 0 18px rgba(34,214,91,0.40)',
    marginBottom: 14,
  },

  timelineTitle: {
    margin: 0,
    color: 'white',
    fontSize: 17,
    fontWeight: 950,
    letterSpacing: '-0.02em',
  },
};
