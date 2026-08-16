import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'ghc-course-assets'
const EXTERNAL_TEST_HOSTS = new Set(['mozilla.github.io'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const COURSE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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

function getApprovedExternalUrl(value: unknown) {
  const raw = String(value || '').trim()
  if (!/^https:\/\//i.test(raw)) return null

  try {
    const url = new URL(raw)
    return EXTERNAL_TEST_HOSTS.has(url.hostname.toLowerCase()) ? url : null
  } catch {
    return null
  }
}

function isPdf(bytes: ArrayBuffer) {
  if (bytes.byteLength < 5) return false
  const signature = new Uint8Array(bytes, 0, 5)
  return signature[0] === 0x25 && // %
    signature[1] === 0x50 && // P
    signature[2] === 0x44 && // D
    signature[3] === 0x46 && // F
    signature[4] === 0x2d // -
}

function inlinePdfResponse(bytes: ArrayBuffer) {
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="manual-ghc-academy.pdf"',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    }
  })
}

export async function GET(request: NextRequest) {
  const token = getBearerToken(request)
  const lessonId = String(request.nextUrl.searchParams.get('lessonId') || '').trim()
  const courseSlug = String(request.nextUrl.searchParams.get('courseSlug') || '').trim()

  if (!token) {
    return NextResponse.json({ error: 'Acceso no válido.' }, { status: 401 })
  }

  if (!UUID_RE.test(lessonId) || courseSlug.length > 120 || !COURSE_SLUG_RE.test(courseSlug)) {
    return NextResponse.json({ error: 'Solicitud de manual no válida.' }, { status: 400 })
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
    { p_course_slug: courseSlug, p_lesson_id: lessonId }
  )

  if (experienceError || !experience?.allowed) {
    return NextResponse.json(
      { error: experience?.reason || 'El material está bloqueado.' },
      { status: 403 }
    )
  }

  const rawManualPath = experience?.lesson?.manual_path
  const storagePath = normalizeStoragePath(rawManualPath)

  if (storagePath) {
    const { data: file, error: fileError } = await supabase.storage.from(BUCKET).download(storagePath)
    if (fileError || !file) {
      return NextResponse.json({ error: 'No se pudo abrir el manual.' }, { status: 404 })
    }

    const bytes = await file.arrayBuffer()
    if (!isPdf(bytes)) {
      console.error('[academy-manual] INVALID_STORAGE_PDF')
      return NextResponse.json({ error: 'El manual no tiene un formato válido.' }, { status: 415 })
    }

    return inlinePdfResponse(bytes)
  }

  // Temporary compatibility for the known Mozilla sample PDF used in current beta lessons.
  // Real GHC manuals must live in the private Storage bucket instead.
  const externalUrl = getApprovedExternalUrl(rawManualPath)
  if (externalUrl) {
    const response = await fetch(externalUrl, { cache: 'no-store', redirect: 'error' })
    if (!response.ok) {
      return NextResponse.json({ error: 'No se pudo abrir el manual de prueba.' }, { status: 502 })
    }

    const bytes = await response.arrayBuffer()
    if (!isPdf(bytes)) {
      console.error('[academy-manual] INVALID_EXTERNAL_PDF')
      return NextResponse.json({ error: 'El manual de prueba no tiene un formato válido.' }, { status: 502 })
    }

    return inlinePdfResponse(bytes)
  }

  return NextResponse.json({ error: 'Esta lección no tiene manual disponible.' }, { status: 404 })
}