import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  resolvePlaybackDescriptor,
  selectPreferredMediaAsset,
  type LessonMediaAsset
} from '../../../../../lib/academy/streaming'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  return authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : ''
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const token = bearerToken(request)
  const lessonId = String(request.nextUrl.searchParams.get('lessonId') || '').trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ ok: false, error: 'Streaming no está configurado en el servidor.' }, { status: 500 })
  }

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Debes iniciar sesión.' }, { status: 401 })
  }

  if (!UUID_RE.test(lessonId)) {
    return NextResponse.json({ ok: false, error: 'lessonId no es válido.' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    return NextResponse.json({ ok: false, error: 'La sesión no es válida.' }, { status: 401 })
  }

  const { data: mediaData, error: mediaError } = await supabase.rpc('ghc_student_get_lesson_media', {
    p_lesson_id: lessonId
  })

  if (mediaError) {
    console.error('[academy-streaming-playback] MEDIA_ACCESS_FAILED')
    return NextResponse.json({ ok: false, error: 'No se pudo comprobar el acceso al streaming.' }, { status: 403 })
  }

  const assets = Array.isArray(mediaData) ? mediaData as LessonMediaAsset[] : []
  const asset = selectPreferredMediaAsset(assets)

  if (!asset) {
    return NextResponse.json({ ok: false, code: 'NO_STREAM_ASSET', error: 'La lección no tiene streaming configurado.' }, { status: 404 })
  }

  const playback = await resolvePlaybackDescriptor(supabase, asset)

  if (playback.mode === 'unavailable') {
    return NextResponse.json({
      ok: false,
      code: 'PROVIDER_ADAPTER_NOT_READY',
      error: 'El recurso de streaming todavía no está disponible.',
      asset: {
        id: asset.id,
        provider: asset.provider,
        protocol: asset.delivery_protocol,
        status: asset.status
      }
    }, { status: 501 })
  }

  if (playback.mode === 'scheduled') {
    return NextResponse.json({
      ok: true,
      asset: {
        id: asset.id,
        kind: asset.media_kind,
        provider: asset.provider,
        status: asset.status
      },
      playback,
      session: null
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  }

  const { data: session, error: sessionError } = await supabase.rpc('ghc_student_open_stream_session', {
    p_asset_id: asset.id
  })

  if (sessionError || !session?.session_id) {
    console.error('[academy-streaming-playback] SESSION_OPEN_FAILED')
    return NextResponse.json({ ok: false, error: 'No se pudo abrir la sesión de reproducción.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    asset: {
      id: asset.id,
      kind: asset.media_kind,
      provider: asset.provider,
      status: asset.status,
      protocol: asset.delivery_protocol,
      durationSeconds: asset.duration_seconds
    },
    playback,
    session
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}