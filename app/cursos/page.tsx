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

        if (Array.isArray(data)) {
          setCourses(data);
        }
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const searchText = `${course.title} ${course.subtitle ?? ''} ${course.description ?? ''}`.toLowerCase();

      return (
        searchText.includes(query.toLowerCase()) &&
        (level === 'todos' || course.level === level) &&
        (type === 'todos' || course.course_type === type)
      );
    });
  }, [courses, query, level, type]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(0,255,65,0.16), transparent 35%), radial-gradient(circle at bottom right, rgba(0,255,65,0.10), transparent 30%), #030504',
        color: 'white',
        padding: '32px',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '24px',
            alignItems: 'center',
            marginBottom: '42px',
            borderBottom: '1px solid rgba(0,255,65,0.25)',
            paddingBottom: '24px',
          }}
        >
          <div>
            <p
              style={{
                color: neon,
                fontSize: '12px',
                letterSpacing: '0.35em',
                fontWeight: 900,
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              GHC Academy · Sport Through Science
            </p>

            <h1
              style={{
                fontSize: 'clamp(38px, 6vw, 72px)',
                lineHeight: '0.95',
                fontWeight: 900,
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Cursos basados en ciencia real
            </h1>

            <p
              style={{
                maxWidth: '720px',
                marginTop: '18px',
                color: 'rgba(255,255,255,0.68)',
                fontSize: '16px',
                lineHeight: '1.7',
              }}
            >
              Formación premium en entrenamiento, salud, patologías, nutrición,
              preparación física y ciencia del movimiento.
            </p>
          </div>

          <a
            href="/"
            style={{
              color: neon,
              border: '1px solid rgba(0,255,65,0.45)',
              padding: '13px 18px',
              borderRadius: '999px',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 900,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Volver al inicio
          </a>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
            padding: '18px',
            borderRadius: '26px',
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(0,255,65,0.22)',
          }}
        >
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Buscar</label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por lipedema, fuerza, nutrición..."
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Nivel</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} style={inputStyle}>
              <option value="todos">Todos</option>
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="todos">Todos</option>
              <option value="curso">Curso</option>
              <option value="minicurso">Minicurso</option>
              <option value="perla">Perla</option>
            </select>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '22px',
          }}
        >
          {filteredCourses.map((course) => (
            <article
              key={course.id}
              style={{
                borderRadius: '28px',
                padding: '24px',
                border: '1px solid rgba(0,255,65,0.26)',
              }}
            >
              <h2>{course.title}</h2>
              <p>{course.subtitle}</p>

              <p style={{ color: neon, fontWeight: 900 }}>
                {Number(course.price || 0).toLocaleString('es-ES')}€
              </p>

              {/* 🔥 LINK FUNCIONAL */}
              <Link href={`/cursos/${course.slug}`} style={{ textDecoration: 'none' }}>
                <button
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    border: 'none',
                    borderRadius: '18px',
                    background: neon,
                    color: '#000',
                    padding: '15px',
                    fontSize: '13px',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  color: 'rgba(255,255,255,0.45)',
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.42)',
  color: 'white',
  padding: '13px 14px',
};
