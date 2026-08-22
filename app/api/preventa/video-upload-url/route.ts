import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'ghc-course-assets';
const OBJECT_PATH = 'preventa/landing/ghc-academy-presentacion-2026.mp4';

function notFound() {
  return new NextResponse(null, { status: 404 });
}

export async function POST() {
  // Esta utilidad solo existe para la carga puntual desde un Preview protegido.
  if (process.env.VERCEL_ENV === 'production') return notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: 'storage_not_configured' }, { status: 503 });
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0] || '';
  if (!projectRef) {
    return NextResponse.json({ ok: false, error: 'invalid_storage_url' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(OBJECT_PATH, { upsert: true });

  if (error || !data?.token) {
    return NextResponse.json({ ok: false, error: 'signed_upload_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    projectRef,
    bucket: BUCKET,
    objectPath: OBJECT_PATH,
    token: data.token,
  });
}
