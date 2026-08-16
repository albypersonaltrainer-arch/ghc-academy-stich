update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
  'audio/webm'
]::text[]
where id = 'ghc-course-assets';