import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GHC Academy | SPORT THROUGH SCIENCE",
  description: "Academia online premium de preparación física, salud y entrenamiento basada en ciencia.",
  icons: { icon: "/logo-limpio.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body>{children}</body>
    </html>
  );
}
