import { NextRequest, NextResponse } from 'next/server';

const SPACE = 'https://qwen-qwen3-tts.hf.space';
const API_NAME = 'generate_voice_design';
const TEST_TEXT = 'Un buen entrenador no se limita a elegir ejercicios. Observa, pregunta, interpreta la respuesta del cliente y adapta el proceso. La diferencia no está en memorizar una técnica, sino en entender cuándo usarla, por qué y para quién.';

const voices = {
  male_warm: 'Native Castilian Spanish male voice from Spain, 40 to 50 years old. Warm, confident, natural, medium-low timbre, calm pace, clear articulation, conversational and credible. Premium educational tone. Avoid theatrical, advertising or radio-announcer delivery.',
  male_documentary: 'Mature native Castilian Spanish male voice from Spain, around 50 years old. Deep but approachable, calm and intelligent. Slightly slower documentary delivery, natural pauses, understated authority. Avoid dramatic, commercial or announcer delivery.',
  female_warm: 'Native Castilian Spanish female voice from Spain, 35 to 45 years old. Warm, clear, natural and confident. Friendly but authoritative, relaxed pace, premium educational tone. Conversational. Avoid theatrical, advertising or radio-announcer delivery.',
  female_documentary: 'Mature native Castilian Spanish female voice from Spain, 40 to 50 years old. Calm, elegant and natural, slightly lower timbre, measured documentary pacing, clear articulation and understated authority. Avoid dramatic, commercial or announcer delivery.',
} as const;

type VoiceId = keyof typeof voices;

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
  const requested = request.nextUrl.searchParams.get('voice') || 'male_warm';
  const voice = (requested in voices ? requested : 'male_warm') as VoiceId;
  const description = voices[voice];

  try {
    const call = await fetch(`${SPACE}/gradio_api/call/${API_NAME}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: [TEST_TEXT, 'Spanish', description] }),
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
    return NextResponse.json({ ok: true, voice, text: TEST_TEXT, audioUrl });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
