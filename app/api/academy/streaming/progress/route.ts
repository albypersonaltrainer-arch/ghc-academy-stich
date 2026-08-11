import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

  const body = await request.json().catch(() => ({}))
  const sessionId = String(body?.sessionId || '').trim()
  const positionSeconds = Math.max(0, Math.floor(Number(body?.positionSeconds || 0)))
  const rawDuration = Number(body?.durationSeconds)
  const durationSeconds = Number.isFinite(rawDuration) && rawDuration >= 0
    ? Math.floor(rawDuration)
    : null
  const ended = body?.ended === true

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'sessionId es obligatorio.' }, { status: 400 })
  }

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
    return NextResponse.json({ ok: false, error: error?.message || 'No se pudo guardar el progreso de reproducción.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
}
