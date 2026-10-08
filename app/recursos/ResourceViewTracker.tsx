'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Anonymous view events only: no cookies, IP, session IDs, or lead identifiers. */
export default function ResourceViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !(pathname === '/recursos' || pathname.startsWith('/recursos/'))) return;
    const params = new URLSearchParams(window.location.search);
    void fetch('/api/preventa/medicion', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event: 'resource_view',
        path: pathname,
        source: params.get('utm_source') || '',
        campaign: params.get('utm_campaign') || '',
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
