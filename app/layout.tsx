import './globals.css';
import React from 'react'

export const metadata = {
  title: 'GHC Academy',
  description: 'Sport Through Science',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
