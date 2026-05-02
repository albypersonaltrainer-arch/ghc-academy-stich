'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Course = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  description?: string | null;
  course_type: 'curso' | 'minicurso' | 'perla';
  level: 'principiante' | 'intermedio' | 'avanzado';
  price: number;
  duration_minutes?: number | null;
  has_certificate?: boolean | null;
};

const neon = '#00FF41';

export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('todos');
  const [type, setType] = useState('todos');

  useEffect(() => {
    async function loadCourses() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const endpoint =
          `${supabaseUrl}/rest/v1/courses` +
          '?select=id,title,slug,subtitle,description,course_type,level,price,duration_minutes,has_certificate' +
          '&status=eq.published' +
          '&order=created_at.desc';

        const response = await fetch(endpoint, {
          headers: {
            apikey: supabaseKey!,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });

        const data = await response.json();
        setCourses(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const text = `${course.title} ${course.subtitle ?? ''} ${course.description ?? ''}`.toLowerCase();
      return (
        text.includes(query.toLowerCase()) &&
        (level === 'todos' || course.level === level) &&
        (type === 'todos' || course.course_type === type)
      );
    });
  }, [courses, query, level, type]);

  return (
    <main style={{ minHeight: '100vh', background: '#030504', color: 'white', padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <h1 style={{ fontSize: '42px', marginBottom: '30px' }}>
          Cursos GHC Academy
        </h1>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredCourses.map((course) => (
            <article key={course.id} style={{ padding: '20px', border: '1px solid rgba(0,255,65,0.3)', borderRadius: '20px' }}>

              <h2>{course.title}</h2>
              <p>{course.subtitle}</p>

              <p style={{ color: neon, fontWeight: 900 }}>
                {course.price}€
              </p>

              {/* 🔥 AQUÍ ESTÁ LA CLAVE */}
              <Link href={`/cursos/${course.slug}`}>
                <button style={{
                  width: '100%',
                  marginTop: '12px',
                  background: neon,
                  border: 'none',
                  padding: '12px',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}>
                  Ver contenido
                </button>
              </Link>

            </article>
          ))}
        </section>

      </div>
    </main>
  );
}
