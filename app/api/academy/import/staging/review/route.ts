import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { previewAcademicFile } from '../../../../../../lib/academy/import-preview'
import {
  BUCKET, SECURITY_HEADERS, exactSourcePath, findPrivateSource,
  stageAuthorization, stageError
} from '../../../../../../lib/academy/staging-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 45

export async function GET(request: NextRequest) {
  const gate = await stageAuthorization(request, false)
  if (!gate.ok) return gate.response

  const id = request.nextUrl.searchParams.get('id') || ''
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) {
    return stageError('INVALID_BATCH_ID', 422)
  }
  try {
    const { data: source, error: infoError } = await findPrivateSource(gate.identity.service, id)
    if (infoError || !source) return stageError('STAGING_SOURCE_NOT_FOUND', 404)
    const expected = exactSourcePath(id, source.source_format)
    if (source.source_storage_path !== expected) return stageError('SOURCE_PATH_INVALID', 422)

    const { data: original, error: downloadError } =
      await gate.identity.service.storage.from(BUCKET).download(expected)
    if (downloadError || !original) return stageError('ORIGINAL_NOT_UPLOADED', 409)
    if (original.size !== source.original_file_bytes || original.size > 12 * 1024 * 1024) {
      return stageError('SOURCE_SIZE_MISMATCH', 422)
    }
    const bytes = new Uint8Array(await original.arrayBuffer())
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    if (sha256 !== source.source_sha256) return stageError('SOURCE_HASH_MISMATCH', 422)
    const preview = previewAcademicFile(source.original_file_name, bytes)
    return NextResponse.json({
      ok: true,
      preview,
      batch: {
        id: source.id,
        status: source.status,
        original_file_name: source.original_file_name
      }
    }, { headers: SECURITY_HEADERS })
  } catch {
    return stageError('STAGING_SOURCE_REVIEW_FAILED', 422)
  }
}
