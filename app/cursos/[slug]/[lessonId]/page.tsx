'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const neon = '#00FF41';

type Lesson = {
  id: string;
  title: string;
  content?: string | null;
};

export default function LessonPage() {
  const params = useParams();
  const lessonId = String(params.lessonId);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLesson() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const res = await fetch(
          `${url}/rest/v1/lessons?id=eq.${lessonId}&select=id,title,content`,
          {
            headers: {
              apikey: key!,
              Authorization: `Bearer ${key}`,
            },
          }
        );

        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setLesson(data[0]);
        }
      } catch (error) {
        console.error('Error loading lesson:', error);
      } finally {
        setLoading(false);
      }
    }

    loadLesson();
  }, [lessonId]);

  if (loading) {
    return (
      <main style={{ padding: 40 }}>
        <p style={{ color: neon }}>Cargando lección...</p>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main style={{ padding: 40 }}>
        <Link href="/cursos" style={{ color: neon }}>
          ← Volver a cursos
        </Link>
        <h1>Lección no encontrada</h1>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#030504',
        color: 'white',
        padding: '40px',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <Link href="/cursos" style={{ color: neon }}>
        ← Volver a cursos
      </Link>

      <h1
        style={{
          marginTop: 20,
          fontSize: '40px',
          fontWeight: 900,
        }}
      >
        {lesson.title}
      </h1>

      <div
        style={{
          marginTop: 30,
          lineHeight: '1.7',
          color: 'rgba(255,255,255,0.75)',
        }}
      >
        {lesson.content || 'Contenido aún no disponible'}
      </div>
    </main>
  );
}
