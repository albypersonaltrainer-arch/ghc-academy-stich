import type { AcademicPreview } from './import-preview'
import { buildAcademicDraft } from './draft-plan'
import type { AcademicDraftSection, DraftKind } from './draft-plan'

export type EditorialDecision = {
  title: string
  kind: DraftKind
  reviewed: boolean
  note: string
}

const KNOWN_KINDS: ReadonlyArray<DraftKind> = [
  'lesson_candidate', 'orientation', 'practice', 'assessment',
  'private_answer_key', 'video_script', 'glossary', 'references', 'other'
]

export function academicReviewPackage(
  preview: AcademicPreview,
  changes: Record<string, EditorialDecision>,
  generatedAt: string = new Date().toISOString()
) {
  const draft = buildAcademicDraft(preview)
  const covered = draft.sections.reduce((n, s) => n + s.blockCount, 0)
  const reviewed = draft.sections.filter(s => Boolean(changes[s.id]?.reviewed)).length
  const shaIsValid = /^[a-f0-9]{64}$/.test(preview.sourceSha256)
  if (!shaIsValid) throw new Error('INVALID_SOURCE_FINGERPRINT')
  if (covered !== preview.blocks.length) throw new Error('INCOMPLETE_SECTION_COVERAGE')

  const sections = draft.sections.map((section: AcademicDraftSection) => {
    const change = changes[section.id]
    const requested = change?.kind
    const requestedKind = KNOWN_KINDS.includes(requested) ? requested : section.kind
    // Never allow a previously detected examination or answer key to become
    // a student-facing lesson by changing a JSON review form.
    const kind = section.kind === 'assessment' || section.kind === 'private_answer_key'
      ? section.kind : requestedKind
    const visibility = kind === 'assessment' || kind === 'private_answer_key'
      ? 'staff_only' : kind === 'lesson_candidate' ? 'student_candidate' : 'needs_decision'
    return {
      ...section,
      editorial: {
        proposedTitle: String(change?.title || '').trim().slice(0, 200) || section.title,
        kind,
        visibility,
        reviewedByHuman: Boolean(change?.reviewed),
        reviewerNote: String(change?.note || '').trim().slice(0, 600),
        approvalStatus: 'not_approved' as const
      }
    }
  })

  return {
    schemaVersion: 'GHC_EDITORIAL_REVIEW_V1' as const,
    status: 'local_unapproved_export' as const,
    writeToCampusAllowed: false as const,
    generatedAt,
    source: {
      fileName: preview.fileName,
      sourceSha256: preview.sourceSha256,
      format: preview.format,
      sourceMetadataTitle: preview.sourceMetadataTitle || null,
      stats: preview.stats,
      truncated: preview.truncated
    },
    qualityGate: {
      fullBlockCoverage: covered === preview.blocks.length,
      metadataTitleMismatch: draft.metadataTitleMismatch,
      unresolvedMediaFiles: draft.metrics.mediaUnassigned,
      suitableForStructuralReview: !preview.truncated
        && !draft.metadataTitleMismatch && draft.levelNumber !== null
        && draft.moduleNumber !== null && preview.format === 'DOCX',
      allSectionsReviewed: reviewed === draft.sections.length,
      humanPublicationApproval: false as const
    },
    levelNumber: draft.levelNumber,
    moduleNumber: draft.moduleNumber,
    moduleTitleSuggestion: draft.moduleTitle,
    sections,
    originalBlocks: preview.blocks,
    imageManifest: preview.media.map(({ previewDataUrl: _image, ...metadata }) => metadata),
    warnings: draft.warnings
  }
}
