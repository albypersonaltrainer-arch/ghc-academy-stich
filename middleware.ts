import { NextRequest, NextResponse } from 'next/server';

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

const PUBLIC_PREVENTA_PAGES = new Set([
  '/preventa',
  '/preventa/checkout',
  '/preventa/confirmacion',
  '/preventa/matricula',
  '/preventa/pago',
]);

const PUBLIC_PREVENTA_API_PREFIXES = [
  '/api/preventa/orders',
  '/api/preventa/sumup-checkout',
  '/api/preventa/sumup-webhook',
  '/api/preventa/cron',
];

function legalIdentityComplete() {
  const values = [
    process.env.NEXT_PUBLIC_GHC_LEGAL_NAME,
    process.env.NEXT_PUBLIC_GHC_LEGAL_TAX_ID,
    process.env.NEXT_PUBLIC_GHC_LEGAL_ADDRESS,
    process.env.NEXT_PUBLIC_GHC_LEGAL_EMAIL,
  ].map((value) => (value || '').trim());

  return values.every(
    (value) => Boolean(value) && value !== 'PENDIENTE' && !value.startsWith('PENDIENTE DE')
  );
}

function lockedPage() {
  return new NextResponse(
    `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow,noarchive" />
    <title>GHC Academy</title>
    <style>
      html,body{margin:0;min-height:100%;background:#050706;color:#f2f4f1;font-family:Arial,Helvetica,sans-serif}
      body{min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}
      main{max-width:720px;text-align:center}
      strong{display:block;font-size:clamp(34px,8vw,76px);letter-spacing:.08em}
      span{display:block;margin-top:14px;color:#22d65b;font-size:12px;font-weight:800;letter-spacing:.22em;text-transform:uppercase}
      p{margin:24px auto 0;max-width:520px;color:#a9afaa;line-height:1.7}
    </style>
  </head>
  <body>
    <main>
      <strong>GHC ACADEMY</strong>
      <span>Sport Through Science</span>
      <p>Estamos preparando la apertura. La plataforma académica todavía no está disponible públicamente.</p>
    </main>
  </body>
</html>`,
    {
      status: 503,
      headers: {
        ...SECURITY_HEADERS,
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  );
}

function matchesAllowedApi(pathname: string) {
  return PUBLIC_PREVENTA_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function middleware(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'production') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Public launch surface: the apex domain renders the presale landing.
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/preventa';
    return NextResponse.rewrite(url);
  }

  // Buyer-facing presale pages only. QA/test pages under /preventa stay closed.
  if (PUBLIC_PREVENTA_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  // Contractual information becomes public only when the legal identity is complete.
  if (pathname === '/legal' && legalIdentityComplete()) {
    return NextResponse.next();
  }

  // Operational presale APIs only. Self-tests, previews and admin APIs stay closed.
  if (matchesAllowedApi(pathname)) {
    return NextResponse.next();
  }

  // Every other API remains unavailable in Production.
  if (pathname.startsWith('/api/')) {
    return new NextResponse(null, {
      status: 404,
      headers: SECURITY_HEADERS,
    });
  }

  // Every Academy page, QA route, static public artifact and direct route stays locked.
  return lockedPage();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
