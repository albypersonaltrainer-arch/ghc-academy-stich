import type { SupabaseClient } from '@supabase/supabase-js'

export type LessonMediaAsset = {
  id: string
  course_id: string
  module_id: string
  lesson_id: string
  media_kind: 'video' | 'audio' | 'live'
  delivery_protocol: 'file' | 'hls' | 'dash' | 'embed' | 'webrtc'
  provider: string
  provider_asset_id?: string | null
  playback_reference?: string | null
  playback_url?: string | null
  storage_bucket?: string | null
  storage_path?: string | null
  poster_url?: string | null
  status: 'ready' | 'scheduled' | 'live'
  is_primary: boolean
  requires_signed_playback: boolean
  duration_seconds?: number | null
  starts_at?: string | null
  ends_at?: string | null
}

export type PlaybackDescriptor = {
  mode: 'file' | 'hls' | 'dash' | 'embed' | 'webrtc' | 'scheduled' | 'unavailable'
  url?: string
  posterUrl?: string | null
  isLive: boolean
  startsAt?: string | null
  endsAt?: string | null
  provider: string
  reason?: string
}

function isSafeHttpUrl(value: string | null | undefined) {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function selectPreferredMediaAsset(assets: LessonMediaAsset[]) {
  if (!Array.isArray(assets) || assets.length === 0) return null

  const liveNow = assets.find((asset) => asset.media_kind === 'live' && asset.status === 'live')
  if (liveNow) return liveNow

  const primaryVideo = assets.find((asset) => asset.media_kind === 'video' && asset.is_primary)
  if (primaryVideo) return primaryVideo

  const video = assets.find((asset) => asset.media_kind === 'video')
  if (video) return video

  const scheduledLive = assets.find((asset) => asset.media_kind === 'live' && asset.status === 'scheduled')
  if (scheduledLive) return scheduledLive

  return assets[0]
}

export async function resolvePlaybackDescriptor(
  supabase: SupabaseClient,
  asset: LessonMediaAsset
): Promise<PlaybackDescriptor> {
  const isLive = asset.media_kind === 'live' || asset.status === 'live'

  if (asset.status === 'scheduled') {
    const start = asset.starts_at ? new Date(asset.starts_at).getTime() : 0
    if (start && start > Date.now()) {
      return {
        mode: 'scheduled',
        provider: asset.provider,
        isLive: true,
        startsAt: asset.starts_at,
        endsAt: asset.ends_at,
        posterUrl: asset.poster_url
      }
    }
  }

  if (asset.provider === 'supabase_storage') {
    if (asset.delivery_protocol !== 'file') {
      return {
        mode: 'unavailable',
        provider: asset.provider,
        isLive,
        reason: 'Supabase Storage se mantiene para archivos; el streaming adaptativo debe resolverse mediante un proveedor de streaming.'
      }
    }

    if (!asset.storage_bucket || !asset.storage_path) {
      return {
        mode: 'unavailable',
        provider: asset.provider,
        isLive,
        reason: 'Falta bucket o ruta del archivo multimedia.'
      }
    }

    const { data, error } = await supabase.storage
      .from(asset.storage_bucket)
      .createSignedUrl(asset.storage_path, 60 * 10)

    if (error || !data?.signedUrl) {
      return {
        mode: 'unavailable',
        provider: asset.provider,
        isLive,
        reason: 'No se pudo emitir una URL temporal para el archivo.'
      }
    }

    return {
      mode: 'file',
      url: data.signedUrl,
      posterUrl: asset.poster_url,
      isLive: false,
      provider: asset.provider
    }
  }

  if (!asset.requires_signed_playback && isSafeHttpUrl(asset.playback_url)) {
    return {
      mode: asset.delivery_protocol,
      url: asset.playback_url || undefined,
      posterUrl: asset.poster_url,
      isLive,
      startsAt: asset.starts_at,
      endsAt: asset.ends_at,
      provider: asset.provider
    }
  }

  if (asset.requires_signed_playback) {
    return {
      mode: 'unavailable',
      provider: asset.provider,
      isLive,
      reason: `El adaptador firmado para ${asset.provider} todavía no está configurado.`
    }
  }

  return {
    mode: 'unavailable',
    provider: asset.provider,
    isLive,
    reason: 'El recurso no tiene una URL de reproducción válida.'
  }
}
