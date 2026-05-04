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
  category?: string | null;
};

const neon = '#00FF41';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const TYPE_ORDER = [
  'Curso principal',
  'Curso',
  'Programa',
  'Minicurso',
  'Perla',
  'Gratis',
  'Recurso',
  'Otro',
];

export default function CoursesCatalogPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemMessage, setSystemMessage] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [levelFilter, setLevelFilter] = useState('Todos');

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        setSystemMessage('');

        const { data, error } = await supabase
          .from('courses')
          .select('*');

        if (error) {
          console.error('Error cargando catálogo:', error);
          setSystemMessage('No se pudo cargar el catálogo académico.');
          setItems([]);
          setLoading(false);
          return;
        }

        const finalItems = Array.isArray(data)
          ? [...data]
              .filter(isVisibleCatalogItem)
              .sort(sortCatalogItems)
          : [];

        setItems(finalItems as Course[]);

        if (finalItems.length === 0) {
          setSystemMessage(
            'No hay cursos, minicursos o perlas visibles todavía. Revisa el estado de publicación en Supabase.'
          );
        }
      } catch (error) {
        console.error('Error inesperado cargando catálogo:', error);
        setSystemMessage('Error cargando el catálogo de GHC Academy.');
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, []);

  const availableTypes = useMemo(() => {
    const types = items.map(getDisplayType);
    const uniqueTypes = Array.from(new Set(types));

    uniqueTypes.sort((a, b) => {
      const aIndex = TYPE_ORDER.indexOf(a);
      const bIndex = TYPE_ORDER.indexOf(b);

      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });

    return ['Todos', ...uniqueTypes];
  }, [items]);

  const availableLevels = useMemo(() => {
    const levels = items
      .map((item) => item.level)
      .filter(Boolean)
      .map((level) => String(level));

    return ['Todos', ...Array.from(new Set(levels))];
  }, [items]);

  const filteredItems = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return items.filter((item) => {
      const itemType = getDisplayType(item);

      const matchesSearch =
        !searchValue ||
        String(item.title || '').toLowerCase().includes(searchValue) ||
        String(item.subtitle || '').toLowerCase().includes(searchValue) ||
        String(item.description || '').toLowerCase().includes(searchValue) ||
        String(item.course_type || '').toLowerCase().includes(searchValue) ||
        String(item.category || '').toLowerCase().includes(searchValue) ||
        String(item.level || '').toLowerCase().includes(searchValue);

      const matchesType =
        typeFilter === 'Todos' || itemType === typeFilter;

      const matchesLevel =
        levelFilter === 'Todos' || String(item.level || '') === levelFilter;

      return matchesSearch && matchesType && matchesLevel;
    });
  }, [items, search, typeFilter, levelFilter]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, Course[]> = {};

    filteredItems.forEach((item) => {
      const type = getDisplayType(item);

      if (!groups[type]) {
        groups[type] = [];
      }

      groups[type].push(item);
    });

    return Object.entries(groups).sort(([a], [b]) => {
      const aIndex = TYPE_ORDER.indexOf(a);
      const bIndex = TYPE_ORDER.indexOf(b);

      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  }, [filteredItems]);

  const principalCount = items.filter((item) =>
    ['Curso principal', 'Curso', 'Programa'].includes(getDisplayType(item))
  ).length;

  const miniCount = items.filter((item) => getDisplayType(item) === 'Minicurso').length;
  const pearlCount = items.filter((item) => getDisplayType(item) === 'Perla').length;

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <p style={kickerStyle}>GHC Academy</p>
          <h1 style={titleStyle}>Cargando academia</h1>
          <p style={textStyle}>Estamos preparando cursos, minicursos y perlas.</p>
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

            <h1 style={titleStyle}>Catálogo académico</h1>

            <p style={subtitleStyle}>
              Cursos premium, minicursos y perlas formativas para aprender desde la ciencia,
              progresar con estructura y aplicar conocimiento real.
            </p>

            <p style={textStyle}>
              Esta será la entrada principal al ecosistema formativo: programas largos, módulos
              especializados, contenidos rápidos de alto valor y recursos introductorios.
            </p>
          </div>

          <aside style={heroPanelStyle}>
            <p style={smallLabel}>Contenido disponible</p>
            <p style={bigNumber}>{items.length}</p>

            <div style={miniGrid}>
              <div style={miniBox}>
                <p style={miniLabel}>Cursos / programas</p>
                <p style={miniValue}>{principalCount}</p>
              </div>

              <div style={miniBox}>
                <p style={miniLabel}>Minicursos</p>
                <p style={miniValue}>{miniCount}</p>
              </div>

              <div style={miniBox}>
                <p style={miniLabel}>Perlas</p>
                <p style={miniValue}>{pearlCount}</p>
              </div>
            </div>
          </aside>
        </section>

        <section style={toolbarStyle}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar curso, minicurso, perla, nivel o temática..."
            style={searchInputStyle}
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            style={selectStyle}
          >
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

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

        {filteredItems.length === 0 ? (
          <section style={emptyStateStyle}>
            <p style={kickerStyle}>Sin resultados</p>
            <h2 style={sectionTitle}>No hay contenidos que coincidan con la búsqueda</h2>
            <p style={textStyle}>
              Prueba a cambiar el filtro o vuelve al catálogo completo.
            </p>
          </section>
        ) : (
          <div style={groupsStackStyle}>
            {groupedItems.map(([groupName, groupItems]) => (
              <section key={groupName}>
                <div style={groupHeaderStyle}>
                  <div>
                    <p style={sectionLabel}>{getGroupEyebrow(groupName)}</p>
                    <h2 style={sectionTitle}>{groupName}</h2>
                  </div>

                  <span style={groupCounterStyle}>
                    {groupItems.length} {groupItems.length === 1 ? 'contenido' : 'contenidos'}
                  </span>
                </div>

                <div style={coursesGridStyle}>
                  {groupItems.map((item) => (
                    <article key={item.id} style={courseCardStyle}>
                      <div style={courseGlowStyle} />

                      <div style={cardTopStyle}>
                        <div style={badgeRowStyle}>
                          <span style={getTypeBadgeStyle(getDisplayType(item))}>
                            {getDisplayType(item)}
                          </span>

                          {item.level && (
                            <span style={badgeSecondary}>{item.level}</span>
                          )}
                        </div>

                        <p style={courseStatusStyle}>
                          {getStatusLabel(item.status)}
                        </p>
                      </div>

                      <h3 style={courseTitleStyle}>{item.title}</h3>

                      {item.subtitle && (
                        <p style={courseSubtitleStyle}>{item.subtitle}</p>
                      )}

                      <p style={courseTextStyle}>
                        {item.description || getDefaultDescription(getDisplayType(item))}
                      </p>

                      <div style={courseDataGridStyle}>
                        <div style={miniBox}>
                          <p style={miniLabel}>Precio</p>
                          <p style={miniValue}>
                            {Number(item.price || 0).toLocaleString('es-ES')}€
                          </p>
                        </div>

                        <div style={miniBox}>
                          <p style={miniLabel}>Duración</p>
                          <p style={miniValue}>{item.duration_minutes || 0} min</p>
                        </div>

                        <div style={miniBox}>
                          <p style={miniLabel}>Certificado</p>
                          <p style={miniValue}>{item.has_certificate ? 'Sí' : 'No'}</p>
                        </div>
                      </div>

                      <Link href={`/cursos/${item.slug}`} style={openCourseButton}>
                        {getOpenButtonText(getDisplayType(item))}
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function isVisibleCatalogItem(item: Course) {
  const status = String(item.status || '').toLowerCase();

  if (!status) return true;

  return [
    'published',
    'publicado',
    'active',
    'activo',
    'preview',
    'demo',
    'draft',
    'borrador',
  ].includes(status);
}

function getDisplayType(item: Course) {
  const raw = String(item.course_type || item.category || '').trim().toLowerCase();

  if (!raw) return 'Curso';

  if (raw.includes('perla')) return 'Perla';
  if (raw.includes('mini')) return 'Minicurso';
  if (raw.includes('programa')) return 'Programa';
  if (raw.includes('principal')) return 'Curso principal';
  if (raw.includes('gratis') || raw.includes('free')) return 'Gratis';
  if (raw.includes('recurso')) return 'Recurso';
  if (raw.includes('curso')) return 'Curso';

  return capitalize(raw);
}

function getStatusLabel(status?: string | null) {
  const value = String(status || '').toLowerCase();

  if (!value) return 'Visible';
  if (value === 'published' || value === 'publicado') return 'Publicado';
  if (value === 'draft' || value === 'borrador') return 'Borrador';
  if (value === 'preview' || value === 'demo') return 'Preview';

  return capitalize(value);
}

function sortCatalogItems(a: Course, b: Course) {
  const typeA = getDisplayType(a);
  const typeB = getDisplayType(b);

  const typeIndexA = TYPE_ORDER.indexOf(typeA);
  const typeIndexB = TYPE_ORDER.indexOf(typeB);

  if (typeIndexA !== typeIndexB) {
    if (typeIndexA === -1) return 1;
    if (typeIndexB === -1) return -1;
    return typeIndexA - typeIndexB;
  }

  return String(a.title || '').localeCompare(String(b.title || ''));
}

function getGroupEyebrow(groupName: string) {
  if (groupName === 'Curso principal' || groupName === 'Curso' || groupName === 'Programa') {
    return 'Itinerarios largos';
  }

  if (groupName === 'Minicurso') {
    return 'Formación compacta';
  }

  if (groupName === 'Perla') {
    return 'Contenido rápido de alto valor';
  }

  if (groupName === 'Gratis') {
    return 'Acceso inicial';
  }

  return 'Biblioteca GHC';
}

function getDefaultDescription(type: string) {
  if (type === 'Perla') {
    return 'Contenido breve y directo para resolver una idea clave en pocos minutos.';
  }

  if (type === 'Minicurso') {
    return 'Formación compacta para profundizar en una habilidad o concepto concreto.';
  }

  return 'Formación premium basada en ciencia real, progresión y aplicación práctica.';
}

function getOpenButtonText(type: string) {
  if (type === 'Perla') return 'Ver perla →';
  if (type === 'Minicurso') return 'Ver minicurso →';

  return 'Ver contenidos →';
}

function getTypeBadgeStyle(type: string): React.CSSProperties {
  if (type === 'Perla') {
    return {
      ...badgeMain,
      background: 'rgba(0,255,65,0.16)',
      color: neon,
      border: '1px solid rgba(0,255,65,0.55)',
    };
  }

  if (type === 'Minicurso') {
    return {
      ...badgeMain,
      background: '#ffffff',
      color: '#000',
    };
  }

  return badgeMain;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  gridTemplateColumns: 'minmax(0, 1fr) minmax(170px, 220px) minmax(170px, 220px)',
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

const groupsStackStyle: React.CSSProperties = {
  display: 'grid',
  gap: '44px',
};

const groupHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '20px',
  alignItems: 'flex-end',
  margin: '0 0 18px',
};

const groupCounterStyle: React.CSSProperties = {
  color: neon,
  border: '1px solid rgba(0,255,65,0.28)',
  borderRadius: '999px',
  padding: '9px 13px',
  fontSize: '12px',
  fontWeight: 900,
  whiteSpace: 'nowrap',
};

const sectionLabel: React.CSSProperties = {
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.3em',
  textTransform: 'uppercase',
  margin: 0,
};

const sectionTitle: React.CSSProperties = {
  fontSize: '34px',
  fontWeight: 900,
  textTransform: 'uppercase',
  margin: '6px 0 0',
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
