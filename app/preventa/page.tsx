import React, { type ReactElement, type ReactNode } from 'react';
import OriginalPreventaPage, { metadata } from './PreventaPageOriginal';
import PreventaLandingVideo from './PreventaLandingVideo';

export { metadata };

const OLD_TENSION =
  'Querer ser entrenador personal y no sentirte todavía preparado. O llevar años siéndolo y saber que aún tienes piezas por completar.';
const NEW_TENSION =
  'Quieres ser entrenador personal, pero todavía no te sientes preparado. O llevas años siéndolo y sabes que aún tienes piezas por completar.';

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
    return node === OLD_TENSION ? NEW_TENSION : node;
  }

  if (!React.isValidElement(node)) return node;

  const element = node as ReactElement<any>;
  const props = element.props || {};
  const originalChildren = props.children as ReactNode;

  if (
    element.type === 'figure' &&
    typeof props.className === 'string' &&
    props.className.includes('conversion-hero-image')
  ) {
    return React.cloneElement(element, {
      children: <PreventaLandingVideo />,
    });
  }

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

  if (!changed) return element;

  return React.cloneElement(element, {
    ...nextProps,
    children: nextChildren,
  });
}

export default function PreventaPage() {
  return transformNode(OriginalPreventaPage());
}
