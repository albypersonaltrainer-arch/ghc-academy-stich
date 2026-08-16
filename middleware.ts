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
  '/legal',
]);

const PUBLIC_PREVENTA_ASSETS = new Set([
  '/images/alby-ghc-academy-founder.jpg',
]);

const PUBLIC_PREVENTA_API_PREFIXES = [
  '/api/preventa/orders',
  '/api/preventa/sumup-checkout',
  '/api/preventa/sumup-webhook',
  '/api/preventa/cron',
];

const PUBLIC_POST_ONLY_PREVENTA_APIS = new Set([
  '/api/preventa/orders',
  '/api/preventa/sumup-checkout',
  '/api/preventa/sumup-webhook',
]);

const EXPLOIT_SCAN_PREFIXES = [
  '/wp-admin',
  '/wp-login.php',
  '/xmlrpc.php',
  '/phpmyadmin',
  '/vendor/phpunit',
  '/cgi-bin/',
  '/.git',
  '/.aws',
  '/.ssh',
];

function notFound() {
  return new NextResponse(null, {
    status: 404,
    headers: SECURITY_HEADERS,
  });
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

function matchesExploitScan(pathname: string) {
  const normalized = pathname.toLowerCase();

  if (normalized === '/.env' || normalized.startsWith('/.env.')) {
    return true;
  }

  return EXPLOIT_SCAN_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)
  );
}

export function middleware(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'production') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Common automated probes for software that GHC Academy does not run.
  // Return a plain 404 so they never reach the Academy lock page or application logic.
  if (matchesExploitScan(pathname)) {
    return notFound();
  }

  // Public launch surface: the apex domain renders the presale landing.
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/preventa';
    return NextResponse.rewrite(url);
  }

  // Buyer-facing presale and contractual pages only. QA/test pages stay closed.
  if (PUBLIC_PREVENTA_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  // Only the public assets explicitly used by the presale may bypass the Academy lock.
  if (PUBLIC_PREVENTA_ASSETS.has(pathname)) {
    return NextResponse.next();
  }

  // Production only needs POST on buyer/payment operational endpoints. Their GET
  // handlers remain available in Preview for QA but must not disclose readiness
  // or provider configuration to unauthenticated Production visitors.
  if (PUBLIC_POST_ONLY_PREVENTA_APIS.has(pathname) && request.method !== 'POST') {
    return notFound();
  }

  // Operational presale APIs only. Self-tests, previews and admin APIs stay closed.
  if (matchesAllowedApi(pathname)) {
    return NextResponse.next();
  }

  // Every other API remains unavailable in Production.
  if (pathname.startsWith('/api/')) {
    return notFound();
  }

  // Every Academy page, QA route, static public artifact and direct route stays locked.
  return lockedPage();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};