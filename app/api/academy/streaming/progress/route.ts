import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_MEDIA_SECONDS = 7 * 24 * 60 * 60

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  return authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : ''
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const token = bearerToken(request)

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ ok: false, error: 'Streaming no está configurado en el servidor.' }, { status: 500 })
  }

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Debes iniciar sesión.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Solicitud JSON no válida.' }, { status: 400 })
  }

  const value = body as Record<string, unknown>
  const sessionId = typeof value.sessionId === 'string' ? value.sessionId.trim() : ''
  const rawPosition = Number(value.positionSeconds)
  const rawDuration = value.durationSeconds === null || value.durationSeconds === undefined
    ? null
    : Number(value.durationSeconds)
  const ended = value.ended === true

  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ ok: false, error: 'sessionId no es válido.' }, { status: 400 })
  }

  if (!Number.isFinite(rawPosition) || rawPosition < 0 || rawPosition > MAX_MEDIA_SECONDS) {
    return NextResponse.json({ ok: false, error: 'positionSeconds no es válido.' }, { status: 400 })
  }

  if (rawDuration !== null && (!Number.isFinite(rawDuration) || rawDuration < 0 || rawDuration > MAX_MEDIA_SECONDS)) {
    return NextResponse.json({ ok: false, error: 'durationSeconds no es válido.' }, { status: 400 })
  }

  const positionSeconds = Math.floor(rawPosition)
  const durationSeconds = rawDuration === null ? null : Math.floor(rawDuration)

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    return NextResponse.json({ ok: false, error: 'La sesión no es válida.' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('ghc_student_touch_stream_session', {
    p_session_id: sessionId,
    p_position_seconds: positionSeconds,
    p_duration_seconds: durationSeconds,
    p_ended: ended
  })

  if (error || data !== true) {
    console.error('[academy-streaming-progress] SESSION_TOUCH_FAILED')
    return NextResponse.json({ ok: false, error: 'No se pudo guardar el progreso de reproducción.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
}