import type { Metadata } from "next"
import NextAuthProvider from "./components/SessionProvider"

export const metadata: Metadata = {
  title: "ISP Atlântida — Portal Académico",
  description: "Sistema de Gestão Escolar",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt">
      <body suppressHydrationWarning style={{ background: '#0d0f14', margin: 0, padding: 0 }}>
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  )
}