'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

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
  status?: string | null;
  image_url?: string | null;
  cover_url?: string | null;
};

const neon = '#00FF41';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function CoursesCatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemMessage, setSystemMessage] = useState('');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('Todos');

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        setSystemMessage('');

        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('status', 'published');

        if (error) {
          console.error('Error cargando cursos:', error);
          setSystemMessage('No se pudieron cargar los cursos publicados.');
          setCourses([]);
          setLoading(false);
          return;
        }

        const finalCourses = Array.isArray(data)
          ? [...data].sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
          : [];

        setCourses(finalCourses as Course[]);
      } catch (error) {
        console.error('Error inesperado cargando cursos:', error);
        setSystemMessage('Error cargando el catálogo de cursos.');
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  const availableLevels = useMemo(() => {
    const levels = courses
      .map((course) => course.level)
      .filter(Boolean)
      .map((level) => String(level));

    return ['Todos', ...Array.from(new Set(levels))];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesSearch =
        !searchValue ||
        String(course.title || '').toLowerCase().includes(searchValue) ||
        String(course.subtitle || '').toLowerCase().includes(searchValue) ||
        String(course.description || '').toLowerCase().includes(searchValue) ||
        String(course.course_type || '').toLowerCase().includes(searchValue) ||
        String(course.level || '').toLowerCase().includes(searchValue);

      const matchesLevel =
        levelFilter === 'Todos' || String(course.level || '') === levelFilter;

      return matchesSearch && matchesLevel;
    });
  }, [courses, search, levelFilter]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <p style={kickerStyle}>GHC Academy</p>
          <h1 style={titleStyle}>Cargando catálogo</h1>
          <p style={textStyle}>Estamos preparando la plataforma académica.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <section style={heroStyle}>
          <div>
            <p style={kickerStyle}>GHC Academy · Sport Through Science</p>

            <h1 style={titleStyle}>Catálogo de cursos</h1>

            <p style={subtitleStyle}>
              Formación premium en entrenamiento, salud, nutrición y alto rendimiento basada en ciencia real.
            </p>

            <p style={textStyle}>
              Explora los programas disponibles y entra en el itinerario académico para ver módulos,
              lecciones, evaluaciones y progreso.
            </p>
          </div>

          <aside style={heroPanelStyle}>
            <p style={smallLabel}>Cursos publicados</p>
            <p style={bigNumber}>{courses.length}</p>

            <div style={miniGrid}>
              <div style={miniBox}>
                <p style={miniLabel}>Modelo</p>
                <p style={miniValue}>Academia premium</p>
              </div>

              <div style={miniBox}>
                <p style={miniLabel}>Sistema</p>
                <p style={miniValue}>Módulos + examen</p>
              </div>
            </div>
          </aside>
        </section>

        <section style={toolbarStyle}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar curso, nivel o temática..."
            style={searchInputStyle}
          />

          <select
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            style={selectStyle}
          >
            {availableLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </section>

        {systemMessage && <div style={noticeBox}>{systemMessage}</div>}

        {filteredCourses.length === 0 ? (
          <section style={emptyStateStyle}>
            <p style={kickerStyle}>Sin resultados</p>
            <h2 style={sectionTitle}>No hay cursos que coincidan con la búsqueda</h2>
            <p style={textStyle}>
              Prueba a cambiar el filtro o vuelve al catálogo completo.
            </p>
          </section>
        ) : (
          <section style={coursesGridStyle}>
            {filteredCourses.map((course) => (
              <article key={course.id} style={courseCardStyle}>
                <div style={courseGlowStyle} />

                <div style={cardTopStyle}>
                  <div style={badgeRowStyle}>
                    {course.course_type && (
                      <span style={badgeMain}>{course.course_type}</span>
                    )}

                    {course.level && (
                      <span style={badgeSecondary}>{course.level}</span>
                    )}
                  </div>

                  <p style={courseStatusStyle}>Publicado</p>
                </div>

                <h2 style={courseTitleStyle}>{course.title}</h2>

                {course.subtitle && (
                  <p style={courseSubtitleStyle}>{course.subtitle}</p>
                )}

                <p style={courseTextStyle}>
                  {course.description || 'Formación premium basada en ciencia real.'}
                </p>

                <div style={courseDataGridStyle}>
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

                <Link href={`/cursos/${course.slug}`} style={openCourseButton}>
                  Ver contenidos →
                </Link>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at top left, rgba(0,255,65,0.18), transparent 34%), radial-gradient(circle at bottom right, rgba(0,255,65,0.10), transparent 30%), #030504',
  color: 'white',
  padding: '32px',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '1240px',
  margin: '0 auto',
};

const heroStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.65fr)',
  gap: '24px',
  alignItems: 'stretch',
  marginBottom: '28px',
};

const kickerStyle: React.CSSProperties = {
  color: neon,
  fontSize: '12px',
  letterSpacing: '0.34em',
  fontWeight: 900,
  textTransform: 'uppercase',
  margin: '0 0 14px',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(46px, 8vw, 92px)',
  lineHeight: '0.9',
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '-0.04em',
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  color: neon,
  fontSize: '20px',
  lineHeight: '1.45',
  fontWeight: 900,
  maxWidth: '900px',
  margin: '22px 0 0',
};

const textStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.66)',
  fontSize: '15px',
  lineHeight: '1.75',
};

const heroPanelStyle: React.CSSProperties = {
  borderRadius: '32px',
  border: '1px solid rgba(0,255,65,0.28)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
  padding: '26px',
  boxShadow: '0 0 80px rgba(0,255,65,0.10)',
};

const smallLabel: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.42)',
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  fontWeight: 900,
};

const bigNumber: React.CSSProperties = {
  margin: '10px 0 22px',
  color: neon,
  fontSize: '58px',
  lineHeight: 1,
  fontWeight: 950,
};

const miniGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '12px',
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

const toolbarStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, 240px)',
  gap: '14px',
  margin: '34px 0 24px',
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '18px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'rgba(0,0,0,0.32)',
  color: 'white',
  padding: '16px 18px',
  outline: 'none',
  fontSize: '14px',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '18px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: '#07100a',
  color: 'white',
  padding: '16px 18px',
  outline: 'none',
  fontSize: '14px',
  fontWeight: 800,
};

const noticeBox: React.CSSProperties = {
  padding: '22px',
  borderRadius: '24px',
  border: '1px solid rgba(0,255,65,0.22)',
  color: 'rgba(255,255,255,0.72)',
  marginBottom: '20px',
  background: 'rgba(255,255,255,0.035)',
};

const emptyStateStyle: React.CSSProperties = {
  borderRadius: '30px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'rgba(255,255,255,0.045)',
  padding: '28px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '34px',
  fontWeight: 900,
  textTransform: 'uppercase',
  margin: 0,
};

const coursesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
  gap: '22px',
};

const courseCardStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '32px',
  border: '1px solid rgba(0,255,65,0.24)',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))',
  padding: '24px',
  boxShadow: '0 0 60px rgba(0,255,65,0.065)',
};

const courseGlowStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-90px',
  right: '-90px',
  width: '190px',
  height: '190px',
  borderRadius: '999px',
  background: 'rgba(0,255,65,0.13)',
  filter: 'blur(22px)',
};

const cardTopStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  alignItems: 'flex-start',
  marginBottom: '18px',
};

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
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

const courseStatusStyle: React.CSSProperties = {
  margin: 0,
  color: neon,
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

const courseTitleStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  fontSize: '32px',
  lineHeight: '1',
  fontWeight: 950,
  textTransform: 'uppercase',
  margin: '0 0 12px',
};

const courseSubtitleStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  color: neon,
  fontSize: '15px',
  fontWeight: 900,
  lineHeight: 1.5,
  margin: '0 0 12px',
};

const courseTextStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  color: 'rgba(255,255,255,0.64)',
  fontSize: '14px',
  lineHeight: 1.7,
  minHeight: '72px',
};

const courseDataGridStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '10px',
  margin: '20px 0',
};

const openCourseButton: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'block',
  width: '100%',
  borderRadius: '18px',
  background: neon,
  color: '#000',
  padding: '15px',
  fontSize: '13px',
  fontWeight: 950,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  textAlign: 'center',
  boxShadow: '0 0 28px rgba(0,255,65,0.28)',
};
