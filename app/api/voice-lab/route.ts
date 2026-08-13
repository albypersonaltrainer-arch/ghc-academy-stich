import { NextResponse } from 'next/server';

const SPACE = 'https://resembleai-chatterbox-multilingual-tts-es-es.hf.space';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch(`${SPACE}/gradio_api/info`, { cache: 'no-store' });
    const text = await response.text();
    let info: unknown = text;
    try { info = JSON.parse(text); } catch {}
    return NextResponse.json({ ok: response.ok, status: response.status, info });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
