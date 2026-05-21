// app/orientador/monografias/MonografiasDashboard.tsx
"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { arredondarNota } from "@/lib/notas"

import { orientadorNavItems as navItems } from "../orientadorNav"

type Estudante = {
  id_estudante: number
  nome: string
  numero_estudante: string | null
  curso: string
}

type Monografia = {
  id_monografia: number
  titulo: string
  resumo: string | null
  estado: string
  nota_final: number | null
  feedback: string | null
  data_submissao: string | null
  data_defesa: string | null
  nome_co_orientador: string | null
  nome_co_autor: string | null
  caminho_arquivo: string | null
  nome_arquivo: string | null
  estudante: Estudante
}

type Premonografia = {
  id_premonografia: number
  tema: string
  estado: string
  data_proposta: string
  caminho_arquivo: string | null
  nome_arquivo: string | null
  feedback: string | null
  estudante: Estudante
}

function Badge({ estado }: { estado: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Proposto:    { bg: "rgba(240,165,0,0.12)",   color: "#f0a500" },
    Aprovado:    { bg: "rgba(34,197,94,0.12)",    color: "#22c55e" },
    Reprovado:   { bg: "rgba(224,61,61,0.12)",    color: "#e03d3d" },
    Cancelado:   { bg: "rgba(85,94,120,0.2)",     color: "#b0b8cf" },
    Submetida:   { bg: "rgba(45,212,191,0.12)",   color: "#2dd4bf" },
    EmRevisao:   { bg: "rgba(240,165,0,0.12)",    color: "#f0a500" },
    Aprovada:    { bg: "rgba(34,197,94,0.12)",    color: "#22c55e" },
    Rejeitada:   { bg: "rgba(224,61,61,0.12)",    color: "#e03d3d" },
    ParaDefender:{ bg: "rgba(155,89,182,0.12)",   color: "#9b59b6" },
    Defendida:   { bg: "rgba(34,197,94,0.12)",    color: "#22c55e" },
  }
  const s = map[estado] ?? { bg: "rgba(85,94,120,0.2)", color: "#b0b8cf" }
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "11px", fontWeight: "600"
    }}>{estado === "EmRevisao" ? "Em Revisão" : estado}</span>
  )
}

const card: React.CSSProperties = {
  background: "#1e2230",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "14px",
  padding: "20px",
  marginBottom: "12px",
}

const btnBase: React.CSSProperties = {
  padding: "6px 14px",
  border: "none",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  color: "white",
}

export default function OrientadorMonografiasDashboard() {
  const [monografias, setMonografias] = useState<Monografia[]>([])
  const [premonografias, setPremonografias] = useState<Premonografia[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"premonografias" | "monografias">("premonografias")

  // Monografia evaluation state
  const [avalMonId, setAvalMonId] = useState<number | null>(null)
  const [feedbackMon, setFeedbackMon] = useState("")
  const [estadoMon, setEstadoMon] = useState<"EmRevisao" | "Aprovada" | "Rejeitada">("EmRevisao")
  const [processandoMon, setProcessandoMon] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/orientador/monografias")
      .then(r => r.json())
      .then(data => {
        setMonografias(data.monografias ?? [])
        setPremonografias(data.premonografias ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  function handleDownload(caminho: string, nome: string, tipo: "monografia" | "premonografia" = "monografia") {
    const url = `/api/orientador/download?path=${encodeURIComponent(caminho)}&nome=${encodeURIComponent(nome)}&tipo=${tipo}`
    window.open(url, "_blank")
  }

  async function avaliarMonografia(id: number) {
    setProcessandoMon(id)
    try {
      const res = await fetch(`/api/orientador/monografias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: estadoMon, feedback: feedbackMon || null })
      })
      if (res.ok) {
        setMonografias(prev => prev.map(m =>
          m.id_monografia === id ? { ...m, estado: estadoMon, feedback: feedbackMon || null } : m
        ))
        setAvalMonId(null)
        setFeedbackMon("")
      } else {
        const d = await res.json()
        alert(d.error || "Erro ao avaliar")
      }
    } catch {
      alert("Erro de rede")
    } finally {
      setProcessandoMon(null)
    }
  }

  const totalProposto = premonografias.filter(p => p.estado === "Proposto").length
  const totalSubmetidas = monografias.filter(m => m.estado === "Submetida").length

  return (
    <DashboardLayout
      navItems={navItems}
      title="Monografias"
      subtitle="Gestão de pré-projectos e monografias dos seus orientandos"
    >
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Pré-Projectos",     value: premonografias.length,  color: "#2dd4bf" },
          { label: "Aguardam Revisão",  value: totalProposto,           color: "#f0a500" },
          { label: "Monografias",       value: monografias.length,      color: "#9b59b6" },
          { label: "Submetidas",        value: totalSubmetidas,         color: "#e03d3d" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#1e2230",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "14px",
            padding: "20px",
            borderTop: `2px solid ${s.color}`
          }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#b0b8cf", marginBottom: "10px" }}>
              {s.label}
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {(["premonografias", "monografias"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...btnBase,
              background: tab === t ? "#2dd4bf" : "#1e2230",
              color: tab === t ? "#0d0f14" : "#d0d7e8",
              border: tab === t ? "none" : "1px solid rgba(255,255,255,0.07)",
              padding: "8px 20px",
              fontSize: "13px",
            }}
          >
            {t === "premonografias" ? `Pré-Projectos (${premonografias.length})` : `Monografias (${monografias.length})`}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: "#b0b8cf", padding: "60px" }}>A carregar...</div>
      )}

      {/* ── PRÉ-PROJECTOS ── */}
      {!loading && tab === "premonografias" && (
        <>
          {premonografias.length === 0 && (
            <div style={{ ...card, textAlign: "center", color: "#b0b8cf", padding: "40px" }}>
              Nenhum pré-projecto encontrado.
            </div>
          )}
          {premonografias.map(p => (
            <div key={p.id_premonografia} style={card}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0", marginBottom: "4px" }}>
                    {p.tema}
                  </div>
                  <div style={{ fontSize: "12px", color: "#d0d7e8" }}>
                    {p.estudante.nome}
                    {p.estudante.numero_estudante && (
                      <span style={{ color: "#b0b8cf" }}> · {p.estudante.numero_estudante}</span>
                    )}
                    <span style={{ color: "#b0b8cf" }}> · {p.estudante.curso}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#b0b8cf", marginTop: "4px" }}>
                    Submetido em {new Date(p.data_proposta).toLocaleDateString("pt-AO")}
                  </div>
                </div>
                <Badge estado={p.estado} />
              </div>

              {/* Existing feedback */}
              {p.feedback && p.estado !== "Proposto" && (
                <div style={{
                  background: "rgba(144,152,176,0.08)", borderRadius: "8px",
                  padding: "10px 14px", marginBottom: "12px",
                  fontSize: "12px", color: "#d0d7e8"
                }}>
                  <strong style={{ color: "#b0b8cf" }}>Feedback: </strong>{p.feedback}
                </div>
              )}

                {/* Download */}
                {p.caminho_arquivo && p.nome_arquivo && (
                  <button
                    onClick={() => handleDownload(p.caminho_arquivo!, p.nome_arquivo!, "premonografia")}
                    style={{ ...btnBase, background: "#2d3348" }}
                  >
                    ⬇ {p.nome_arquivo}
                  </button>
                )}
            </div>
          ))}
        </>
      )}

      {/* ── MONOGRAFIAS ── */}
      {!loading && tab === "monografias" && (
        <>
          {monografias.length === 0 && (
            <div style={{ ...card, textAlign: "center", color: "#b0b8cf", padding: "40px" }}>
              Nenhuma monografia encontrada.
            </div>
          )}
          {monografias.map(m => {
            const podeAvaliar = ["Submetida", "EmRevisao"].includes(m.estado)
            return (
              <div key={m.id_monografia} style={card}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0", marginBottom: "4px" }}>
                      {m.titulo}
                    </div>
                    <div style={{ fontSize: "12px", color: "#d0d7e8" }}>
                      {m.estudante.nome}
                      {m.estudante.numero_estudante && (
                        <span style={{ color: "#b0b8cf" }}> · {m.estudante.numero_estudante}</span>
                      )}
                      <span style={{ color: "#b0b8cf" }}> · {m.estudante.curso}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#b0b8cf", marginTop: "4px" }}>
                      Submetida em {m.data_submissao ? new Date(m.data_submissao).toLocaleDateString("pt-AO") : "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    <Badge estado={m.estado} />
                    {m.nota_final != null && (
                      <span style={{
                        fontSize: "13px", fontWeight: "700",
                        color: m.nota_final >= 10 ? "#22c55e" : "#e03d3d"
                      }}>
                        {arredondarNota(m.nota_final)} / 20
                      </span>
                    )}
                  </div>
                </div>

                {/* Resumo */}
                {m.resumo && (
                  <div style={{ fontSize: "12px", color: "#d0d7e8", marginBottom: "10px", lineHeight: "1.5" }}>
                    {m.resumo.length > 200 ? m.resumo.slice(0, 200) + "…" : m.resumo}
                  </div>
                )}

                {/* Existing feedback */}
                {m.feedback && (
                  <div style={{
                    background: "rgba(144,152,176,0.08)", borderRadius: "8px",
                    padding: "10px 14px", marginBottom: "12px",
                    fontSize: "12px", color: "#d0d7e8"
                  }}>
                    <strong style={{ color: "#b0b8cf" }}>Feedback: </strong>{m.feedback}
                  </div>
                )}

                {/* Action row */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  {m.caminho_arquivo && m.nome_arquivo && (
                    <button
                      onClick={() => handleDownload(m.caminho_arquivo!, m.nome_arquivo!)}
                      style={{ ...btnBase, background: "#2d3348" }}
                    >
                      ⬇ {m.nome_arquivo}
                    </button>
                  )}
                  {podeAvaliar && avalMonId !== m.id_monografia && (
                    <button
                      onClick={() => {
                        setAvalMonId(m.id_monografia)
                        setFeedbackMon(m.feedback ?? "")
                        setEstadoMon(m.estado === "Submetida" ? "EmRevisao" : "Aprovada")
                      }}
                      style={{ ...btnBase, background: "#f0a500" }}
                    >
                      Avaliar
                    </button>
                  )}
                </div>

                {/* Inline evaluation form */}
                {avalMonId === m.id_monografia && (
                  <div style={{
                    marginTop: "14px", padding: "16px",
                    background: "#13161e", borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.07)"
                  }}>
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "12px", color: "#b0b8cf", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Novo Estado
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {(["EmRevisao", "Aprovada", "Rejeitada"] as const)
                          .filter(e => {
                            // Only show valid transitions
                            if (m.estado === "Submetida") return e === "EmRevisao"
                            if (m.estado === "EmRevisao") return e === "Aprovada" || e === "Rejeitada"
                            return false
                          })
                          .map(e => (
                            <button
                              key={e}
                              onClick={() => setEstadoMon(e)}
                              style={{
                                ...btnBase,
                                background: estadoMon === e
                                  ? (e === "Rejeitada" ? "#e03d3d" : e === "Aprovada" ? "#22c55e" : "#f0a500")
                                  : "#2d3348",
                                opacity: estadoMon === e ? 1 : 0.6,
                              }}
                            >
                              {e === "EmRevisao" ? "Em Revisão" : e}
                            </button>
                          ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "12px", color: "#b0b8cf", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Feedback (opcional)
                      </div>
                      <textarea
                        value={feedbackMon}
                        onChange={e => setFeedbackMon(e.target.value)}
                        placeholder="Observações para o estudante..."
                        rows={3}
                        style={{
                          width: "100%", boxSizing: "border-box",
                          padding: "10px 14px", background: "#1e2230",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px", color: "#e8eaf0",
                          fontSize: "13px", resize: "vertical", outline: "none"
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => avaliarMonografia(m.id_monografia)}
                        disabled={processandoMon === m.id_monografia}
                        style={{
                          ...btnBase, flex: 1,
                          background: processandoMon === m.id_monografia ? "#b0b8cf" :
                            estadoMon === "Rejeitada" ? "#e03d3d" :
                            estadoMon === "Aprovada" ? "#22c55e" : "#f0a500"
                        }}
                      >
                        {processandoMon === m.id_monografia ? "A guardar..." : "Confirmar"}
                      </button>
                      <button
                        onClick={() => { setAvalMonId(null); setFeedbackMon("") }}
                        style={{ ...btnBase, background: "#2d3348" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </DashboardLayout>
  )
}