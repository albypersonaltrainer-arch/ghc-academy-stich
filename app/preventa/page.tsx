import type { Metadata } from 'next';
import React, { type ReactElement, type ReactNode } from 'react';
import OriginalPreventaPage from './PreventaPageOriginal';
import PreventaLandingVideo from './PreventaLandingVideo';

export const metadata: Metadata = {
  title: 'Preventa Edición Fundadora | Programa Profesional de Entrenamiento Personal | GHC Academy',
  description:
    'Preventa de la Edición Fundadora del Programa Profesional de Entrenamiento Personal de GHC Academy. Reserva tu plaza fundadora.',
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
    title: 'Preventa Edición Fundadora | GHC Academy',
    description:
      'Programa Profesional de Entrenamiento Personal. Preventa de la Edición Fundadora de GHC Academy.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Preventa Edición Fundadora | GHC Academy',
    description:
      'Reserva tu plaza fundadora en el Programa Profesional de Entrenamiento Personal de GHC Academy.',
  },
};

const OLD_TENSION =
  'Querer ser entrenador personal y no sentirte todavía preparado. O llevar años siéndolo y saber que aún tienes piezas por completar.';
const NEW_TENSION =
  'Quieres ser entrenador personal, pero todavía no te sientes preparado. O llevas años siéndolo y sabes que aún tienes piezas por completar.';

function transformText(value: string): string {
  return value
    .replace(OLD_TENSION, NEW_TENSION)
    .replaceAll('15 de septiembre de 2026', '1 de octubre de 2026')
    .replace('Apertura 15 octubre 2026', 'Apertura 16 octubre 2026')
    .replace('¿Cuándo abre la plataforma?', '¿Cuándo comienza la formación?')
    .replace(
      'La apertura académica está fijada para el 15 de octubre de 2026.',
      'La apertura académica está fijada para el 16 de octubre de 2026.',
    )
    .replace(
      'Las evaluaciones y controles académicos forman parte del diseño de la plataforma Academy.',
      'Las evaluaciones y controles académicos forman parte del recorrido formativo de GHC Academy.',
    )
    .replace(
      'La plataforma académica abre el 15 de octubre de 2026.',
      'La formación comienza el 16 de octubre de 2026.',
    )
    .replace(
      'Porque entras antes de la apertura oficial y formas parte de la primera generación.',
      'Porque entras antes del inicio de la formación y formas parte de la primera generación.',
    )
    .replace(
      'El pack completo tendrá un precio oficial de 2.290 €.',
      'El precio futuro del pack completo será de 2.290 €.',
    )
    .replace('Pack completo oficial', 'Precio futuro del pack completo')
    .replace('600 € menos que el pack oficial', '600 € menos que el precio futuro del pack');
}

function textContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (React.isValidElement(node)) {
    return textContent((node.props as { children?: ReactNode }).children);
  }
  return '';
}

function transformNode(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return node.map(transformNode);

  if (typeof node === 'string') {
    return transformText(node);
  }

  if (!React.isValidElement(node)) return node;

  const element = node as ReactElement<any>;
  const props = element.props || {};
  const originalChildren = props.children as ReactNode;

  let nextChildren = transformNode(originalChildren);
  const nextProps: Record<string, unknown> = {};
  let changed = nextChildren !== originalChildren;

  const content = textContent(originalChildren).trim();

  if (element.type === 'a' && props.href === '#contenido') {
    if (content === 'Ver el programa') {
      nextProps.href = '#mapa-conocimientos';
      changed = true;
    }

    if (content === 'Ver todo lo que incluye') {
      nextProps.href = '#mapa-conocimientos';
      nextChildren = 'Ver todo lo que vas a aprender';
      changed = true;
    }
  }

  if (element.type === 'section' && textContent(originalChildren).includes('El mapa de conocimientos')) {
    nextProps.id = 'mapa-conocimientos';
    changed = true;
  }

  const transformedElement = changed
    ? React.cloneElement(element, {
        ...nextProps,
        children: nextChildren,
      })
    : element;

  if (
    element.type === 'section' &&
    typeof props.className === 'string' &&
    props.className.includes('conversion-tension-section')
  ) {
    return (
      <>
        {transformedElement}
        <section
          aria-label="Vídeo de presentación de GHC Academy"
          style={{
            padding: '0 24px 96px',
          }}
        >
          <div
            style={{
              width: 'min(100%, 1040px)',
              margin: '0 auto 34px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
                color: 'var(--ghc-green)',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 30,
                  height: 1,
                  background: 'currentColor',
                  opacity: 0.8,
                }}
              />
              Antes de seguir
              <span
                aria-hidden="true"
                style={{
                  width: 30,
                  height: 1,
                  background: 'currentColor',
                  opacity: 0.8,
                }}
              />
            </div>
            <h2
              style={{
                maxWidth: 930,
                margin: '0 auto',
                color: 'var(--ghc-text)',
                fontSize: 'clamp(34px, 4.4vw, 58px)',
                lineHeight: 1.02,
                letterSpacing: '-0.04em',
                textWrap: 'balance',
              }}
            >
              Si estás pensando en dedicarte profesionalmente al entrenamiento, mira esto primero.
            </h2>
            <p
              style={{
                maxWidth: 760,
                margin: '20px auto 0',
                color: 'var(--ghc-muted)',
                fontSize: 'clamp(16px, 1.65vw, 19px)',
                lineHeight: 1.7,
                textWrap: 'balance',
              }}
            >
              En poco más de 2 minutos te explico por qué nace GHC Academy, qué problema queremos resolver y qué buscamos que cambie en tu forma de trabajar como entrenador.
            </p>
          </div>

          <div
            style={{
              width: 'min(100%, 1180px)',
              margin: '0 auto',
              padding: 8,
              borderRadius: 26,
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 28px 80px rgba(0,0,0,0.28)',
            }}
          >
            <PreventaLandingVideo />
          </div>
        </section>
      </>
    );
  }

  return transformedElement;
}

export default function PreventaPage() {
  return transformNode(OriginalPreventaPage());
}
