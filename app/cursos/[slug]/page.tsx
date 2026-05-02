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
  course_type: string;
  level: string;
  price: number;
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

  useEffect(() => {
    async function loadCourseContent() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          setLoading(false);
          return;
        }

        // 1. Curso
        const courseRes = await fetch(
          `${supabaseUrl}/rest/v1/courses?select=id,title,slug,subtitle,description,course_type,level,price,duration_minutes,has_certificate&slug=eq.${slug}&status=eq.published&limit=1`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        const courseData = await courseRes.json();

        if (!Array.isArray(courseData) || courseData.length === 0) {
          setLoading(false);
          return;
        }

        const selectedCourse = courseData[0];
        setCourse(selectedCourse);

        // 2. Módulos (SIEMPRE carga)
        const modulesRes = await fetch(
          `${supabaseUrl}/rest/v1/modules?select=id,course_id,title,description,position&course_id=eq.${selectedCourse.id}&order=position.asc`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        const modulesData = await modulesRes.json();

        if (Array.isArray(modulesData)) {
          setModules(modulesData);
        } else {
          setModules([]);
        }

        // 3. Lecciones (no rompe nada si falla)
        try {
          if (Array.isArray(modulesData) && modulesData.length > 0) {
            const moduleIds = modulesData.map((m) => m.id).join(',');

            const lessonsRes = await fetch(
              `${supabaseUrl}/rest/v1/lessons?select=id,module_id,title,content,position&module_id=in.(${moduleIds})&order=position.asc`,
              {
                headers: {
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`,
                },
              }
            );

            const lessonsData = await lessonsRes.json();

            if (Array.isArray(lessonsData)) {
              setLessons(lessonsData);
            } else {
              setLessons([]);
            }
          }
        } catch (err) {
          console.error('Error loading lessons:', err);
          setLessons([]);
        }

      } catch (error) {
        console.error('Error loading course content:', error);
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
          <p style={{ color: neon, fontWeight: 900 }}>Cargando contenido...</p>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <Link href="/cursos" style={backButton}>← Volver a cursos</Link>
          <h1 style={titleStyle}>Curso no encontrado</h1>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <Link href="/cursos" style={backButton}>← Volver a cursos</Link>

        <h1 style={titleStyle}>{course.title}</h1>

        <section style={{ marginTop: '40px' }}>
          <h2 style={sectionTitle}>Módulos</h2>

          {modules.length === 0 && (
            <div style={emptyBox}>
              No hay módulos (revisar Supabase)
            </div>
          )}

          <div style={{ display: 'grid', gap: '20px' }}>
            {modules.map((module, index) => {
              const moduleLessons = lessons.filter(
                (lesson) => lesson.module_id === module.id
              );

              const unlocked = index === 0;

              return (
                <div key={module.id} style={{ opacity: unlocked ? 1 : 0.5 }}>
                  <h3>{module.title}</h3>

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
  background: '#030504',
  color: 'white',
  padding: '32px',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '900px',
  margin: '0 auto',
};

const backButton: React.CSSProperties = {
  color: neon,
  textDecoration: 'none',
};

const titleStyle: React.CSSProperties = {
  fontSize: '40px',
  fontWeight: 900,
};

const sectionTitle: React.CSSProperties = {
  fontSize: '24px',
  marginTop: '20px',
};

const lessonRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px',
  borderBottom: '1px solid #222',
};

const openLessonLink: React.CSSProperties = {
  color: neon,
  fontWeight: 900,
  textDecoration: 'none',
};

const emptyBox: React.CSSProperties = {
  padding: '20px',
  border: '1px solid red',
};
