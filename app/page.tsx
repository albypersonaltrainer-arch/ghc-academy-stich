import Link from 'next/link';

const featuredCourses = [
  {
    title: 'Biomecánica Fundamental',
    description:
      'Comprende los principios del movimiento humano y su aplicación en el entrenamiento.',
    level: 'Principiante',
    duration: '4–5 h',
    certificate: 'Incluido',
    image:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    badge: 'Más popular',
  },
  {
    title: 'Análisis del Rendimiento',
    description:
      'Aprende a recolectar, analizar e interpretar datos para tomar mejores decisiones.',
    level: 'Intermedio',
    duration: '5–6 h',
    certificate: 'Incluido',
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    badge: 'Data-driven',
  },
  {
    title: 'Principios del Entrenamiento de Fuerza',
    description:
      'Diseña programas efectivos basados en evidencia para cualquier objetivo.',
    level: 'Principiante',
    duration: '6–8 h',
    certificate: 'Incluido',
    image:
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80',
    badge: 'Fuerza',
  },
];

const pillars = [
  {
    title: 'Ciencia',
    text: 'Contenido basado en estudios científicos y evidencia actualizada.',
    icon: '⬡',
  },
  {
    title: 'Progresión',
    text: 'Aprendizaje estructurado por niveles para avanzar con seguridad.',
    icon: '↗',
  },
  {
    title: 'Evaluación',
    text: 'Tests, casos prácticos y exámenes para validar conocimiento real.',
    icon: '◇',
  },
  {
    title: 'Certificación',
    text: 'Credenciales digitales para destacar tu carrera profesional.',
    icon: '★',
  },
];

export default function HomePage() {
  return (
    <main style={page}>
      <section style={shell}>
        <header style={header}>
          <Link href="/" style={brand}>
            <span style={brandMark}>
              <span style={brandMarkInner}>G</span>
            </span>

            <span style={brandTextWrap}>
              <span style={brandText}>GHC</span>
              <span style={brandSubtext}>Academy</span>
            </span>
          </Link>

          <nav style={nav}>
            <Link href="/" style={navLinkActive}>
              Inicio
            </Link>
            <Link href="/cursos" style={navLink}>
              Cursos
            </Link>
            <Link href="#metodologia" style={navLink}>
              Metodología
            </Link>
            <Link href="/alumno" style={navLink}>
              Alumnos
            </Link>
            <Link href="/acceso" style={navLink}>
              Acceso
            </Link>
          </nav>

          <Link href="/acceso" style={headerButton}>
            Únete ahora →
          </Link>
        </header>

        <section style={hero}>
          <div style={heroContent}>
            <p style={eyebrow}>Ciencia · Progresión · Rendimiento</p>

            <h1 style={heroTitle}>
              Formación de alto rendimiento desde la ciencia
            </h1>

            <p style={heroText}>
              Cursos online basados en evidencia para entrenadores, atletas y profesionales que
              buscan resultados reales, sostenibles y medibles.
            </p>

            <div style={heroActions}>
              <Link href="/cursos" style={primaryButton}>
                Explorar cursos →
              </Link>

              <Link href="#metodologia" style={ghostButton}>
                Conocer metodología →
              </Link>
            </div>

            <div style={heroStats}>
              <div style={heroStat}>
                <span style={heroStatIcon}>◷</span>
                <div>
                  <strong>Aprende a tu ritmo</strong>
                  <span>Acceso 24/7</span>
                </div>
              </div>

              <div style={heroStat}>
                <span style={heroStatIcon}>◇</span>
                <div>
                  <strong>Certificación oficial</strong>
                  <span>Credencial GHC</span>
                </div>
              </div>

              <div style={heroStat}>
                <span style={heroStatIcon}>↗</span>
                <div>
                  <strong>Basado en evidencia</strong>
                  <span>Ciencia aplicada</span>
                </div>
              </div>
            </div>
          </div>

          <div style={heroVisual}>
            <div style={heroImage} />

            <div style={floatingPanel}>
              <p style={floatingLabel}>Detección de progreso</p>
              <div style={chartBars}>
                <span style={{ ...bar, height: '42%' }} />
                <span style={{ ...bar, height: '74%' }} />
                <span style={{ ...bar, height: '56%' }} />
                <span style={{ ...bar, height: '88%' }} />
                <span style={{ ...bar, height: '68%' }} />
              </div>
            </div>

            <div style={anatomyPanel}>
              <span style={anatomyCircle}>＋</span>
              <p>Biomecánica · Control motor · Rendimiento</p>
            </div>
          </div>
        </section>

        <section style={featuredSection}>
          <div style={sectionHeader}>
            <div>
              <p style={sectionLabel}>Programas destacados</p>
              <h2 style={sectionTitle}>Aprende con nuestros cursos estrella</h2>
            </div>

            <Link href="/cursos" style={sectionLink}>
              Ver todos los cursos →
            </Link>
          </div>

          <div style={courseGrid}>
            {featuredCourses.map((course) => (
              <article key={course.title} style={courseCard}>
                <div
                  style={{
                    ...courseImage,
                    backgroundImage: `
                      linear-gradient(180deg, rgba(5,7,6,0.05), rgba(5,7,6,0.90)),
                      url(${course.image})
                    `,
                  }}
                >
                  <span style={courseBadge}>{course.badge}</span>
                </div>

                <div style={courseBody}>
                  <h3 style={courseTitle}>{course.title}</h3>
                  <p style={courseText}>{course.description}</p>

                  <div style={courseMeta}>
                    <div>
                      <span>Nivel</span>
                      <strong>{course.level}</strong>
                    </div>
                    <div>
                      <span>Duración</span>
                      <strong>{course.duration}</strong>
                    </div>
                    <div>
                      <span>Certificado</span>
                      <strong>{course.certificate}</strong>
                    </div>
                  </div>

                  <Link href="/cursos" style={courseLink}>
                    Ver curso →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="metodologia" style={methodSection}>
          <div style={methodIntro}>
            <p style={sectionLabel}>Nuestra metodología</p>
            <h2 style={methodTitle}>Ciencia aplicada. Resultados reales.</h2>
            <p style={methodText}>
              Combinamos investigación, experiencia y tecnología para que aprendas lo que realmente
              funciona y puedas aplicarlo con criterio profesional.
            </p>

            <Link href="/cursos" style={ghostButton}>
              Conocer metodología →
            </Link>
          </div>

          <div style={pillarsGrid}>
            {pillars.map((pillar) => (
              <article key={pillar.title} style={pillarCard}>
                <span style={pillarIcon}>{pillar.icon}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={platformSection}>
          <div style={experienceCard}>
            <p style={sectionLabel}>Tu experiencia en GHC Academy</p>
            <h2 style={methodTitle}>Todo lo que necesitas para crecer</h2>
            <p style={methodText}>
              Una plataforma diseñada para que aprendas, apliques y midas tu progreso con una ruta
              clara y profesional.
            </p>

            <ul style={featureList}>
              <li>Ruta de aprendizaje personalizada</li>
              <li>Contenido actualizado continuamente</li>
              <li>Comunidad de profesionales</li>
              <li>Soporte y recursos exclusivos</li>
            </ul>

            <Link href="/alumno" style={ghostButton}>
              Ver plataforma →
            </Link>
          </div>

          <div style={dashboardPreview}>
            <div style={progressCard}>
              <p style={previewTitle}>Progreso general</p>
              <div style={progressRing}>
                <strong>67%</strong>
                <span>Completado</span>
              </div>
              <p style={previewText}>Excelente trabajo. Sigue así para alcanzar tus objetivos.</p>
            </div>

            <div style={modulePreview}>
              <p style={previewTitle}>Módulos del programa</p>

              <div style={moduleRow}>
                <span>✓</span>
                <div>
                  <strong>Biomecánica Fundamental</strong>
                  <small>100%</small>
                </div>
              </div>

              <div style={moduleRow}>
                <span>✓</span>
                <div>
                  <strong>Sistemas Energéticos</strong>
                  <small>92%</small>
                </div>
              </div>

              <div style={moduleRowActive}>
                <span>●</span>
                <div>
                  <strong>Adaptaciones Neuromusculares</strong>
                  <small>En curso · 75%</small>
                </div>
              </div>

              <div style={moduleRowLocked}>
                <span>🔒</span>
                <div>
                  <strong>Mecánica de la Hipertrofia</strong>
                  <small>Bloqueado</small>
                </div>
              </div>

              <Link href="/alumno" style={miniLink}>
                Ver mi progreso →
              </Link>
            </div>

            <div style={examPreview}>
              <div style={medalIcon}>★</div>
              <p style={previewTitle}>Próximo examen</p>
              <h3>Certificación Nivel 1</h3>
              <p>Prepárate para obtener tu certificado oficial.</p>
              <Link href="/cursos" style={smallGreenButton}>
                Ir al simulador →
              </Link>
            </div>
          </div>
        </section>

        <section style={communityBand}>
          <div>
            <h2>Únete a una comunidad de profesionales que entrenan su conocimiento.</h2>
          </div>

          <div style={communityStats}>
            <div>
              <strong>+10.000</strong>
              <span>Alumnos formados</span>
            </div>
            <div>
              <strong>+50</strong>
              <span>Cursos disponibles</span>
            </div>
            <div>
              <strong>+95%</strong>
              <span>Satisfacción general</span>
            </div>
          </div>

          <Link href="/acceso" style={primaryButton}>
            Únete ahora →
          </Link>
        </section>

        <footer style={footer}>
          <div>
            <div style={footerBrand}>
              <span style={brandMarkSmall}>G</span>
              <div>
                <strong>GHC</strong>
                <span>Academy</span>
              </div>
            </div>

            <p style={footerText}>
              Empoderamos entrenadores y atletas a través de la ciencia, la educación y el
              rendimiento.
            </p>
          </div>

          <div style={footerColumns}>
            <div>
              <strong>Plataforma</strong>
              <Link href="/cursos">Cursos</Link>
              <Link href="/alumno">Área alumno</Link>
              <Link href="/acceso">Acceso</Link>
            </div>

            <div>
              <strong>Recursos</strong>
              <a>Blog</a>
              <a>Guías gratuitas</a>
              <a>Webinars</a>
            </div>

            <div>
              <strong>Acerca de</strong>
              <a>Sobre nosotros</a>
              <a>Metodología</a>
              <a>Contacto</a>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}

const neon = '#22d65b';

const page: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at top left, rgba(34,214,91,0.14), transparent 34%), radial-gradient(circle at bottom right, rgba(34,214,91,0.08), transparent 30%), #050706',
  color: '#f3f5f2',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const shell: React.CSSProperties = {
  width: 'min(1440px, calc(100% - 28px))',
  margin: '0 auto',
  borderLeft: '1px solid rgba(255,255,255,0.06)',
  borderRight: '1px solid rgba(255,255,255,0.06)',
  background:
    'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))',
};

const header: React.CSSProperties = {
  height: '82px',
  display: 'grid',
  gridTemplateColumns: '220px 1fr 170px',
  alignItems: 'center',
  gap: '22px',
  padding: '0 34px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
};

const brand: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '12px',
  color: '#fff',
  textDecoration: 'none',
};

const brandMark: React.CSSProperties = {
  width: '42px',
  height: '42px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.22)',
  background:
    'linear-gradient(145deg, rgba(255,255,255,0.16), rgba(34,214,91,0.18))',
  display: 'grid',
  placeItems: 'center',
  boxShadow: '0 0 30px rgba(34,214,91,0.12)',
};

const brandMarkInner: React.CSSProperties = {
  color: neon,
  fontWeight: 950,
  fontSize: '20px',
};

const brandTextWrap: React.CSSProperties = {
  display: 'grid',
  gap: '2px',
};

const brandText: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 950,
  letterSpacing: '0.18em',
};

const brandSubtext: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 800,
  letterSpacing: '0.32em',
  color: 'rgba(255,255,255,0.62)',
  textTransform: 'uppercase',
};

const nav: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '42px',
};

const navLink: React.CSSProperties = {
  color: 'rgba(255,255,255,0.72)',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 700,
};

const navLinkActive: React.CSSProperties = {
  ...navLink,
  color: '#fff',
  borderBottom: `2px solid ${neon}`,
  paddingBottom: '8px',
};

const headerButton: React.CSSProperties = {
  justifySelf: 'end',
  border: '1px solid rgba(34,214,91,0.38)',
  background: 'rgba(34,214,91,0.10)',
  color: neon,
  padding: '13px 18px',
  borderRadius: '12px',
  fontSize: '13px',
  fontWeight: 850,
  textDecoration: 'none',
};

const hero: React.CSSProperties = {
  minHeight: '650px',
  display: 'grid',
  gridTemplateColumns: '0.95fr 1.05fr',
  gap: '34px',
  alignItems: 'center',
  padding: '72px 54px 40px',
};

const heroContent: React.CSSProperties = {
  position: 'relative',
  zIndex: 2,
};

const eyebrow: React.CSSProperties = {
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  margin: '0 0 22px',
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 'clamp(54px, 6vw, 86px)',
  lineHeight: '1.04',
  letterSpacing: '0.06em',
  fontWeight: 850,
};

const heroText: React.CSSProperties = {
  color: 'rgba(255,255,255,0.70)',
  fontSize: '18px',
  lineHeight: 1.65,
  maxWidth: '650px',
  margin: '26px 0 0',
};

const heroActions: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginTop: '34px',
  flexWrap: 'wrap',
};

const primaryButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: '12px',
  background: neon,
  color: '#07100a',
  padding: '15px 24px',
  fontSize: '14px',
  fontWeight: 900,
  textDecoration: 'none',
  boxShadow: '0 0 28px rgba(34,214,91,0.24)',
};

const ghostButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.035)',
  color: 'rgba(255,255,255,0.84)',
  padding: '15px 24px',
  fontSize: '14px',
  fontWeight: 850,
  textDecoration: 'none',
};

const heroStats: React.CSSProperties = {
  display: 'flex',
  gap: '22px',
  marginTop: '46px',
  flexWrap: 'wrap',
};

const heroStat: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  minWidth: '190px',
};

const heroStatIcon: React.CSSProperties = {
  width: '34px',
  height: '34px',
  borderRadius: '999px',
  border: '1px solid rgba(255,255,255,0.18)',
  display: 'grid',
  placeItems: 'center',
  color: '#fff',
};

const heroVisual: React.CSSProperties = {
  position: 'relative',
  minHeight: '570px',
};

const heroImage: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: '34px',
  backgroundImage: `
    linear-gradient(90deg, rgba(5,7,6,0.95), rgba(5,7,6,0.36), rgba(5,7,6,0.90)),
    url(https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1500&q=80)
  `,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  filter: 'grayscale(1)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const floatingPanel: React.CSSProperties = {
  position: 'absolute',
  left: '60px',
  top: '220px',
  width: '220px',
  padding: '18px',
  borderRadius: '18px',
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(5,7,6,0.72)',
  backdropFilter: 'blur(10px)',
};

const floatingLabel: React.CSSProperties = {
  margin: '0 0 12px',
  color: 'rgba(255,255,255,0.58)',
  fontSize: '11px',
  letterSpacing: '0.14em',
};

const chartBars: React.CSSProperties = {
  height: '80px',
  display: 'flex',
  alignItems: 'flex-end',
  gap: '8px',
};

const bar: React.CSSProperties = {
  width: '22px',
  display: 'block',
  background: neon,
  borderRadius: '4px 4px 0 0',
  opacity: 0.8,
};

const anatomyPanel: React.CSSProperties = {
  position: 'absolute',
  right: '70px',
  top: '280px',
  width: '260px',
  padding: '18px',
  borderRadius: '999px',
  border: '1px solid rgba(34,214,91,0.28)',
  background: 'rgba(5,7,6,0.62)',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: 'rgba(255,255,255,0.72)',
};

const anatomyCircle: React.CSSProperties = {
  width: '42px',
  height: '42px',
  borderRadius: '999px',
  border: `1px solid ${neon}`,
  display: 'grid',
  placeItems: 'center',
  color: neon,
};

const featuredSection: React.CSSProperties = {
  margin: '0 54px 20px',
  padding: '34px',
  borderRadius: '28px',
  border: '1px solid rgba(255,255,255,0.09)',
  background: 'rgba(255,255,255,0.035)',
};

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '24px',
  alignItems: 'flex-end',
  marginBottom: '26px',
};

const sectionLabel: React.CSSProperties = {
  margin: '0 0 10px',
  color: neon,
  fontSize: '12px',
  fontWeight: 900,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: '38px',
  lineHeight: 1.06,
  fontWeight: 850,
  letterSpacing: '0.03em',
};

const sectionLink: React.CSSProperties = {
  color: neon,
  textDecoration: 'none',
  fontWeight: 850,
};

const courseGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '22px',
};

const courseCard: React.CSSProperties = {
  borderRadius: '18px',
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(5,7,6,0.72)',
};

const courseImage: React.CSSProperties = {
  height: '170px',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  filter: 'grayscale(1)',
  position: 'relative',
};

const courseBadge: React.CSSProperties = {
  position: 'absolute',
  top: '14px',
  left: '14px',
  border: `1px solid rgba(34,214,91,0.42)`,
  background: 'rgba(34,214,91,0.10)',
  color: neon,
  borderRadius: '8px',
  padding: '7px 10px',
  fontSize: '10px',
  fontWeight: 900,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const courseBody: React.CSSProperties = {
  padding: '22px',
};

const courseTitle: React.CSSProperties = {
  margin: 0,
  fontSize: '22px',
  lineHeight: 1.2,
  fontWeight: 850,
};

const courseText: React.CSSProperties = {
  color: 'rgba(255,255,255,0.64)',
  lineHeight: 1.55,
  fontSize: '15px',
};

const courseMeta: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '12px',
  borderTop: '1px solid rgba(255,255,255,0.08)',
  paddingTop: '16px',
  marginTop: '18px',
};

const courseLink: React.CSSProperties = {
  display: 'inline-flex',
  marginTop: '20px',
  color: neon,
  textDecoration: 'none',
  fontWeight: 900,
};

const methodSection: React.CSSProperties = {
  margin: '20px 54px',
  display: 'grid',
  gridTemplateColumns: '0.9fr 1.6fr',
  gap: '22px',
  padding: '34px',
  borderRadius: '28px',
  border: '1px solid rgba(255,255,255,0.09)',
  background: 'rgba(255,255,255,0.03)',
};

const methodIntro: React.CSSProperties = {};

const methodTitle: React.CSSProperties = {
  margin: 0,
  fontSize: '38px',
  lineHeight: 1.08,
  fontWeight: 850,
};

const methodText: React.CSSProperties = {
  color: 'rgba(255,255,255,0.64)',
  lineHeight: 1.65,
  fontSize: '16px',
};

const pillarsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '16px',
};

const pillarCard: React.CSSProperties = {
  padding: '26px 20px',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.09)',
  background: 'rgba(5,7,6,0.55)',
  textAlign: 'center',
};

const pillarIcon: React.CSSProperties = {
  color: neon,
  fontSize: '40px',
};

const platformSection: React.CSSProperties = {
  margin: '20px 54px',
  display: 'grid',
  gridTemplateColumns: '0.9fr 1.7fr',
  gap: '22px',
  padding: '34px',
  borderRadius: '28px',
  border: '1px solid rgba(255,255,255,0.09)',
  background: 'rgba(255,255,255,0.03)',
};

const experienceCard: React.CSSProperties = {};

const featureList: React.CSSProperties = {
  color: 'rgba(255,255,255,0.70)',
  lineHeight: 1.9,
  paddingLeft: '20px',
};

const dashboardPreview: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '0.9fr 1.35fr 0.8fr',
  gap: '16px',
};

const progressCard: React.CSSProperties = {
  borderRadius: '22px',
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(0,0,0,0.28)',
  padding: '22px',
};

const previewTitle: React.CSSProperties = {
  margin: '0 0 16px',
  color: '#fff',
  fontWeight: 850,
};

const progressRing: React.CSSProperties = {
  width: '160px',
  height: '160px',
  margin: '0 auto 18px',
  borderRadius: '999px',
  border: '13px solid rgba(34,214,91,0.22)',
  borderTopColor: neon,
  borderRightColor: neon,
  display: 'grid',
  placeItems: 'center',
};

const previewText: React.CSSProperties = {
  color: 'rgba(255,255,255,0.62)',
  textAlign: 'center',
};

const modulePreview: React.CSSProperties = {
  ...progressCard,
};

const moduleRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '32px 1fr',
  gap: '12px',
  alignItems: 'center',
  padding: '12px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
};

const moduleRowActive: React.CSSProperties = {
  ...moduleRow,
  border: `1px solid rgba(34,214,91,0.55)`,
  borderRadius: '12px',
  background: 'rgba(34,214,91,0.07)',
};

const moduleRowLocked: React.CSSProperties = {
  ...moduleRow,
  opacity: 0.45,
};

const miniLink: React.CSSProperties = {
  display: 'inline-flex',
  marginTop: '16px',
  color: neon,
  textDecoration: 'none',
  fontWeight: 900,
};

const examPreview: React.CSSProperties = {
  ...progressCard,
};

const medalIcon: React.CSSProperties = {
  width: '88px',
  height: '88px',
  borderRadius: '999px',
  border: '1px solid rgba(255,255,255,0.18)',
  display: 'grid',
  placeItems: 'center',
  color: neon,
  fontSize: '34px',
  marginBottom: '20px',
};

const smallGreenButton: React.CSSProperties = {
  display: 'inline-flex',
  background: neon,
  color: '#07100a',
  textDecoration: 'none',
  padding: '13px 18px',
  borderRadius: '12px',
  fontWeight: 900,
};

const communityBand: React.CSSProperties = {
  margin: '20px 54px',
  padding: '28px 34px',
  borderRadius: '20px',
  border: '1px solid rgba(34,214,91,0.20)',
  background: 'rgba(34,214,91,0.05)',
  display: 'grid',
  gridTemplateColumns: '1fr 1.4fr 180px',
  gap: '20px',
  alignItems: 'center',
};

const communityStats: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '18px',
  textAlign: 'center',
};

const footer: React.CSSProperties = {
  margin: '20px 54px 0',
  padding: '46px 20px',
  display: 'grid',
  gridTemplateColumns: '1fr 2fr',
  gap: '30px',
  borderTop: '1px solid rgba(255,255,255,0.08)',
};

const footerBrand: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
};

const brandMarkSmall: React.CSSProperties = {
  width: '42px',
  height: '42px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.18)',
  display: 'grid',
  placeItems: 'center',
  color: neon,
  fontWeight: 950,
};

const footerText: React.CSSProperties = {
  color: 'rgba(255,255,255,0.52)',
  maxWidth: '350px',
  lineHeight: 1.6,
};

const footerColumns: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '28px',
};
