import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    if (new URL(origin).host !== request.nextUrl.host) return NextResponse.json({ ok: false }, { status: 403 });
  } catch { return NextResponse.json({ ok: false }, { status: 403 }); }
  const input = await request.json().catch(() => ({}));
  const token = typeof input.token === 'string' ? input.token.trim() : '';
  if (!/^[a-f0-9-]{36}$/i.test(token)) {
    return NextResponse.json({ ok: false, error: 'El enlace no es válido.' }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: 'No disponible temporalmente.' }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from('preventa_interest_leads').update({
    marketing_consent: false,
    marketing_consented_at: null,
    updated_at: new Date().toISOString(),
  }).eq('unsubscribe_token', token).select('id').maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: 'No ha sido posible completar la baja.' }, { status: 503 });
  if (data?.id) {
    await db.from('preventa_interest_email_queue').update({ status: 'cancelled' })
      .eq('lead_id', data.id).eq('status', 'pending');
  }
  return NextResponse.json({ ok: true, message: 'Tu baja de las comunicaciones comerciales se ha registrado.' });
}
