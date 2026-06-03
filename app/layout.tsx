import "./globals.css"
import type { Metadata } from "next"
import NextAuthProvider from "./components/SessionProvider"


export const metadata: Metadata = {
  title: "ISP Atlântida — Portal Académico",
  description: "Sistema de Gestão Escolar",
}

// Script que corre ANTES do React hidratar para aplicar o tema guardado
// Evita flash de conteúdo errado (FOUC)
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('sge-theme');
      if (theme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        // Garantir que dark mode é o padrão explícito
        if (!theme) {
          localStorage.setItem('sge-theme', 'dark');
        }
      }
    } catch(e) {
      // Se localStorage não disponível, dark mode como padrão
      document.documentElement.classList.remove('light');
    }
  })();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  )
}
