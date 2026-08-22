import Link from 'next/link'
import './globals.css'
import AcademyMediaGuard from './components/AcademyMediaGuard'
import AcademySecurityGuard from './components/AcademySecurityGuard'

export const metadata = {
  title: 'GHC Academy',
  description: 'Formación profesional online para entrenadores basada en conocimiento aplicado, criterio y ciencia.'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <AcademyMediaGuard />
        <AcademySecurityGuard />
        {children}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,.08)', background: '#070b08', padding: '18px 22px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, fontSize: 12 }}>
          <Link href="/legal#aviso" style={{ color: '#a8b9ac', textDecoration: 'none' }}>Aviso legal</Link>
          <Link href="/legal#contratacion" style={{ color: '#a8b9ac', textDecoration: 'none' }}>Contratación</Link>
          <Link href="/legal#desistimiento" style={{ color: '#a8b9ac', textDecoration: 'none' }}>Desistimiento y reembolsos</Link>
          <Link href="/legal#privacidad" style={{ color: '#a8b9ac', textDecoration: 'none' }}>Privacidad</Link>
          <Link href="/legal#cookies" style={{ color: '#a8b9ac', textDecoration: 'none' }}>Cookies</Link>
        </footer>
      </body>
    </html>
  )
}
