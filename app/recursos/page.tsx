import Link from 'next/link';
import type { Metadata } from 'next';
import { academyGroupLabels, academyTopics } from '../../lib/seo/academy-topics';

export const metadata: Metadata = {
  title: 'Guías para entrenadores personales | GHC Academy',
  description: '30 guías para estudiar entrenamiento personal, elegir formación y desarrollar criterio profesional: valoración, biomecánica, programación y más.',
  alternates: { canonical: 'https://ghcacademy.net/recursos' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Guías de entrenamiento personal | GHC Academy',
    description: 'Aprende a evaluar, programar y desarrollar criterio profesional con nuestras guías educativas.',
    url: 'https://ghcacademy.net/recursos', type: 'website',
  },
};

const groups = Object.entries(academyGroupLabels) as Array<[keyof typeof academyGroupLabels, string]>;

export default function RecursosPage() {
  return (
    <main style={{ background: '#050905', color: '#f6faf6', minHeight: '100vh', padding: '44px 22px 100px' }}>
      <div style={{ maxWidth: 1160, margin: 'auto' }}>
        <nav aria-label="Ruta" style={{ marginBottom: 40, fontSize: 14, color: '#b4c4b7' }}>
          <Link href="/preventa" style={{ color: '#75e891' }}>GHC Academy</Link> / Guías
        </nav>
        <header style={{ maxWidth: 870, marginBottom: 58 }}>
          <p style={{ color: '#6dea8f', letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 800, fontSize: 12 }}>
            Biblioteca educativa · GHC Academy
          </p>
          <h1 style={{ fontSize: 'clamp(38px,5vw,64px)', lineHeight: 1.08, margin: '18px 0' }}>Guías para formarte como entrenador personal</h1>
          <p style={{ color: '#c1cec3', fontSize: 19, lineHeight: 1.75 }}>
            Reunimos 30 recursos prácticos para entender el aprendizaje del entrenamiento personal,
            profundizar en sus fundamentos y conocer los límites profesionales.
            No sustituyen la formación académica ni la legislación de tu territorio.
          </p>
          <Link href="/preventa" style={{ display: 'inline-flex', background: '#32d65c', color: '#071107', padding: '14px 18px', borderRadius: 12, fontWeight: 800, textDecoration: 'none' }}>
            Ver formación completa · 3 niveles y 30 módulos →
          </Link>
        </header>
        {groups.map(([key, label]) => (
          <section key={key} style={{ margin: '48px 0 64px' }}>
            <h2 style={{ fontSize: 'clamp(26px,3vw,36px)', borderBottom: '1px solid #24422a', paddingBottom: 14 }}>{label}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,300px),1fr))', gap: 18 }}>
              {academyTopics.filter(t => t.category === key).map(topic => (
                <article key={topic.slug} style={{ padding: 24, border: '1px solid #28452d', borderRadius: 18, background: '#0b130e' }}>
                  <h3 style={{ lineHeight: 1.3, margin: 0, fontSize: 20 }}>
                    <Link href={`/recursos/${topic.slug}`} style={{ color: '#f4f8f4', textDecoration: 'none' }}>
                      {topic.title}
                    </Link>
                  </h3>
                  <p style={{ color: '#afc1b2', lineHeight: 1.6 }}>{topic.description}</p>
                  <Link href={`/recursos/${topic.slug}`} style={{ color: '#6de48c', fontWeight: 700 }}>Leer guía →</Link>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
