import Link from 'next/link'
import type { ReactNode } from 'react'

export default function AlumnoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Link
        href="/alumno/soporte"
        aria-label="Abrir soporte GHC Academy"
        style={{
          position: 'fixed',
          right: 18,
          bottom: 88,
          zIndex: 80,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 42,
          padding: '0 15px',
          borderRadius: 999,
          border: '1px solid rgba(99,229,70,.28)',
          background: 'rgba(8,12,10,.94)',
          color: '#b7ffa8',
          textDecoration: 'none',
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: '.04em',
          boxShadow: '0 14px 38px rgba(0,0,0,.28)',
          backdropFilter: 'blur(14px)'
        }}
      >
        <span aria-hidden="true">?</span>
        Soporte
      </Link>
    </>
  )
}
