import { NextRequest, NextResponse } from 'next/server';

const SPACE = 'https://qwen-qwen3-tts.hf.space';
const API_NAME = 'generate_voice_design';

const H1_PROMPT =
  'Native Castilian Spanish male voice from Spain, 40 to 50 years old. Warm, confident, natural, medium-low timbre, calm pace, clear articulation, conversational and credible. Premium educational tone. Avoid theatrical, advertising or radio-announcer delivery.';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function parseSseResult(body: string): { url?: string; path?: string } | null {
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
    } catch {
      // Ignore non-result SSE events.
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get('text')?.trim();

  if (!text) {
    return NextResponse.json({ ok: false, error: 'missing_text' }, { status: 400 });
  }

  if (text.length > 800) {
    return NextResponse.json({ ok: false, error: 'text_too_long' }, { status: 400 });
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
      return NextResponse.json(
        { ok: false, stage: 'submit', status: call.status, detail: callText },
        { status: 502 },
      );
    }

    const event = JSON.parse(callText) as { event_id?: string };

    if (!event.event_id) {
      return NextResponse.json(
        { ok: false, stage: 'submit', detail: callText },
        { status: 502 },
      );
    }

    const result = await fetch(
      `${SPACE}/gradio_api/call/${API_NAME}/${event.event_id}`,
      {
        headers: { accept: 'text/event-stream' },
        cache: 'no-store',
      },
    );

    const resultText = await result.text();

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, stage: 'result', status: result.status, detail: resultText },
        { status: 502 },
      );
    }

    const audio = parseSseResult(resultText);

    if (!audio) {
      return NextResponse.json(
        { ok: false, stage: 'parse', detail: resultText },
        { status: 502 },
      );
    }

    const audioUrl =
      audio.url ||
      `${SPACE}/gradio_api/file=${encodeURIComponent(audio.path || '')}`;

    if (request.nextUrl.searchParams.get('mode') === 'audio') {
      const audioResponse = await fetch(audioUrl, { cache: 'no-store' });
      if (!audioResponse.ok) {
        return NextResponse.json(
          { ok: false, stage: 'audio_proxy', status: audioResponse.status },
          { status: 502 },
        );
      }
      const bytes = await audioResponse.arrayBuffer();
      return new Response(bytes, {
        status: 200,
        headers: {
          'content-type': audioResponse.headers.get('content-type') || 'audio/wav',
          'cache-control': 'no-store',
          'content-disposition': 'inline; filename="ghc_h1_ad.wav"',
        },
      });
    }

    return NextResponse.json({
      ok: true,
      voice: 'ghc_male_warm_v1',
      label: 'H1 · Hombre cálido',
      text,
      audioUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
