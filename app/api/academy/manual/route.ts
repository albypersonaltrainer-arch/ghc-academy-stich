import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'ghc-course-assets'

function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
}

function normalizeStoragePath(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  if (!/^https?:\/\//i.test(raw)) return raw.replace(/^\/+/, '')

  try {
    const url = new URL(raw)
    const marker = `/storage/v1/object/${BUCKET}/`
    const signedMarker = `/storage/v1/object/sign/${BUCKET}/`
    const publicMarker = `/storage/v1/object/public/${BUCKET}/`
    const candidate = [signedMarker, publicMarker, marker].find((item) => url.pathname.includes(item))
    if (!candidate) return ''
    return decodeURIComponent(url.pathname.split(candidate)[1] || '').replace(/^\/+/, '')
  } catch {
    return ''
  }
}

export async function GET(request: NextRequest) {
  const token = getBearerToken(request)
  const lessonId = request.nextUrl.searchParams.get('lessonId') || ''
  const courseSlug = request.nextUrl.searchParams.get('courseSlug') || ''

  if (!token || !lessonId || !courseSlug) {
    return NextResponse.json({ error: 'Acceso no válido.' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Configuración de almacenamiento incompleta.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 })
  }

  const { data: experience, error: experienceError } = await supabase.rpc(
    'ghc_student_get_lesson_experience',
    {
      p_course_slug: courseSlug,
      p_lesson_id: lessonId
    }
  )

  if (experienceError || !experience?.allowed) {
    return NextResponse.json(
      { error: experience?.reason || 'El material está bloqueado.' },
      { status: 403 }
    )
  }

  const storagePath = normalizeStoragePath(experience?.lesson?.manual_path)
  if (!storagePath) {
    return NextResponse.json({ error: 'Esta lección no tiene manual disponible.' }, { status: 404 })
  }

  const { data: file, error: fileError } = await supabase.storage.from(BUCKET).download(storagePath)
  if (fileError || !file) {
    return NextResponse.json({ error: 'No se pudo abrir el manual.' }, { status: 404 })
  }

  const bytes = await file.arrayBuffer()

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': file.type || 'application/pdf',
      'Content-Disposition': 'inline; filename="manual-ghc-academy.pdf"',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    }
  })
}
