import { NextRequest, NextResponse } from 'next/server';

const SPACE = 'https://qwen-qwen3-tts.hf.space';
const API_NAME = 'generate_voice_design';
const TEST_TEXT = 'Un buen entrenador no se limita a elegir ejercicios. Observa, pregunta, interpreta la respuesta del cliente y adapta el proceso. La diferencia no está en memorizar una técnica, sino en entender cuándo usarla, por qué y para quién.';

/**
 * Registro de voces de GHC Academy.
 *
 * La voz aprobada queda como predeterminada. Para añadir voces distintas más
 * adelante solo hay que incorporar otra entrada al catálogo con un id único y
 * su prompt. El resto del flujo de generación no necesita cambiar.
 */
const VOICE_CATALOG = {
  ghc_male_warm_v1: {
    label: 'H1 · Hombre cálido',
    prompt: 'Native Castilian Spanish male voice from Spain, 40 to 50 years old. Warm, confident, natural, medium-low timbre, calm pace, clear articulation, conversational and credible. Premium educational tone. Avoid theatrical, advertising or radio-announcer delivery.',
  },
} as const;

const DEFAULT_VOICE_ID: VoiceId = 'ghc_male_warm_v1';
const LEGACY_VOICE_ALIASES: Record<string, VoiceId> = {
  male_warm: DEFAULT_VOICE_ID,
};

type VoiceId = keyof typeof VOICE_CATALOG;

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function resolveVoiceId(requested?: string | null): VoiceId {
  if (!requested) return DEFAULT_VOICE_ID;
  if (requested in LEGACY_VOICE_ALIASES) return LEGACY_VOICE_ALIASES[requested];
  if (requested in VOICE_CATALOG) return requested as VoiceId;
  return DEFAULT_VOICE_ID;
}

function parseSseResult(body: string) {
  const lines = body.split('\n').filter((line) => line.startsWith('data: ')).map((line) => line.slice(6).trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i]);
      if (Array.isArray(parsed)) {
        const first = parsed[0];
        if (first?.url || first?.path) return first;
      }
    } catch {}
  }
  return null;
}

export async function GET(request: NextRequest) {
  const voiceId = resolveVoiceId(request.nextUrl.searchParams.get('voice'));
  const voice = VOICE_CATALOG[voiceId];

  try {
    const call = await fetch(`${SPACE}/gradio_api/call/${API_NAME}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: [TEST_TEXT, 'Spanish', voice.prompt] }),
      cache: 'no-store',
    });
    const callText = await call.text();
    if (!call.ok) return NextResponse.json({ ok: false, stage: 'submit', status: call.status, detail: callText }, { status: 502 });

    const event = JSON.parse(callText) as { event_id?: string };
    if (!event.event_id) return NextResponse.json({ ok: false, stage: 'submit', detail: callText }, { status: 502 });

    const result = await fetch(`${SPACE}/gradio_api/call/${API_NAME}/${event.event_id}`, { cache: 'no-store', headers: { accept: 'text/event-stream' } });
    const resultText = await result.text();
    if (!result.ok) return NextResponse.json({ ok: false, stage: 'result', status: result.status, detail: resultText }, { status: 502 });

    const audio = parseSseResult(resultText);
    if (!audio) return NextResponse.json({ ok: false, stage: 'parse', detail: resultText }, { status: 502 });

    const audioUrl = audio.url || `${SPACE}/gradio_api/file=${encodeURIComponent(audio.path)}`;
    return NextResponse.json({ ok: true, voice: voiceId, label: voice.label, text: TEST_TEXT, audioUrl });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
