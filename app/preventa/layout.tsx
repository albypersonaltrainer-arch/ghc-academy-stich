import type { Metadata } from 'next';
import './refinements.css';
import './hero-refinement-v3.css';
import './conversion-premium.css';
import './floating-card-hotfix.css';
import './final-polish.css';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://ghcacademy.net/preventa',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://ghcacademy.net/preventa',
    siteName: 'GHC Academy',
    title: 'Programa Profesional de Entrenamiento Personal · GHC Academy',
    description:
      'Preventa de la Edición Fundadora del Programa Profesional de Entrenamiento Personal de GHC Academy.',
  },
};

export default function PreventaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
