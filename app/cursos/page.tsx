'use client';

import { useEffect, useMemo, useState } from 'react';

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

        if (!supabaseUrl || !supabaseKey) {
          setLoading(false);
          return;
        }

        const endpoint =
          `${supabaseUrl}/rest/v1/courses` +
          '?select=id,title,slug,subtitle,description,course_type,level,price,duration_minutes,has_certificate' +
          '&status=eq.published' +
          '&order=created_at.desc';

        const response = await fetch(endpoint, {
          headers: {
            apikey: supabaseKey,
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

      const matchesQuery = searchText.includes(query.toLowerCase());
      const matchesLevel = level === 'todos' || course.level === level;
      const matchesType = type === 'todos' || course.course_type === type;

      return matchesQuery && matchesLevel && matchesType;
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
            boxShadow: '0 0 60px rgba(0,255,65,0.07)',
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
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              style={inputStyle}
            >
              <option value="todos">Todos</option>
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Tipo</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              style={inputStyle}
            >
              <option value="todos">Todos</option>
              <option value="curso">Curso</option>
              <option value="minicurso">Minicurso</option>
              <option value="perla">Perla</option>
            </select>
          </div>
        </section>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '22px',
            color: 'rgba(255,255,255,0.55)',
            fontSize: '14px',
          }}
        >
          <span>
            {loading
              ? 'Conectando con Supabase...'
              : `${filteredCourses.length} contenidos encontrados`}
          </span>
          <span style={{ color: neon, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            Sistema académico conectado
          </span>
        </div>

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
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '28px',
                padding: '24px',
                background:
                  'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
                border: '1px solid rgba(0,255,65,0.26)',
                boxShadow: '0 0 50px rgba(0,255,65,0.08)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-70px',
                  right: '-70px',
                  width: '160px',
                  height: '160px',
                  borderRadius: '999px',
                  background: 'rgba(0,255,65,0.14)',
                  filter: 'blur(30px)',
                }}
              />

              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <span style={badgeMain}>{course.course_type}</span>
                  <span style={badgeSecondary}>{course.level}</span>
                </div>

                <h2
                  style={{
                    fontSize: '26px',
                    lineHeight: '1.15',
                    fontWeight: 900,
                    margin: '0 0 12px',
                  }}
                >
                  {course.title}
                </h2>

                {course.subtitle && (
                  <p
                    style={{
                      color: neon,
                      fontWeight: 800,
                      fontSize: '14px',
                      lineHeight: '1.5',
                      marginBottom: '14px',
                    }}
                  >
                    {course.subtitle}
                  </p>
                )}

                <p
                  style={{
                    color: 'rgba(255,255,255,0.62)',
                    fontSize: '14px',
                    lineHeight: '1.7',
                    minHeight: '76px',
                  }}
                >
                  {course.description || 'Contenido académico premium de GHC Academy.'}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    margin: '20px 0',
                  }}
                >
                  <div style={miniBox}>
                    <p style={miniLabel}>Duración</p>
                    <p style={miniValue}>{course.duration_minutes || 0} min</p>
                  </div>

                  <div style={miniBox}>
                    <p style={miniLabel}>Certificado</p>
                    <p style={miniValue}>{course.has_certificate ? 'Sí' : 'No'}</p>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: '20px',
                    border: '1px solid rgba(0,255,65,0.24)',
                    background: 'rgba(0,255,65,0.06)',
                    padding: '16px',
                    marginBottom: '18px',
                  }}
                >
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.42)', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                    Precio
                  </p>
                  <p style={{ margin: '6px 0 0', color: neon, fontSize: '34px', fontWeight: 900 }}>
                    {Number(course.price || 0).toLocaleString('es-ES')}€
                  </p>
                </div>

                <button
                  style={{
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
                  }}
                >
                  Ver contenido
                </button>
              </div>
            </article>
          ))}
        </section>

        {!loading && filteredCourses.length === 0 && (
          <div
            style={{
              marginTop: '40px',
              padding: '26px',
              borderRadius: '24px',
              border: '1px solid rgba(0,255,65,0.22)',
              color: 'rgba(255,255,255,0.65)',
              textAlign: 'center',
            }}
          >
            No hay cursos que coincidan con la búsqueda.
          </div>
        )}
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
  boxSizing: 'border-box',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.42)',
  color: 'white',
  padding: '13px 14px',
  outline: 'none',
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
