import { NextRequest, NextResponse } from 'next/server';

const SPACE = 'https://qwen-qwen3-tts.hf.space';
const API_NAME = 'generate_voice_design';

const H1_PROMPT = 'Native Castilian Spanish male voice from Spain, 40 to 50 years old. Warm, confident, natural, medium-low timbre, calm pace, clear articulation, conversational and credible. Premium educational tone. Avoid theatrical, advertising or radio-announcer delivery.';

const SCENES: Record<string, string> = {
  '1': 'En entrenamiento profesional, integrar es más difícil que memorizar. La competencia no se demuestra recitando métodos, sino cuando un caso real obliga a decidir: qué información falta, qué riesgo existe, qué merece atención y qué debe esperar. El Sistema GHC parte de una idea sencilla: la respuesta real del cliente tiene que convertirse en la siguiente decisión.',
  '2': 'Un caso real rara vez llega ordenado. La misma persona puede querer perder grasa, recuperar fuerza, reducir dolor y sentirse mejor, mientras duerme poco, tiene horarios variables o toma medicación. El trabajo profesional empieza separando hechos, hipótesis y decisiones. Un hecho describe lo observado. Una hipótesis propone una explicación que puede ser falsa. Y una decisión especifica qué haremos ahora y qué dato podría obligarnos a cambiar el plan.',
  '3': 'Para organizar esa incertidumbre, GHC utiliza ocho etapas: seguridad, contexto, evaluación mínima útil, prioridad, programa, ejecución, respuesta y revisión. No son una receta rígida. Son una arquitectura para evitar que el entrenador salte directamente al ejercicio favorito. Cada etapa puede adaptarse a la persona, pero el sistema debe conservar la trazabilidad: por qué se decidió, qué se hizo y qué ocurrió después.',
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function parseSseResult(body: string) {
  const lines = body
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6).trim())
    .filter(Boolean);

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
  const scene = request.nextUrl.searchParams.get('scene') || '1';
  const text = SCENES[scene];
  if (!text) {
    return NextResponse.json({ ok: false, error: 'invalid_scene', allowed: Object.keys(SCENES) }, { status: 400 });
  }

  try {
    const call = await fetch(`${SPACE}/gradio_api/call/${API_NAME}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: [text, 'Spanish', H1_PROMPT] }),
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
    const direct = request.nextUrl.searchParams.get('direct') === '1';
    if (direct) return NextResponse.redirect(audioUrl, 302);

    return NextResponse.json({
      ok: true,
      scene,
      voice: 'ghc_male_warm_v1',
      label: 'H1 · Hombre cálido',
      audioUrl,
      paidInferenceUsed: false,
      actualSpendEur: 0,
      source: 'Qwen3-TTS VoiceDesign public free Space',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
