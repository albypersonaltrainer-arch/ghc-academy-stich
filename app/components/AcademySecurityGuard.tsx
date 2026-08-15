'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function academyRoute(pathname: string) {
  return pathname.startsWith('/alumno') || pathname.startsWith('/cursos/')
}

function courseContentRoute(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  return parts[0] === 'cursos' && parts.length >= 3
}

function lessonIdFromPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  const candidate = parts[0] === 'cursos' && parts.length >= 3 ? parts[2] : ''
  return UUID_RE.test(candidate) ? candidate : null
}

function shortId(value: string | null | undefined) {
  const clean = String(value || '').replace(/-/g, '')
  return clean ? clean.slice(-8).toUpperCase() : ''
}

type SecurityIdentity = {
  userEmail: string
  userCode: string
  sessionCode: string
}

export default function AcademySecurityGuard() {
  const pathname = usePathname() || ''
  const [identity, setIdentity] = useState<SecurityIdentity | null>(null)

  const isAcademy = academyRoute(pathname)
  const showWatermark = courseContentRoute(pathname)
  const lessonId = useMemo(() => lessonIdFromPath(pathname), [pathname])

  useEffect(() => {
    if (!isAcademy) {
      setIdentity(null)
      return
    }

    let active = true
    let intervalId: ReturnType<typeof setInterval> | null = null

    const touch = async () => {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) {
        if (active) setIdentity(null)
        return
      }

      const { data: securityData } = await supabase.rpc('ghc_student_touch_security_session', {
        p_course_id: null,
        p_lesson_id: lessonId
      })

      if (!active) return

      setIdentity({
        userEmail: String(user.email || 'usuario GHC'),
        userCode: shortId(user.id),
        sessionCode: shortId(securityData?.session_id)
      })
    }

    void touch()
    intervalId = setInterval(() => { void touch() }, 5 * 60 * 1000)

    return () => {
      active = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [isAcademy, lessonId])

  if (!showWatermark || !identity) return null

  const label = `GHC Academy · ${identity.userEmail} · U:${identity.userCode}${identity.sessionCode ? ` · S:${identity.sessionCode}` : ''}`

  return (
    <div
      aria-hidden="true"
      data-ghc-security-watermark="active"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483000,
        pointerEvents: 'none',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(240px, 1fr))',
        gridTemplateRows: 'repeat(4, 1fr)',
        alignItems: 'center',
        justifyItems: 'center',
        opacity: 0.11,
        userSelect: 'none'
      }}
    >
      {Array.from({ length: 12 }).map((_, index) => (
        <span
          key={index}
          style={{
            display: 'block',
            maxWidth: 320,
            padding: '5px 9px',
            color: '#ffffff',
            fontSize: 10,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: '0.04em',
            textAlign: 'center',
            transform: `rotate(${index % 2 === 0 ? -22 : -18}deg)`,
            textShadow: '0 1px 3px rgba(0,0,0,.85)',
            whiteSpace: 'normal'
          }}
        >
          {label}
        </span>
      ))}
    </div>
  )
}
