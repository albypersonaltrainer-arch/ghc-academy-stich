import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'ghc-course-assets';
const OBJECT_PATH = 'preventa/landing/ghc-academy-presentacion-2026.mp4';

function notFound() {
  return new NextResponse(null, { status: 404 });
}

function getStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) return null;

  return {
    supabaseUrl,
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }),
  };
}

export async function GET() {
  const storage = getStorageClient();
  if (!storage) {
    return NextResponse.json({ ok: false, error: 'storage_not_configured' }, { status: 503 });
  }

  const { data, error } = await storage.client.storage
    .from(BUCKET)
    .createSignedUrl(OBJECT_PATH, 60 * 60 * 6);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ ok: false, error: 'video_not_available' }, { status: 404 });
  }

  return NextResponse.json(
    { ok: true, url: data.signedUrl },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' } }
  );
}

export async function POST() {
  if (process.env.VERCEL_ENV === 'production') return notFound();

  const storage = getStorageClient();
  if (!storage) {
    return NextResponse.json({ ok: false, error: 'storage_not_configured' }, { status: 503 });
  }

  const projectRef = new URL(storage.supabaseUrl).hostname.split('.')[0] || '';
  if (!projectRef) {
    return NextResponse.json({ ok: false, error: 'invalid_storage_url' }, { status: 500 });
  }

  const { data, error } = await storage.client.storage
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
