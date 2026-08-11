'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { createClient } from '@supabase/supabase-js'
import styles from './LessonStreamingPlayer.module.css'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type Playback = {
  mode: 'file' | 'hls' | 'dash' | 'embed' | 'webrtc' | 'scheduled' | 'unavailable'
  url?: string
  posterUrl?: string | null
  isLive?: boolean
  startsAt?: string | null
  endsAt?: string | null
  provider?: string
  reason?: string
}

type PlaybackSession = {
  session_id: string
  expires_at?: string | null
}

type Props = {
  lessonId: string
  title: string
  fallbackUrl?: string
  onAvailabilityChange?: (available: boolean) => void
}

function formatScheduled(value?: string | null) {
  if (!value) return 'Próximamente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Próximamente'
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

export default function LessonStreamingPlayer({ lessonId, title, fallbackUrl = '', onAvailabilityChange }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const tokenRef = useRef('')
  const lastReportedRef = useRef(0)
  const [playback, setPlayback] = useState<Playback | null>(
    fallbackUrl ? { mode: 'file', url: fallbackUrl, isLive: false, provider: 'legacy' } : null
  )
  const [session, setSession] = useState<PlaybackSession | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setPlayback(fallbackUrl ? { mode: 'file', url: fallbackUrl, isLive: false, provider: 'legacy' } : null)
    setSession(null)
    setError('')
    lastReportedRef.current = 0
  }, [fallbackUrl, lessonId])

  useEffect(() => {
    let active = true

    const load = async () => {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token || ''
      tokenRef.current = token
      if (!token || !lessonId) return

      try {
        const response = await fetch(`/api/academy/streaming/playback?lessonId=${encodeURIComponent(lessonId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        })

        const payload = await response.json().catch(() => null)
        if (!active) return

        if (response.status === 404) {
          return
        }

        if (!response.ok || !payload?.ok) {
          if (!fallbackUrl) setError(payload?.error || 'No se pudo preparar la reproducción.')
          return
        }

        setPlayback(payload.playback || null)
        setSession(payload.session || null)
        setError('')
      } catch (loadError: any) {
        if (active && !fallbackUrl) setError(loadError?.message || 'No se pudo preparar la reproducción.')
      }
    }

    load()
    return () => { active = false }
  }, [fallbackUrl, lessonId])

  const available = Boolean(
    playback && (
      playback.mode === 'scheduled' ||
      playback.mode === 'embed' ||
      playback.mode === 'file' ||
      playback.mode === 'hls'
    )
  )

  useEffect(() => {
    onAvailabilityChange?.(available)
  }, [available, onAvailabilityChange])

  useEffect(() => {
    const video = videoRef.current
    if (!video || playback?.mode !== 'hls' || !playback.url) return

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playback.url
      return () => {
        video.removeAttribute('src')
        video.load()
      }
    }

    if (!Hls.isSupported()) {
      setError('Este navegador no permite reproducir HLS.')
      return
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: playback.isLive === true
    })

    hls.loadSource(playback.url)
    hls.attachMedia(video)
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) setError('Se ha interrumpido la reproducción del streaming.')
    })

    return () => hls.destroy()
  }, [playback?.isLive, playback?.mode, playback?.url])

  const reportProgress = useCallback(async (ended = false) => {
    const video = videoRef.current
    const sessionId = session?.session_id || ''
    const token = tokenRef.current
    if (!video || !sessionId || !token) return

    const position = Math.max(0, Math.floor(Number(video.currentTime || 0)))
    const rawDuration = Number(video.duration)
    const duration = Number.isFinite(rawDuration) && rawDuration >= 0 ? Math.floor(rawDuration) : null

    try {
      await fetch('/api/academy/streaming/progress', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          positionSeconds: position,
          durationSeconds: duration,
          ended
        }),
        cache: 'no-store',
        keepalive: true
      })
    } catch {
      // El progreso de vídeo es telemetría auxiliar; nunca debe bloquear la reproducción.
    }
  }, [session?.session_id])

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video || !session?.session_id) return
    const position = Math.floor(Number(video.currentTime || 0))
    if (position - lastReportedRef.current >= 20) {
      lastReportedRef.current = position
      void reportProgress(false)
    }
  }

  if (!playback && !error) return null

  if (error && !playback?.url) {
    return <div className={styles.state}>{error}</div>
  }

  if (playback?.mode === 'scheduled') {
    return (
      <div className={styles.state}>
        <span className={styles.liveBadge}>DIRECTO PROGRAMADO</span>
        <strong>{title}</strong>
        <p>Disponible {formatScheduled(playback.startsAt)}</p>
      </div>
    )
  }

  if (playback?.mode === 'embed' && playback.url) {
    return (
      <div className={styles.embedWrap}>
        {playback.isLive && <span className={styles.liveBadge}>EN DIRECTO</span>}
        <iframe
          src={playback.url}
          title={`Streaming · ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    )
  }

  if ((playback?.mode === 'dash' || playback?.mode === 'webrtc') && playback.url) {
    return (
      <div className={styles.state}>
        <strong>Proveedor preparado</strong>
        <p>Este protocolo requiere el adaptador específico del proveedor antes de activarse.</p>
      </div>
    )
  }

  if ((playback?.mode === 'file' || playback?.mode === 'hls') && playback.url) {
    return (
      <div className={styles.playerWrap}>
        {playback.isLive && <span className={styles.liveBadge}>EN DIRECTO</span>}
        <video
          ref={videoRef}
          src={playback.mode === 'file' ? playback.url : undefined}
          poster={playback.posterUrl || undefined}
          controls
          playsInline
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onPause={() => void reportProgress(false)}
          onEnded={() => void reportProgress(true)}
        />
        {error && <div className={styles.error}>{error}</div>}
      </div>
    )
  }

  return null
}
