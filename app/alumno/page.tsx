'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import GHCLogo from '../components/GHCLogo';

type AnyRecord = Record<string, any>;
type Tab = 'resumen' | 'cursos' | 'progreso' | 'certificados' | 'perfil';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const green = '#22D65B';

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
          }
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

  const courseCards = useMemo(() => {
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

  const globalProgress =
    totalLessons > 0 ? Math.round((lessonProgress.length / totalLessons) * 100) : 0;

  const stats = {
    courses: courses.length,
    lessons: lessonProgress.length,
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
        <section style={styles.loadingCard}>
          <GHCLogo size="md" showText tagline={false} />
          <h1 style={styles.loadingTitle}>Cargando portal</h1>
          <p style={styles.muted}>Estamos preparando tu dashboard real de alumno.</p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <GHCLogo size="md" showText tagline={false} />

          <div style={styles.studentCard}>
            <div style={styles.avatar}>{getInitials(displayName)}</div>

            <div>
              <p style={styles.studentName}>{displayName}</p>
              <p style={styles.studentRole}>Alumno GHC Academy</p>
            </div>
          </div>

          <nav style={styles.nav}>
            <TabButton label="Resumen" active={activeTab === 'resumen'} onClick={() => setActiveTab('resumen')} />
            <TabButton label="Mis cursos" active={activeTab === 'cursos'} onClick={() => setActiveTab('cursos')} />
            <TabButton label="Progreso" active={activeTab === 'progreso'} onClick={() => setActiveTab('progreso')} />
            <TabButton label="Certificados" active={activeTab === 'certificados'} onClick={() => setActiveTab('certificados')} />
            <TabButton label="Perfil" active={activeTab === 'perfil'} onClick={() => setActiveTab('perfil')} />
          </nav>
        </div>

        <div style={styles.sidebarFooter}>
          <Link href="/cursos" style={styles.sidebarLink}>
            Catálogo
          </Link>

          <button onClick={handleLogout} style={styles.logoutButton}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <section style={styles.content}>
        <header style={styles.header}>
          <div>
            <p style={styles.kicker}>Portal del alumno</p>
            <h1 style={styles.title}>Bienvenido, {shortName(displayName)}</h1>
            <p style={styles.muted}>
              Tu progreso, cursos, módulos aprobados y certificados ya se leen desde Supabase.
            </p>
          </div>

          <Link href="/cursos" style={styles.secondaryButton}>
            Explorar cursos
          </Link>
        </header>

        {systemMessage && <div style={styles.notice}>{systemMessage}</div>}

        {activeTab === 'resumen' && (
          <div style={styles.stack}>
            <section style={styles.heroGrid}>
              <article style={styles.progressPanel}>
                <p style={styles.sectionLabel}>Progreso general</p>

                <div style={styles.ringWrap}>
                  <div
                    style={{
                      ...styles.ring,
                      background: `conic-gradient(${green} ${globalProgress * 3.6}deg, rgba(255,255,255,0.10) 0deg)`,
                    }}
                  >
                    <div style={styles.ringInner}>
                      <strong>{globalProgress}%</strong>
                      <span>Completado</span>
                    </div>
                  </div>
                </div>

                <p style={styles.muted}>
                  Resumen global de tu progreso real dentro de GHC Academy.
                </p>
              </article>

              <article style={styles.nextPanel}>
                <div style={styles.nextImage} />

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
                        <div style={{ ...styles.progressFill, width: `${mainCourse.progressPercent}%` }} />
                      </div>

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
                    </>
                  ) : (
                    <>
                      <h2 style={styles.smallTitle}>Aún no hay cursos activos</h2>
                      <p style={styles.muted}>Entra al catálogo para iniciar tu itinerario.</p>
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
              <div style={styles.progressList}>
                {courseCards.map((card) => (
                  <article key={card.course.id} style={styles.progressRow}>
                    <div>
                      <h3 style={styles.progressCourseTitle}>{card.course.title}</h3>
                      <p style={styles.muted}>
                        {card.completedLessonCount}/{card.courseLessons.length} lecciones ·{' '}
                        {card.completedModuleCount}/{card.courseModules.length} módulos
                      </p>
                    </div>

                    <div style={styles.progressRight}>
                      <strong style={styles.progressPercent}>{card.progressPercent}%</strong>
                      <div style={styles.progressTrackMini}>
                        <div style={{ ...styles.progressFill, width: `${card.progressPercent}%` }} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
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

            <p style={styles.muted}>
              Más adelante añadiremos edición de perfil, foto, dispositivos autorizados y preferencias.
            </p>
          </Panel>
        )}
      </section>
    </main>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={active ? styles.navActive : styles.navButton}>
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
  children: React.ReactNode;
}) {
  return (
    <section style={styles.panel}>
      <p style={styles.sectionLabel}>{label}</p>
      <h2 style={styles.sectionTitle}>{title}</h2>
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

function CourseCard({ card, completed = false }: { card: AnyRecord; completed?: boolean }) {
  const course = card.course;
  const nextLesson = card.nextLesson;

  return (
    <article style={styles.courseCard}>
      <div style={styles.courseImage} />

      <div style={styles.courseBody}>
        <div style={styles.badgeRow}>
          {course.course_type && <span style={styles.badgeMain}>{course.course_type}</span>}
          {course.level && <span style={styles.badgeSecondary}>{course.level}</span>}
          {completed && <span style={styles.badgeCompleted}>Completado</span>}
        </div>

        <h3 style={styles.courseTitle}>{course.title}</h3>

        {course.subtitle && <p style={styles.courseSubtitle}>{course.subtitle}</p>}

        <p style={styles.courseText}>
          {course.description || 'Formación premium basada en ciencia real.'}
        </p>

        <div style={styles.miniGrid}>
          <InfoBox label="Lecciones" value={`${card.completedLessonCount}/${card.courseLessons.length}`} />
          <InfoBox label="Módulos" value={`${card.completedModuleCount}/${card.courseModules.length}`} />
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
      <h3 style={styles.certificateTitle}>{certificate.course_title}</h3>

      <div style={styles.miniGrid}>
        <InfoBox label="Nota final" value={`${certificate.final_score}%`} />
        <InfoBox label="Estado" value="Válido" />
      </div>

      <p style={styles.certificateCode}>{certificate.certificate_code}</p>

      <Link href={`/certificados/${certificate.verification_slug}`} style={styles.primaryButton}>
        Ver certificado →
      </Link>
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
    background:
      'radial-gradient(circle at top left, rgba(34,214,91,0.10), transparent 36%), radial-gradient(circle at bottom right, rgba(34,214,91,0.06), transparent 30%), #050706',
    color: '#F2F4F1',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },

  loadingCard: {
    maxWidth: '620px',
    margin: '22vh auto 0',
    borderRadius: '34px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))',
    padding: '34px',
  },

  loadingTitle: {
    fontSize: 'clamp(38px, 6vw, 68px)',
    lineHeight: '0.95',
    fontWeight: 850,
    letterSpacing: '-0.035em',
    margin: '24px 0 0',
  },

  sidebar: {
    minHeight: '100vh',
    position: 'sticky',
    top: 0,
    alignSelf: 'start',
    borderRight: '1px solid rgba(255,255,255,0.075)',
    background: 'rgba(0,0,0,0.54)',
    backdropFilter: 'blur(18px)',
    padding: '26px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },

  studentCard: {
    marginTop: '26px',
    borderRadius: '22px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.045)',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: '999px',
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(34,214,91,0.12)',
    border: '1px solid rgba(34,214,91,0.28)',
    color: green,
    fontWeight: 950,
  },

  studentName: {
    margin: 0,
    fontSize: 13,
    fontWeight: 900,
  },

  studentRole: {
    margin: '4px 0 0',
    color: 'rgba(242,244,241,0.46)',
    fontSize: 12,
  },

  nav: {
    display: 'grid',
    gap: '9px',
    marginTop: '34px',
    marginBottom: '34px',
  },

  navButton: {
    width: '100%',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.035)',
    color: 'rgba(242,244,241,0.62)',
    borderRadius: '15px',
    padding: '14px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 850,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },

  navActive: {
    width: '100%',
    border: '1px solid rgba(34,214,91,0.36)',
    background: 'rgba(34,214,91,0.10)',
    color: green,
    borderRadius: '15px',
    padding: '14px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 850,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },

  sidebarFooter: {
    display: 'grid',
    gap: '12px',
  },

  sidebarLink: {
    display: 'block',
    textDecoration: 'none',
    textAlign: 'center',
    border: '1px solid rgba(34,214,91,0.26)',
    background: 'rgba(34,214,91,0.08)',
    color: green,
    borderRadius: '16px',
    padding: '13px',
    fontSize: '12px',
    fontWeight: 900,
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
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },

  content: {
    minWidth: 0,
    padding: '34px',
  },

  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '24px',
    alignItems: 'flex-start',
    marginBottom: '28px',
  },

  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },

  kicker: {
    color: green,
    fontSize: '12px',
    letterSpacing: '0.30em',
    fontWeight: 900,
    textTransform: 'uppercase',
    margin: '0 0 14px',
  },

  title: {
    fontSize: 'clamp(38px, 5vw, 66px)',
    lineHeight: '0.95',
    fontWeight: 850,
    letterSpacing: '-0.035em',
    margin: 0,
  },

  muted: {
    color: 'rgba(242,244,241,0.66)',
    fontSize: '14px',
    lineHeight: 1.7,
  },

  notice: {
    padding: '20px',
    borderRadius: '22px',
    border: '1px solid rgba(34,214,91,0.22)',
    color: 'rgba(242,244,241,0.72)',
    marginBottom: '20px',
    background: 'rgba(255,255,255,0.035)',
  },

  stack: {
    display: 'grid',
    gap: '24px',
  },

  heroGrid: {
    display: 'grid',
    gridTemplateColumns: '0.85fr 1.5fr',
    gap: '18px',
  },

  progressPanel: {
    borderRadius: '30px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))',
    padding: '24px',
  },

  nextPanel: {
    borderRadius: '30px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.045)',
    display: 'grid',
    gridTemplateColumns: '0.92fr 1fr',
    overflow: 'hidden',
  },

  nextImage: {
    minHeight: 300,
    backgroundImage:
      'linear-gradient(90deg, rgba(5,7,6,0.15), rgba(5,7,6,0.88)), url(https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1200&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'grayscale(1) contrast(1.06) brightness(0.72)',
  },

  nextBody: {
    padding: '24px',
  },

  smallTitle: {
    margin: '0 0 12px',
    fontSize: '26px',
    lineHeight: 1.08,
    fontWeight: 850,
    letterSpacing: '-0.02em',
  },

  ringWrap: {
    display: 'flex',
    justifyContent: 'center',
    margin: '22px 0',
  },

  ring: {
    width: 168,
    height: 168,
    borderRadius: '999px',
    display: 'grid',
    placeItems: 'center',
  },

  ringInner: {
    width: 128,
    height: 128,
    borderRadius: '999px',
    background: '#080B0A',
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.10)',
  },

  microStatsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginTop: 18,
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '16px',
  },

  statCard: {
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.095)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.060), rgba(255,255,255,0.020))',
    padding: '20px',
  },

  smallLabel: {
    margin: 0,
    color: 'rgba(242,244,241,0.44)',
    fontSize: '11px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontWeight: 850,
  },

  statValue: {
    display: 'block',
    marginTop: '10px',
    color: green,
    fontSize: '36px',
    lineHeight: 1,
    fontWeight: 850,
  },

  panel: {
    borderRadius: '30px',
    border: '1px solid rgba(255,255,255,0.095)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.060), rgba(255,255,255,0.020))',
    padding: '24px',
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
    fontWeight: 900,
    letterSpacing: '0.26em',
    textTransform: 'uppercase',
  },

  sectionTitle: {
    margin: '6px 0 0',
    fontSize: '30px',
    lineHeight: 1,
    fontWeight: 850,
  },

  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
    gap: '18px',
  },

  courseCard: {
    borderRadius: '26px',
    border: '1px solid rgba(255,255,255,0.095)',
    background: 'rgba(255,255,255,0.040)',
    overflow: 'hidden',
  },

  courseImage: {
    height: 150,
    backgroundImage:
      'linear-gradient(180deg, rgba(5,7,6,0.05), rgba(5,7,6,0.90)), url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'grayscale(1) brightness(0.78)',
  },

  courseBody: {
    padding: '22px',
  },

  certificateCard: {
    borderRadius: '26px',
    border: '1px solid rgba(255,255,255,0.22)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.10), rgba(34,214,91,0.04))',
    padding: '22px',
  },

  certificateIcon: {
    width: 58,
    height: 58,
    borderRadius: '999px',
    display: 'grid',
    placeItems: 'center',
    border: '1px solid rgba(255,255,255,0.20)',
    color: green,
    marginBottom: 16,
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
    fontWeight: 900,
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
    fontSize: '24px',
    lineHeight: 1.08,
    fontWeight: 850,
  },

  certificateTitle: {
    margin: '0 0 10px',
    fontSize: '24px',
    lineHeight: 1.08,
    fontWeight: 850,
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

  infoBox: {
    borderRadius: '15px',
    border: '1px solid rgba(255,255,255,0.085)',
    background: 'rgba(0,0,0,0.24)',
    padding: '11px',
  },

  infoValue: {
    margin: '6px 0 0',
    color: 'white',
    fontWeight: 850,
  },

  progressTrack: {
    height: '10px',
    borderRadius: '999px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.10)',
    margin: '16px 0',
  },

  progressTrackMini: {
    height: '10px',
    borderRadius: '999px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.10)',
    width: '160px',
    margin: '8px 0 0',
  },

  progressFill: {
    height: '100%',
    borderRadius: '999px',
    background: green,
    boxShadow: '0 0 18px rgba(34,214,91,0.35)',
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
    borderRadius: '14px',
    background: green,
    color: '#061008',
    padding: '14px',
    fontSize: '12px',
    fontWeight: 900,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    textAlign: 'center',
    boxShadow: '0 0 24px rgba(34,214,91,0.18)',
  },

  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '14px',
    background: 'rgba(34,214,91,0.09)',
    color: green,
    border: '1px solid rgba(34,214,91,0.28)',
    padding: '14px',
    fontSize: '12px',
    fontWeight: 900,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    textAlign: 'center',
    boxShadow: '0 0 24px rgba(34,214,91,0.12)',
  },

  textLink: {
    color: green,
    fontSize: '12px',
    fontWeight: 900,
    textTransform: 'uppercase',
    textDecoration: 'none',
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
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.24)',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '18px',
    alignItems: 'center',
  },

  progressCourseTitle: {
    margin: 0,
    fontSize: '17px',
    fontWeight: 850,
  },

  progressRight: {
    textAlign: 'right',
  },

  progressPercent: {
    color: green,
    fontSize: '21px',
    fontWeight: 900,
  },

  certificateCode: {
    color: green,
    fontSize: '13px',
    fontWeight: 850,
    letterSpacing: '0.06em',
    marginTop: '12px',
  },

  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '14px',
    margin: '22px 0',
  },
};
