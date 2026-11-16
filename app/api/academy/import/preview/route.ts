import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { previewAcademicFile } from '../../../../../lib/academy/import-preview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow'
}

function reply(code: string, status: number) {
  return NextResponse.json({ ok: false, code }, { status, headers: HEADERS })
}

export async function POST(request: NextRequest) {
  // This tool is deliberately unavailable from Production, including to service-role callers.
  if (
    process.env.VERCEL_ENV !== 'preview' ||
    process.env.GHC_ACADEMIC_IMPORT_PREVIEW_ONLY !== 'true' ||
    process.env.VERCEL_GIT_COMMIT_REF !== 'feature/ghc-importador-academico-20261116'
  ) return reply('NOT_FOUND', 404)

  const bearer = request.headers.get('authorization') || ''
  const token = bearer.match(/^Bearer\s+(\S+)$/i)?.[1] || ''
  if (!token || token.length > 4096) return reply('SESSION_REQUIRED', 401)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return reply('PREVIEW_UNAVAILABLE', 503)

  try {
    const client = createClient(url, anon, {
      global: { headers: { Authorization: 'Bearer ' + token } },
      auth: { persistSession: false, autoRefreshToken: false }
    })
    const { data: identity, error: identityError } = await client.auth.getUser(token)
    if (identityError || !identity?.user) return reply('SESSION_INVALID', 401)

    // Database guard verifies the admin role plus a verified MFA factor and JWT AAL2.
    const { data: admin, error: roleError } = await client.rpc('ghc_is_admin')
    if (roleError || admin !== true) return reply('ADMIN_AAL2_REQUIRED', 403)

    if (!(request.headers.get('content-type') || '').startsWith('multipart/form-data')) {
      return reply('MULTIPART_REQUIRED', 415)
    }

    // Client limit; server-side limit and parser inflate bounds are also enforced.
    const declaredSize = Number(request.headers.get('content-length') || 0)
    if (declaredSize > 13 * 1024 * 1024) return reply('FILE_TOO_LARGE', 413)
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return reply('FILE_REQUIRED', 400)
    if (!/\.(docx|pdf)$/i.test(file.name)) return reply('FORMAT_NOT_SUPPORTED', 415)
    if (file.size > 12 * 1024 * 1024 || file.size < 30) return reply('FILE_TOO_LARGE', 413)

    const bytes = new Uint8Array(await file.arrayBuffer())
    const preview = previewAcademicFile(file.name, bytes)
    // No database/storage/AI writes. Returning extracted content exclusively to the requester.
    return NextResponse.json({ ok: true, preview }, { headers: HEADERS })
  } catch (error) {
    const kind = error instanceof Error ? error.message : ''
    if (kind === 'PDF_SIN_TEXTO_EXTRAIBLE') return reply('PDF_REQUIRES_ORIGINAL_WORD_OR_OCR', 422)
    if (kind.startsWith('DOCX_') || kind.startsWith('PDF_') || kind === 'FORMATO_NO_ADMITIDO') {
      return reply('DOCUMENT_CANNOT_BE_READ_SAFELY', 422)
    }
    if (kind === 'TAMANO_NO_ADMITIDO') return reply('FILE_TOO_LARGE', 413)
    // Do not write personal document text or access tokens to platform logs.
    return reply('PREVIEW_PARSE_FAILED', 422)
  }
}
