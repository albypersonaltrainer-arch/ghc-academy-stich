'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

type AnyRecord = Record<string, any>;

const neon = '#00FF41';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function AlumnoDashboardPage() {
  const router = useRouter();

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
          setSystemMessage('No se pudieron cargar los cursos del alumno.');
          setCourses([]);
          setLoading(false);
          return;
        }

        const visibleCourses = Array.isArray(coursesData)
          ? coursesData
              .filter((course) => isVisibleCourse(course))
              .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
          : [];

        setCourses(visibleCourses);

        const courseIds = visibleCourses.map((course) => course.id).filter(Boolean);

        if (courseIds.length === 0) {
          setLoading(false);
          return;
        }

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

        setModuleCompletions(
          Array.isArray(moduleCompletionData) ? moduleCompletionData : []
        );

        const { data: courseCompletionData } = await supabase
          .from('course_completions')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('completed', true);

        setCourseCompletions(
          Array.isArray(courseCompletionData) ? courseCompletionData : []
        );

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

  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const completedCourses = courseCompletions.length;
    const completedModules = moduleCompletions.length;
    const completedLessons = lessonProgress.length;
    const issuedCertificates = certificates.length;

    return {
      totalCourses,
      completedCourses,
      completedModules,
      completedLessons,
      issuedCertificates,
    };
  }, [courses, courseCompletions, moduleCompletions, lessonProgress, certificates]);

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

      const courseCompletion = courseCompletions.find(
        (completion) => String(completion.course_id) === String(course.id)
      );

      const certificate = certificates.find(
        (item) => String(item.course_id) === String(course.id)
      );

      const progressPercent =
        courseLessons.length > 0
          ? Math.round((completedLessonCount / courseLessons.length) * 100)
          : 0;

      const nextLesson = findNextLesson({
        course,
        courseModules,
        courseLessons,
        completedModuleCount,
        lessonProgress,
        moduleCompletions,
      });

      return {
        course,
        courseModules,
        courseLessons,
        completedLessonCount,
        completedModuleCount,
        progressPercent,
        courseCompletion,
        certificate,
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

  const activeCourses = courseCards.filter((card) => !card.courseCompletion);
  const completedCourses = courseCards.filter((card) => card.courseCompletion);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/acceso');
  };

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={loadingCardStyle}>
          <p style={kickerStyle}>GHC Academy</p>
          <h1 style={titleStyle}>Cargando portal</h1>
          <p style={textStyle}>Estamos preparando tu panel real de alumno.</p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <div>
            <p style={kickerStyle}>Portal real del alumno</p>
            <h1 style={titleStyle}>Hola, {displayName}</h1>
            <p style={subtitleStyle}>
              Aquí verás tus cursos, progreso real, módulos aprobados y certificados digitales.
            </p>
          </div>

          <div style={headerActionsStyle}>
            <Link href="/cursos" style={secondaryButtonStyle}>
              Catálogo
            </Link>

            <button onClick={handleLogout} style={logoutButtonStyle}>
              Cerrar sesión
            </button>
          </div>
        </header>

        {systemMessage && <div style={noticeBox}>{systemMessage}</div>}

        <section style={statsGridStyle}>
          <article style={statCardStyle}>
            <p style={smallLabel}>Cursos visibles</p>
            <strong style={statValueStyle}>{stats.totalCourses}</strong>
          </article>

          <article style={statCardStyle}>
            <p style={smallLabel}>Lecciones completadas</p>
            <strong style={statValueStyle}>{stats.completedLessons}</strong>
          </article>

          <article style={statCardStyle}>
            <p style={smallLabel}>Módulos aprobados</p>
            <strong style={statValueStyle}>{stats.completedModules}</strong>
          </article>

          <article style={statCardStyle}>
            <p style={smallLabel}>Certificados</p>
            <strong style={statValueStyle}>{stats.issuedCertificates}</strong>
          </article>
        </section>

        <section style={sectionBlockStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={sectionLabel}>Formación activa</p>
              <h2 style={sectionTitle}>Mis cursos en progreso</h2>
            </div>
          </div>

          {activeCourses.length === 0 ? (
            <div style={emptyStateStyle}>
              <p style={kickerStyle}>Sin cursos activos</p>
              <h3 style={emptyTitleStyle}>Todavía no tienes progreso iniciado</h3>
              <p style={textStyle}>
                Entra en un curso desde el catálogo, completa lecciones y aprueba módulos para que
                aparezcan aquí.
              </p>
              <Link href="/cursos" style={primaryButtonStyle}>
                Explorar catálogo →
              </Link>
            </div>
          ) : (
            <div style={courseGridStyle}>
              {activeCourses.map((card) => (
                <CourseCard key={card.course.id} card={card} />
              ))}
            </div>
          )}
        </section>

        <section style={sectionBlockStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={sectionLabel}>Historial académico</p>
              <h2 style={sectionTitle}>Cursos completados</h2>
            </div>
          </div>

          {completedCourses.length === 0 ? (
            <div style={emptyStateStyle}>
              <p style={textStyle}>Cuando completes un curso, aparecerá aquí con su certificado.</p>
            </div>
          ) : (
            <div style={courseGridStyle}>
              {completedCourses.map((card) => (
                <CourseCard key={card.course.id} card={card} completed />
              ))}
            </div>
          )}
        </section>

        <section style={sectionBlockStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={sectionLabel}>Credenciales</p>
              <h2 style={sectionTitle}>Mis certificados</h2>
            </div>
          </div>

          {certificates.length === 0 ? (
            <div style={emptyStateStyle}>
              <p style={textStyle}>
                Tus certificados reales aparecerán aquí cuando completes cursos y los emitas desde
                GHC Academy.
              </p>
            </div>
          ) : (
            <div style={certificateGridStyle}>
              {certificates.map((certificate) => (
                <article key={certificate.id} style={certificateCardStyle}>
                  <p style={smallLabel}>Certificado válido</p>
                  <h3 style={certificateTitleStyle}>{certificate.course_title}</h3>
                  <p style={textStyle}>
                    Código: <strong>{certificate.certificate_code}</strong>
                  </p>
                  <p style={textStyle}>Nota final: {certificate.final_score}%</p>

                  <Link
                    href={`/certificados/${certificate.verification_slug}`}
                    style={primaryButtonStyle}
                  >
                    Ver certificado →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
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
      <div style={cardTopStyle}>
        <div style={badgeRowStyle}>
          {course.course_type && <span style={badgeMain}>{course.course_type}</span>}
          {course.level && <span style={badgeSecondary}>{course.level}</span>}
          {completed && <span style={completedBadge}>Completado</span>}
        </div>
      </div>

      <h3 style={courseTitleStyle}>{course.title}</h3>

      {course.subtitle && <p style={courseSubtitleStyle}>{course.subtitle}</p>}

      <p style={courseTextStyle}>
        {course.description || 'Formación premium basada en ciencia real.'}
      </p>

      <div style={miniStatsGridStyle}>
        <div style={miniBox}>
          <p style={miniLabel}>Lecciones</p>
          <p style={miniValue}>
            {card.completedLessonCount}/{card.courseLessons.length}
          </p>
        </div>

        <div style={miniBox}>
          <p style={miniLabel}>Módulos</p>
          <p style={miniValue}>
            {card.completedModuleCount}/{card.courseModules.length}
          </p>
        </div>

        <div style={miniBox}>
          <p style={miniLabel}>Progreso</p>
          <p style={miniValue}>{card.progressPercent}%</p>
        </div>
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

        <Link href={`/cursos/${course.slug}`} style={secondaryLinkStyle}>
          Detalle
        </Link>
      </div>
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
  course: AnyRecord;
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
  background:
    'radial-gradient(circle at top left, rgba(0,255,65,0.16), transparent 35%), radial-gradient(circle at bottom right, rgba(0,255,65,0.10), transparent 30%), #030504',
  color: 'white',
  padding: '32px',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const containerStyle: CSSProperties = {
  maxWidth: '1240px',
  margin: '0 auto',
};

const loadingCardStyle: CSSProperties = {
  maxWidth: '620px',
  margin: '22vh auto 0',
  borderRadius: '34px',
  border: '1px solid rgba(0,255,65,0.30)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025))',
  padding: '34px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '24px',
  alignItems: 'flex-start',
  marginBottom: '30px',
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
  fontSize: 'clamp(44px, 7vw, 84px)',
  lineHeight: '0.9',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '-0.04em',
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.70)',
  fontSize: '17px',
  lineHeight: 1.65,
  maxWidth: '850px',
  margin: '18px 0 0',
};

const textStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.66)',
  fontSize: '14px',
  lineHeight: 1.7,
};

const noticeBox: CSSProperties = {
  padding: '22px',
  borderRadius: '24px',
  border: '1px solid rgba(0,255,65,0.22)',
  color: 'rgba(255,255,255,0.72)',
  marginBottom: '20px',
  background: 'rgba(255,255,255,0.035)',
};

const statsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '16px',
  marginBottom: '34px',
};

const statCardStyle: CSSProperties = {
  borderRadius: '26px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
  padding: '20px',
};

const smallLabel: CSSProperties = {
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
  fontSize: '38px',
  lineHeight: 1,
  fontWeight: 950,
};

const sectionBlockStyle: CSSProperties = {
  marginTop: '40px',
};

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '20px',
  alignItems: 'flex-end',
  marginBottom: '18px',
};

const sectionLabel: CSSProperties = {
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  margin: 0,
};

const sectionTitle: CSSProperties = {
  fontSize: '34px',
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: '6px 0 0',
};

const emptyStateStyle: CSSProperties = {
  borderRadius: '28px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'rgba(255,255,255,0.045)',
  padding: '26px',
};

const emptyTitleStyle: CSSProperties = {
  fontSize: '28px',
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: 0,
};

const courseGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
  gap: '22px',
};

const certificateGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '18px',
};

const courseCardStyle: CSSProperties = {
  borderRadius: '30px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))',
  padding: '24px',
  boxShadow: '0 0 60px rgba(0,255,65,0.065)',
};

const certificateCardStyle: CSSProperties = {
  borderRadius: '28px',
  border: '1px solid rgba(255,255,255,0.28)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.12), rgba(0,255,65,0.05))',
  padding: '22px',
};

const certificateTitleStyle: CSSProperties = {
  fontSize: '25px',
  lineHeight: 1.05,
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: '10px 0 12px',
};

const cardTopStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'flex-start',
  marginBottom: '18px',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const badgeMain: CSSProperties = {
  background: neon,
  color: '#000',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const badgeSecondary: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.14)',
  color: 'rgba(255,255,255,0.72)',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const completedBadge: CSSProperties = {
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
  fontSize: '30px',
  lineHeight: 1,
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: '0 0 12px',
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

const miniStatsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '10px',
  margin: '18px 0',
};

const miniBox: CSSProperties = {
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(0,0,0,0.28)',
  padding: '12px',
};

const miniLabel: CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.38)',
  fontSize: '11px',
};

const miniValue: CSSProperties = {
  margin: '5px 0 0',
  color: 'white',
  fontWeight: 800,
};

const progressTrackStyle: CSSProperties = {
  height: '12px',
  borderRadius: '999px',
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.12)',
  margin: '18px 0',
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

const secondaryLinkStyle: CSSProperties = {
  color: neon,
  fontSize: '13px',
  fontWeight: 950,
  textTransform: 'uppercase',
  textDecoration: 'none',
};

const logoutButtonStyle: CSSProperties = {
  border: '1px solid rgba(255,80,80,0.40)',
  background: 'rgba(255,80,80,0.12)',
  color: '#ffaaaa',
  borderRadius: '18px',
  padding: '15px',
  fontSize: '13px',
  fontWeight: 950,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
