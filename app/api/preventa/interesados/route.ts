import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const validAudiences = new Set(['aspirante', 'profesional']);

function text(value: unknown, max = 120): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function emailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function originAllowed(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) return NextResponse.json({ ok: false, error: 'Solicitud no permitida.' }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ ok: false, error: 'Formulario no válido.' }, { status: 400 });

  // Honeypot: a fake completion receives a generic success but is never persisted.
  if (text(body.companyWebsite)) return NextResponse.json({ ok: true });
  const firstName = text(body.firstName, 80).replace(/\s+/g, ' ');
  const email = text(body.email, 254).toLowerCase();
  const audience = text(body.audience);
  const privacy = body.privacyAcknowledged === true;
  const marketing = body.marketingConsent === true;
  if (firstName.length < 2 || !emailValid(email) || !validAudiences.has(audience) || !privacy) {
    return NextResponse.json({ ok: false, error: 'Revisa los datos y la información de privacidad.' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'Este formulario no está disponible en este momento.' }, { status: 503 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date().toISOString();
  const sourceChannel = text(body.utmSource, 80) || 'direct';
  const sourceMedium = text(body.utmMedium, 80);
  const campaignCode = text(body.utmCampaign, 100);
  const { data: lead, error } = await supabase.from('preventa_interest_leads').upsert({
    first_name: firstName,
    email_normalized: email,
    audience,
    privacy_acknowledged_at: now,
    marketing_consent: marketing,
    marketing_consented_at: marketing ? now : null,
    source_channel: sourceChannel,
    source_medium: sourceMedium,
    campaign_code: campaignCode,
    source_page: '/preventa',
    updated_at: now,
  }, { onConflict: 'email_normalized', ignoreDuplicates: false }).select('id').single();
  if (error) {
    console.error('preventa_interest_lead_write_failed', error.code);
    return NextResponse.json({ ok: false, error: 'No hemos podido guardar tu solicitud. Inténtalo de nuevo.' }, { status: 500 });
  }
  if (marketing && lead?.id) {
    const delayHours = [24, 96, 240];
    const { error: enqueueError } = await supabase.from('preventa_interest_email_queue').upsert(
      delayHours.map((hours, index) => ({
        lead_id: lead.id,
        template_code: `L0${index + 1}`,
        scheduled_at: new Date(Date.now() + hours * 3600_000).toISOString(),
      })),
      { onConflict: 'lead_id,template_code', ignoreDuplicates: true },
    );
    if (enqueueError) console.error('preventa_interest_followup_enqueue_failed', enqueueError.code);
  }
  // No order is generated, no payment is initiated; promotional follow-up is only queued after opt-in.
  await supabase.from('preventa_funnel_events').insert({
    event_name: 'lead_saved', page_path: '/preventa',
    source_channel: sourceChannel, campaign_code: campaignCode,
  });
  return NextResponse.json({ ok: true, message: 'Solicitud guardada. Gracias por tu interés.' });
}
