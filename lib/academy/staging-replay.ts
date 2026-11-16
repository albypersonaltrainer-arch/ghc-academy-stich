// Read-only retry policy for a source that may already have been staged.
// A retry is accepted only when it points to exactly the same original bytes.
export type SourceReplayMeta = {
  id: string
  name: string
  size: number
  format: 'DOCX' | 'PDF'
  sha256: string
}

export type ExistingReplaySource = {
  id: string
  original_file_name: string
  original_file_bytes: number
  source_format: 'DOCX' | 'PDF'
  source_sha256: string
  source_storage_path: string
}

export function classifySourceReplay(
  attempted: SourceReplayMeta,
  existing: ExistingReplaySource | null,
  expectedPath: string
): 'new' | 'same_source' | 'conflict' {
  if (!existing) return 'new'
  return (
    existing.id === attempted.id &&
    existing.original_file_name === attempted.name &&
    existing.original_file_bytes === attempted.size &&
    existing.source_format === attempted.format &&
    existing.source_sha256 === attempted.sha256 &&
    existing.source_storage_path === expectedPath
  ) ? 'same_source' : 'conflict'
}
