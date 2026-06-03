"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface Disciplina {
  nome_disciplina: string
  codigo_disciplina: string
  semestre: string
  ano_curricular: number
  nota_final: string
  situacao: string
}

interface DocumentoData {
  tipo: "declaracao" | "cert-disc" | "cert"
  id: number
  numero_documento: string
  data_emissao: string
  ano_lectivo?: string
  descricao?: string
  nota_final?: string
  nota_extenso?: string
  disciplinas?: Disciplina[]
  estudante: {
    nome_completo: string
    numero_estudante: string | null
    ano_current?: number | null
    estado?: string
    curso: {
      nome_curso: string
    }
  }
}

export default function VerificarDocumento() {
  const params = useParams()
  const id = params.id as string

  const [documento, setDocumento] = useState<DocumentoData | null>(null)
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
    } catch {
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
      default: return "var(--text-secondary)"
    }
  }

  const getEstadoLabel = (estado?: string) => {
    switch (estado) {
      case "EmCurso": return { label: "Em Curso", color: "#4ade80" }
      case "Finalizado": return { label: "Finalizado", color: "#3b82f6" }
      case "Desistente": return { label: "Desistente", color: "#f87171" }
      case "Suspendido": return { label: "Suspendido", color: "#fbbf24" }
      default: return { label: estado || "—", color: "var(--text-muted)" }
    }
  }

  const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
      case "Aprovado": return "#4ade80"
      case "Reprovado": return "#f87171"
      case "Dispensada": return "#fbbf24"
      default: return "var(--text-muted)"
    }
  }

  // ─── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <main style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, var(--bg-primary) 0%, #141820 50%, var(--bg-primary) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        padding: "24px 16px",
        boxSizing: "border-box"
      }}>
        <div style={{ textAlign: "center" }}>
          {/* QR Scanner Animation */}
          <div style={{
            width: 120,
            height: 120,
            margin: "0 auto 24px",
            position: "relative",
            background: "rgba(224,61,61,0.05)",
            borderRadius: "12px",
            border: "2px solid rgba(224,61,61,0.2)",
            overflow: "hidden"
          }}>
            {/* Canto superior esquerdo */}
            <div style={{ position: "absolute", top: 0, left: 0, width: 24, height: 24, borderTop: "3px solid var(--accent)", borderLeft: "3px solid var(--accent)", borderTopLeftRadius: 4 }} />
            {/* Canto superior direito */}
            <div style={{ position: "absolute", top: 0, right: 0, width: 24, height: 24, borderTop: "3px solid var(--accent)", borderRight: "3px solid var(--accent)", borderTopRightRadius: 4 }} />
            {/* Canto inferior esquerdo */}
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 24, height: 24, borderBottom: "3px solid var(--accent)", borderLeft: "3px solid var(--accent)", borderBottomLeftRadius: 4 }} />
            {/* Canto inferior direito */}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderBottom: "3px solid var(--accent)", borderRight: "3px solid var(--accent)", borderBottomRightRadius: 4 }} />
            {/* Scanning line */}
            <div style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
              animation: "scan 1.5s ease-in-out infinite",
              top: 0
            }} />
          </div>
          <style>{`@keyframes scan { 0%, 100% { top: 0; } 50% { top: calc(100% - 2px); } }`}</style>
          <div style={{
            display: "flex",
            gap: 6,
            justifyContent: "center",
            marginBottom: 12
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "dotPulse 1.4s ease-in-out infinite" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "dotPulse 1.4s ease-in-out infinite 0.2s" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "dotPulse 1.4s ease-in-out infinite 0.4s" }} />
          </div>
          <style>{`@keyframes dotPulse { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }`}</style>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>A verificar documento...</p>
        </div>
      </main>
    )
  }

  const tipo = documento?.tipo || "unknown"

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, var(--bg-primary) 0%, #141820 50%, var(--bg-primary) 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      padding: "24px 16px",
      boxSizing: "border-box"
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes checkDraw { to { stroke-dashoffset: 0; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
      `}</style>
      <div style={{ width: "100%", maxWidth: "520px", animation: "fadeIn 0.4s ease-out" }}>
        {/* ── Logo + Header ── */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "52px", height: "52px",
            background: "var(--accent)",
            borderRadius: "14px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            fontWeight: "800",
            color: "white",
            marginBottom: "12px",
            boxShadow: "0 4px 20px rgba(224,61,61,0.3)"
          }}>A</div>
          <h1 style={{
            color: "var(--text-primary)",
            fontSize: "18px",
            fontWeight: "700",
            margin: "0 0 4px"
          }}>Instituto Superior Politécnico Atlântida</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>Verificação de Documentos</p>
        </div>

        {/* ── Error ── */}
        {error ? (
          <div style={{
            background: "rgba(224,61,61,0.1)",
            border: "1px solid rgba(224,61,61,0.25)",
            borderRadius: "16px",
            padding: "40px 24px",
            textAlign: "center",
            animation: "shake 0.5s ease-in-out"
          }}>
            <div style={{
              width: 64, height: 64,
              borderRadius: "50%",
              background: "rgba(224,61,61,0.15)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 style={{
              color: "var(--accent)",
              fontSize: "18px",
              fontWeight: "600",
              margin: "0 0 8px"
            }}>Documento Inválido</h2>
            <p style={{ color: "rgba(224,61,61,0.8)", fontSize: "14px", margin: 0 }}>{error}</p>
          </div>
        ) : documento ? (
          /* ── Success Card ── */
          <div style={{
            background: "rgba(30,34,48,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 8px 40px rgba(0,0,0,0.3)"
          }}>
            {/* Header with seal */}
            <div style={{
              padding: "36px 24px 24px",
              textAlign: "center",
              borderBottom: "1px solid rgba(255,255,255,0.06)"
            }}>
              <div style={{
                width: 56, height: 56,
                borderRadius: "50%",
                background: "rgba(74,222,128,0.12)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px",
                animation: "scaleIn 0.4s ease-out"
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" strokeDasharray="30" strokeDashoffset="30" style={{ animation: "checkDraw 0.6s ease-out 0.3s forwards" }} />
                </svg>
              </div>
              <h2 style={{
                color: "#4ade80",
                fontSize: "20px",
                fontWeight: "600",
                margin: "0 0 6px"
              }}>Documento Válido</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "0 0 12px" }}>
                Este documento foi emitido pelo Instituto Superior Politécnico Atlântida
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <span style={{
                  display: "inline-block",
                  background: `${getDocumentTypeColor(tipo)}22`,
                  color: getDocumentTypeColor(tipo),
                  padding: "4px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  border: `1px solid ${getDocumentTypeColor(tipo)}33`
                }}>{getDocumentTypeLabel(tipo)}</span>

                {/* Estado do estudante (para declaração e certificados) */}
                {documento.estudante.estado && (
                  <span style={{
                    display: "inline-block",
                    background: `${getEstadoLabel(documento.estudante.estado).color}22`,
                    color: getEstadoLabel(documento.estudante.estado).color,
                    padding: "4px 14px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border: `1px solid ${getEstadoLabel(documento.estudante.estado).color}33`
                  }}>
                    {getEstadoLabel(documento.estudante.estado).label}
                  </span>
                )}
              </div>
            </div>

            {/* Info rows */}
            <div style={{ padding: "20px 24px" }}>
              {/* Número do Documento */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Nº Documento</span>
                <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "500" }}>
                  {documento.numero_documento}
                </span>
              </div>

              {/* Nome */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Nome</span>
                <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "500", textAlign: "right" }}>
                  {documento.estudante.nome_completo}
                </span>
              </div>

              {/* Nº Matrícula */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Matrícula</span>
                <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "500" }}>
                  {documento.estudante.numero_estudante || "—"}
                </span>
              </div>

              {/* Curso */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Curso</span>
                <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "500", textAlign: "right" }}>
                  {documento.estudante.curso.nome_curso}
                </span>
              </div>

              {/* ── Campos específicos por tipo ── */}

              {/* Declaração: Ano Lectivo + Ano Curricular */}
              {tipo === "declaracao" && (
                <>
                  {documento.ano_lectivo && (
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)"
                    }}>
                      <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Ano Lectivo</span>
                      <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "500" }}>
                        {documento.ano_lectivo}
                      </span>
                    </div>
                  )}
                  {documento.estudante.ano_current && (
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)"
                    }}>
                      <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Ano Curricular</span>
                      <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "500" }}>
                        {documento.estudante.ano_current}º Ano
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Certificado de Disciplinas: Tabela */}
              {tipo === "cert-disc" && documento.disciplinas && (
                <div style={{
                  padding: "16px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)"
                }}>
                  <span style={{
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    fontWeight: "600",
                    display: "block",
                    marginBottom: "12px"
                  }}>Disciplinas e Notas</span>

                  {/* Tabela */}
                  <div style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    overflow: "hidden"
                  }}>
                    {/* Header */}
                    <div style={{
                      display: "flex",
                      background: "rgba(255,255,255,0.04)",
                      borderBottom: "1px solid rgba(255,255,255,0.06)"
                    }}>
                      <div style={{ flex: 3, padding: "8px 10px", fontSize: "10px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Disciplina</div>
                      <div style={{ flex: 1, padding: "8px 6px", fontSize: "10px", fontWeight: "600", color: "var(--text-muted)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sem.</div>
                      <div style={{ flex: 1, padding: "8px 6px", fontSize: "10px", fontWeight: "600", color: "var(--text-muted)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ano</div>
                      <div style={{ flex: 1, padding: "8px 6px", fontSize: "10px", fontWeight: "600", color: "var(--text-muted)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>Nota</div>
                      <div style={{ flex: 1.2, padding: "8px 6px", fontSize: "10px", fontWeight: "600", color: "var(--text-muted)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>Situação</div>
                    </div>

                    {/* Rows */}
                    {documento.disciplinas.map((disc, index) => (
                      <div key={index} style={{
                        display: "flex",
                        borderBottom: index < documento.disciplinas!.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        background: index % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)"
                      }}>
                        <div style={{ flex: 3, padding: "8px 10px", fontSize: "11px", color: "var(--text-primary)" }}>{disc.nome_disciplina}</div>
                        <div style={{ flex: 1, padding: "8px 6px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>{disc.semestre === "1º Semestre" ? "1º" : "2º"}</div>
                        <div style={{ flex: 1, padding: "8px 6px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>{disc.ano_curricular}º</div>
                        <div style={{ flex: 1, padding: "8px 6px", fontSize: "11px", color: "var(--text-primary)", textAlign: "center", fontWeight: "500" }}>{disc.nota_final}</div>
                        <div style={{
                          flex: 1.2,
                          padding: "8px 6px",
                          fontSize: "10px",
                          textAlign: "center",
                          color: getSituacaoColor(disc.situacao),
                          fontWeight: "600"
                        }}>{disc.situacao}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certificado de Conclusão: Nota Final */}
              {tipo === "cert" && (
                <div style={{
                  padding: "20px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  textAlign: "center"
                }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: "12px", display: "block", marginBottom: "8px" }}>
                    Nota Final
                  </span>
                  <div style={{
                    display: "inline-block",
                    background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))",
                    border: "2px solid rgba(245,158,11,0.2)",
                    borderRadius: "16px",
                    padding: "16px 32px"
                  }}>
                    <span style={{
                      color: "#fbbf24",
                      fontSize: "36px",
                      fontWeight: "800",
                      letterSpacing: "1px"
                    }}>
                      {documento.nota_final}
                    </span>
                  </div>
                  {documento.nota_extenso && (
                    <p style={{
                      color: "var(--text-muted)",
                      fontSize: "13px",
                      fontStyle: "italic",
                      margin: "12px 0 0"
                    }}>
                      {documento.nota_extenso}
                    </p>
                  )}
                </div>
              )}

              {/* Descrição */}
              {documento.descricao && tipo !== "cert-disc" && (
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)"
                }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Descrição</span>
                  <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "500", textAlign: "right" }}>
                    {documento.descricao}
                  </span>
                </div>
              )}

              {/* Data de Emissão */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0"
              }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Emissão</span>
                <span style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: "500" }}>
                  {new Date(documento.data_emissao).toLocaleDateString("pt-PT")}
                </span>
              </div>
            </div>

            {/* Footer do card */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              textAlign: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span style={{ color: "#4ade80", fontSize: "11px", opacity: 0.8 }}>Documento verificado digitalmente</span>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "11px", margin: 0 }}>
                Verificado em {new Date().toLocaleString("pt-PT")}
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Footer ── */}
        <p style={{
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "12px",
          marginTop: "24px"
        }}>
          ISP Atlântida © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  )
}