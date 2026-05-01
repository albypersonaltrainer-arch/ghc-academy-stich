import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GHC ACADEMY | Sport Through Science',
  description: 'Protocolos avanzados de optimización humana',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* Aquí podríamos añadir analytics o píxeles en el futuro */}
      </head>
      <body>{children}</body>
    </html>
  )
}
