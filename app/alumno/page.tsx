'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

type AnyRecord = Record<string, any>;

type DashboardTab = 'overview' | 'courses' | 'progress' | 'certificates' | 'profile';

const neon = '#00FF41';

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
      <main style={pageStyle}>
        <section style={loadingCardStyle}>
          <p style={kickerStyle}>GHC Academy</p>
          <h1 style={loadingTitleStyle}>Cargando portal</h1>
          <p style={mutedTextStyle}>Estamos preparando tu dashboard real de alumno.</p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <aside style={sidebarStyle}>
        <div>
          <p style={sidebarKickerStyle}>GHC Academy</p>
          <h1 style={sidebarLogoStyle}>Alumno</h1>
          <p style={sidebarUserStyle}>{displayName}</p>
        </div>

        <nav style={navStyle}>
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

        <div style={sidebarFooterStyle}>
          <Link href="/cursos" style={sidebarLinkStyle}>
            Catálogo
          </Link>

          <button onClick={handleLogout} style={logoutButtonStyle}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <section style={contentStyle}>
        <header style={topHeaderStyle}>
          <div>
            <p style={kickerStyle}>Portal real del alumno</p>
            <h2 style={titleStyle}>Hola, {displayName}</h2>
            <p style={mutedTextStyle}>
              Sesión activa con {user?.email}. Tu progreso ya se lee desde Supabase.
            </p>
          </div>

          <div style={headerActionsStyle}>
            <Link href="/cursos" style={secondaryButtonStyle}>
              Explorar cursos
            </Link>
          </div>
        </header>

        {systemMessage && <div style={noticeBoxStyle}>{systemMessage}</div>}

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
      style={active ? navButtonActiveStyle : navButtonStyle}
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
    <div style={tabStackStyle}>
      <section style={statsGridStyle}>
        <StatCard label="Cursos visibles" value={stats.visibleCourses} />
        <StatCard label="Lecciones completadas" value={stats.completedLessons} />
        <StatCard label="Módulos aprobados" value={stats.completedModules} />
        <StatCard label="Certificados" value={stats.certificates} />
      </section>

      <section style={highlightGridStyle}>
        <article style={heroCardStyle}>
          <p style={sectionLabelStyle}>Progreso global</p>
          <h3 style={heroCardTitleStyle}>{stats.globalProgress}%</h3>

          <div style={progressTrackStyle}>
            <div style={{ ...progressFillStyle, width: `${stats.globalProgress}%` }} />
          </div>

          <p style={mutedTextStyle}>
            Este porcentaje resume el avance de lecciones completadas respecto a los cursos visibles.
          </p>
        </article>

        <article style={heroCardStyle}>
          <p style={sectionLabelStyle}>Continuar formación</p>

          {mainCourse ? (
            <>
              <h3 style={smallTitleStyle}>{mainCourse.course.title}</h3>
              <p style={mutedTextStyle}>
                Progreso: {mainCourse.progressPercent}% · Módulos aprobados:{' '}
                {mainCourse.completedModuleCount}/{mainCourse.courseModules.length}
              </p>

              <Link
                href={
                  mainCourse.nextLesson
                    ? `/cursos/${mainCourse.course.slug}/${mainCourse.nextLesson.id}`
                    : `/cursos/${mainCourse.course.slug}`
                }
                style={primaryButtonStyle}
              >
                Continuar →
              </Link>
            </>
          ) : (
            <>
              <h3 style={smallTitleStyle}>Aún no hay cursos activos</h3>
              <p style={mutedTextStyle}>Entra al catálogo para iniciar tu itinerario.</p>
              <Link href="/cursos" style={primaryButtonStyle}>
                Ir al catálogo →
              </Link>
            </>
          )}
        </article>
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <p style={sectionLabelStyle}>Últimas credenciales</p>
            <h3 style={sectionTitleStyle}>Certificados</h3>
          </div>
        </div>

        {certificates.length === 0 ? (
          <EmptyState text="Cuando emitas certificados reales, aparecerán aquí." />
        ) : (
          <div style={cardsGridStyle}>
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
    <div style={tabStackStyle}>
      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <p style={sectionLabelStyle}>Formación activa</p>
            <h3 style={sectionTitleStyle}>Mis cursos</h3>
          </div>
        </div>

        {activeCourses.length === 0 ? (
          <EmptyState text="Todavía no tienes cursos activos. Entra al catálogo para iniciar tu formación." />
        ) : (
          <div style={cardsGridStyle}>
            {activeCourses.map((card) => (
              <CourseCard key={card.course.id} card={card} />
            ))}
          </div>
        )}
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <p style={sectionLabelStyle}>Historial académico</p>
            <h3 style={sectionTitleStyle}>Cursos completados</h3>
          </div>
        </div>

        {completedCourses.length === 0 ? (
          <EmptyState text="Cuando completes un curso, aparecerá aquí." />
        ) : (
          <div style={cardsGridStyle}>
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
    <div style={tabStackStyle}>
      <section style={statsGridStyle}>
        <StatCard label="Progreso global" value={`${stats.globalProgress}%`} />
        <StatCard label="Lecciones completadas" value={lessonProgress.length} />
        <StatCard label="Módulos aprobados" value={moduleCompletions.length} />
        <StatCard label="Cursos completados" value={stats.completedCourses} />
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <p style={sectionLabelStyle}>Detalle por curso</p>
            <h3 style={sectionTitleStyle}>Progreso académico</h3>
          </div>
        </div>

        <div style={progressListStyle}>
          {courseCards.map((card) => (
            <article key={card.course.id} style={progressRowStyle}>
              <div>
                <h4 style={progressCourseTitleStyle}>{card.course.title}</h4>
                <p style={mutedTextStyle}>
                  {card.completedLessonCount}/{card.courseLessons.length} lecciones ·{' '}
                  {card.completedModuleCount}/{card.courseModules.length} módulos
                </p>
              </div>

              <div style={progressRightStyle}>
                <strong style={progressPercentStyle}>{card.progressPercent}%</strong>
                <div style={progressTrackMiniStyle}>
                  <div style={{ ...progressFillStyle, width: `${card.progressPercent}%` }} />
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
    <section style={panelStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <p style={sectionLabelStyle}>Credenciales digitales</p>
          <h3 style={sectionTitleStyle}>Mis certificados</h3>
        </div>
      </div>

      {certificates.length === 0 ? (
        <EmptyState text="Aún no tienes certificados reales emitidos. Completa un curso y emite tu certificado para verlo aquí." />
      ) : (
        <div style={cardsGridStyle}>
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
    <div style={tabStackStyle}>
      <section style={panelStyle}>
        <p style={sectionLabelStyle}>Perfil</p>
        <h3 style={sectionTitleStyle}>{displayName}</h3>

        <div style={profileGridStyle}>
          <InfoBox label="Email" value={user?.email || '—'} />
          <InfoBox label="Rol" value={profile?.role || 'student'} />
          <InfoBox label="Cursos completados" value={stats.completedCourses} />
          <InfoBox label="Certificados" value={stats.certificates} />
        </div>

        <p style={mutedTextStyle}>
          Más adelante añadiremos edición de perfil, foto, dispositivos autorizados y preferencias
          del alumno.
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article style={statCardStyle}>
      <p style={smallLabelStyle}>{label}</p>
      <strong style={statValueStyle}>{value}</strong>
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
    <article style={courseCardStyle}>
      <div style={badgeRowStyle}>
        {course.course_type && <span style={badgeMainStyle}>{course.course_type}</span>}
        {course.level && <span style={badgeSecondaryStyle}>{course.level}</span>}
        {completed && <span style={badgeCompletedStyle}>Completado</span>}
      </div>

      <h3 style={courseTitleStyle}>{course.title}</h3>

      {course.subtitle && <p style={courseSubtitleStyle}>{course.subtitle}</p>}

      <p style={courseTextStyle}>
        {course.description || 'Formación premium basada en ciencia real.'}
      </p>

      <div style={miniGridStyle}>
        <InfoBox label="Lecciones" value={`${card.completedLessonCount}/${card.courseLessons.length}`} />
        <InfoBox label="Módulos" value={`${card.completedModuleCount}/${card.courseModules.length}`} />
        <InfoBox label="Progreso" value={`${card.progressPercent}%`} />
      </div>

      <div style={progressTrackStyle}>
        <div style={{ ...progressFillStyle, width: `${card.progressPercent}%` }} />
      </div>

      <div style={cardActionsStyle}>
        {nextLesson ? (
          <Link href={`/cursos/${course.slug}/${nextLesson.id}`} style={primaryButtonStyle}>
            Continuar →
          </Link>
        ) : (
          <Link href={`/cursos/${course.slug}`} style={primaryButtonStyle}>
            Ver curso →
          </Link>
        )}

        <Link href={`/cursos/${course.slug}`} style={textLinkStyle}>
          Detalle
        </Link>
      </div>
    </article>
  );
}

function CertificateCard({ certificate }: { certificate: AnyRecord }) {
  return (
    <article style={certificateCardStyle}>
      <p style={smallLabelStyle}>Certificado válido</p>
      <h3 style={certificateTitleStyle}>{certificate.course_title}</h3>

      <div style={miniGridStyle}>
        <InfoBox label="Nota final" value={`${certificate.final_score}%`} />
        <InfoBox label="Estado" value="Válido" />
      </div>

      <p style={certificateCodeStyle}>{certificate.certificate_code}</p>

      <Link href={`/certificados/${certificate.verification_slug}`} style={primaryButtonStyle}>
        Ver certificado →
      </Link>
    </article>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={infoBoxStyle}>
      <p style={smallLabelStyle}>{label}</p>
      <p style={infoValueStyle}>{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <article style={emptyCardStyle}>
      <p style={mutedTextStyle}>{text}</p>
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

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  gridTemplateColumns: '300px minmax(0, 1fr)',
  background:
    'radial-gradient(circle at top left, rgba(0,255,65,0.16), transparent 35%), radial-gradient(circle at bottom right, rgba(0,255,65,0.10), transparent 30%), #030504',
  color: 'white',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const sidebarStyle: CSSProperties = {
  minHeight: '100vh',
  position: 'sticky',
  top: 0,
  alignSelf: 'start',
  borderRight: '1px solid rgba(0,255,65,0.22)',
  background: 'rgba(0,0,0,0.62)',
  backdropFilter: 'blur(18px)',
  padding: '28px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const sidebarKickerStyle: CSSProperties = {
  margin: '0 0 10px',
  color: neon,
  fontSize: '11px',
  fontWeight: 950,
  letterSpacing: '0.26em',
  textTransform: 'uppercase',
};

const sidebarLogoStyle: CSSProperties = {
  margin: 0,
  fontSize: '36px',
  fontWeight: 950,
  lineHeight: 0.95,
  textTransform: 'uppercase',
};

const sidebarUserStyle: CSSProperties = {
  marginTop: '12px',
  color: 'rgba(255,255,255,0.62)',
  fontSize: '13px',
  lineHeight: 1.5,
};

const navStyle: CSSProperties = {
  display: 'grid',
  gap: '10px',
  marginTop: '34px',
  marginBottom: '34px',
};

const navButtonStyle: CSSProperties = {
  width: '100%',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.045)',
  color: 'rgba(255,255,255,0.70)',
  borderRadius: '18px',
  padding: '15px',
  textAlign: 'left',
  fontSize: '13px',
  fontWeight: 950,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const navButtonActiveStyle: CSSProperties = {
  ...navButtonStyle,
  border: '1px solid rgba(0,255,65,0.62)',
  background: 'rgba(0,255,65,0.16)',
  color: neon,
  boxShadow: '0 0 30px rgba(0,255,65,0.12)',
};

const sidebarFooterStyle: CSSProperties = {
  display: 'grid',
  gap: '12px',
};

const sidebarLinkStyle: CSSProperties = {
  display: 'block',
  textDecoration: 'none',
  textAlign: 'center',
  border: '1px solid rgba(0,255,65,0.35)',
  background: 'rgba(0,255,65,0.08)',
  color: neon,
  borderRadius: '18px',
  padding: '14px',
  fontSize: '12px',
  fontWeight: 950,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

const logoutButtonStyle: CSSProperties = {
  border: '1px solid rgba(255,80,80,0.40)',
  background: 'rgba(255,80,80,0.12)',
  color: '#ffaaaa',
  borderRadius: '18px',
  padding: '14px',
  fontSize: '12px',
  fontWeight: 950,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const contentStyle: CSSProperties = {
  minWidth: 0,
  padding: '34px',
};

const topHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '24px',
  alignItems: 'flex-start',
  marginBottom: '28px',
};

const headerActionsStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

const kickerStyle: CSSProperties = {
  color: neon,
  fontSize: '12px',
  letterSpacing: '0.34em',
  fontWeight: 900,
  textTransform: 'uppercase',
  margin: '0 0 14px',
};

const titleStyle: CSSProperties = {
  fontSize: 'clamp(42px, 6vw, 76px)',
  lineHeight: '0.9',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '-0.04em',
  margin: 0,
};

const loadingTitleStyle: CSSProperties = {
  ...titleStyle,
  fontSize: 'clamp(38px, 6vw, 68px)',
};

const mutedTextStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.66)',
  fontSize: '14px',
  lineHeight: 1.7,
};

const loadingCardStyle: CSSProperties = {
  maxWidth: '620px',
  margin: '22vh auto 0',
  borderRadius: '34px',
  border: '1px solid rgba(0,255,65,0.30)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025))',
  padding: '34px',
};

const noticeBoxStyle: CSSProperties = {
  padding: '20px',
  borderRadius: '24px',
  border: '1px solid rgba(0,255,65,0.22)',
  color: 'rgba(255,255,255,0.72)',
  marginBottom: '20px',
  background: 'rgba(255,255,255,0.035)',
};

const tabStackStyle: CSSProperties = {
  display: 'grid',
  gap: '24px',
};

const statsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '16px',
};

const statCardStyle: CSSProperties = {
  borderRadius: '28px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))',
  padding: '22px',
};

const smallLabelStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.42)',
  fontSize: '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  fontWeight: 900,
};

const statValueStyle: CSSProperties = {
  display: 'block',
  marginTop: '10px',
  color: neon,
  fontSize: '40px',
  lineHeight: 1,
  fontWeight: 950,
};

const highlightGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '18px',
};

const heroCardStyle: CSSProperties = {
  borderRadius: '32px',
  border: '1px solid rgba(0,255,65,0.28)',
  background: 'linear-gradient(145deg, rgba(0,255,65,0.12), rgba(255,255,255,0.035))',
  padding: '26px',
  boxShadow: '0 0 70px rgba(0,255,65,0.09)',
};

const heroCardTitleStyle: CSSProperties = {
  margin: '0 0 16px',
  color: neon,
  fontSize: '70px',
  lineHeight: 1,
  fontWeight: 950,
};

const smallTitleStyle: CSSProperties = {
  margin: '0 0 12px',
  fontSize: '28px',
  lineHeight: 1,
  fontWeight: 950,
  textTransform: 'uppercase',
};

const panelStyle: CSSProperties = {
  borderRadius: '32px',
  border: '1px solid rgba(0,255,65,0.22)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
  padding: '26px',
};

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '18px',
  alignItems: 'flex-end',
  marginBottom: '18px',
};

const sectionLabelStyle: CSSProperties = {
  margin: 0,
  color: neon,
  fontSize: '12px',
  fontWeight: 950,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
};

const sectionTitleStyle: CSSProperties = {
  margin: '6px 0 0',
  fontSize: '34px',
  lineHeight: 1,
  fontWeight: 950,
  textTransform: 'uppercase',
};

const cardsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
  gap: '18px',
};

const courseCardStyle: CSSProperties = {
  borderRadius: '30px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))',
  padding: '24px',
  boxShadow: '0 0 60px rgba(0,255,65,0.055)',
};

const certificateCardStyle: CSSProperties = {
  ...courseCardStyle,
  border: '1px solid rgba(255,255,255,0.28)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.12), rgba(0,255,65,0.05))',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  marginBottom: '18px',
};

const badgeMainStyle: CSSProperties = {
  background: neon,
  color: '#000',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const badgeSecondaryStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.14)',
  color: 'rgba(255,255,255,0.72)',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const badgeCompletedStyle: CSSProperties = {
  background: 'rgba(0,255,65,0.14)',
  border: '1px solid rgba(0,255,65,0.55)',
  color: neon,
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const courseTitleStyle: CSSProperties = {
  margin: '0 0 12px',
  fontSize: '30px',
  lineHeight: 1,
  fontWeight: 950,
  textTransform: 'uppercase',
};

const certificateTitleStyle: CSSProperties = {
  ...courseTitleStyle,
  fontSize: '25px',
};

const courseSubtitleStyle: CSSProperties = {
  color: neon,
  fontSize: '15px',
  fontWeight: 900,
  lineHeight: 1.5,
  margin: '0 0 12px',
};

const courseTextStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.64)',
  fontSize: '14px',
  lineHeight: 1.7,
  minHeight: '72px',
};

const miniGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '10px',
  margin: '18px 0',
};

const infoBoxStyle: CSSProperties = {
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(0,0,0,0.28)',
  padding: '12px',
};

const infoValueStyle: CSSProperties = {
  margin: '6px 0 0',
  color: 'white',
  fontWeight: 850,
};

const progressTrackStyle: CSSProperties = {
  height: '12px',
  borderRadius: '999px',
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.12)',
  margin: '18px 0',
};

const progressTrackMiniStyle: CSSProperties = {
  ...progressTrackStyle,
  width: '160px',
  margin: '8px 0 0',
};

const progressFillStyle: CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  background: neon,
  boxShadow: '0 0 20px rgba(0,255,65,0.55)',
};

const cardActionsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: '10px',
  alignItems: 'center',
};

const primaryButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '18px',
  background: neon,
  color: '#000',
  padding: '15px',
  fontSize: '13px',
  fontWeight: 950,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  textAlign: 'center',
  boxShadow: '0 0 28px rgba(0,255,65,0.28)',
};

const secondaryButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: 'rgba(0,255,65,0.10)',
  color: neon,
  border: '1px solid rgba(0,255,65,0.40)',
};

const textLinkStyle: CSSProperties = {
  color: neon,
  fontSize: '13px',
  fontWeight: 950,
  textTransform: 'uppercase',
  textDecoration: 'none',
};

const emptyCardStyle: CSSProperties = {
  borderRadius: '28px',
  border: '1px solid rgba(0,255,65,0.18)',
  background: 'rgba(255,255,255,0.035)',
  padding: '22px',
};

const progressListStyle: CSSProperties = {
  display: 'grid',
  gap: '12px',
};

const progressRowStyle: CSSProperties = {
  borderRadius: '22px',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(0,0,0,0.26)',
  padding: '18px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '18px',
  alignItems: 'center',
};

const progressCourseTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '18px',
  fontWeight: 950,
  textTransform: 'uppercase',
};

const progressRightStyle: CSSProperties = {
  textAlign: 'right',
};

const progressPercentStyle: CSSProperties = {
  color: neon,
  fontSize: '22px',
  fontWeight: 950,
};

const certificateCodeStyle: CSSProperties = {
  color: neon,
  fontSize: '13px',
  fontWeight: 950,
  letterSpacing: '0.08em',
  marginTop: '12px',
};

const profileGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '14px',
  margin: '22px 0',
};
