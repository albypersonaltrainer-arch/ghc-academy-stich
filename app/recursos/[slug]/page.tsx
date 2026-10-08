import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { academyGroupLabels, academyTopics } from '../../../lib/seo/academy-topics';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return academyTopics.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = academyTopics.find(t => t.slug === slug);
  if (!topic) return {};
  const canonical = `https://ghcacademy.net/recursos/${topic.slug}`;
  return {
    title: `${topic.title} | GHC Academy`,
    description: topic.description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { title: topic.title, description: topic.description, url: canonical, type: 'article' },
  };
}

export default async function ResourceArticle({ params }: PageProps) {
  const { slug } = await params;
  const topic = academyTopics.find(t => t.slug === slug);
  if (!topic) notFound();
  const related = academyTopics.filter(t => t.category === topic.category && t.slug !== topic.slug).slice(0, 3);
  const path = `https://ghcacademy.net/recursos/${topic.slug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: topic.title,
    description: topic.description,
    mainEntityOfPage: path,
    publisher: { '@type': 'Organization', name: 'GHC Academy', url: 'https://ghcacademy.net' },
  };
  const breadcrumbData = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'GHC Academy', item: 'https://ghcacademy.net/preventa' },
      { '@type': 'ListItem', position: 2, name: 'Guías', item: 'https://ghcacademy.net/recursos' },
      { '@type': 'ListItem', position: 3, name: topic.title, item: path },
    ],
  };
  return (
    <main style={{ background: '#050905', minHeight: '100vh', color: '#f5faf5', padding: '42px 22px 100px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([structuredData, breadcrumbData]) }} />
      <div style={{ maxWidth: 840, margin: 'auto' }}>
        <nav aria-label="Ruta" style={{ fontSize: 14, color: '#b0c3b3', marginBottom: 38 }}>
          <Link style={{ color: '#70e68d' }} href="/preventa">GHC Academy</Link>
          {' / '}
          <Link style={{ color: '#70e68d' }} href="/recursos">Guías</Link>
          {' / '}
          <span>{academyGroupLabels[topic.category]}</span>
        </nav>
        <article>
          <header style={{ marginBottom: 42 }}>
            <p style={{ color: '#6de990', fontSize: 13, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '.15em' }}>
              {academyGroupLabels[topic.category]} · Guía gratuita
            </p>
            <h1 style={{ fontSize: 'clamp(36px,4.8vw,61px)', lineHeight: 1.12, letterSpacing: '-.035em', margin: '18px 0' }}>
              {topic.title}
            </h1>
            <p style={{ fontSize: 'clamp(18px,2vw,21px)', color: '#c8d7ca', lineHeight: 1.7 }}>{topic.introduction}</p>
          </header>
          <section style={{ fontSize: 17, lineHeight: 1.86, color: '#d4dfd5' }}>
            <h2 style={{ color: '#fff', fontSize: 27, marginTop: 42 }}>Qué conviene tener en cuenta</h2>
            <p>{topic.guidance}</p>
            <h2 style={{ color: '#fff', fontSize: 27, marginTop: 42 }}>Cómo llevarlo a un caso real</h2>
            <p>{topic.example}</p>
            <h2 style={{ color: '#fff', fontSize: 27, marginTop: 42 }}>Un error habitual que debes evitar</h2>
            <p>{topic.caution}</p>
            <h2 style={{ color: '#fff', fontSize: 27, marginTop: 42 }}>Cómo seguir aprendiendo</h2>
            <p>
              Para tomar decisiones profesionales hay que relacionar los conceptos de esta guía con evaluación inicial,
              principios de entrenamiento, seguimiento y comunicación. El Programa de Formación en Entrenamiento Personal
              de GHC Academy reúne tres niveles y treinta módulos; desarrolla una formación privada que no
              equivale a una titulación oficial ni confiere una habilitación profesional automática.
            </p>
          </section>
          <aside style={{ border: '1px solid #30683b', padding: 'clamp(20px,4vw,36px)', marginTop: 45,
            borderRadius: 20, background: '#0e2113' }}>
            <h2 style={{ fontSize: 26, marginTop: 0 }}>¿Quieres pasar de leer teoría a razonar casos?</h2>
            <p style={{ lineHeight: 1.7, color: '#c9decd' }}>
              Descubre el programa completo: bases, aplicación avanzada e integración profesional. Consulta el temario,
              el acompañamiento y las condiciones antes de decidir.
            </p>
            <Link href="/preventa" style={{ display: 'inline-flex', background: '#32d65c',
              color: '#071107', padding: '15px 20px', fontWeight: 800, borderRadius: 12, textDecoration: 'none' }}>
              Conocer GHC Academy →
            </Link>
          </aside>
        </article>
        <section style={{ marginTop: 60 }}>
          <h2 style={{ fontSize: 27 }}>También puede interesarte</h2>
          <ul style={{ lineHeight: 2.3 }}>
            {related.map(r => <li key={r.slug}>
              <Link href={`/recursos/${r.slug}`} style={{ color: '#70e68d' }}>{r.title}</Link>
            </li>)}
          </ul>
          <Link href="/recursos" style={{ color: '#70e68d', fontWeight: 700 }}>Ver las 30 guías →</Link>
        </section>
      </div>
    </main>
  );
}
