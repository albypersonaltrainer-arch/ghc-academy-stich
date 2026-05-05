'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

type AnyRecord = Record<string, any>;

const neon = '#00FF41';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function AlumnoPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<AnyRecord | null>(null);
  const [courses, setCourses] = useState<AnyRecord[]>([]);
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

        const { data: coursesData } = await supabase
          .from('courses')
          .select('*');

        const visibleCourses = Array.isArray(coursesData)
          ? coursesData
              .filter((course) => {
                const status = String(course.status || '').toLowerCase();
                return !status || ['published', 'publicado', 'active', 'activo', 'preview', 'demo'].includes(status);
              })
              .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
          : [];

        setCourses(visibleCourses);

        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('completed', true);

        setLessonProgress(Array.isArray(progressData) ? progressData : []);

        const { data: moduleData } = await supabase
          .from('module_completions')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('completed', true);

        setModuleCompletions(Array.isArray(moduleData) ? moduleData : []);

        const { data: courseCompletionData } = await supabase
          .from('course_completions')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('completed', true);

        setCourseCompletions(Array.isArray(courseCompletionData) ? courseCompletionData : []);

        const { data: certificateData } = await supabase
          .from('certificates')
          .select('*')
          .eq('user_id', activeUser.id)
          .eq('status', 'valid');

        setCertificates(Array.isArray(certificateData) ? certificateData : []);
      } catch (error) {
        console.error('Error cargando dashboard alumno:', error);
        setSystemMessage('No se pudo cargar el panel del alumno.');
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
    return {
      courses: courses.length,
      lessons: lessonProgress.length,
      modules: moduleCompletions.length,
      completedCourses: courseCompletions.length,
      certificates: certificates.length,
    };
  }, [courses, lessonProgress, moduleCompletions, courseCompletions, certificates]);

  const activeCourses = useMemo(() => {
    return courses.filter((course) => {
      return !courseCompletions.some(
        (completion) => String(completion.course_id) === String(course.id)
      );
    });
  }, [courses, courseCompletions]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/acceso');
  }

  if (loading) {
    return (
      <main style={page}>
        <section style={loadingCard}>
          <p style={kicker}>GHC Academy</p>
          <h1 style={title}>Cargando portal</h1>
          <p style={text}>Estamos preparando tu dashboard real de alumno.</p>
        </section>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={container}>
        <header style={header}>
          <div>
            <p style={kicker}>Portal real del alumno</p>
            <h1 style={title}>Hola, {displayName}</h1>
            <p style={subtitle}>
              Sesión activa con {user?.email}. Aquí verás tu progreso real, módulos aprobados,
              cursos completados y certificados emitidos.
            </p>
          </div>

          <div style={actions}>
            <Link href="/cursos" style={secondaryButton}>
              Catálogo
            </Link>

            <button onClick={handleLogout} style={logoutButton}>
              Cerrar sesión
            </button>
          </div>
        </header>

        {systemMessage && <div style={notice}>{systemMessage}</div>}

        <section style={statsGrid}>
          <article style={statCard}>
            <p style={smallLabel}>Cursos visibles</p>
            <strong style={statValue}>{stats.courses}</strong>
          </article>

          <article style={statCard}>
            <p style={smallLabel}>Lecciones completadas</p>
            <strong style={statValue}>{stats.lessons}</strong>
          </article>

          <article style={statCard}>
            <p style={smallLabel}>Módulos aprobados</p>
            <strong style={statValue}>{stats.modules}</strong>
          </article>

          <article style={statCard}>
            <p style={smallLabel}>Certificados</p>
            <strong style={statValue}>{stats.certificates}</strong>
          </article>
        </section>

        <section style={section}>
          <div style={sectionHeader}>
            <div>
              <p style={sectionLabel}>Formación activa</p>
              <h2 style={sectionTitle}>Mis cursos</h2>
            </div>
          </div>

          {activeCourses.length === 0 ? (
            <article style={emptyCard}>
              <p style={kicker}>Sin cursos activos</p>
              <h3 style={cardTitle}>Todavía no tienes progreso iniciado</h3>
              <p style={text}>
                Entra en un curso del catálogo, completa lecciones y aprueba módulos para que
                aparezca aquí tu progreso.
              </p>
              <Link href="/cursos" style={primaryButton}>
                Explorar catálogo →
              </Link>
            </article>
          ) : (
            <div style={courseGrid}>
              {activeCourses.map((course) => (
                <article key={course.id} style={courseCard}>
                  <div style={badgeRow}>
                    {course.course_type && <span style={badgeMain}>{course.course_type}</span>}
                    {course.level && <span style={badgeSecondary}>{course.level}</span>}
                  </div>

                  <h3 style={courseTitle}>{course.title}</h3>

                  {course.subtitle && <p style={courseSubtitle}>{course.subtitle}</p>}

                  <p style={courseText}>
                    {course.description || 'Formación premium basada en ciencia real.'}
                  </p>

                  <div style={miniGrid}>
                    <div style={miniBox}>
                      <p style={miniLabel}>Precio</p>
                      <p style={miniValue}>
                        {Number(course.price || 0).toLocaleString('es-ES')}€
                      </p>
                    </div>

                    <div style={miniBox}>
                      <p style={miniLabel}>Duración</p>
                      <p style={miniValue}>{course.duration_minutes || 0} min</p>
                    </div>

                    <div style={miniBox}>
                      <p style={miniLabel}>Certificado</p>
                      <p style={miniValue}>{course.has_certificate ? 'Sí' : 'No'}</p>
                    </div>
                  </div>

                  <Link href={`/cursos/${course.slug}`} style={primaryButton}>
                    Ver curso →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section style={section}>
          <div style={sectionHeader}>
            <div>
              <p style={sectionLabel}>Credenciales</p>
              <h2 style={sectionTitle}>Mis certificados</h2>
            </div>
          </div>

          {certificates.length === 0 ? (
            <article style={emptyCard}>
              <p style={text}>
                Cuando completes un curso y emitas un certificado real, aparecerá aquí.
              </p>
            </article>
          ) : (
            <div style={courseGrid}>
              {certificates.map((certificate) => (
                <article key={certificate.id} style={certificateCard}>
                  <p style={smallLabel}>Certificado válido</p>
                  <h3 style={courseTitle}>{certificate.course_title}</h3>
                  <p style={text}>Código: {certificate.certificate_code}</p>
                  <p style={text}>Nota final: {certificate.final_score}%</p>

                  <Link href={`/certificados/${certificate.verification_slug}`} style={primaryButton}>
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

const page: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at top left, rgba(0,255,65,0.16), transparent 35%), radial-gradient(circle at bottom right, rgba(0,255,65,0.10), transparent 30%), #030504',
  color: 'white',
  padding: '32px',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const container: React.CSSProperties = {
  maxWidth: '1240px',
  margin: '0 auto',
};

const loadingCard: React.CSSProperties = {
  maxWidth: '620px',
  margin: '22vh auto 0',
  borderRadius: '34px',
  border: '1px solid rgba(0,255,65,0.30)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025))',
  padding: '34px',
};

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '24px',
  alignItems: 'flex-start',
  marginBottom: '30px',
};

const actions: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

const kicker: React.CSSProperties = {
  color: neon,
  fontSize: '12px',
  letterSpacing: '0.34em',
  fontWeight: 900,
  textTransform: 'uppercase',
  margin: '0 0 14px',
};

const title: React.CSSProperties = {
  fontSize: 'clamp(44px, 7vw, 84px)',
  lineHeight: '0.9',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '-0.04em',
  margin: 0,
};

const subtitle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.70)',
  fontSize: '17px',
  lineHeight: 1.65,
  maxWidth: '850px',
  margin: '18px 0 0',
};

const text: React.CSSProperties = {
  color: 'rgba(255,255,255,0.66)',
  fontSize: '14px',
  lineHeight: 1.7,
};

const notice: React.CSSProperties = {
  padding: '22px',
  borderRadius: '24px',
  border: '1px solid rgba(0,255,65,0.22)',
  color: 'rgba(255,255,255,0.72)',
  marginBottom: '20px',
  background: 'rgba(255,255,255,0.035)',
};

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '16px',
  marginBottom: '34px',
};

const statCard: React.CSSProperties = {
  borderRadius: '26px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
  padding: '20px',
};

const smallLabel: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.42)',
  fontSize: '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  fontWeight: 900,
};

const statValue: React.CSSProperties = {
  display: 'block',
  marginTop: '10px',
  color: neon,
  fontSize: '38px',
  lineHeight: 1,
  fontWeight: 950,
};

const section: React.CSSProperties = {
  marginTop: '40px',
};

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '20px',
  alignItems: 'flex-end',
  marginBottom: '18px',
};

const sectionLabel: React.CSSProperties = {
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  margin: 0,
};

const sectionTitle: React.CSSProperties = {
  fontSize: '34px',
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: '6px 0 0',
};

const emptyCard: React.CSSProperties = {
  borderRadius: '28px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'rgba(255,255,255,0.045)',
  padding: '26px',
};

const cardTitle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: 0,
};

const courseGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
  gap: '22px',
};

const courseCard: React.CSSProperties = {
  borderRadius: '30px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))',
  padding: '24px',
  boxShadow: '0 0 60px rgba(0,255,65,0.065)',
};

const certificateCard: React.CSSProperties = {
  ...courseCard,
  border: '1px solid rgba(255,255,255,0.28)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.12), rgba(0,255,65,0.05))',
};

const badgeRow: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  marginBottom: '18px',
};

const badgeMain: React.CSSProperties = {
  background: neon,
  color: '#000',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const badgeSecondary: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.14)',
  color: 'rgba(255,255,255,0.72)',
  borderRadius: '999px',
  padding: '7px 10px',
  fontSize: '11px',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const courseTitle: React.CSSProperties = {
  fontSize: '30px',
  lineHeight: 1,
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: '0 0 12px',
};

const courseSubtitle: React.CSSProperties = {
  color: neon,
  fontSize: '15px',
  fontWeight: 900,
  lineHeight: 1.5,
  margin: '0 0 12px',
};

const courseText: React.CSSProperties = {
  color: 'rgba(255,255,255,0.64)',
  fontSize: '14px',
  lineHeight: 1.7,
  minHeight: '72px',
};

const miniGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '10px',
  margin: '18px 0',
};

const miniBox: React.CSSProperties = {
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(0,0,0,0.28)',
  padding: '12px',
};

const miniLabel: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.38)',
  fontSize: '11px',
};

const miniValue: React.CSSProperties = {
  margin: '5px 0 0',
  color: 'white',
  fontWeight: 800,
};

const primaryButton: React.CSSProperties = {
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

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: 'rgba(0,255,65,0.10)',
  color: neon,
  border: '1px solid rgba(0,255,65,0.40)',
};

const logoutButton: React.CSSProperties = {
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
