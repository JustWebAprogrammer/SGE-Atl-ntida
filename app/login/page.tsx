"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    })

    if (result?.error) {
      setError("Email ou senha incorretos")
      setLoading(false)
      return
    }

    router.push("/dashboard")
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0d0f14",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        padding: "0 24px"
      }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            background: "#e03d3d",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            fontWeight: "800",
            color: "white",
            margin: "0 auto 16px"
          }}>A</div>
          <h1 style={{
            color: "#e8eaf0",
            fontSize: "22px",
            fontWeight: "700",
            margin: "0 0 4px"
          }}>ISP Atlântida</h1>
          <p style={{
            color: "#b0b8cf",
            fontSize: "13px",
            margin: 0
          }}>Portal Académico</p>
        </div>

        {/* Card */}
        <div style={{
          background: "#1e2230",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "16px",
          padding: "32px"
        }}>
          <h2 style={{
            color: "#e8eaf0",
            fontSize: "18px",
            fontWeight: "600",
            margin: "0 0 24px"
          }}>Entrar na conta</h2>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                color: "#d0d7e8",
                fontSize: "12px",
                fontWeight: "500",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@ispatlantida.ao"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "#13161e",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                  color: "#e8eaf0",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                color: "#d0d7e8",
                fontSize: "12px",
                fontWeight: "500",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "#13161e",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                  color: "#e8eaf0",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(224,61,61,0.12)",
                border: "1px solid rgba(224,61,61,0.3)",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "#e03d3d",
                fontSize: "13px",
                marginBottom: "16px"
              }}>{error}</div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                background: loading ? "#b0b8cf" : "#e03d3d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity 0.15s"
              }}
            >
              {loading ? "A entrar..." : "Entrar"}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: "center",
          color: "#b0b8cf",
          fontSize: "12px",
          marginTop: "24px"
        }}>
          ISP Atlântida © 2026
        </p>
      </div>
    </main>
  )
}