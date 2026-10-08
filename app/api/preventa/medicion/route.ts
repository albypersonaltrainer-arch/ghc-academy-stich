import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const events = new Set(['landing_view', 'lead_cta', 'checkout_click', 'resource_view']);

function limited(v: unknown, n = 100) {
  return typeof v === 'string' ? v.trim().slice(0, n) : '';
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return new NextResponse(null, { status: 403 });
  try {
    if (new URL(origin).host !== request.nextUrl.host) return new NextResponse(null, { status: 403 });
  } catch { return new NextResponse(null, { status: 403 }); }

  const data = await request.json().catch(() => null);
  if (!data || !events.has(data.event)) return new NextResponse(null, { status: 400 });
  const path = limited(data.path, 150);
  if (!(path === '/preventa' || path.startsWith('/recursos'))) return new NextResponse(null, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new NextResponse(null, { status: 503 });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.from('preventa_funnel_events').insert({
    event_name: data.event, page_path: path,
    source_channel: limited(data.source, 80),
    campaign_code: limited(data.campaign, 100),
  });
  if (error) return new NextResponse(null, { status: 503 });
  return new NextResponse(null, { status: 204 });
}
