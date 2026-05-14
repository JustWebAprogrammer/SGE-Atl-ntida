"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import { arredondarNota } from "@/lib/notas"

import { estudanteNavItems as navItems } from "../estudanteNav"

type NotaItem = {
  id: number
  nome: string
  codigo: string
  creditos: number
  ano: number
  semestre: string
  ac1: number | null
  ac2: number | null
  ac3: number | null
  ttp: number | null
  pp1: number | null
  pp2: number | null
  exame: number | null
  recurso: number | null
  exame_especial: number | null
  nota_final: number | null
  dispensada: boolean
  tipo_avaliacao: string
  avaliacao_atual: "ac" | "exame" | "recurso" | "especial" | "em_curso"
  aprovado: boolean | null
  tem_dispensa: boolean
  nota_dispensa: number
  dispensavel: boolean
  estado: string
  is_provisional: boolean
}

type ApiResponse = {
  notas: Record<number, Record<string, NotaItem[]>>
  medias: Record<number, number | null>
  mediaGeral: number | null
  propina_bloqueada: boolean
}

function calcNotaParcialDisplay(nota: NotaItem): string {
  const campos = [nota.ac1, nota.ac2, nota.ac3, nota.ttp, nota.pp1, nota.pp2]
  const temAlgum = campos.some(c => c !== null)
  if (!temAlgum) return "—"
  const soma = campos.reduce<number>((acc, c) => acc + (c ?? 0), 0)
  const parcial = arredondarNota(soma / 6)
  return `${parcial}`
}

const ESTADO_CORES: Record<string, { bg: string; fg: string }> = {
  "Em Curso":      { bg: "rgba(85,94,120,0.2)", fg: "#555e78" },
  "Exame":         { bg: "rgba(240,165,0,0.15)",  fg: "#f0a500" },
  "Dispensa":      { bg: "rgba(45,212,191,0.12)", fg: "#2dd4bf" },
  "Recurso":       { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b" },
  "Exame Especial":{ bg: "rgba(139,92,246,0.15)", fg: "#8b5cf6" },
  "Aprovado":      { bg: "rgba(34,197,94,0.12)",  fg: "#22c55e" },
  "Reprovado":     { bg: "rgba(224,61,61,0.12)",  fg: "#e03d3d" },
}

function EstadoBadge({ estado }: { estado: string }) {
  const cor = ESTADO_CORES[estado] ?? { bg: "rgba(85,94,120,0.2)", fg: "#555e78" }
  return (
    <span style={{
      background: cor.bg,
      color: cor.fg,
      padding: "3px 10px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "600",
      whiteSpace: "nowrap",
    }}>
      {estado}
    </span>
  )
}

function ComponentesAC({ nota }: { nota: NotaItem }) {
  const camposAC = [
    { label: "AC1", val: nota.ac1 },
    { label: "AC2", val: nota.ac2 },
    { label: "AC3", val: nota.ac3 },
    { label: "TTP", val: nota.ttp },
    { label: "PP1", val: nota.pp1 },
    { label: "PP2", val: nota.pp2 },
  ].filter(c => c.val !== null)

  const fases = [
    { label: "Exame",    val: nota.exame,         cor: "#f0a500", chave: "exame"    },
    { label: "Recurso",  val: nota.recurso,        cor: "#e03d3d", chave: "recurso"  },
    { label: "Especial", val: nota.exame_especial, cor: "#9b59b6", chave: "especial" },
  ].filter(f => f.val !== null)

  if (camposAC.length === 0 && fases.length === 0) return (
    <div style={{ color: "#555e78", fontSize: "12px", fontStyle: "italic" }}>
      Sem componentes lançados ainda.
    </div>
  )

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", flexWrap: "wrap" }}>

      {/* Bloco AC */}
      {camposAC.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{
            fontSize: "10px", color: "#555e78",
            textTransform: "uppercase", letterSpacing: "0.5px"
          }}>Avaliação Contínua</div>
          <div style={{ display: "flex", gap: "6px" }}>
            {camposAC.map(c => (
              <div key={c.label} style={{
                background: "#0d0f14",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "8px", padding: "6px 10px",
                textAlign: "center", minWidth: "48px",
              }}>
                <div style={{ fontSize: "9px", color: "#555e78", marginBottom: "3px", textTransform: "uppercase" }}>
                  {c.label}
                </div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#e8eaf0" }}>
                  {arredondarNota(c.val)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Separador vertical */}
      {camposAC.length > 0 && fases.length > 0 && (
        <div style={{
          width: "1px", background: "rgba(255,255,255,0.07)",
          alignSelf: "stretch", marginTop: "18px",
        }} />
      )}

      {/* Cadeia de exames */}
      {fases.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{
            fontSize: "10px", color: "#555e78",
            textTransform: "uppercase", letterSpacing: "0.5px"
          }}>
            {fases.length > 1 ? "Cadeia de Exames" : fases[0].label}
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {fases.map((f, i) => {
              const isDecisivo = f.chave === nota.avaliacao_atual
              const falhou = !isDecisivo
              return (
                <div key={f.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {i > 0 && (
                    <div style={{ color: "#555e78", fontSize: "11px" }}>→</div>
                  )}
                  <div style={{
                    background: "#0d0f14",
                    border: `1px solid ${isDecisivo ? f.cor : "rgba(224,61,61,0.2)"}`,
                    borderRadius: "8px", padding: "6px 12px",
                    textAlign: "center", minWidth: "64px",
                    opacity: falhou ? 0.5 : 1,
                  }}>
                    <div style={{
                      fontSize: "9px", marginBottom: "3px", textTransform: "uppercase",
                      color: isDecisivo ? f.cor : "#555e78",
                    }}>
                      {f.label}
                    </div>
                    <div style={{
                      fontSize: "14px", fontWeight: "700",
                      color: isDecisivo ? (nota.aprovado ? "#22c55e" : "#e03d3d") : "#e03d3d",
                    }}>
                      {arredondarNota(f.val)}
                    </div>
                    <div style={{
                      fontSize: "9px", marginTop: "2px",
                      textTransform: "uppercase", letterSpacing: "0.3px",
                      color: isDecisivo ? (nota.aprovado ? "#22c55e" : "#e03d3d") : "#e03d3d",
                    }}>
                      {isDecisivo ? (nota.aprovado ? "aprovado" : "reprovado") : "reprovado"}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {(nota.avaliacao_atual === "recurso" || nota.avaliacao_atual === "especial") && (
            <div style={{ fontSize: "11px", color: "#9098b0", marginTop: "2px" }}>
              Nota seca — máx. 12 · não combina com AC
            </div>
          )}
        </div>
      )}

    </div>
  )
}

export default function NotasDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/estudante/notas")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const anos = data ? Object.keys(data.notas).map(Number).sort() : []

  return (
    <DashboardLayout navItems={navItems} title="Notas" subtitle="Histórico académico completo">

      {/* Média geral */}
      {data && (
        <div style={{
          background: "#1e2230",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px", padding: "20px 24px",
          marginBottom: "24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#555e78", letterSpacing: "0.5px" }}>
              Média Geral
            </div>
            <div style={{ fontSize: "13px", color: "#9098b0", marginTop: "4px" }}>
              Média das médias por ano · dispensadas contam com nota AC
            </div>
          </div>
            <div style={{
              fontSize: "32px", fontWeight: "800",
              color: data.mediaGeral !== null
                ? (data.mediaGeral >= 10 ? "#22c55e" : "#e03d3d")
                : "#555e78"
            }}>
              {data.mediaGeral !== null ? `${arredondarNota(data.mediaGeral)} / 20` : "—"}
            </div>
        </div>
      )}

      {/* Banner de bloqueio */}
      {data?.propina_bloqueada && (
        <div style={{
          background: "rgba(224,61,61,0.08)",
          border: "1px solid rgba(224,61,61,0.25)",
          borderRadius: "14px", padding: "16px 24px",
          marginBottom: "24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#e03d3d", marginBottom: "4px" }}>
              Notas do ano corrente bloqueadas
            </div>
            <div style={{ fontSize: "13px", color: "#9098b0" }}>
              Regulariza a propina para ver as notas do ano actual.
            </div>
          </div>
          <button
            onClick={() => window.location.href = "/estudante/pagamentos"}
            style={{
              padding: "8px 18px",
              background: "#e03d3d", color: "white",
              border: "none", borderRadius: "8px",
              fontSize: "13px", fontWeight: "600", cursor: "pointer"
            }}
          >
            Ir para Pagamentos
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", color: "#555e78", padding: "60px" }}>
          A carregar notas...
        </div>
      )}

      {anos.map(ano => (
        <div key={ano} style={{ marginBottom: "28px" }}>

          {/* Cabeçalho do ano */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: "12px",
          }}>
            <div style={{
              fontSize: "13px", fontWeight: "700", color: "#e03d3d",
              textTransform: "uppercase", letterSpacing: "0.8px",
            }}>
              {ano}º Ano
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "11px", color: "#555e78", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{
                    display: "inline-block", width: "8px", height: "8px",
                    borderRadius: "50%", background: "#2dd4bf"
                  }} />
                  Dispensado conta com nota AC
                </span>
                <span style={{ fontSize: "11px", color: "#555e78", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{
                    display: "inline-block", width: "8px", height: "8px",
                    borderRadius: "50%", background: "#f0a500"
                  }} />
                  Em curso conta com nota parcial
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#9098b0" }}>
                Média:{" "}
                <span style={{
                  fontWeight: "700",
                  color: data!.medias[ano] !== null
                    ? (data!.medias[ano]! >= 10 ? "#22c55e" : "#e03d3d")
                    : "#555e78"
                }}>
                  {data!.medias[ano] !== null ? `${arredondarNota(data!.medias[ano])} / 20` : "—"}
                </span>
              </div>
            </div>
          </div>

          {(["S1", "S2"] as const).filter(s => data!.notas[ano][s]).map(sem => (
            <div key={sem} style={{
              background: "#1e2230",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px", overflow: "hidden", marginBottom: "12px",
            }}>
              <div style={{
                padding: "10px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                fontSize: "11px", color: "#9098b0",
                textTransform: "uppercase", letterSpacing: "0.5px",
                background: "rgba(255,255,255,0.02)",
              }}>
                {sem === "S1" ? "1º Semestre" : "2º Semestre"}
              </div>

              {data!.notas[ano][sem].map(nota => (
                <div key={nota.id}>
                  <div
                    onClick={() => setExpandido(expandido === nota.id ? null : nota.id)}
                    style={{
                      padding: "14px 20px",
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto",
                      alignItems: "center", gap: "16px", cursor: "pointer",
                      borderBottom: expandido === nota.id
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "1px solid transparent",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <div style={{ color: "#e8eaf0", fontSize: "14px", fontWeight: "500" }}>
                        {nota.nome}
                      </div>
                      <div style={{ color: "#555e78", fontSize: "11px", marginTop: "2px" }}>
                        {nota.codigo} · {nota.creditos} créditos
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                        {/* Dispensável indicator — static discipline info */}
                        {nota.dispensavel ? (
                          <span style={{
                            background: "rgba(45,212,191,0.1)", color: "#2dd4bf",
                            padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "600"
                          }}>
                            Dispensável ≥ {nota.nota_dispensa}
                          </span>
                        ) : (
                          <span style={{
                            background: "rgba(85,94,120,0.15)", color: "#555e78",
                            padding: "1px 6px", borderRadius: "4px", fontSize: "10px"
                          }}>
                            Sem dispensa
                          </span>
                        )}
                        {/* Estado badge — student's journey through this discipline */}
                        <EstadoBadge estado={nota.estado} />
                      </div>
                    </div>

                    <div style={{
                      fontSize: "16px", fontWeight: "800",
                      color: nota.nota_final !== null
                        ? (nota.aprovado ? "#22c55e" : "#e03d3d")
                        : nota.avaliacao_atual === "em_curso" ? "#f0a500"
                        : "#555e78",
                      minWidth: "52px", textAlign: "right",
                    }}>
                      {nota.nota_final !== null
                        ? `${arredondarNota(nota.nota_final)}`
                        : nota.avaliacao_atual === "em_curso"
                          ? calcNotaParcialDisplay(nota)
                          : "—"}
                    </div>

                    <div style={{
                      color: "#555e78", fontSize: "12px",
                      transition: "transform 0.2s",
                      transform: expandido === nota.id ? "rotate(180deg)" : "rotate(0deg)",
                    }}>▼</div>
                  </div>

                  {expandido === nota.id && (
                    <div style={{
                      padding: "16px 20px",
                      background: "rgba(13,15,20,0.5)",
                    }}>
                      <div style={{
                        fontSize: "11px", color: "#555e78",
                        textTransform: "uppercase", letterSpacing: "0.5px",
                        marginBottom: "12px",
                      }}>
                        Componentes de Avaliação
                      </div>
                      <ComponentesAC nota={nota} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      {!loading && anos.length === 0 && (
        <div style={{
          background: "#1e2230",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px", padding: "60px",
          textAlign: "center", color: "#555e78",
        }}>
          Nenhuma nota lançada ainda.
        </div>
      )}

    </DashboardLayout>
  )
}