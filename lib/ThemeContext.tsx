"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

type Theme = "dark" | "light"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  // Carregar tema do localStorage quando o componente monta
  useEffect(() => {
    const saved = localStorage.getItem("sge-theme") as Theme | null
    if (saved === "light" || saved === "dark") {
      setTheme(saved)
    }
    setMounted(true)
  }, [])

  // Aplicar classe no <html> sempre que o tema muda
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (theme === "light") {
      root.classList.add("light")
    } else {
      root.classList.remove("light")
    }
    localStorage.setItem("sge-theme", theme)
  }, [theme, mounted])

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Fallback seguro durante SSR ou fora do provider
    return { theme: "dark" as Theme, toggleTheme: () => {} }
  }
  return ctx
}