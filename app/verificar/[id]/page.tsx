"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function VerificarDocumento() {
  const params = useParams()
  const id = params.id as string

  const [documento, setDocumento] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (id) {
      fetchDocumento()
    }
  }, [id])

  async function fetchDocumento() {
    try {
      const res = await fetch(`/api/verificar/${id}`)
      const data = await res.json()

      if (res.ok) {
        setDocumento(data)
      } else {
        setError(data.error || "Documento não encontrado")
      }
    } catch (err) {
      setError("Erro ao verificar documento")
    } finally {
      setLoading(false)
    }
  }

  const getDocumentTypeLabel = (tipo: string) => {
    switch (tipo) {
      case "declaracao": return "Declaração Académica"
      case "cert-disc": return "Certificado de Disciplinas"
      case "cert": return "Certificado de Conclusão"
      default: return "Documento"
    }
  }

  const getDocumentTypeColor = (tipo: string) => {
    switch (tipo) {
      case "declaracao": return "#4ade80"
      case "cert-disc": return "#6366f1"
      case "cert": return "#f59e0b"
      default: return "#d0d7e8"
    }
  }

  // ─── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <main style={{
        minHeight: "100vh",
        background: "#0d0f14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40,
            border: "3px solid rgba(255,255,255,0.08)",
            borderTop: "3px solid #e03d3d",
            borderRadius: "50%",
            margin: "0 auto 20px",
            animation: "spin 0.8s linear infinite"
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "#d0d7e8", fontSize: "14px", margin: 0 }}>A verificar documento...</p>
        </div>
      </main>
    )
  }

  const tipo = documento?.tipo || null

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0d0f14",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      padding: "24px 16px",
      boxSizing: "border-box"
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        {/* ── Logo + Header ── */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "48px", height: "48px",
            background: "#e03d3d",
            borderRadius: "12px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            fontWeight: "800",
            color: "white",
            marginBottom: "12px"
          }}>A</div>
          <h1 style={{
            color: "#e8eaf0",
            fontSize: "18px",
            fontWeight: "700",
            margin: "0 0 4px"
          }}>Instituto Superior Politécnico Atlântida</h1>
          <p style={{ color: "#b0b8cf", fontSize: "13px", margin: 0 }}>Verificação de Documentos</p>
        </div>

        {/* ── Error ── */}
        {error ? (
          <div style={{
            background: "rgba(224,61,61,0.12)",
            border: "1px solid rgba(224,61,61,0.3)",
            borderRadius: "16px",
            padding: "40px 24px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>✕</div>
            <h2 style={{
              color: "#e03d3d",
              fontSize: "18px",
              fontWeight: "600",
              margin: "0 0 8px"
            }}>Documento Inválido</h2>
            <p style={{ color: "rgba(224,61,61,0.8)", fontSize: "14px", margin: 0 }}>{error}</p>
          </div>
        ) : documento ? (
          /* ── Success Card ── */
          <div style={{
            background: "#1e2230",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{
              padding: "32px 24px",
              textAlign: "center",
              borderBottom: "1px solid rgba(255,255,255,0.07)"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>✓</div>
              <h2 style={{
                color: "#4ade80",
                fontSize: "20px",
                fontWeight: "600",
                margin: "0 0 6px"
              }}>Documento Válido</h2>
              <p style={{ color: "#d0d7e8", fontSize: "13px", margin: "0 0 12px" }}>
                Este documento foi emitido pelo Instituto Superior Politécnico Atlântida
              </p>
              <span style={{
                display: "inline-block",
                background: `${getDocumentTypeColor(tipo)}22`,
                color: getDocumentTypeColor(tipo),
                padding: "4px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "600"
              }}>{getDocumentTypeLabel(tipo)}</span>
            </div>

            {/* Info rows */}
            <div style={{ padding: "20px 24px" }}>
              {/* Número do Documento */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span style={{ color: "#d0d7e8", fontSize: "12px" }}>Nº Documento</span>
                <span style={{ color: "#e8eaf0", fontSize: "13px", fontWeight: "500" }}>
                  {documento.numero_documento}
                </span>
              </div>

              {/* Nome */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span style={{ color: "#d0d7e8", fontSize: "12px" }}>Nome</span>
                <span style={{ color: "#e8eaf0", fontSize: "13px", fontWeight: "500", textAlign: "right" }}>
                  {documento.estudante.nome_completo}
                </span>
              </div>

              {/* Nº Matrícula */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span style={{ color: "#d0d7e8", fontSize: "12px" }}>Matrícula</span>
                <span style={{ color: "#e8eaf0", fontSize: "13px", fontWeight: "500" }}>
                  {documento.estudante.numero_estudante}
                </span>
              </div>

              {/* Curso */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span style={{ color: "#d0d7e8", fontSize: "12px" }}>Curso</span>
                <span style={{ color: "#e8eaf0", fontSize: "13px", fontWeight: "500", textAlign: "right" }}>
                  {documento.estudante.curso.nome_curso}
                </span>
              </div>

              {/* Ano Lectivo */}
              {documento.ano_lectivo && (
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)"
                }}>
                  <span style={{ color: "#d0d7e8", fontSize: "12px" }}>Ano Lectivo</span>
                  <span style={{ color: "#e8eaf0", fontSize: "13px", fontWeight: "500" }}>
                    {documento.ano_lectivo}
                  </span>
                </div>
              )}

              {/* Descrição */}
              {documento.descricao && (
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)"
                }}>
                  <span style={{ color: "#d0d7e8", fontSize: "12px" }}>Descrição</span>
                  <span style={{ color: "#e8eaf0", fontSize: "13px", fontWeight: "500", textAlign: "right" }}>
                    {documento.descricao}
                  </span>
                </div>
              )}

              {/* Data de Emissão */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0"
              }}>
                <span style={{ color: "#d0d7e8", fontSize: "12px" }}>Emissão</span>
                <span style={{ color: "#e8eaf0", fontSize: "13px", fontWeight: "500" }}>
                  {new Date(documento.data_emissao).toLocaleDateString("pt-PT")}
                </span>
              </div>
            </div>

            {/* Footer do card */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              textAlign: "center"
            }}>
              <p style={{ color: "#b0b8cf", fontSize: "11px", margin: 0 }}>
                Verificado em {new Date().toLocaleString("pt-PT")}
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Footer ── */}
        <p style={{
          textAlign: "center",
          color: "#b0b8cf",
          fontSize: "12px",
          marginTop: "24px"
        }}>
          ISP Atlântida © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  )
}