'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import GHCLogo from '../components/GHCLogo';

type AnyRecord = Record<string, any>;
type DashboardTab = 'overview' | 'courses' | 'progress' | 'certificates' | 'profile';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function AlumnoDashboardPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
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
          console.error('Error loading courses:', coursesError);
          setSystemMessage('No se pudieron cargar los cursos.');
          setCourses([]);
          setLoading(false);
          return;
        }

        const visibleCourses = Array.isArray(coursesData)
          ? coursesData.filter(isVisibleCourse).sort((a, b) =>
              String(a.title || '').localeCompare(String(b.title || ''))
            )
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
        console.error('Error loading student dashboard:', error);
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

  const stats = useMemo(() => {
    const totalLessons = courseCards.reduce(
      (sum, card) => sum + card.courseLessons.length,
      0
    );

    const globalProgress =
      totalLessons > 0 ? Math.round((lessonProgress.length / totalLessons) * 100) : 0;

    return {
      visibleCourses: courses.length,
      activeCourses: activeCourses.length,
      completedCourses: completedCourses.length,
      completedLessons: lessonProgress.length,
      completedModules: moduleCompletions.length,
      certificates: certificates.length,
      globalProgress,
    };
  }, [
    courses,
    activeCourses,
    completedCourses,
    lessonProgress,
    moduleCompletions,
    certificates,
    courseCards,
  ]);

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
          <p style={styles.mutedText}>Estamos preparando tu dashboard real de alumno.</p>
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
        </div>

        <nav style={styles.nav}>
          <SidebarButton
            active={activeTab === 'overview'}
            label="Resumen"
            onClick={() => setActiveTab('overview')}
          />
          <SidebarButton
            active={activeTab === 'courses'}
            label="Mis cursos"
            onClick={() => setActiveTab('courses')}
          />
          <SidebarButton
            active={activeTab === 'progress'}
            label="Progreso"
            onClick={() => setActiveTab('progress')}
          />
          <SidebarButton
            active={activeTab === 'certificates'}
            label="Certificados"
            onClick={() => setActiveTab('certificates')}
          />
          <SidebarButton
            active={activeTab === 'profile'}
            label="Perfil"
            onClick={() => setActiveTab('profile')}
          />
        </nav>

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
        <header style={styles.topHeader}>
          <div>
            <p style={styles.kicker}>Portal del alumno</p>
            <h2 style={styles.title}>Bienvenido, {shortName(displayName)}</h2>
            <p style={styles.mutedText}>
              Tu progreso, cursos, módulos aprobados y certificados ya se leen desde Supabase.
            </p>
          </div>

          <div style={styles.headerActions}>
            <Link href="/cursos" style={styles.secondaryButton}>
              Explorar cursos
            </Link>
          </div>
        </header>

        {systemMessage && <div style={styles.noticeBox}>{systemMessage}</div>}

        {activeTab === 'overview' && (
          <OverviewTab
            stats={stats}
            mainCourse={mainCourse}
            certificates={certificates}
          />
        )}

        {activeTab === 'courses' && (
          <CoursesTab
            activeCourses={activeCourses}
            completedCourses={completedCourses}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressTab
            stats={stats}
            courseCards={courseCards}
            lessonProgress={lessonProgress}
            moduleCompletions={moduleCompletions}
          />
        )}

        {activeTab === 'certificates' && (
          <CertificatesTab certificates={certificates} />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            displayName={displayName}
            user={user}
            profile={profile}
            stats={stats}
          />
        )}
      </section>
    </main>
  );
}

function SidebarButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? styles.navButtonActive : styles.navButton}
    >
      {label}
    </button>
  );
}

function OverviewTab({
  stats,
  mainCourse,
  certificates,
}: {
  stats: AnyRecord;
  mainCourse: AnyRecord | null;
  certificates: AnyRecord[];
}) {
  return (
    <div style={styles.tabStack}>
      <section style={styles.heroGrid}>
        <article style={styles.progressHero}>
          <p style={styles.sectionLabel}>Progreso general</p>

          <div style={styles.ringShell}>
            <div
              style={{
                ...styles.ring,
                background: `conic-gradient(#22d65b ${stats.globalProgress * 3.6}deg, rgba(255,255,255,0.10) 0deg)`,
              }}
            >
              <div style={styles.ringInner}>
                <strong>{stats.globalProgress}%</strong>
                <span>Completado</span>
              </div>
            </div>
          </div>

          <p style={styles.mutedText}>
            Resumen global de tu progreso en lecciones completadas dentro de los cursos visibles.
          </p>

          <div style={styles.microStatsGrid}>
            <InfoBox label="Lecciones" value={stats.completedLessons} />
            <InfoBox label="Módulos" value={stats.completedModules} />
          </div>
        </article>

        <article style={styles.nextModule}>
          <div style={styles.nextModuleImage} />

          <div style={styles.nextModuleBody}>
            <p style={styles.sectionLabel}>Continuar formación</p>

            {mainCourse ? (
              <>
                <h3 style={styles.smallTitle}>{mainCourse.course.title}</h3>

                <p style={styles.mutedText}>
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
                <h3 style={styles.smallTitle}>Aún no hay cursos activos</h3>
                <p style={styles.mutedText}>Entra al catálogo para iniciar tu itinerario.</p>
                <Link href="/cursos" style={styles.primaryButton}>
                  Ir al catálogo →
                </Link>
              </>
            )}
          </div>
        </article>
      </section>

      <section style={styles.statsGrid}>
        <StatCard label="Cursos visibles" value={stats.visibleCourses} />
        <StatCard label="Lecciones completadas" value={stats.completedLessons} />
        <StatCard label="Módulos aprobados" value={stats.completedModules} />
        <StatCard label="Certificados" value={stats.certificates} />
      </section>

      <section style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div>
            <p style={styles.sectionLabel}>Últimas credenciales</p>
            <h3 style={styles.sectionTitle}>Certificados</h3>
          </div>
        </div>

        {certificates.length === 0 ? (
          <EmptyState text="Cuando emitas certificados reales, aparecerán aquí." />
        ) : (
          <div style={styles.cardsGrid}>
            {certificates.slice(0, 3).map((certificate) => (
              <CertificateCard key={certificate.id} certificate={certificate} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CoursesTab({
  activeCourses,
  completedCourses,
}: {
  activeCourses: AnyRecord[];
  completedCourses: AnyRecord[];
}) {
  return (
    <div style={styles.tabStack}>
      <section style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div>
            <p style={styles.sectionLabel}>Formación activa</p>
            <h3 style={styles.sectionTitle}>Mis cursos</h3>
          </div>
        </div>

        {activeCourses.length === 0 ? (
          <EmptyState text="Todavía no tienes cursos activos. Entra al catálogo para iniciar tu formación." />
        ) : (
          <div style={styles.cardsGrid}>
            {activeCourses.map((card) => (
              <CourseCard key={card.course.id} card={card} />
            ))}
          </div>
        )}
      </section>

      <section style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div>
            <p style={styles.sectionLabel}>Historial académico</p>
            <h3 style={styles.sectionTitle}>Cursos completados</h3>
          </div>
        </div>

        {completedCourses.length === 0 ? (
          <EmptyState text="Cuando completes un curso, aparecerá aquí." />
        ) : (
          <div style={styles.cardsGrid}>
            {completedCourses.map((card) => (
              <CourseCard key={card.course.id} card={card} completed />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProgressTab({
  stats,
  courseCards,
  lessonProgress,
  moduleCompletions,
}: {
  stats: AnyRecord;
  courseCards: AnyRecord[];
  lessonProgress: AnyRecord[];
  moduleCompletions: AnyRecord[];
}) {
  return (
    <div style={styles.tabStack}>
      <section style={styles.statsGrid}>
        <StatCard label="Progreso global" value={`${stats.globalProgress}%`} />
        <StatCard label="Lecciones completadas" value={lessonProgress.length} />
        <StatCard label="Módulos aprobados" value={moduleCompletions.length} />
        <StatCard label="Cursos completados" value={stats.completedCourses} />
      </section>

      <section style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div>
            <p style={styles.sectionLabel}>Detalle por curso</p>
            <h3 style={styles.sectionTitle}>Progreso académico</h3>
          </div>
        </div>

        <div style={styles.progressList}>
          {courseCards.map((card) => (
            <article key={card.course.id} style={styles.progressRow}>
              <div>
                <h4 style={styles.progressCourseTitle}>{card.course.title}</h4>
                <p style={styles.mutedText}>
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
      </section>
    </div>
  );
}

function CertificatesTab({ certificates }: { certificates: AnyRecord[] }) {
  return (
    <section style={styles.panel}>
      <div style={styles.sectionHeader}>
        <div>
          <p style={styles.sectionLabel}>Credenciales digitales</p>
          <h3 style={styles.sectionTitle}>Mis certificados</h3>
        </div>
      </div>

      {certificates.length === 0 ? (
        <EmptyState text="Aún no tienes certificados reales emitidos. Completa un curso y emite tu certificado para verlo aquí." />
      ) : (
        <div style={styles.cardsGrid}>
          {certificates.map((certificate) => (
            <CertificateCard key={certificate.id} certificate={certificate} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProfileTab({
  displayName,
  user,
  profile,
  stats,
}: {
  displayName: string;
  user: any;
  profile: AnyRecord | null;
  stats: AnyRecord;
}) {
  return (
    <div style={styles.tabStack}>
      <section style={styles.panel}>
        <p style={styles.sectionLabel}>Perfil</p>
        <h3 style={styles.sectionTitle}>{displayName}</h3>

        <div style={styles.profileGrid}>
          <InfoBox label="Email" value={user?.email || '—'} />
          <InfoBox label="Rol" value={profile?.role || 'student'} />
          <InfoBox label="Cursos completados" value={stats.completedCourses} />
          <InfoBox label="Certificados" value={stats.certificates} />
        </div>

        <p style={styles.mutedText}>
          Más adelante añadiremos edición de perfil, foto, dispositivos autorizados y preferencias
          del alumno.
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={styles.statCard}>
      <p style={styles.smallLabel}>{label}</p>
      <strong style={styles.statValue}>{value}</strong>
    </article>
  );
}

function CourseCard({
  card,
  completed = false,
}: {
  card: AnyRecord;
  completed?: boolean;
}) {
  const course = card.course;
  const nextLesson = card.nextLesson;

  return (
    <article style={styles.courseCard}>
      <div style={styles.courseImage} />

      <div style={styles.courseCardBody}>
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

function EmptyState({ text }: { text: string }) {
  return (
    <article style={styles.emptyCard}>
      <p style={styles.mutedText}>{text}</p>
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
    color: '#22D65B',
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

  navButtonActive: {
    width: '100%',
    border: '1px solid rgba(34,214,91,0.36)',
    background: 'rgba(34,214,91,0.10)',
    color: '#22D65B',
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
    color: '#22D65B',
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
    color: '#22D65B',
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

  loadingTitle: {
    fontSize: 'clamp(38px, 6vw, 68px)',
    lineHeight: '0.95',
    fontWeight: 850,
    letterSpacing: '-0.035em',
    margin: '24px 0 0',
  },

  mutedText: {
    color: 'rgba(242,244,241,0.66)',
    fontSize: '14px',
    lineHeight: 1.7,
  },

  loadingCard: {
    maxWidth: '620px',
    margin: '22vh auto 0',
    borderRadius: '34px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))',
    padding: '34px',
  },

  noticeBox: {
    padding: '20px',
    borderRadius: '22px',
    border: '1px solid rgba(34,214,91,0.22)',
    color: 'rgba(242,244,241,0.72)',
    marginBottom: '20px',
    background: 'rgba(255,255,255,0.035)',
  },

  tabStack: {
    display: 'grid',
    gap: '24px',
  },

  heroGrid: {
    display: 'grid',
    gridTemplateColumns: '0.85fr 1.5fr',
    gap: '18px',
  },

  progressHero: {
    borderRadius: '30px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))',
    padding: '24px',
  },

  nextModule: {
    borderRadius: '30px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.045)',
    display: 'grid',
    gridTemplateColumns: '0.92fr 1fr',
    overflow: 'hidden',
  },

  nextModuleImage: {
    minHeight: 300,
    backgroundImage:
      'linear-gradient(90deg, rgba(5,7,6,0.15), rgba(5,7,6,0.88)), url(https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1200&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'grayscale(1) contrast(1.06) brightness(0.72)',
  },

  nextModuleBody: {
    padding: '24px',
  },

  ringShell: {
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
    color: '#22D65B',
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
    color: '#22D65B',
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

  courseCardBody: {
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
    color: '#22D65B',
    marginBottom: 16,
  },

  badgeRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },

  badgeMain: {
    background: '#22D65B',
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
    color: '#22D65B',
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
    color: '#22D65B',
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
    background: '#22D65B',
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
    background: '#22D65B',
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
    color: '#22D65B',
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
    color: '#22D65B',
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
    color: '#22D65B',
    fontSize: '21px',
    fontWeight: 900,
  },

  certificateCode: {
    color: '#22D65B',
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

  smallTitle: {
    margin: '0 0 12px',
    fontSize: '26px',
    lineHeight: 1.08,
    fontWeight: 850,
    letterSpacing: '-0.02em',
  },
};
