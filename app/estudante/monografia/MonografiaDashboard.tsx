"use client"

import { useState, useEffect, useRef } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { arredondarNota } from "@/lib/notas"

import { estudanteNavItems as navItems } from "../estudanteNav"

type Orientacao = {
  orientador: {
    nome_completo: string
    especialidade: string
  }
  data_solicitacao: string
}

type Premonografia = {
  id: number
  tema: string
  data_proposta: string
  estado: string
  nome_arquivo: string | null
  feedback: string | null
}

type Monografia = {
  id: number
  titulo: string
  resumo: string
  descricao: string | null
  nome_arquivo: string | null
  data_submissao: string
  estado: string
  nota_final: number | null
  feedback: string | null
  feedback_gestor: string | null
  data_defesa: string | null
  hora_defesa: string | null
  sala_defesa: string | null
  nome_co_orientador: string | null
  nome_co_autor: string | null
  caminho_arquivo: string | null
  correcoes: {
    orientador: {
      nome_completo: string
      especialidade: string
    }
    data_correcao: string | null
    observacoes: string | null
  }[]
}

type DadosMonografia = {
  isFinalista: boolean
  duracao_anos?: number
  temOrientacaoAceite: boolean
  orientacao: Orientacao | null
  premonografia: Premonografia | null
  premonografias: Premonografia[]
  monografia: Monografia | null
  monografias: Monografia[]
  pagamentoEstado: string
  canSubmitMonografia: boolean
  blockingReasons: string[]
}

function BadgeEstado({ estado }: { estado: string }) {
  const config: Record<string, { bg: string; color: string }> = {
    Proposto: { bg: "rgba(240,165,0,0.12)", color: "#f0a500" },
    Aprovado: { bg: "rgba(34,197,94,0.12)", color: "#22c55e" },
    Reprovado: { bg: "var(--accent-bg)", color: "var(--accent)" },
    Cancelado: { bg: "rgba(85,94,120,0.2)", color: "var(--text-muted)" },
    Submetida: { bg: "rgba(45,212,191,0.12)", color: "#2dd4bf" },
    EmRevisao: { bg: "rgba(240,165,0,0.12)", color: "#f0a500" },
    ParaDefender: { bg: "rgba(155,89,182,0.12)", color: "#9b59b6" },
    Defendida: { bg: "rgba(34,197,94,0.12)", color: "#22c55e" },
    Rejeitada: { bg: "var(--accent-bg)", color: "var(--accent)" },
  }

  const style = config[estado] ?? { bg: "rgba(85,94,120,0.2)", color: "var(--text-muted)" }

  return (
    <span style={{
      background: style.bg, color: style.color,
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "11px", fontWeight: "600"
    }}>{estado}</span>
  )
}

export default function MonografiaDashboard() {
  const [dados, setDados] = useState<DadosMonografia | null>(null)
  const [loading, setLoading] = useState(true)
  const [tema, setTema] = useState("")
  const [arquivoPre, setArquivoPre] = useState<File | null>(null)
  const [submetendoPre, setSubmetendoPre] = useState(false)
  const [erroPre, setErroPre] = useState("")
  const [sucessoPre, setSucessoPre] = useState(false)
  const fileInputPreRef = useRef<HTMLInputElement>(null)
  const [mostrarHistorico, setMostrarHistorico] = useState(false)
  const [activeView, setActiveView] = useState<"premonografia" | "monografia">("monografia")

  // Form monografia
  const [titulo, setTitulo] = useState("")
  const [resumo, setResumo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [idCoOrientador, setIdCoOrientador] = useState("")
  const [nomeCoOrientador, setNomeCoOrientador] = useState("")
  const [nomeCoAutor, setNomeCoAutor] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [submetendoMon, setSubmetendoMon] = useState(false)
  const [erroMon, setErroMon] = useState("")
  const [sucessoMon, setSucessoMon] = useState(false)
  const [showBlockingModal, setShowBlockingModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "20px",
  }

  useEffect(() => {
    fetch("/api/estudante/monografia")
      .then(async r => {
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        const text = await r.text();
        if (!text) {
          return null;
        }
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error("Invalid JSON response:", text);
          throw e;
        }
      })
      .then(data => setDados(data ? { monografias: [], ...data } : null))
      .catch(err => {
        console.error("Failed to load monografia data:", err);
        setDados(null);
      })
      .finally(() => setLoading(false))
  }, [])

  async function submeterPremonografia() {
    if (tema.trim().length < 10) {
      setErroPre("O tema deve ter pelo menos 10 caracteres")
      return
    }

    if (!arquivoPre) {
      setErroPre("O arquivo do pré-projecto é obrigatório")
      return
    }

    setSubmetendoPre(true)
    setErroPre("")

    try {
      const formData = new FormData()
      formData.append("tema", tema)
      formData.append("arquivo", arquivoPre)

      const res = await fetch("/api/estudante/premonografia", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setErroPre(data.error)
        return
      }

      // Refetch completo para actualizar premonografias[] e o estado correcto
      const res2 = await fetch("/api/estudante/monografia")
      if (res2.ok) {
        const dadosActualizados = await res2.json()
        setDados(dadosActualizados)
      }
      setTema("")
      setArquivoPre(null)
      setSucessoPre(true)
    } finally {
      setSubmetendoPre(false)
    }
  }

  async function submeterMonografia() {
    if (!titulo || titulo.trim().length < 10) {
      setErroMon("O título deve ter pelo menos 10 caracteres")
      return
    }
    if (!resumo || resumo.trim().length < 50) {
      setErroMon("O resumo deve ter pelo menos 50 caracteres")
      return
    }
    if (!arquivo) {
      setErroMon("O arquivo da monografia é obrigatório")
      return
    }

    setSubmetendoMon(true)
    setErroMon("")

    try {
      const formData = new FormData()
      formData.append("titulo", titulo)
      formData.append("resumo", resumo)
      formData.append("descricao", descricao)
      if (nomeCoOrientador) formData.append("nome_co_orientador", nomeCoOrientador)
      if (nomeCoAutor) formData.append("nome_co_autor", nomeCoAutor)
      if (arquivo) formData.append("arquivo", arquivo)

      const res = await fetch("/api/estudante/monografia/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setErroMon(data.error)
        return
      }

      // Refetch completo para actualizar monografias[] e estado correcto
      const res2 = await fetch("/api/estudante/monografia")
      if (res2.ok) {
        const dadosActualizados = await res2.json()
        setDados({ monografias: [], ...dadosActualizados })
      }
      setSucessoMon(true)
    } finally {
      setSubmetendoMon(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Monografia" subtitle="Submissão e acompanhamento">
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "60px" }}>
          A carregar...
        </div>
      </DashboardLayout>
    )
  }

  if (!dados) {
    return (
      <DashboardLayout navItems={navItems} title="Monografia" subtitle="Submissão e acompanhamento">
        <div style={{ textAlign: "center", color: "var(--accent)", padding: "60px" }}>
          Erro ao carregar dados
        </div>
      </DashboardLayout>
    )
  }

  // Não está no último ano do curso
  if (!dados.isFinalista) {
    const anoMonografia = dados.duracao_anos ?? 4
    return (
      <DashboardLayout navItems={navItems} title="Monografia" subtitle="Submissão e acompanhamento">
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "14px", padding: "40px", textAlign: "center"
        }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔒</div>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
            Monografia disponível no {anoMonografia}º ano
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            A submissão de monografia só está disponível para estudantes do {anoMonografia}º ano.
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ── Modal de bloqueio ──
  const blockingModal = showBlockingModal && dados.blockingReasons && dados.blockingReasons.length > 0 ? (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px"
    }} onClick={() => setShowBlockingModal(false)}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid rgba(224,61,61,0.3)",
        borderRadius: "16px", padding: "28px", maxWidth: "520px", width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ fontSize: "32px" }}>🚫</div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
              Não é possível submeter a monografia
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              Resolva os problemas abaixo antes de submeter.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          {dados.blockingReasons.map((reason, i) => (
            <div key={i} style={{
              padding: "14px 16px",
              background: "rgba(224,61,61,0.08)",
              border: "1px solid rgba(224,61,61,0.2)",
              borderRadius: "10px",
              display: "flex", alignItems: "flex-start", gap: "10px"
            }}>
              <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>⚠️</span>
              <div style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.5" }}>
                {reason}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowBlockingModal(false)}
          style={{
            width: "100%", padding: "12px",
            background: "var(--accent)", color: "white",
            border: "none", borderRadius: "8px",
            fontSize: "14px", fontWeight: "600", cursor: "pointer"
          }}
        >
          Entendi
        </button>
      </div>
    </div>
  ) : null

  // Helper: seção de bloqueio para monografia
  function BlockingSection() {
    if (!dados || dados.canSubmitMonografia) return null
    return (
      <div style={{
        background: "rgba(224,61,61,0.06)",
        border: "1px solid rgba(224,61,61,0.2)",
        borderRadius: "14px", padding: "20px", marginBottom: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ fontSize: "20px" }}>🚫</span>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent)" }}>
            Requisitos em falta para submissão
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
          {dados.blockingReasons.map((reason, i) => (
            <div key={i} style={{
              padding: "10px 14px",
              background: "rgba(13,15,20,0.5)",
              borderRadius: "8px",
              borderLeft: "3px solid var(--accent)",
              fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5"
            }}>
              {reason}
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowBlockingModal(true)}
          style={{
            padding: "8px 16px",
            background: "var(--accent)", color: "white",
            border: "none", borderRadius: "8px",
            fontSize: "12px", fontWeight: "600", cursor: "pointer"
          }}
        >
          Ver detalhes
        </button>
      </div>
    )
  }

  // Propina pendente (só bloqueia se não for finalista)
  // Finalistas não pagam propinas mensais, só a taxa de monografia
  if (!dados.isFinalista && dados.pagamentoEstado !== "Pago") {
    return (
      <DashboardLayout navItems={navItems} title="Monografia" subtitle="Submissão e acompanhamento">
        <div style={{
          background: "rgba(240,165,0,0.08)",
          border: "1px solid rgba(240,165,0,0.2)",
          borderRadius: "14px", padding: "24px",
          display: "flex", alignItems: "center", gap: "16px"
        }}>
          <div style={{ fontSize: "28px" }}>⚠️</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0a500", marginBottom: "4px" }}>
              Propina pendente
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Precisa de estar com a propina em dia para submeter a monografia.
            </div>
          </div>
          <a href="/estudante/pagamentos" style={{
            marginLeft: "auto", padding: "8px 16px",
            background: "#f0a500", color: "var(--bg-primary)",
            borderRadius: "8px", fontSize: "13px", fontWeight: "600",
            textDecoration: "none"
          }}>
            Ver Pagamentos
          </a>
        </div>
      </DashboardLayout>
    )
  }

  // Tem monografias
  if (dados.monografias && dados.monografias.length > 0) {
    const monAtiva = dados.monografias.find(mon =>
      ["Submetida", "EmRevisao", "Aprovada", "ParaDefender", "Defendida"].includes(mon.estado)
    ) ?? null
    const monRejeitada = !monAtiva && dados.monografias[0]?.estado === "Rejeitada"
      ? dados.monografias[0] : null

    // ── Monografia em processo (acompanhamento) ──────────────────────────
    if (monAtiva) {
      const m = monAtiva
      return (
        <DashboardLayout navItems={navItems} title="Monografia" subtitle="Submissão e acompanhamento">
          {/* Info do orientador */}
          {dados.orientacao && (
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border-color)",
              borderRadius: "14px", padding: "16px 20px", marginBottom: "16px",
              display: "flex", alignItems: "center", gap: "12px"
            }}>
              <div style={{ fontSize: "24px" }}>👨‍🏫</div>
              <div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Orientador</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{dados.orientacao.orientador.nome_completo}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{dados.orientacao.orientador.especialidade}</div>
              </div>
            </div>
          )}

          {/* Info co-autores */}
          {(m.nome_co_orientador || m.nome_co_autor) && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "14px", padding: "16px 20px", marginBottom: "16px" }}>
              {m.nome_co_orientador && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: m.nome_co_autor ? "12px" : 0 }}>
                  <div style={{ fontSize: "24px" }}>👥</div>
                  <div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Co-orientador</div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{m.nome_co_orientador}</div>
                  </div>
                </div>
              )}
              {m.nome_co_autor && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ fontSize: "24px" }}>✍️</div>
                  <div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Co-autor</div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{m.nome_co_autor}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card principal */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "14px", padding: "24px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Submetida em {new Date(m.data_submissao).toLocaleDateString("pt-AO")}</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>{m.titulo}</div>
              </div>
              <BadgeEstado estado={m.estado} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Resumo</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6" }}>{m.resumo}</div>
            </div>
            {m.descricao && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Descrição</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6" }}>{m.descricao}</div>
              </div>
            )}
            {m.nome_arquivo && (
              <div style={{ background: "rgba(13,15,20,0.5)", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>📄</span>
                <div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "500" }}>{m.nome_arquivo}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>PDF</div>
                </div>
              </div>
            )}
            {m.nota_final !== null && (
              <div style={{ marginTop: "16px", padding: "16px", background: (m.nota_final ?? 0) >= 10 ? "rgba(34,197,94,0.08)" : "rgba(224,61,61,0.08)", borderRadius: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Nota Final</div>
                <div style={{ fontSize: "32px", fontWeight: "700", color: (m.nota_final ?? 0) >= 10 ? "#22c55e" : "var(--accent)" }}>
                  {m.nota_final != null ? arredondarNota(m.nota_final) : "-"}
                </div>
              </div>
            )}
              {m.data_defesa && (
              <div style={{ marginTop: "12px", padding: "12px 16px", background: "rgba(155,89,182,0.08)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>📅</span>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Data de Defesa</div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#9b59b6" }}>{new Date(m.data_defesa).toLocaleDateString("pt-AO")}{m.hora_defesa ? ` às ${m.hora_defesa}h` : ""}{m.sala_defesa ? ` · Sala ${m.sala_defesa}` : ""}</div>
                </div>
              </div>
            )}
          </div>

          {m.feedback && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Feedback do Orientador</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6" }}>{m.feedback}</div>
            </div>
          )}
          {m.feedback_gestor && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Feedback do Gestor</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6" }}>{m.feedback_gestor}</div>
            </div>
          )}
          {m.correcoes.length > 0 && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "14px", padding: "20px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Histórico de Correções</div>
              {m.correcoes.map((c, i) => (
                <div key={i} style={{ padding: "12px", background: "rgba(13,15,20,0.5)", borderRadius: "8px", marginBottom: i < m.correcoes.length - 1 ? "8px" : 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>{c.orientador.nome_completo}</div>
                  {c.data_correcao && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{new Date(c.data_correcao).toLocaleDateString("pt-AO")}</div>}
                  {c.observacoes && <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{c.observacoes}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Histórico de monografias */}
          {dados.monografias.length >= 1 && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "14px", padding: "16px 20px", marginTop: "16px" }}>
              <div onClick={() => setMostrarHistorico(!mostrarHistorico)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Histórico de monografias ({dados.monografias.length})</div>
                <div style={{ fontSize: "18px", color: "var(--text-muted)" }}>{mostrarHistorico ? "▲" : "▼"}</div>
              </div>
              {mostrarHistorico && (
                <div style={{ marginTop: "12px" }}>
                  {dados.monografias.map((mon, index) => (
                    <div key={mon.id} style={{
                      padding: "12px", background: index === 0 ? "rgba(34,197,94,0.05)" : "rgba(13,15,20,0.5)",
                      borderRadius: "8px", marginBottom: index < dados.monografias.length - 1 ? "8px" : 0,
                      borderLeft: index === 0 ? "3px solid #22c55e" : "3px solid var(--text-muted)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>{mon.titulo}</div>
                        <BadgeEstado estado={mon.estado} />
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Submetida em {new Date(mon.data_submissao).toLocaleDateString("pt-AO")}</div>
                      {mon.feedback && <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}><strong style={{ color: "var(--text-muted)" }}>Feedback: </strong>{mon.feedback}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DashboardLayout>
      )
    }

    // ── Monografia Rejeitada — permite resubmissão ────────────────────────
    if (monRejeitada) {
      const m = monRejeitada
      return (
        <DashboardLayout navItems={navItems} title="Monografia" subtitle="Submissão e acompanhamento">
          {/* Info do orientador */}
          {dados.orientacao && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "14px", padding: "16px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ fontSize: "24px" }}>👨‍🏫</div>
              <div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Orientador</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{dados.orientacao.orientador.nome_completo}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{dados.orientacao.orientador.especialidade}</div>
              </div>
            </div>
          )}

          {/* Banner de rejeição */}
          <div style={{ background: "rgba(224,61,61,0.08)", border: "1px solid rgba(224,61,61,0.25)", borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span style={{ fontSize: "20px" }}>❌</span>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent)" }}>Monografia Rejeitada</div>
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}><strong>Título:</strong> {m.titulo}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Submetida em {new Date(m.data_submissao).toLocaleDateString("pt-AO")}</div>
            {m.feedback && (
              <div style={{ marginTop: "12px", padding: "12px", background: "rgba(13,15,20,0.5)", borderRadius: "8px", borderLeft: "3px solid var(--accent)" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Feedback do orientador:</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>{m.feedback}</div>
              </div>
            )}
            {m.feedback_gestor && (
              <div style={{ marginTop: "8px", padding: "12px", background: "rgba(13,15,20,0.5)", borderRadius: "8px", borderLeft: "3px solid #f0a500" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Feedback do gestor:</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>{m.feedback_gestor}</div>
              </div>
            )}
          </div>

          {/* Bloqueio de requisitos */}
          <BlockingSection />

          {/* Formulário de resubmissão */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "14px", padding: "24px" }}>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>Submeter Nova Monografia</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>Corrija os problemas apontados e submeta uma nova versão.</div>

            {sucessoMon ? (
              <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "10px", padding: "20px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#22c55e", marginBottom: "8px" }}>Monografia resubmetida com sucesso!</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>A sua monografia foi submetida e está a aguardar revisão.</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Título *</label>
                  <input type="text" value={titulo} onChange={e => { setTitulo(e.target.value); setErroMon("") }}
                    placeholder="Título da monografia"
                    style={{ width: "100%", padding: "10px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color-strong)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Resumo * (mín. 50 caracteres)</label>
                  <textarea value={resumo} onChange={e => { setResumo(e.target.value); setErroMon("") }}
                    placeholder="Resumo da sua monografia..." rows={4}
                    style={{ width: "100%", padding: "10px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color-strong)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{resumo.length}/50 caracteres</div>
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Descrição (opcional)</label>
                  <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                    placeholder="Descrição adicional..." rows={3}
                    style={{ width: "100%", padding: "10px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color-strong)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Co-orientador externo (opcional)</label>
                  <input type="text" value={nomeCoOrientador} onChange={e => setNomeCoOrientador(e.target.value)}
                    placeholder="Nome do co-orientador externo"
                    style={{ width: "100%", padding: "10px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color-strong)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Co-autor (opcional)</label>
                  <input type="text" value={nomeCoAutor} onChange={e => setNomeCoAutor(e.target.value)}
                    placeholder="Nome do co-autor"
                    style={{ width: "100%", padding: "10px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color-strong)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ficheiro * (PDF ou Word, máx. 10MB)</label>
                  <div onClick={() => fileInputRef.current?.click()}
                    style={{ border: "2px dashed var(--border-color-strong)", borderRadius: "10px", padding: "24px", textAlign: "center", cursor: "pointer", background: arquivo ? "rgba(34,197,94,0.05)" : "transparent" }}>
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={e => setArquivo(e.target.files?.[0] || null)} style={{ display: "none" }} />
                    {arquivo ? (
                      <div>
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
                        <div style={{ fontSize: "13px", color: "#22c55e", fontWeight: "500" }}>{arquivo.name}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{(arquivo.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>📁</div>
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Clique para selecionar o ficheiro PDF ou Word</div>
                      </div>
                    )}
                  </div>
                </div>
                {erroMon && (
                  <div style={{ background: "rgba(224,61,61,0.08)", border: "1px solid rgba(224,61,61,0.2)", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "13px", color: "var(--accent)" }}>{erroMon}</div>
                )}
                <button onClick={submeterMonografia} disabled={submetendoMon}
                  style={{ width: "100%", padding: "12px", background: submetendoMon ? "var(--text-muted)" : "var(--accent)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: submetendoMon ? "not-allowed" : "pointer" }}>
                  {submetendoMon ? "A submeter..." : "Submeter Nova Monografia"}
                </button>
              </>
            )}
          </div>

          {/* Histórico */}
          {dados.monografias.length >= 1 && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "14px", padding: "16px 20px", marginTop: "16px" }}>
              <div onClick={() => setMostrarHistorico(!mostrarHistorico)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Histórico de monografias ({dados.monografias.length})</div>
                <div style={{ fontSize: "18px", color: "var(--text-muted)" }}>{mostrarHistorico ? "▲" : "▼"}</div>
              </div>
              {mostrarHistorico && (
                <div style={{ marginTop: "12px" }}>
                  {dados.monografias.map((mon, index) => (
                    <div key={mon.id} style={{
                      padding: "12px", background: "rgba(13,15,20,0.5)", borderRadius: "8px",
                      marginBottom: index < dados.monografias.length - 1 ? "8px" : 0,
                      borderLeft: "3px solid var(--text-muted)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>{mon.titulo}</div>
                        <BadgeEstado estado={mon.estado} />
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Submetida em {new Date(mon.data_submissao).toLocaleDateString("pt-AO")}</div>
                      {mon.feedback && <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}><strong style={{ color: "var(--text-muted)" }}>Feedback: </strong>{mon.feedback}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DashboardLayout>
      )
    }
  }

  // Tem pré-monografias
  if (dados.premonografias && dados.premonografias.length > 0) {
    const p = dados.premonografias[0]

    // ✅ Se QUALQUER pré-projecto está APROVADO: bloqueia e mostra tabs PRÉ / MONOGRAFIA
    // ✅ Se o último está REPROVADO ou PROPOSTO (e nenhum aprovado): mostra formulário
    const preAprovado = dados.premonografias.find(pre => pre.estado === "Aprovado") ?? null

    if (preAprovado) {
      return (
        <DashboardLayout navItems={navItems} title="Monografia" subtitle="Submissão e acompanhamento">

          {/* Info do orientador */}
          {dados.orientacao && (
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border-color)",
              borderRadius: "14px", padding: "16px 20px", marginBottom: "16px",
              display: "flex", alignItems: "center", gap: "12px"
            }}>
              <div style={{ fontSize: "24px" }}>👨‍🏫</div>
              <div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Orientador</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                  {dados.orientacao.orientador.nome_completo}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {dados.orientacao.orientador.especialidade}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab switcher ── */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <button
              onClick={() => setActiveView("premonografia")}
              style={{
                padding: "8px 20px", borderRadius: "6px",
                fontSize: "13px", fontWeight: "600", cursor: "pointer", color: "white",
                background: activeView === "premonografia" ? "#2dd4bf" : "var(--bg-card)",
                border: activeView === "premonografia" ? "none" : "1px solid var(--border-color)",
              }}
            >
              📋 Pré-projecto ({dados.premonografias?.length || 0})
            </button>
            <button
              onClick={() => setActiveView("monografia")}
              style={{
                padding: "8px 20px", borderRadius: "6px",
                fontSize: "13px", fontWeight: "600", cursor: "pointer", color: "white",
                background: activeView === "monografia" ? "var(--accent)" : "var(--bg-card)",
                border: activeView === "monografia" ? "none" : "1px solid var(--border-color)",
              }}
            >
              📄 Monografia
            </button>
          </div>

          {/* ── VIEW: Pré-projecto (bloqueado) ── */}
          {activeView === "premonografia" && (
            <>
              {/* Info do pré-projecto aprovado */}
              <div style={{
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "14px", padding: "20px", marginBottom: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px" }}>✅</span>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#22c55e" }}>Pré-projecto Aprovado</div>
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  <strong>Tema:</strong> {preAprovado.tema}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Submetido em {new Date(preAprovado.data_proposta).toLocaleDateString("pt-AO")}
                </div>
                {preAprovado.feedback && (
                  <div style={{
                    marginTop: "12px", padding: "12px",
                    background: "rgba(13,15,20,0.5)", borderRadius: "8px",
                    borderLeft: "3px solid #22c55e"
                  }}>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Feedback do orientador:</div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>{preAprovado.feedback}</div>
                  </div>
                )}
              </div>

              {/* ── CTA principal — aparece logo abaixo do card aprovado ── */}
              <div style={{
                marginBottom: "16px", padding: "18px 20px",
                background: "linear-gradient(135deg, var(--accent-bg) 0%, rgba(224,61,61,0.06) 100%)",
                border: "1px solid rgba(224,61,61,0.3)",
                borderRadius: "14px", display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: "12px", flexWrap: "wrap"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "28px" }}>🎓</span>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "3px" }}>
                      Pronto para a Monografia!
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      O pré-projecto está aprovado. Submeta agora a monografia final.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveView("monografia")}
                  style={{
                    flexShrink: 0, padding: "11px 24px",
                    background: "var(--accent)", color: "white",
                    border: "none", borderRadius: "8px",
                    fontSize: "13px", fontWeight: "700", cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(224,61,61,0.35)"
                  }}
                >
                  Submeter Monografia →
                </button>
              </div>

              {/* Formulário completamente bloqueado */}
              <div style={{
                background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "14px", padding: "24px", opacity: 0.45,
                pointerEvents: "none", userSelect: "none"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "20px" }}>🔒</span>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Submissão de Pré-projecto Bloqueada</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      O pré-projecto foi aprovado. Já não é possível submeter novos.
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Tema do Pré-projecto *
                  </label>
                  <textarea
                    disabled rows={3}
                    style={{
                      width: "100%", padding: "10px 14px",
                      background: "var(--bg-primary)", border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: "8px", color: "var(--text-muted)", fontSize: "13px",
                      outline: "none", resize: "none", boxSizing: "border-box", cursor: "not-allowed"
                    }}
                  />
                </div>
                <button disabled style={{
                  width: "100%", padding: "12px",
                  background: "#1a1d26", color: "var(--text-muted)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "not-allowed"
                }}>
                  🔒 Submissão Bloqueada
                </button>
              </div>
            </>
          )}

          {/* ── VIEW: Monografia ── */}
          {activeView === "monografia" && (
            <>
              {/* Bloqueio de requisitos */}
              <BlockingSection />

              {sucessoMon ? (
                <div style={{
                  background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: "14px", padding: "24px", textAlign: "center"
                }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#22c55e", marginBottom: "8px" }}>
                    Monografia submetida com sucesso!
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    A sua monografia foi submetida e está a aguardar revisão do orientador.
                  </div>
                </div>
              ) : (
                <div style={{
                  background: "var(--bg-card)", border: "1px solid var(--border-color)",
                  borderRadius: "14px", padding: "24px"
                }}>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "20px" }}>
                    Submeter Monografia
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Título *
                    </label>
                    <input
                      type="text" value={titulo}
                      onChange={e => { setTitulo(e.target.value); setErroMon("") }}
                      placeholder="Título da sua monografia"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color-strong)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Resumo * (mín. 50 caracteres)
                    </label>
                    <textarea
                      value={resumo}
                      onChange={e => { setResumo(e.target.value); setErroMon("") }}
                      placeholder="Resumo da sua monografia..." rows={4}
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color-strong)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                    />
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{resumo.length}/50 caracteres</div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Descrição (opcional)
                    </label>
                    <textarea
                      value={descricao} onChange={e => setDescricao(e.target.value)}
                      placeholder="Descrição adicional..." rows={3}
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color-strong)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Co-orientador externo (opcional)
                    </label>
                    <input
                      type="text" value={nomeCoOrientador}
                      onChange={e => setNomeCoOrientador(e.target.value)}
                      placeholder="Nome do co-orientador externo"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color-strong)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Co-autor (opcional)
                    </label>
                    <input
                      type="text" value={nomeCoAutor}
                      onChange={e => setNomeCoAutor(e.target.value)}
                      placeholder="Nome do co-autor"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color-strong)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Ficheiro da Monografia * (PDF ou Word, máx. 10MB)
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{ border: "2px dashed var(--border-color-strong)", borderRadius: "10px", padding: "24px", textAlign: "center", cursor: "pointer", background: arquivo ? "rgba(34,197,94,0.05)" : "transparent" }}
                    >
                      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={e => setArquivo(e.target.files?.[0] || null)} style={{ display: "none" }} />
                      {arquivo ? (
                        <div>
                          <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
                          <div style={{ fontSize: "13px", color: "#22c55e", fontWeight: "500" }}>{arquivo.name}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{(arquivo.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: "24px", marginBottom: "8px" }}>📁</div>
                          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Clique para selecionar o ficheiro PDF ou Word</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {erroMon && (
                    <div style={{ background: "rgba(224,61,61,0.08)", border: "1px solid rgba(224,61,61,0.2)", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "13px", color: "var(--accent)" }}>
                      {erroMon}
                    </div>
                  )}

                  <button
                    onClick={submeterMonografia} disabled={submetendoMon}
                    style={{ width: "100%", padding: "12px", background: submetendoMon ? "var(--text-muted)" : "var(--accent)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: submetendoMon ? "not-allowed" : "pointer" }}
                  >
                    {submetendoMon ? "A submeter..." : "Submeter Monografia"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Modal de bloqueio */}
          {blockingModal}

        </DashboardLayout>
      )
    }

    // ── PROPOSTO ou REPROVADO ─────────────────────────────────────────────
    return (
      <DashboardLayout navItems={navItems} title="Monografia" subtitle="Submissão e acompanhamento">
        {/* Info do orientador */}
        {dados.orientacao && (
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-color)",
            borderRadius: "14px", padding: "16px 20px", marginBottom: "16px",
            display: "flex", alignItems: "center", gap: "12px"
          }}>
            <div style={{ fontSize: "24px" }}>👨‍🏫</div>
            <div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Orientador</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{dados.orientacao.orientador.nome_completo}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{dados.orientacao.orientador.especialidade}</div>
            </div>
          </div>
        )}

        {/* Card só para PROPOSTO */}
        {p.estado === "Proposto" && (
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-color)",
            borderRadius: "14px", padding: "24px", marginBottom: "16px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Pré-projecto</div>
              <BadgeEstado estado={p.estado} />
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
              <strong>Tema:</strong> {p.tema}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Submetido em {new Date(p.data_proposta).toLocaleDateString("pt-AO")}
            </div>
            <div style={{ marginTop: "16px", padding: "12px", background: "rgba(240,165,0,0.08)", borderRadius: "8px" }}>
              <div style={{ fontSize: "12px", color: "#f0a500" }}>
                O seu pré-projecto está a aguardar aprovação do orientador.
              </div>
            </div>
          </div>
        )}

        {/* Formulário de nova submissão quando REPROVADO */}
        {p.estado === "Reprovado" && (
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-color)",
            borderRadius: "14px", padding: "24px"
          }}>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
              Submeter Pré-projecto
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
              Pode submeter um novo tema para apreciação do orientador.
            </div>

            {sucessoPre ? (
              <div style={{
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "10px", padding: "20px", textAlign: "center"
              }}>
                <div style={{ fontSize: "32px", marginBottom: "10px" }}>✅</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#22c55e" }}>Novo pré-projecto submetido!</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>Aguarda aprovação do orientador.</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Tema do Pré-projecto *
                  </label>
                  <textarea value={tema} onChange={e => { setTema(e.target.value); setErroPre("") }}
                    placeholder="Descreva o tema do seu novo pré-projecto..." rows={3}
                    style={{ width: "100%", padding: "10px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color-strong)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{tema.length}/10 caracteres mínimos</div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Ficheiro * (PDF ou Word, máx. 10MB)
                  </label>
                  <div onClick={() => fileInputPreRef.current?.click()} style={{ border: "2px dashed var(--border-color-strong)", borderRadius: "10px", padding: "20px", textAlign: "center", cursor: "pointer", background: arquivoPre ? "rgba(34,197,94,0.05)" : "transparent" }}>
                    <input ref={fileInputPreRef} type="file" accept=".pdf,.doc,.docx" onChange={e => setArquivoPre(e.target.files?.[0] || null)} style={{ display: "none" }} />
                    {arquivoPre ? (
                      <div>
                        <div style={{ fontSize: "20px", marginBottom: "6px" }}>📄</div>
                        <div style={{ fontSize: "13px", color: "#22c55e", fontWeight: "500" }}>{arquivoPre.name}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{(arquivoPre.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: "20px", marginBottom: "6px" }}>📁</div>
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Clique para selecionar ficheiro</div>
                      </div>
                    )}
                  </div>
                </div>

                {erroPre && (
                  <div style={{ background: "rgba(224,61,61,0.08)", border: "1px solid rgba(224,61,61,0.2)", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "13px", color: "var(--accent)" }}>{erroPre}</div>
                )}

                <button onClick={submeterPremonografia} disabled={submetendoPre}
                  style={{ width: "100%", padding: "12px", background: submetendoPre ? "var(--text-muted)" : "var(--accent)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: submetendoPre ? "not-allowed" : "pointer" }}>
                  {submetendoPre ? "A submeter..." : "Submeter Novo Pré-projecto"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Dropdown histórico — só quando há mais de 1 */}
        {dados.premonografias.length > 1 && (
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border-color)",
            borderRadius: "14px", padding: "16px 20px", marginTop: "16px"
          }}>
            <div onClick={() => setMostrarHistorico(!mostrarHistorico)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Ver histórico de pré-projectos ({dados.premonografias.length})
              </div>
              <div style={{ fontSize: "18px", color: "var(--text-muted)" }}>{mostrarHistorico ? "▲" : "▼"}</div>
            </div>
            {mostrarHistorico && (
              <div style={{ marginTop: "12px" }}>
                {dados.premonografias.map((pre, index) => (
                  <div key={pre.id} style={{
                    padding: "12px",
                    background: index === 0 ? "rgba(34,197,94,0.05)" : "rgba(13,15,20,0.5)",
                    borderRadius: "8px",
                    marginBottom: index < dados.premonografias.length - 1 ? "8px" : 0,
                    borderLeft: index === 0 ? "3px solid #22c55e" : "3px solid var(--text-muted)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>{pre.tema}</div>
                      <BadgeEstado estado={pre.estado} />
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Submetido em {new Date(pre.data_proposta).toLocaleDateString("pt-AO")}
                    </div>
                    {pre.feedback && (
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        <strong style={{ color: "var(--text-muted)" }}>Feedback: </strong>{pre.feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DashboardLayout>
    )
  }

  // ── NÃO TEM NENHUM PRÉ-PROJECTO NEM MONOGRAFIA → mostrar formulário de pré-projecto ──
  return (
    <DashboardLayout navItems={navItems} title="Monografia" subtitle="Submissão e acompanhamento">

      {/* Aviso de orientação se não tiver */}
      {!dados.temOrientacaoAceite && (
        <div style={{
          background: "rgba(240,165,0,0.08)", border: "1px solid rgba(240,165,0,0.2)",
          borderRadius: "14px", padding: "20px", marginBottom: "16px",
          display: "flex", alignItems: "center", gap: "12px"
        }}>
          <div style={{ fontSize: "28px" }}>📌</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#f0a500", marginBottom: "4px" }}>
              Orientação — Próximo Passo
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Após submeter o pré-projecto, o gestor irá aprová-lo. Depois vá à página <strong>Orientador</strong> para solicitar um orientador.
            </div>
          </div>
          <a href="/estudante/orientador" style={{
            marginLeft: "auto", padding: "8px 16px",
            background: "#f0a500", color: "var(--bg-primary)",
            borderRadius: "8px", fontSize: "13px", fontWeight: "600",
            textDecoration: "none", whiteSpace: "nowrap"
          }}>
            Ir para Orientador →
          </a>
        </div>
      )}

      {/* Info do orientador (se já tiver) */}
      {dados.orientacao && (
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "14px", padding: "16px 20px", marginBottom: "16px",
          display: "flex", alignItems: "center", gap: "12px"
        }}>
          <div style={{ fontSize: "24px" }}>👨‍🏫</div>
          <div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Orientador</div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{dados.orientacao.orientador.nome_completo}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{dados.orientacao.orientador.especialidade}</div>
          </div>
        </div>
      )}

      {/* Formulário de submissão do pré-projecto */}
      <div style={cardStyle}>
        <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
          Submeter Pré-projecto
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
          Primeiro passo para a monografia. Submeta o seu pré-projecto para aprovação do gestor.
        </div>

        {sucessoPre ? (
          <div style={{
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: "10px", padding: "20px", textAlign: "center"
          }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>✅</div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#22c55e" }}>Pré-projecto submetido com sucesso!</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>Aguarda aprovação do gestor.</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Tema do Pré-projecto *
              </label>
              <textarea value={tema} onChange={e => { setTema(e.target.value); setErroPre("") }}
                placeholder="Descreva o tema do seu pré-projecto..." rows={3}
                style={{ width: "100%", padding: "10px 14px", background: "var(--bg-primary)", border: "1px solid var(--border-color-strong)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{tema.length}/10 caracteres mínimos</div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Ficheiro * (PDF ou Word, máx. 10MB)
              </label>
              <div onClick={() => fileInputPreRef.current?.click()} style={{ border: "2px dashed var(--border-color-strong)", borderRadius: "10px", padding: "20px", textAlign: "center", cursor: "pointer", background: arquivoPre ? "rgba(34,197,94,0.05)" : "transparent" }}>
                <input ref={fileInputPreRef} type="file" accept=".pdf,.doc,.docx" onChange={e => setArquivoPre(e.target.files?.[0] || null)} style={{ display: "none" }} />
                {arquivoPre ? (
                  <div>
                    <div style={{ fontSize: "20px", marginBottom: "6px" }}>📄</div>
                    <div style={{ fontSize: "13px", color: "#22c55e", fontWeight: "500" }}>{arquivoPre.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{(arquivoPre.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "20px", marginBottom: "6px" }}>📁</div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Clique para selecionar ficheiro</div>
                  </div>
                )}
              </div>
            </div>

            {erroPre && (
              <div style={{ background: "rgba(224,61,61,0.08)", border: "1px solid rgba(224,61,61,0.2)", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "13px", color: "var(--accent)" }}>{erroPre}</div>
            )}

            <button onClick={submeterPremonografia} disabled={submetendoPre}
              style={{ width: "100%", padding: "12px", background: submetendoPre ? "var(--text-muted)" : "var(--accent)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: submetendoPre ? "not-allowed" : "pointer" }}>
              {submetendoPre ? "A submeter..." : "Submeter Pré-projecto"}
            </button>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}