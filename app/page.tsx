import Link from 'next/link';
import GHCLogo from './components/GHCLogo';

const featuredCourses = [
  {
    title: 'Biomecánica Fundamental',
    description:
      'Comprende los principios del movimiento humano y su aplicación real en el entrenamiento.',
    level: 'Principiante',
    duration: '4–5 h',
    certificate: 'Incluido',
    badge: 'Más popular',
    image:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Análisis del Rendimiento',
    description:
      'Aprende a recolectar, interpretar y aplicar datos para tomar mejores decisiones.',
    level: 'Intermedio',
    duration: '5–6 h',
    certificate: 'Incluido',
    badge: 'Data-driven',
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Principios del Entrenamiento de Fuerza',
    description:
      'Diseña programas efectivos basados en evidencia para cualquier objetivo.',
    level: 'Principiante',
    duration: '6–8 h',
    certificate: 'Incluido',
    badge: 'Fuerza',
    image:
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80',
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
    <main className="ghc-home-v2">
      <section className="ghc-home-shell">
        <header className="ghc-home-header">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <GHCLogo size="md" showText tagline={false} />
          </Link>

          <nav className="ghc-home-nav">
            <Link href="/" className="active">
              Inicio
            </Link>
            <Link href="/cursos">Cursos</Link>
            <Link href="#metodologia">Metodología</Link>
            <Link href="/alumno">Alumnos</Link>
            <Link href="/acceso">Acceso</Link>
          </nav>

          <Link href="/acceso" className="ghc-home-cta">
            Únete ahora →
          </Link>
        </header>

        <section className="ghc-home-hero">
          <div>
            <div style={{ marginBottom: 28 }}>
              <GHCLogo size="lg" showText tagline />
            </div>

            <p className="ghc-home-kicker">Ciencia · Progresión · Rendimiento</p>

            <h1>Formación de alto rendimiento desde la ciencia</h1>

            <p>
              Cursos online basados en evidencia para entrenadores, atletas y profesionales que
              buscan resultados reales, sostenibles y medibles.
            </p>

            <div className="ghc-home-actions">
              <Link href="/cursos" className="ghc-home-btn-primary">
                Explorar cursos →
              </Link>

              <Link href="#metodologia" className="ghc-home-btn-ghost">
                Conocer metodología →
              </Link>
            </div>

            <div className="ghc-home-feature-row">
              <div className="ghc-home-feature">
                <i>◷</i>
                <div>
                  <strong>Aprende a tu ritmo</strong>
                  <span>Acceso 24/7</span>
                </div>
              </div>

              <div className="ghc-home-feature">
                <i>◇</i>
                <div>
                  <strong>Certificación oficial</strong>
                  <span>Credencial GHC</span>
                </div>
              </div>

              <div className="ghc-home-feature">
                <i>↗</i>
                <div>
                  <strong>Basado en evidencia</strong>
                  <span>Ciencia aplicada</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ghc-home-hero-visual">
            <div className="ghc-home-hero-photo" />

            <div className="ghc-home-floating">
              <p>Detección de progreso</p>
              <div className="ghc-home-bars">
                <span style={{ height: '42%' }} />
                <span style={{ height: '74%' }} />
                <span style={{ height: '56%' }} />
                <span style={{ height: '88%' }} />
                <span style={{ height: '68%' }} />
              </div>
            </div>

            <div className="ghc-home-pill">
              <i>＋</i>
              <span>Biomecánica · Control motor · Rendimiento</span>
            </div>
          </div>
        </section>

        <section className="ghc-home-section">
          <div className="ghc-home-section-header">
            <div>
              <p className="ghc-home-section-label">Programas destacados</p>
              <h2 className="ghc-home-section-title">
                Aprende con nuestros cursos estrella
              </h2>
            </div>

            <Link href="/cursos" className="ghc-home-section-link">
              Ver todos los cursos →
            </Link>
          </div>

          <div className="ghc-home-course-grid">
            {featuredCourses.map((course) => (
              <article key={course.title} className="ghc-home-course-card">
                <div
                  className="ghc-home-course-image"
                  style={{
                    backgroundImage: `
                      linear-gradient(180deg, rgba(5,7,6,0.05), rgba(5,7,6,0.90)),
                      url(${course.image})
                    `,
                  }}
                >
                  <span className="ghc-home-course-badge">{course.badge}</span>
                </div>

                <div className="ghc-home-course-body">
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>

                  <div className="ghc-home-course-meta">
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

                  <Link href="/cursos" className="ghc-home-card-link">
                    Ver curso →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="metodologia" className="ghc-home-section ghc-home-method">
          <div>
            <p className="ghc-home-section-label">Nuestra metodología</p>
            <h2 className="ghc-home-section-title">Ciencia aplicada. Resultados reales.</h2>
            <p>
              Combinamos investigación, experiencia y tecnología para que aprendas lo que realmente
              funciona y puedas aplicarlo con criterio profesional.
            </p>

            <Link href="/cursos" className="ghc-home-btn-ghost">
              Conocer metodología →
            </Link>
          </div>

          <div className="ghc-home-pillars">
            {pillars.map((pillar) => (
              <article key={pillar.title} className="ghc-home-pillar">
                <i>{pillar.icon}</i>
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ghc-home-section ghc-home-platform">
          <div>
            <p className="ghc-home-section-label">Tu experiencia en GHC Academy</p>
            <h2 className="ghc-home-section-title">Todo lo que necesitas para crecer</h2>
            <p>
              Una plataforma diseñada para que aprendas, apliques y midas tu progreso con una ruta
              clara y profesional.
            </p>

            <ul className="ghc-home-feature-list">
              <li>Ruta de aprendizaje personalizada</li>
              <li>Contenido actualizado continuamente</li>
              <li>Comunidad de profesionales</li>
              <li>Soporte y recursos exclusivos</li>
            </ul>

            <Link href="/alumno" className="ghc-home-btn-ghost">
              Ver plataforma →
            </Link>
          </div>

          <div className="ghc-home-dashboard-preview">
            <article className="ghc-home-preview-card">
              <h3>Progreso general</h3>
              <div className="ghc-home-ring">
                <div>
                  <strong>67%</strong>
                  <span>Completado</span>
                </div>
              </div>
              <p>Excelente trabajo. Sigue así para alcanzar tus objetivos.</p>
            </article>

            <article className="ghc-home-preview-card">
              <h3>Módulos del programa</h3>

              <div className="ghc-home-module-row">
                <span>✓</span>
                <div>
                  <strong>Biomecánica Fundamental</strong>
                  <small>100%</small>
                </div>
              </div>

              <div className="ghc-home-module-row">
                <span>✓</span>
                <div>
                  <strong>Sistemas Energéticos</strong>
                  <small>92%</small>
                </div>
              </div>

              <div className="ghc-home-module-row active">
                <span>●</span>
                <div>
                  <strong>Adaptaciones Neuromusculares</strong>
                  <small>En curso · 75%</small>
                </div>
              </div>

              <div className="ghc-home-module-row locked">
                <span>🔒</span>
                <div>
                  <strong>Mecánica de la Hipertrofia</strong>
                  <small>Bloqueado</small>
                </div>
              </div>

              <Link href="/alumno" className="ghc-home-card-link">
                Ver mi progreso →
              </Link>
            </article>

            <article className="ghc-home-preview-card">
              <div className="ghc-home-medal">★</div>
              <h3>Próximo examen</h3>
              <p>Prepárate para obtener tu certificado oficial.</p>
              <Link href="/cursos" className="ghc-home-small-button">
                Ir al simulador →
              </Link>
            </article>
          </div>
        </section>

        <section className="ghc-home-community">
          <div>
            <h2>Únete a una comunidad de profesionales que entrenan su conocimiento.</h2>
          </div>

          <div className="ghc-home-community-stats">
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

          <Link href="/acceso" className="ghc-home-btn-primary">
            Únete ahora →
          </Link>
        </section>

        <footer className="ghc-home-footer">
          <div>
            <div style={{ marginBottom: 18 }}>
              <GHCLogo size="sm" showText tagline={false} />
            </div>

            <p>
              Empoderamos entrenadores y atletas a través de la ciencia, la educación y el
              rendimiento.
            </p>
          </div>

          <div className="ghc-home-footer-columns">
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
