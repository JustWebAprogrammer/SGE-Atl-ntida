"use client"

import { useTheme } from "@/lib/ThemeContext"

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
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
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  )
}