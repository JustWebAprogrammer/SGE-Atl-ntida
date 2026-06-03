import type { Metadata } from "next"
import NextAuthProvider from "./components/SessionProvider"
import { ThemeProvider } from "@/lib/ThemeContext"

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
    <html lang="pt" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0 }}>
        <ThemeProvider>
          <NextAuthProvider>{children}</NextAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
