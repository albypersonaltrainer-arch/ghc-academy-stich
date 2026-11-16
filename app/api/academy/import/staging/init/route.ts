import { NextRequest, NextResponse } from 'next/server'
import {
  BUCKET, SECURITY_HEADERS, exactSourcePath, parseSourceMeta,
  stageAuthorization, stageError
} from '../../../../../../lib/academy/staging-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function POST(request: NextRequest) {
  const gate = await stageAuthorization(request, true)
  if (!gate.ok) return gate.response

  try {
    const raw = await request.text()
    if (raw.length > 4096) return stageError('JSON_TOO_LARGE', 413)
    const meta = parseSourceMeta(JSON.parse(raw))
    if (!meta) return stageError('INVALID_SOURCE_METADATA', 422)

    const path = exactSourcePath(meta.id, meta.format)
    const { data, error } = await gate.identity.service.storage
      .from(BUCKET).createSignedUploadUrl(path)
    if (error || !data?.token) return stageError('SIGNED_UPLOAD_UNAVAILABLE', 503)

    // The token is scoped to one path only; it does not expose the service key,
    // grant bucket listing, or allow reading objects.
    return NextResponse.json({
      ok: true, path, token: data.token, id: meta.id,
      maxBytes: 12 * 1024 * 1024,
      status: 'awaiting_private_upload'
    }, { headers: SECURITY_HEADERS })
  } catch {
    return stageError('SIGNED_UPLOAD_INIT_FAILED', 422)
  }
}
