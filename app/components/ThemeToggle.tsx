"use client"

import { useState, useEffect } from "react"

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Ler o tema atual do DOM (já aplicado pelo script inline)
    const html = document.documentElement
    setIsDark(!html.classList.contains("light"))
    setMounted(true)
  }, [])

  function toggle() {
    const html = document.documentElement
    if (html.classList.contains("light")) {
      // Está light, mudar para dark
      html.classList.remove("light")
      localStorage.setItem("sge-theme", "dark")
      setIsDark(true)
    } else {
      // Está dark, mudar para light
      html.classList.add("light")
      localStorage.setItem("sge-theme", "light")
      setIsDark(false)
    }
  }

  // Evitar mismatch SSR
  if (!mounted) return null

  return (
    <button
      onClick={toggle}
      title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color-strong)",
        cursor: "pointer",
        padding: "6px 10px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        lineHeight: 1,
        transition: "all 0.2s ease",
        color: "var(--text-primary)",
      }}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  )
}