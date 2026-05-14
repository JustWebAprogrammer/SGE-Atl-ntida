"use client"

import { useState, useEffect, useMemo } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { gestorNavItems } from "../gestorNav"

type Solicitacao = {
  id_solicitacao: number
  estudante: {
    id_estudante: number
    nome: string
    numero_estudante: string | null
    curso: string
    id_curso: number
    ano_current: number | null
    turno: string
  }
  orientador: {
    id_orientador: number
    nome: string
    especialidade: string
  }
  data_solicitacao: string
  estado: string
  observacoes: string | null
  gestor_assigned: boolean
}

type CursoOption = {
  id_curso: number
  nome_curso: string
}

function BadgeEstado({ estado }: { estado: string }) {
  const config: Record<string, { bg: string; color: string }> = {
    Pendente: { bg: "rgba(240,165,0,0.12)", color: "#f0a500" },
    Aceite: { bg: "rgba(34,197,94,0.12)", color: "#22c55e" },
    Recusado: { bg: "rgba(224,61,61,0.12)", color: "#e03d3d" },
    Cancelado: { bg: "rgba(85,94,120,0.2)", color: "#555e78" },
  }

  const style = config[estado] ?? { bg: "rgba(85,94,120,0.2)", color: "#555e78" }

  return (
    <span style={{
      background: style.bg,
      color: style.color,
      padding: "3px 10px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "600"
    }}>
      {estado}
    </span>
  )
}

export default function SolicitacoesGestorDashboard() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState<number | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [filtroCurso, setFiltroCurso] = useState<string>("")
  const [filtroTurno, setFiltroTurno] = useState<string>("")

  // Options for dropdowns (from API)
  const [cursosOptions, setCursosOptions] = useState<CursoOption[]>([])
  const [turnosOptions, setTurnosOptions] = useState<string[]>([])

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (filtroCurso) params.set("cursoId", filtroCurso)
    if (filtroTurno) params.set("turno", filtroTurno)

    fetch(`/api/gestor/solicitacoes?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        setSolicitacoes(data.solicitacoes || [])
        if (data.cursos) setCursosOptions(data.cursos)
        if (data.turnos) setTurnosOptions(data.turnos)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, filtroCurso, filtroTurno])

  async function processarSolicitacao(idSolicitacao: number, estado: "Aceite" | "Recusado") {
    setProcessando(idSolicitacao)

    try {
      const res = await fetch(`/api/gestor/solicitacoes/${idSolicitacao}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      })

      if (res.ok) {
        setSolicitacoes(prev => prev.map(s =>
          s.id_solicitacao === idSolicitacao ? { ...s, estado } : s
        ))
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao processar solicitacao")
      }
    } catch {
      alert("Erro ao processar solicitacao")
    } finally {
      setProcessando(null)
    }
  }

  const pendentes = useMemo(() => solicitacoes.filter(s => s.estado === "Pendente"), [solicitacoes])
  const historico = useMemo(() => solicitacoes.filter(s => s.estado !== "Pendente"), [solicitacoes])
  const aceites = useMemo(() => solicitacoes.filter(s => s.estado === "Aceite").length, [solicitacoes])
  const recusados = useMemo(() => solicitacoes.filter(s => s.estado === "Recusado").length, [solicitacoes])

  const hasActiveFilters = search || filtroCurso || filtroTurno

  return (
    <DashboardLayout
      navItems={gestorNavItems}
      title="Solicitacoes de Orientacao"
      subtitle="Gerir pedidos de orientacao do departamento"
    >
      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div style={{
          background: "#1e2230",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px",
          padding: "20px",
          borderTop: "2px solid #f0a500"
        }}>
          <div style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "#555e78",
            marginBottom: "10px"
          }}>Pendentes</div>
          <div style={{
            fontSize: "16px",
            fontWeight: "700",
            color: "#e8eaf0"
          }}>{loading ? "..." : pendentes.length}</div>
        </div>
        <div style={{
          background: "#1e2230",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px",
          padding: "20px",
          borderTop: "2px solid #22c55e"
        }}>
          <div style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "#555e78",
            marginBottom: "10px"
          }}>Aceites</div>
          <div style={{
            fontSize: "16px",
            fontWeight: "700",
            color: "#e8eaf0"
          }}>{loading ? "..." : aceites}</div>
        </div>
        <div style={{
          background: "#1e2230",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px",
          padding: "20px",
          borderTop: "2px solid #e03d3d"
        }}>
          <div style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "#555e78",
            marginBottom: "10px"
          }}>Recusados</div>
          <div style={{
            fontSize: "16px",
            fontWeight: "700",
            color: "#e8eaf0"
          }}>{loading ? "..." : recusados}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: "#1e2230",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding: "16px",
        marginBottom: "20px"
      }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{
              fontSize: "11px",
              color: "#9098b0",
              textTransform: "uppercase",
              marginBottom: "4px",
              display: "block"
            }}>Pesquisar Estudante</label>
            <input
              type="text"
              placeholder="Nome do estudante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#13161e",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#e8eaf0",
                fontSize: "13px"
              }}
            />
          </div>

          <div>
            <label style={{
              fontSize: "11px",
              color: "#9098b0",
              textTransform: "uppercase",
              marginBottom: "4px",
              display: "block"
            }}>Curso</label>
            <select
              value={filtroCurso}
              onChange={(e) => setFiltroCurso(e.target.value)}
              style={{
                padding: "8px 12px",
                background: "#13161e",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#e8eaf0",
                fontSize: "13px",
                minWidth: "180px"
              }}
            >
              <option value="">Todos os Cursos</option>
              {cursosOptions.map(c => (
                <option key={c.id_curso} value={c.id_curso}>{c.nome_curso}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              fontSize: "11px",
              color: "#9098b0",
              textTransform: "uppercase",
              marginBottom: "4px",
              display: "block"
            }}>Turno</label>
            <select
              value={filtroTurno}
              onChange={(e) => setFiltroTurno(e.target.value)}
              style={{
                padding: "8px 12px",
                background: "#13161e",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#e8eaf0",
                fontSize: "13px",
                minWidth: "140px"
              }}
            >
              <option value="">Todos os Turnos</option>
              {turnosOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(""); setFiltroCurso(""); setFiltroTurno("") }}
              style={{
                padding: "8px 12px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#9098b0",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Pending Requests */}
      <div style={{
        background: "#1e2230",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <div style={{
          fontSize: "14px",
          fontWeight: "600",
          marginBottom: "16px",
          color: "#e8eaf0"
        }}>Solicitacoes Pendentes</div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#555e78", padding: "30px" }}>A carregar...</div>
        ) : pendentes.length === 0 ? (
          <div style={{ textAlign: "center", color: "#555e78", padding: "30px" }}>
            {hasActiveFilters ? "Nenhuma solicitacao pendente encontrada com os filtros selecionados" : "Nenhuma solicitacao pendente"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {pendentes.map(s => (
              <div key={s.id_solicitacao} style={{
                background: "#13161e",
                borderRadius: "10px",
                padding: "16px",
                border: "1px solid rgba(255,255,255,0.05)"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px"
                }}>
                  <div>
                    <div style={{ color: "#e8eaf0", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                      {s.estudante.nome}
                    </div>
                    <div style={{ color: "#555e78", fontSize: "12px" }}>
                      {s.estudante.numero_estudante} &middot; {s.estudante.curso} &middot; {s.estudante.ano_current} Ano &middot; {s.estudante.turno}
                    </div>
                    <div style={{ color: "#9098b0", fontSize: "12px", marginTop: "4px" }}>
                      Orientador: {s.orientador.nome} ({s.orientador.especialidade})
                    </div>
                  </div>
                  <BadgeEstado estado={s.estado} />
                </div>

                <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "8px" }}>
                  Solicitado em {new Date(s.data_solicitacao).toLocaleDateString("pt-AO")}
                </div>

                {s.observacoes && !s.gestor_assigned && (
                  <div style={{
                    background: "rgba(13,15,20,0.5)",
                    borderRadius: "6px",
                    padding: "10px",
                    marginBottom: "12px"
                  }}>
                    <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px", textTransform: "uppercase" }}>
                      Observacoes
                    </div>
                    <div style={{ fontSize: "12px", color: "#9098b0", lineHeight: "1.5" }}>
                      {s.observacoes}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button
                    onClick={() => processarSolicitacao(s.id_solicitacao, "Aceite")}
                    disabled={processando === s.id_solicitacao}
                    style={{
                      flex: 1,
                      padding: "8px",
                      background: processando === s.id_solicitacao ? "#555e78" : "#22c55e",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: processando === s.id_solicitacao ? "not-allowed" : "pointer"
                    }}
                  >
                    {processando === s.id_solicitacao ? "..." : "Aceitar"}
                  </button>
                  <button
                    onClick={() => processarSolicitacao(s.id_solicitacao, "Recusado")}
                    disabled={processando === s.id_solicitacao}
                    style={{
                      flex: 1,
                      padding: "8px",
                      background: processando === s.id_solicitacao ? "#555e78" : "#e03d3d",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: processando === s.id_solicitacao ? "not-allowed" : "pointer"
                    }}
                  >
                    {processando === s.id_solicitacao ? "..." : "Recusar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Section */}
      <div style={{
        background: "#1e2230",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding: "20px"
      }}>
        <div style={{
          fontSize: "14px",
          fontWeight: "600",
          marginBottom: "16px",
          color: "#e8eaf0"
        }}>Historico de Solicitacoes</div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#555e78", padding: "30px" }}>A carregar...</div>
        ) : historico.length === 0 ? (
          <div style={{ textAlign: "center", color: "#555e78", padding: "30px" }}>
            {hasActiveFilters ? "Nenhuma solicitacao no historico com os filtros selecionados" : "Nenhuma solicitacao processada ainda"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {historico.map(s => (
              <div key={s.id_solicitacao} style={{
                background: "#13161e",
                borderRadius: "10px",
                padding: "16px",
                border: "1px solid rgba(255,255,255,0.05)",
                opacity: 0.85
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px"
                }}>
                  <div>
                    <div style={{ color: "#e8eaf0", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
                      {s.estudante.nome}
                      {s.gestor_assigned && (
                        <span title="Atribuido pelo gestor" style={{ marginLeft: "6px", fontSize: "12px" }}>&#x1f539;</span>
                      )}
                    </div>
                    <div style={{ color: "#555e78", fontSize: "12px" }}>
                      {s.estudante.numero_estudante} &middot; {s.estudante.curso} &middot; {s.estudante.ano_current} Ano &middot; {s.estudante.turno}
                    </div>
                    <div style={{ color: "#9098b0", fontSize: "12px", marginTop: "4px" }}>
                      Orientador: {s.orientador.nome} ({s.orientador.especialidade})
                    </div>
                  </div>
                  <BadgeEstado estado={s.estado} />
                </div>

                <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "8px" }}>
                  Solicitado em {new Date(s.data_solicitacao).toLocaleDateString("pt-AO")}
                </div>

                {/* Allow changing state for non-cancelled requests */}
                {s.estado !== "Cancelado" && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    {s.estado === "Recusado" && (
                      <button
                        onClick={() => processarSolicitacao(s.id_solicitacao, "Aceite")}
                        disabled={processando === s.id_solicitacao}
                        style={{
                          padding: "6px 12px",
                          background: processando === s.id_solicitacao ? "#555e78" : "rgba(34,197,94,0.15)",
                          color: processando === s.id_solicitacao ? "#9098b0" : "#22c55e",
                          border: "1px solid rgba(34,197,94,0.3)",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: processando === s.id_solicitacao ? "not-allowed" : "pointer"
                        }}
                      >
                        {processando === s.id_solicitacao ? "..." : "Alterar para Aceite"}
                      </button>
                    )}
                    {s.estado === "Aceite" && (
                      <button
                        onClick={() => processarSolicitacao(s.id_solicitacao, "Recusado")}
                        disabled={processando === s.id_solicitacao}
                        style={{
                          padding: "6px 12px",
                          background: processando === s.id_solicitacao ? "#555e78" : "rgba(224,61,61,0.15)",
                          color: processando === s.id_solicitacao ? "#9098b0" : "#e03d3d",
                          border: "1px solid rgba(224,61,61,0.3)",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: processando === s.id_solicitacao ? "not-allowed" : "pointer"
                        }}
                      >
                        {processando === s.id_solicitacao ? "..." : "Alterar para Recusado"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}