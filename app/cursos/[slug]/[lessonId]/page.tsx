'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const neon = '#00FF41';

type Lesson = {
  id: string;
  title: string;
  content?: string | null;
  module_id: string;
};

type Module = {
  id: string;
  title: string;
};

export default function LessonPage() {
  const params = useParams();
  const lessonId = String(params.lessonId);
  const slug = String(params.slug);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const headers = {
          apikey: key!,
          Authorization: `Bearer ${key}`,
        };

        // 👉 1. Cargar lección actual
        const lessonRes = await fetch(
          `${url}/rest/v1/lessons?id=eq.${lessonId}&select=*`,
          { headers }
        );
        const lessonData = await lessonRes.json();

        if (!lessonData.length) {
          setLoading(false);
          return;
        }

        const currentLesson = lessonData[0];
        setLesson(currentLesson);

        // 👉 2. Cargar módulos
        const modulesRes = await fetch(
          `${url}/rest/v1/modules?select=id,title,position&order=position.asc`,
          { headers }
        );
        const modulesData = await modulesRes.json();
        setModules(modulesData || []);

        // 👉 3. Cargar lecciones
        const lessonsRes = await fetch(
          `${url}/rest/v1/lessons?select=id,title,module_id,position&order=position.asc`,
          { headers }
        );
        const lessonsData = await lessonsRes.json();
        setLessons(lessonsData || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [lessonId]);

  if (loading) {
    return <p style={{ color: neon, padding: 40 }}>Cargando...</p>;
  }

  if (!lesson) {
    return <p style={{ padding: 40 }}>Lección no encontrada</p>;
  }

  return (
    <main style={page}>
      {/* SIDEBAR */}
      <aside style={sidebar}>
        <Link href={`/cursos/${slug}`} style={back}>
          ← Volver
        </Link>

        {modules.map((module) => {
          const moduleLessons = lessons.filter(
            (l) => l.module_id === module.id
          );

          return (
            <div key={module.id} style={{ marginBottom: 20 }}>
              <p style={moduleTitle}>{module.title}</p>

              {moduleLessons.map((l) => (
                <Link
                  key={l.id}
                  href={`/cursos/${slug}/${l.id}`}
                  style={{
                    ...lessonLink,
                    background:
                      l.id === lesson.id ? 'rgba(0,255,65,0.2)' : 'transparent',
                    border:
                      l.id === lesson.id
                        ? '1px solid rgba(0,255,65,0.5)'
                        : '1px solid transparent',
                  }}
                >
                  {l.title}
                </Link>
              ))}
            </div>
          );
        })}
      </aside>

      {/* CONTENIDO */}
      <section style={content}>
        <h1 style={title}>{lesson.title}</h1>

        <div style={text}>
          {lesson.content || 'Contenido no disponible'}
        </div>
      </section>
    </main>
  );
}

/* 🎨 ESTILOS */

const page: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  background: '#030504',
  color: 'white',
};

const sidebar: React.CSSProperties = {
  width: '320px',
  borderRight: '1px solid rgba(0,255,65,0.2)',
  padding: '20px',
  overflowY: 'auto',
};

const back: React.CSSProperties = {
  color: neon,
  display: 'block',
  marginBottom: 20,
  textDecoration: 'none',
  fontWeight: 800,
};

const moduleTitle: React.CSSProperties = {
  fontSize: 12,
  color: neon,
  marginBottom: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
};

const lessonLink: React.CSSProperties = {
  display: 'block',
  padding: '10px',
  borderRadius: 10,
  marginBottom: 6,
  color: 'white',
  textDecoration: 'none',
  fontSize: 14,
};

const content: React.CSSProperties = {
  flex: 1,
  padding: '40px',
};

const title: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 900,
};

const text: React.CSSProperties = {
  marginTop: 20,
  lineHeight: 1.7,
  color: 'rgba(255,255,255,0.7)',
};
