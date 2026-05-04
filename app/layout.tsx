import './globals.css'

export const metadata = {
  title: 'GHC Academy',
  description: 'Sport Through Science'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  )
}
