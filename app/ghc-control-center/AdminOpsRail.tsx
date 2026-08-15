'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function AdminOpsRail() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

  useEffect(() => {
    if (pathname === '/ghc-control-center' && tab === 'pagos') {
      router.replace('/ghc-control-center/accesos')
    }
  }, [pathname, tab, router])

  if (!pathname?.startsWith('/ghc-control-center')) return null

  return (
    <nav
      aria-label="Herramientas operativas GHC"
      style={{
        position: 'fixed',
        right: 14,
        bottom: 14,
        zIndex: 120,
        display: 'flex',
        gap: 8,
        padding: 7,
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,.10)',
        background: 'rgba(6,10,8,.94)',
        boxShadow: '0 18px 50px rgba(0,0,0,.35)',
        backdropFilter: 'blur(16px)'
      }}
    >
      <Link href="/ghc-control-center/accesos" style={linkStyle}>Pagos y accesos</Link>
      <Link href="/ghc-control-center/soporte" style={linkStyle}>Soporte</Link>
      <Link href="/ghc-control-center/seguridad" style={linkStyle}>Seguridad</Link>
    </nav>
  )
}

const linkStyle = {
  minHeight: 34,
  padding: '0 12px',
  borderRadius: 999,
  display: 'inline-flex',
  alignItems: 'center',
  color: '#b8ffaa',
  textDecoration: 'none',
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: '.04em',
  whiteSpace: 'nowrap'
} as const
