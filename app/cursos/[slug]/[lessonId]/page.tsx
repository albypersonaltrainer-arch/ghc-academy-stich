'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const neon = '#00FF41';

type Course = {
  id: string;
  title: string;
  slug: string;
};

type Module = {
  id: string;
  course_id: string;
  title: string;
  position?: number | null;
};

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  content?: string | null;
  sort_order?: number | null;
};

export default function LessonPage() {
  const params = useParams();
  const slug = String(params.slug);
  const lessonId = String(params.lessonId);

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadLessonPlatform() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          setMessage('Faltan variables de conexión con Supabase.');
          setLoading(false);
          return;
        }

        const headers = {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        };

        const courseRes = await fetch(
          `${supabaseUrl}/rest/v1/courses?select=id,title,slug&slug=eq.${encodeURIComponent(slug)}&limit=1`,
          { headers }
        );

        const courseData = await courseRes.json();

        if (!Array.isArray(courseData) || courseData.length === 0) {
          setMessage('Curso no encontrado.');
          setLoading(false);
          return;
        }

        const selectedCourse = courseData[0] as Course;
        setCourse(selectedCourse);

        const lessonRes = await fetch(
          `${supabaseUrl}/rest/v1/lessons?select=id,module_id,title,content,sort_order&id=eq.${encodeURIComponent(lessonId)}&limit=1`,
          { headers }
        );

        const lessonData = await lessonRes.json();

        if (!Array.isArray(lessonData) || lessonData.length === 0) {
          setMessage('Lección no encontrada.');
          setLoading(false);
          return;
        }

        const selectedLesson = lessonData[0] as Lesson;
        setLesson(selectedLesson);

        const modulesRes = await fetch(
          `${supabaseUrl}/rest/v1/modules?select=id,course_id,title,position&course_id=eq.${encodeURIComponent(selectedCourse.id)}&order=position.asc`,
          { headers }
        );

        const modulesData = await modulesRes.json();
        const finalModules: Module[] = Array.isArray(modulesData) ? modulesData : [];
        setModules(finalModules);

        if (finalModules.length === 0) {
          setLessons([]);
          setLoading(false);
          return;
        }

        const moduleIds = finalModules.map((module) => module.id).join(',');

        const lessonsRes = await fetch(
          `${supabaseUrl}/rest/v1/lessons?select=id,module_id,title,content,sort_order&module_id=in.(${moduleIds})&order=sort_order.asc`,
          { headers }
        );

        const lessonsData = await lessonsRes.json();

        if (Array.isArray(lessonsData)) {
          setLessons(lessonsData);
        } else {
          setLessons([]);
        }
      } catch (error) {
        console.error('Error loading lesson platform:', error);
        setMessage('Error cargando la lección.');
      } finally {
        setLoading(false);
      }
    }

    loadLessonPlatform();
  }, [slug, lessonId]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <p style={loadingStyle}>CARGANDO LECCIÓN...</p>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main style={pageStyle}>
        <div style={contentStyle}>
          <Link href={`/cursos/${slug}`} style={backButton}>
            ← Volver al curso
          </Link>
          <h1 style={titleStyle}>Lección no encontrada</h1>
          <p style={textStyle}>{message}</p>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <aside style={sidebarStyle}>
        <Link href={`/cursos/${slug}`} style={backButton}>
          ← Volver al curso
        </Link>

        <p style={sidebarBrand}>GHC Academy</p>
        <h2 style={sidebarTitle}>{course?.title || 'Curso'}</h2>

        <div style={{ display: 'grid', gap: '18px', marginTop: '26px' }}>
          {modules.map((module) => {
            const moduleLessons = lessons
              .filter((item) => item.module_id === module.id)
              .sort((a, b) => Number(a.sort_order || 999) - Number(b.sort_order || 999));

            return (
              <div key={module.id}>
                <p style={moduleTitleStyle}>{module.title}</p>

                <div style={{ display: 'grid', gap: '8px' }}>
                  {moduleLessons.length === 0 && (
                    <div style={emptyLessonStyle}>Lecciones pendientes</div>
                  )}

                  {moduleLessons.map((item) => {
                    const active = item.id === lesson.id;

                    return (
                      <Link
                        key={item.id}
                        href={`/cursos/${slug}/${item.id}`}
                        style={{
                          ...lessonLinkStyle,
                          border: active
                            ? '1px solid rgba(0,255,65,0.65)'
                            : '1px solid rgba(255,255,255,0.08)',
                          background: active
                            ? 'rgba(0,255,65,0.16)'
                            : 'rgba(255,255,255,0.035)',
                          color: active ? neon : 'rgba(255,255,255,0.78)',
                        }}
                      >
                        {item.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <section style={contentStyle}>
        <p style={eyebrowStyle}>Lección activa</p>
        <h1 style={titleStyle}>{lesson.title}</h1>

        <div style={lessonContentStyle}>
          {lesson.content || 'Contenido aún no disponible.'}
        </div>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at top left, rgba(0,255,65,0.10), transparent 32%), #030504',
  color: 'white',
  display: 'grid',
  gridTemplateColumns: '340px minmax(0, 1fr)',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const loadingStyle: React.CSSProperties = {
  color: neon,
  padding: '40px',
  fontWeight: 900,
  letterSpacing: '0.18em',
};

const sidebarStyle: React.CSSProperties = {
  borderRight: '1px solid rgba(0,255,65,0.22)',
  background: 'rgba(0,0,0,0.28)',
  padding: '24px',
  minHeight: '100vh',
  overflowY: 'auto',
};

const backButton: React.CSSProperties = {
  display: 'inline-block',
  color: neon,
  textDecoration: 'none',
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  marginBottom: '26px',
};

const sidebarBrand: React.CSSProperties = {
  color: neon,
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  margin: 0,
};

const sidebarTitle: React.CSSProperties = {
  fontSize: '20px',
  lineHeight: '1.2',
  margin: '10px 0 0',
};

const moduleTitleStyle: React.CSSProperties = {
  color: neon,
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  margin: '0 0 8px',
};

const lessonLinkStyle: React.CSSProperties = {
  display: 'block',
  borderRadius: '14px',
  padding: '12px',
  textDecoration: 'none',
  fontSize: '13px',
  lineHeight: '1.35',
};

const emptyLessonStyle: React.CSSProperties = {
  borderRadius: '14px',
  padding: '12px',
  color: 'rgba(255,255,255,0.42)',
  background: 'rgba(255,255,255,0.025)',
  fontSize: '13px',
};

const contentStyle: React.CSSProperties = {
  padding: '42px',
  maxWidth: '980px',
};

const eyebrowStyle: React.CSSProperties = {
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(38px, 5vw, 64px)',
  lineHeight: '1',
  fontWeight: 900,
  margin: '0 0 26px',
};

const textStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.68)',
  lineHeight: '1.75',
};

const lessonContentStyle: React.CSSProperties = {
  borderRadius: '28px',
  border: '1px solid rgba(0,255,65,0.22)',
  background: 'rgba(255,255,255,0.045)',
  padding: '28px',
  color: 'rgba(255,255,255,0.78)',
  fontSize: '17px',
  lineHeight: '1.85',
  boxShadow: '0 0 60px rgba(0,255,65,0.06)',
};
