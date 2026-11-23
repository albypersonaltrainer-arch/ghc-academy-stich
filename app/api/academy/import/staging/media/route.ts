import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { extractOriginalDocxImage } from '../../../../../../lib/academy/import-preview'
import { isAulaVisibleImage, isSafePrivateAula } from '../../../../../../lib/academy/aula-safety'
import type { AulaModel } from '../../../../../../lib/academy/aula-model-types'
import {
  BUCKET, SECURITY_HEADERS, exactSourcePath, findPrivateSource,
  stageAuthorization, stageError
} from '../../../../../../lib/academy/staging-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 45

type RpcOutput = { data: AulaModel | null; error: { message: string } | null }
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i

export async function GET(request: NextRequest) {
  const gate = await stageAuthorization(request, false)
  if (!gate.ok) return gate.response
  const id = request.nextUrl.searchParams.get('id') || ''
  const mediaId = request.nextUrl.searchParams.get('media') || ''
  if (!UUID.test(id) || !/^rId[0-9]{1,6}$/.test(mediaId)) {
    return stageError('INVALID_MEDIA_REQUEST', 422)
  }

  try {
    const service = gate.identity.service as unknown as {
      rpc(name: 'ghc_academic_stage_learning_model', args: { p_id: string }): Promise<RpcOutput>
    }
    const { data: model, error: modelError } = await service.rpc(
      'ghc_academic_stage_learning_model', { p_id: id }
    )
    if (modelError || !model || !isSafePrivateAula(model) || !isAulaVisibleImage(model, mediaId)) {
      // Deny teacher-only images even if they are embedded inside the same DOCX.
      return stageError('AULA_MEDIA_NOT_ALLOWED', 404)
    }

    const { data: source, error: sourceError } =
      await findPrivateSource(gate.identity.service, id)
    if (sourceError || !source || source.source_format !== 'DOCX' ||
        source.source_sha256 !== model.source_sha256 ||
        source.source_storage_path !== exactSourcePath(id, 'DOCX')) {
      return stageError('ORIGINAL_NOT_AVAILABLE', 404)
    }
    const { data: document, error: downloadError } =
      await gate.identity.service.storage.from(BUCKET).download(source.source_storage_path)
    if (downloadError || !document || document.size !== source.original_file_bytes ||
        document.size > 12 * 1024 * 1024) return stageError('ORIGINAL_INTEGRITY_FAILED', 422)

    const bytes = new Uint8Array(await document.arrayBuffer())
    const digest = createHash('sha256').update(bytes).digest('hex')
    if (digest !== source.source_sha256) return stageError('ORIGINAL_INTEGRITY_FAILED', 422)
    const embedded = extractOriginalDocxImage(bytes, mediaId)
    if (!embedded) return stageError('AULA_MEDIA_NOT_AVAILABLE', 404)
    return new NextResponse(new Uint8Array(embedded.bytes), {
      status: 200,
      headers: {
        ...SECURITY_HEADERS,
        'Content-Type': embedded.mimeType,
        'Content-Length': String(embedded.bytes.length),
        'Content-Disposition': 'inline',
        'X-Source-Media-SHA256': embedded.sha256
      }
    })
  } catch {
    return stageError('AULA_MEDIA_NOT_AVAILABLE', 422)
  }
}
