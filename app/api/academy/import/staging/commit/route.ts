import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { previewAcademicFile } from '../../../../../../lib/academy/import-preview'
import { buildAcademicDraft } from '../../../../../../lib/academy/draft-plan'
import { resolveCurriculumModule } from '../../../../../../lib/academy/curriculum-map'
import {
  BUCKET, SECURITY_HEADERS, exactSourcePath, parseSourceMeta, savePrivateBatch, findPrivateSource,
  stageAuthorization, stageError
} from '../../../../../../lib/academy/staging-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 45

export async function POST(request: NextRequest) {
  const gate = await stageAuthorization(request, true)
  if (!gate.ok) return gate.response

  try {
    const raw = await request.text()
    if (raw.length > 4096) return stageError('JSON_TOO_LARGE', 413)
    const meta = parseSourceMeta(JSON.parse(raw))
    if (!meta) return stageError('INVALID_SOURCE_METADATA', 422)
    const path = exactSourcePath(meta.id, meta.format)

    // A repeated confirmation must never touch or remove a previously
    // accepted original. Reply idempotently only for the SAME file bytes.
    const { data: existing, error: existingError } =
      await findPrivateSource(gate.identity.service, meta.id)
    if (existingError) return stageError('STAGING_DATABASE_UNAVAILABLE', 503)
    if (existing) {
      if (existing.source_sha256 !== meta.sha256
          || existing.original_file_bytes !== meta.size
          || existing.original_file_name !== meta.name
          || existing.source_format !== meta.format
          || existing.source_storage_path !== path) {
        return stageError('BATCH_ID_CONFLICT', 409)
      }
      return NextResponse.json({
        ok: true,
        result: { id: existing.id, status: existing.status },
        sourceName: existing.original_file_name,
        status: existing.status,
        publicationAllowed: false,
        alreadySaved: true
      }, { headers: SECURITY_HEADERS })
    }

    // Load from the private bucket on the server. Never trust the browser's
    // preview, hash, course assignment or section classifications.
    const { data: original, error: downloadError } =
      await gate.identity.service.storage.from(BUCKET).download(path)
    if (downloadError || !original) return stageError('ORIGINAL_NOT_UPLOADED', 409)
    if (original.size !== meta.size || original.size > 12 * 1024 * 1024) {
      return stageError('SOURCE_SIZE_MISMATCH', 422)
    }
    const bytes = new Uint8Array(await original.arrayBuffer())
    const digest = createHash('sha256').update(bytes).digest('hex')
    if (digest !== meta.sha256) return stageError('SOURCE_HASH_MISMATCH', 422)

    const preview = previewAcademicFile(meta.name, bytes)
    if (preview.truncated) return stageError('EXTRACTION_TRUNCATED', 422)
    if (preview.sourceSha256 !== digest) return stageError('SOURCE_HASH_MISMATCH', 422)
    const draft = buildAcademicDraft(preview)
    if (!draft.sections.length) return stageError('NO_SECTIONS_DETECTED', 422)
    const target = resolveCurriculumModule(draft.moduleNumber)

    const payload = {
      import_version: 'GHC_STAGE_1',
      id: meta.id,
      original_file_name: meta.name,
      source_sha256: digest,
      source_format: meta.format,
      original_file_bytes: bytes.length,
      source_storage_path: path,
      created_by: gate.identity.userId,
      source_internal_title: preview.sourceMetadataTitle || '',
      source_blocks: preview.blocks,
      extraction_summary: {
        ...preview.stats,
        sourceSha256: digest,
        totalMediaInSource: preview.mediaFilesInPackage,
        previewTruncated: preview.truncated
      },
      warnings: draft.warnings,
      level_number: draft.levelNumber,
      module_number: draft.moduleNumber,
      course_slug: target && draft.levelNumber === target.level
        ? target.courseSlug : null,
      editorial_title: draft.moduleTitle,
      needs_correction:
        meta.format === 'PDF' || draft.metadataTitleMismatch
        || draft.metrics.mediaUnassigned > 0 || !target
        || draft.levelNumber !== target.level,
      sections: draft.sections.map(s => ({
        title: s.title,
        kind: s.kind,
        visibility: s.visibility,
        block_start: s.blockStart,
        block_end: s.blockEnd,
        content_blocks: preview.blocks.slice(s.blockStart, s.blockEnd)
      })),
      media: preview.media.map(m => ({
        id: m.id,
        path: m.path,
        sha256: m.sha256,
        mime_type: m.mimeType,
        bytes: m.bytes,
        block_indexes: m.blockIndexes,
        alt_text: m.altText,
        alt_needs_review: m.altNeedsReview
      }))
    }

    const { data: saved, error: rpcError } = await savePrivateBatch(
      gate.identity.service, payload
    )
    if (rpcError || !saved?.id) {
      const code = rpcError?.code === '23505' ? 'SOURCE_ALREADY_STAGED' : 'STAGING_DATABASE_REJECTED'
      return stageError(code, code === 'SOURCE_ALREADY_STAGED' ? 409 : 422)
    }
    // No record is written to public.modules, public.lessons or assessments.
    return NextResponse.json({
      ok: true,
      result: saved,
      sourceName: meta.name,
      status: saved.status,
      moduleNumber: draft.moduleNumber,
      levelNumber: draft.levelNumber,
      publicationAllowed: false
    }, { headers: SECURITY_HEADERS })
  } catch {
    return stageError('STAGING_FINALIZATION_FAILED', 422)
  }
}
