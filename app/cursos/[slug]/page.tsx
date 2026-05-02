'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Course = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  description?: string | null;
  course_type?: string | null;
  level?: string | null;
  price?: number | null;
  duration_minutes?: number | null;
  has_certificate?: boolean | null;
};

type Module = {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  position?: number | null;
};

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  content?: string | null;
  position?: number | null;
};

const neon = '#00FF41';

export default function CourseDetailPage() {
  const params = useParams();
  const slug = String(params.slug);

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemMessage, setSystemMessage] = useState('');

  useEffect(() => {
    async function loadCourseContent() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          setSystemMessage('Faltan variables de conexión con Supabase.');
          setLoading(false);
          return;
        }

        const headers = {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        };

        const courseRes = await fetch(
          `${supabaseUrl}/rest/v1/courses?select=id,title,slug,subtitle,description,course_type,level,price,duration_minutes,has_certificate&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`,
          { headers }
        );

        const courseData = await courseRes.json();

        if (!Array.isArray(courseData) || courseData.length === 0) {
          setSystemMessage('Este curso no existe o todavía no está publicado.');
          setLoading(false);
          return;
        }

        const selectedCourse = courseData[0] as Course;
        setCourse(selectedCourse);

        let finalModules: Module[] = [];

        const modulesRes = await fetch(
          `${supabaseUrl}/rest/v1/modules?select=id,course_id,title,description,position&course_id=eq.${encodeURIComponent(selectedCourse.id)}&order=position.asc`,
          { headers }
        );

        const modulesData = await modulesRes.json();

        if (Array.isArray(modulesData)) {
          finalModules = modulesData;
        }

        if (finalModules.length === 0) {
          const fallbackModulesRes = await fetch(
            `${supabaseUrl}/rest/v1/modules?select=id,course_id,title,description,position&order=position.asc`,
            { headers }
          );

          const fallbackModulesData = await fallbackModulesRes.json();

          if (Array.isArray(fallbackModulesData)) {
            finalModules = fallbackModulesData.filter(
              (module) =>
                String(module.course_id).trim() === String(selectedCourse.id).trim()
            );
          }
        }

        finalModules.sort((a, b) => Number(a.position || 999) - Number(b.position || 999));
        setModules(finalModules);

        if (finalModules.length === 0) {
          setSystemMessage(
            'Curso cargado correctamente, pero todavía no se han encontrado módulos asociados.'
          );
          setLessons([]);
          setLoading(false);
          return;
        }

        const moduleIds = finalModules.map((module) => module.id).join(',');

        try {
          const lessonsRes = await fetch(
            `${supabaseUrl}/rest/v1/lessons?select=id,module_id,title,content,position&module_id=in.(${moduleIds})&order=position.asc`,
            { headers }
          );

          const lessonsData = await lessonsRes.json();

          if (Array.isArray(lessonsData)) {
            setLessons(lessonsData);
          } else {
            setLessons([]);
          }
        } catch (error) {
          console.error('Error loading lessons:', error);
          setLessons([]);
        }
      } catch (error) {
        console.error('Error loading course content:', error);
        setSystemMessage('Error cargando el contenido del curso.');
      } finally {
        setLoading(false);
      }
    }

    loadCourseContent();
  }, [slug]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <p style={{ color: neon, fontWeight: 900, letterSpacing: '0.18em' }}>
            CARGANDO CONTENIDO ACADÉMICO...
          </p>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <Link href="/cursos" style={backButton}>
            ← Volver a cursos
          </Link>
          <h1 style={titleStyle}>Curso no encontrado</h1>
          <p style={textStyle}>{systemMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <Link href="/cursos" style={backButton}>
          ← Volver a cursos
        </Link>

        <section style={heroStyle}>
          <div>
            <p style={eyebrowStyle}>GHC Academy · Sport Through Science</p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
              {course.course_type && <span style={badgeMain}>{course.course_type}</span>}
              {course.level && <span style={badgeSecondary}>{course.level}</span>}
            </div>

            <h1 style={titleStyle}>{course.title}</h1>

            {course.subtitle && <p style={subtitleStyle}>{course.subtitle}</p>}

            <p style={textStyle}>
              {course.description || 'Formación premium basada en ciencia real.'}
            </p>
          </div>

          <aside style={priceCardStyle}>
            <p style={smallLabel}>Precio</p>
            <p style={priceStyle}>
              {Number(course.price || 0).toLocaleString('es-ES')}€
            </p>

            <div style={dataGridStyle}>
              <div style={miniBox}>
                <p style={miniLabel}>Duración</p>
                <p style={miniValue}>{course.duration_minutes || 0} min</p>
              </div>

              <div style={miniBox}>
                <p style={miniLabel}>Certificado</p>
                <p style={miniValue}>{course.has_certificate ? 'Sí' : 'No'}</p>
              </div>
            </div>

            <button style={buyButton}>Solicitar acceso</button>
          </aside>
        </section>

        <section style={{ marginTop: '42px' }}>
          <p style={sectionLabel}>Contenido académico</p>
          <h2 style={sectionTitle}>Módulos y lecciones</h2>

          {systemMessage && <div style={noticeBox}>{systemMessage}</div>}

          <div style={{ display: 'grid', gap: '18px' }}>
            {modules.map((module, index) => {
              const moduleLessons = lessons
                .filter((lesson) => lesson.module_id === module.id)
                .sort((a, b) => Number(a.position || 999) - Number(b.position || 999));

              const unlocked = index === 0;

              return (
                <article
                  key={module.id}
                  style={{
                    ...moduleCard,
                    opacity: unlocked ? 1 : 0.48,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                    <div>
                      <p style={moduleNumber}>Módulo {module.position || index + 1}</p>
                      <h3 style={moduleTitle}>{module.title}</h3>
                      <p style={textStyle}>
                        {module.description || 'Módulo formativo de GHC Academy.'}
                      </p>
                    </div>

                    <span style={lockBadge}>
                      {unlocked ? 'Disponible' : 'Bloqueado'}
                    </span>
                  </div>

                  <div style={{ marginTop: '18px', display: 'grid', gap: '10px' }}>
                    {moduleLessons.length === 0 && (
                      <div style={lessonRow}>
                        <span>Lecciones pendientes de crear</span>
                        <span>—</span>
                      </div>
                    )}

                    {moduleLessons.map((lesson) => (
                      <div key={lesson.id} style={lessonRow}>
                        <span>{lesson.title}</span>

                        {unlocked ? (
                          <Link href={`/cursos/${slug}/${lesson.id}`} style={openLessonLink}>
                            Abrir
                          </Link>
                        ) : (
                          <span>🔒</span>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at top left, rgba(0,255,65,0.16), transparent 35%), radial-gradient(circle at bottom right, rgba(0,255,65,0.10), transparent 30%), #030504',
  color: 'white',
  padding: '32px',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
};

const backButton: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '28px',
  color: neon,
  border: '1px solid rgba(0,255,65,0.45)',
  padding: '12px 16px',
  borderRadius: '999px',
  textDecoration: 'none',
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
};

const heroStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.6fr)',
  gap: '24px',
};

const eyebrowStyle: React.CSSProperties = {
  color: neon,
  fontSize: '12px',
  letterSpacing: '0.35em',
  fontWeight: 900,
  textTransform: 'uppercase',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(38px, 6vw, 72px)',
  lineHeight: '0.95',
  fontWeight: 900,
  textTransform: 'uppercase',
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  color: neon,
  fontWeight: 900,
  fontSize: '18px',
  lineHeight: '1.5',
  marginTop: '20px',
};

const textStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.66)',
  fontSize: '15px',
  lineHeight: '1.75',
};

const priceCardStyle: React.CSSProperties = {
  borderRadius: '30px',
  border: '1px solid rgba(0,255,65,0.26)',
  background: 'rgba(255,255,255,0.045)',
  padding: '24px',
  boxShadow: '0 0 60px rgba(0,255,65,0.08)',
};

const smallLabel: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.42)',
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
};

const priceStyle: React.CSSProperties = {
  margin: '8px 0 20px',
  color: neon,
  fontSize: '46px',
  fontWeight: 900,
};

const dataGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
  marginBottom: '18px',
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

const buyButton: React.CSSProperties = {
  width: '100%',
  border: 'none',
  borderRadius: '18px',
  background: neon,
  color: '#000',
  padding: '15px',
  fontSize: '13px',
  fontWeight: 900,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  boxShadow: '0 0 28px rgba(0,255,65,0.30)',
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

const sectionLabel: React.CSSProperties = {
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '34px',
  fontWeight: 900,
  textTransform: 'uppercase',
  marginTop: 0,
};

const noticeBox: React.CSSProperties = {
  padding: '22px',
  borderRadius: '24px',
  border: '1px solid rgba(0,255,65,0.22)',
  color: 'rgba(255,255,255,0.72)',
  marginBottom: '20px',
  background: 'rgba(255,255,255,0.035)',
};

const moduleCard: React.CSSProperties = {
  borderRadius: '28px',
  padding: '24px',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
  border: '1px solid rgba(0,255,65,0.24)',
};

const moduleNumber: React.CSSProperties = {
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  margin: 0,
};

const moduleTitle: React.CSSProperties = {
  fontSize: '26px',
  lineHeight: '1.15',
  fontWeight: 900,
  margin: '8px 0 10px',
};

const lockBadge: React.CSSProperties = {
  height: 'fit-content',
  borderRadius: '999px',
  border: '1px solid rgba(0,255,65,0.35)',
  color: neon,
  padding: '9px 12px',
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const lessonRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(0,0,0,0.26)',
  padding: '13px 14px',
  color: 'rgba(255,255,255,0.75)',
  fontSize: '14px',
};

const openLessonLink: React.CSSProperties = {
  color: neon,
  textDecoration: 'none',
  fontWeight: 900,
};
