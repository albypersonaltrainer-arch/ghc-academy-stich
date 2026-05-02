'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Lesson = {
  id: string;
  title: string;
  content?: string | null;
};

const neon = '#00FF41';

export default function LessonPage() {
  const params = useParams();
  const lessonId = String(params.lessonId);
  const slug = String(params.slug);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLesson() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const res = await fetch(
          `${supabaseUrl}/rest/v1/lessons?select=id,title,content&id=eq.${lessonId}&limit=1`,
          {
            headers: {
              apikey: supabaseKey!,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setLesson(data[0]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, [lessonId]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <p style={{ color: neon }}>Cargando lección...</p>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main style={pageStyle}>
        <Link href={`/cursos/${slug}`} style={backButton}>
          ← Volver al curso
        </Link>
        <h1>Lección no encontrada</h1>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={container}>
        <Link href={`/cursos/${slug}`} style={backButton}>
          ← Volver al curso
        </Link>

        <h1 style={title}>{lesson.title}</h1>

        <div style={content}>
          {lesson.content || 'Contenido pendiente de añadir en Supabase.'}
        </div>
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

const container: React.CSSProperties = {
  maxWidth: '900px',
  margin: '0 auto',
};

const backButton: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '20px',
  color: neon,
  textDecoration: 'none',
};

const title: React.CSSProperties = {
  fontSize: '40px',
  fontWeight: 900,
  marginBottom: '20px',
};

const content: React.CSSProperties = {
  lineHeight: '1.8',
  color: 'rgba(255,255,255,0.8)',
};
