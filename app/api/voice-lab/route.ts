import { NextRequest, NextResponse } from 'next/server';

const SPACE = 'https://resembleai-chatterbox-multilingual-tts-es-es.hf.space';
const API_NAME = 'generate_tts_audio';
const TEST_TEXT = 'Un buen entrenador no se limita a elegir ejercicios. Observa, pregunta, interpreta la respuesta del cliente y adapta el proceso. La diferencia no está en memorizar una técnica, sino en entender cuándo usarla, por qué y para quién.';

const variants = {
  neutral: { exaggeration: 0.45, temperature: 0.72, seed: 17, cfg: 0.55 },
  warm: { exaggeration: 0.62, temperature: 0.78, seed: 29, cfg: 0.42 },
  documentary: { exaggeration: 0.38, temperature: 0.62, seed: 41, cfg: 0.68 },
} as const;

type VariantName = keyof typeof variants;

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function parseSseResult(body: string) {
  const dataLines = body
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6).trim())
    .filter(Boolean);

  for (let i = dataLines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(dataLines[i]);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      if (first?.url) return first;
      if (first?.path) return first;
    } catch {
      // Ignore non-JSON SSE data lines.
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get('variant') || 'neutral';
  const variant = (requested in variants ? requested : 'neutral') as VariantName;
  const settings = variants[variant];

  try {
    const call = await fetch(`${SPACE}/gradio_api/call/${API_NAME}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        data: [
          TEST_TEXT,
          null,
          settings.exaggeration,
          settings.temperature,
          settings.seed,
          settings.cfg,
        ],
      }),
      cache: 'no-store',
    });

    const callText = await call.text();
    if (!call.ok) {
      return NextResponse.json({ ok: false, stage: 'submit', status: call.status, detail: callText }, { status: 502 });
    }

    const event = JSON.parse(callText) as { event_id?: string };
    if (!event.event_id) {
      return NextResponse.json({ ok: false, stage: 'submit', detail: callText }, { status: 502 });
    }

    const result = await fetch(`${SPACE}/gradio_api/call/${API_NAME}/${event.event_id}`, {
      cache: 'no-store',
      headers: { accept: 'text/event-stream' },
    });
    const resultText = await result.text();

    if (!result.ok) {
      return NextResponse.json({ ok: false, stage: 'result', status: result.status, detail: resultText }, { status: 502 });
    }

    const audio = parseSseResult(resultText);
    if (!audio) {
      return NextResponse.json({ ok: false, stage: 'parse', detail: resultText }, { status: 502 });
    }

    const audioUrl = audio.url || `${SPACE}/gradio_api/file=${encodeURIComponent(audio.path)}`;

    return NextResponse.json({
      ok: true,
      variant,
      settings,
      text: TEST_TEXT,
      audioUrl,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
