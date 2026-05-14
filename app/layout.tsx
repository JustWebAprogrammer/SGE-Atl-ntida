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
      <body suppressHydrationWarning>
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  )
}