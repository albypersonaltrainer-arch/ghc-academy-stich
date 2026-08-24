'use client';

import { useEffect } from 'react';

const ALLOWED_SOURCES = new Set(['ghctraining', 'ghcnutrition']);

function getEcosystemParams() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get('utm_source') || '';
  const medium = params.get('utm_medium') || '';
  const campaign = params.get('utm_campaign') || '';

  if (!ALLOWED_SOURCES.has(source)) return null;
  if (medium !== 'ecosystem' || campaign !== 'ghc_ecosystem') return null;

  return { source, medium, campaign };
}

export default function EcosystemAttributionBridge() {
  useEffect(() => {
    const attribution = getEcosystemParams();
    if (!attribution) return;

    const carryAttribution = () => {
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/preventa/checkout"]').forEach((anchor) => {
        const rawHref = anchor.getAttribute('href');
        if (!rawHref) return;

        const target = new URL(rawHref, window.location.origin);
        if (target.origin !== window.location.origin || target.pathname !== '/preventa/checkout') return;

        target.searchParams.set('utm_source', attribution.source);
        target.searchParams.set('utm_medium', attribution.medium);
        target.searchParams.set('utm_campaign', attribution.campaign);

        anchor.setAttribute('href', `${target.pathname}${target.search}${target.hash}`);
      });
    };

    carryAttribution();

    const observer = new MutationObserver(carryAttribution);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
