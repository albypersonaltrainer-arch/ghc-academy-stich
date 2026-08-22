import { NextRequest, NextResponse } from 'next/server';

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

const PUBLIC_PREVENTA_PAGES = new Set([
  '/preventa',
  '/preventa/checkout',
  '/preventa/confirmacion',
  '/legal',
]);

const PUBLIC_SEO_FILES = new Set([
  '/robots.txt',
  '/sitemap.xml',
]);

const PUBLIC_PREVENTA_ASSETS = new Set([
  '/images/alby-ghc-academy-founder.jpg',
]);

const PUBLIC_PREVENTA_API_PREFIXES = [
  '/api/preventa/orders',
  '/api/preventa/sumup-checkout',
  '/api/preventa/sumup-webhook',
  '/api/preventa/cron',
  '/api/preventa/landing-video',
];

const PUBLIC_POST_ONLY_PREVENTA_APIS = new Set([
  '/api/preventa/orders',
  '/api/preventa/sumup-checkout',
  '/api/preventa/sumup-webhook',
]);

const PREVENTA_CRON_PATH = '/api/preventa/cron';
const PREVENTA_VIDEO_PATH = '/api/preventa/landing-video';

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
    <title>GHC Academy · Edición Fundadora</title>
    <style>
      html,body{margin:0;min-height:100%;background:#050706;color:#f2f4f1;font-family:Arial,Helvetica,sans-serif}
      body{min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}
      main{max-width:720px;text-align:center}
      strong{display:block;font-size:clamp(34px,8vw,72px);letter-spacing:.06em}
      span{display:block;margin-top:14px;color:#22d65b;font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase}
      p{margin:24px auto 0;max-width:560px;color:#a9afaa;line-height:1.7}
      a{display:inline-block;margin-top:24px;padding:13px 20px;border:1px solid #22d65b;border-radius:999px;color:#f2f4f1;text-decoration:none;font-weight:700}
    </style>
  </head>
  <body>
    <main>
      <strong>GHC ACADEMY</strong>
      <span>Edición Fundadora 2026</span>
      <p>El área académica no está abierta al público. La Edición Fundadora del Programa Profesional de Entrenamiento Personal está actualmente en preventa.</p>
      <a href="/preventa">Ver la preventa</a>
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

  if (matchesExploitScan(pathname)) {
    return notFound();
  }

  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/preventa';
    return NextResponse.redirect(url, 308);
  }

  if (PUBLIC_SEO_FILES.has(pathname)) {
    return NextResponse.next();
  }

  if (PUBLIC_PREVENTA_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  if (PUBLIC_PREVENTA_ASSETS.has(pathname)) {
    return NextResponse.next();
  }

  if (pathname === PREVENTA_VIDEO_PATH && request.method !== 'GET') {
    return notFound();
  }

  if (PUBLIC_POST_ONLY_PREVENTA_APIS.has(pathname) && request.method !== 'POST') {
    return notFound();
  }

  if (pathname === PREVENTA_CRON_PATH && request.method !== 'GET' && request.method !== 'POST') {
    return notFound();
  }

  if (matchesAllowedApi(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return notFound();
  }

  return lockedPage();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
