import Link from 'next/link'
import type { ReactNode } from 'react'

export default function FinancingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Link
        href="/ghc-control-center/avisos-comerciales"
        aria-label="Abrir avisos comerciales de GHC Academy"
        style={{
          position: 'fixed',
          right: 18,
          bottom: 22,
          zIndex: 90,
          minHeight: 44,
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0 16px',
          borderRadius: 999,
          border: '1px solid rgba(99,229,70,.32)',
          background: 'rgba(8,12,10,.95)',
          color: '#b7ffa8',
          textDecoration: 'none',
          fontSize: 12,
          fontWeight: 900,
          boxShadow: '0 14px 38px rgba(0,0,0,.32)',
          backdropFilter: 'blur(14px)'
        }}
      >
        Avisos comerciales
      </Link>
    </>
  )
}
