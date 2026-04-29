import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Verificar la sesión del usuario desde Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // 1. PROTECCIÓN DE RUTA /ADMIN (SEGURIDAD POR OSCURIDAD)
  if (pathname.startsWith('/admin')) {
    const role = session?.user?.user_metadata?.role;

    // Si no es ADMIN_ROLE o no hay sesión, devolvemos 404 para ocultar la ruta
    if (!session || role !== 'ADMIN_ROLE') {
      url.pathname = '/404';
      return NextResponse.rewrite(url);
    }
  }

  // 2. PROTECCIÓN DE RUTA /DASHBOARD (SOLO ALUMNOS)
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
};
