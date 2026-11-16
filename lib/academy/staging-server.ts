import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const BUCKET = 'ghc-academic-staging'
export const MAX_FILE_BYTES = 12 * 1024 * 1024

const BRANCH = 'feature/ghc-importador-academico-20261116'

export const SECURITY_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}

function createPrivilegedClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export type StageIdentity = {
  userId: string
  service: ReturnType<typeof createPrivilegedClient>
}

export function stageError(code: string, status: number) {
  return NextResponse.json({ ok: false, code }, { status, headers: SECURITY_HEADERS })
}

export function isStagePreview() {
  return process.env.VERCEL_ENV === 'preview'
    && process.env.GHC_ACADEMIC_IMPORT_PREVIEW_ONLY === 'true'
    && process.env.VERCEL_GIT_COMMIT_REF === BRANCH
}

export function exactSourcePath(id: string, format: 'DOCX' | 'PDF') {
  return 'originals/' + id + '/source.' + format.toLowerCase()
}

export function parseSourceMeta(body: unknown): {
  id: string; name: string; size: number; format: 'DOCX' | 'PDF'; sha256: string
} | null {
  if (!body || typeof body !== 'object') return null
  const obj = body as Record<string, unknown>
  const id = typeof obj.id === 'string' ? obj.id : ''
  const name = typeof obj.name === 'string' ? obj.name.trim() : ''
  const size = obj.size
  const sha256 = typeof obj.sha256 === 'string' ? obj.sha256 : ''
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) return null
  if (name.length < 1 || name.length > 180 || !/\.(docx|pdf)$/i.test(name)) return null
  if (typeof size !== 'number' || !Number.isInteger(size) || size < 30 || size > MAX_FILE_BYTES) return null
  if (!/^[a-f0-9]{64}$/.test(sha256)) return null
  const format: 'DOCX' | 'PDF' = /\.docx$/i.test(name) ? 'DOCX' : 'PDF'
  return { id, name, size, sha256, format }
}

export async function stageAuthorization(request: NextRequest, changing: boolean): Promise<
  { ok: true; identity: StageIdentity } | { ok: false; response: NextResponse }
> {
  if (!isStagePreview()) return { ok: false, response: stageError('NOT_FOUND', 404) }
  if (changing) {
    const origin = request.headers.get('origin')
    if (origin !== new URL(request.url).origin) {
      return { ok: false, response: stageError('INVALID_ORIGIN', 403) }
    }
    if (!(request.headers.get('content-type') || '').startsWith('application/json')) {
      return { ok: false, response: stageError('JSON_REQUIRED', 415) }
    }
    const size = Number(request.headers.get('content-length') || '0')
    if (!Number.isFinite(size) || size > 8192) {
      return { ok: false, response: stageError('JSON_TOO_LARGE', 413) }
    }
  }

  const bearer = request.headers.get('authorization') || ''
  const token = /^Bearer\s+(\S+)$/i.exec(bearer)?.[1]
  if (!token || token.length > 4096) return { ok: false, response: stageError('SESSION_REQUIRED', 401) }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !serviceKey) return { ok: false, response: stageError('STAGING_UNAVAILABLE', 503) }
  try {
    const scoped = createClient(url, anon, {
      global: { headers: { Authorization: 'Bearer ' + token } },
      auth: { persistSession: false, autoRefreshToken: false }
    })
    const { data: user, error: identityError } = await scoped.auth.getUser(token)
    if (identityError || !user.user) return { ok: false, response: stageError('SESSION_INVALID', 401) }
    const { data: authorized, error: roleError } = await scoped.rpc('ghc_is_admin')
    if (roleError || authorized !== true) {
      return { ok: false, response: stageError('ADMIN_AAL2_REQUIRED', 403) }
    }
    // Construct the privileged client only AFTER verifying identity, admin role
    // and the verified AAL2 claim through the database function.
    const service = createPrivilegedClient(url, serviceKey)
    return { ok: true, identity: { userId: user.user.id, service } }
  } catch {
    return { ok: false, response: stageError('AUTH_VALIDATION_FAILED', 403) }
  }
}


export type SavedStageResult = {
  id: string
  status: 'awaiting_review' | 'needs_correction'
  sections: number
  media: number
  sha256: string
}

export type StageRow = {
  id: string
  original_file_name: string
  original_sha256: string
  level_number: number | null
  module_number: number | null
  status: string
  created_at: string
  sections: number
  media: number
}

// The restricted RPCs were created after the project's generated database
// definitions. Specify their SQL contracts locally; never broaden database
// grants to work around missing TypeScript types.
export async function savePrivateBatch(
  service: StageIdentity['service'], payload: Record<string, unknown>
): Promise<{ data: SavedStageResult | null; error: { code?: string; message: string } | null }> {
  const typed = service as unknown as {
    rpc(name: 'ghc_academic_stage_save', args: { p_payload: Record<string, unknown> }):
      Promise<{ data: SavedStageResult | null; error: { code?: string; message: string } | null }>
  }
  return typed.rpc('ghc_academic_stage_save', { p_payload: payload })
}

export async function listPrivateBatches(
  service: StageIdentity['service']
): Promise<{ data: StageRow[] | null; error: { code?: string; message: string } | null }> {
  const typed = service as unknown as {
    rpc(name: 'ghc_academic_stage_list', args: { p_limit: number }):
      Promise<{ data: StageRow[] | null; error: { code?: string; message: string } | null }>
  }
  return typed.rpc('ghc_academic_stage_list', { p_limit: 30 })
}


export type StageSourceInfo = {
  id: string
  original_file_name: string
  source_format: 'DOCX' | 'PDF'
  original_file_bytes: number
  source_sha256: string
  source_storage_path: string
  status: string
}

export async function findPrivateSource(
  service: StageIdentity['service'], id: string
): Promise<{ data: StageSourceInfo | null; error: { code?: string; message: string } | null }> {
  const typed = service as unknown as {
    rpc(name: 'ghc_academic_stage_source_info', args: { p_id: string }):
      Promise<{ data: StageSourceInfo | null; error: { code?: string; message: string } | null }>
  }
  return typed.rpc('ghc_academic_stage_source_info', { p_id: id })
}
