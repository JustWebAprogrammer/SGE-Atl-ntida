"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "../../components/DashboardLayout"

import { estudanteNavItems as navItems } from "../estudanteNav"

type Orientador = {
  id_orientador: number
  nome_completo: string
  especialidade: string
}

type Solicitacao = {
  id_solicitacao: number
  orientador: {
    nome_completo: string
    especialidade: string
  }
  data_solicitacao: string
  estado: string
  observacoes: string | null
}

type DadosSolicitacao = {
  isFinalista: boolean
  duracao_anos?: number
  pagamentoEstado: string
  solicitacao: Solicitacao | null
  orientadores: Orientador[]
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
      background: style.bg, color: style.color,
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "11px", fontWeight: "600"
    }}>{estado}</span>
  )
}

export default function OrientadorDashboard() {
  const [dados, setDados] = useState<DadosSolicitacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [orientadorSelecionado, setOrientadorSelecionado] = useState<number | null>(null)
  const [observacoes, setObservacoes] = useState("")
  const [submetendo, setSubmetendo] = useState(false)
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    fetch("/api/estudante/solicitacao-orientacao")
      .then(r => r.json())
      .then(setDados)
      .finally(() => setLoading(false))
  }, [])

  async function submeterSolicitacao() {
    if (!orientadorSelecionado) {
      setErro("Selecione um orientador")
      return
    }

    setSubmetendo(true)
    setErro("")

    try {
      const res = await fetch("/api/estudante/solicitacao-orientacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_orientador: orientadorSelecionado,
          observacoes: observacoes || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.error)
        return
      }

      setSucesso(true)
      setDados(prev => prev ? { ...prev, solicitacao: data } : prev)
    } catch {
      setErro("Erro ao submeter solicitação")
    } finally {
      setSubmetendo(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="Orientador" subtitle="Solicitação de orientação">
        <div style={{ textAlign: "center", color: "#555e78", padding: "60px" }}>
          A carregar...
        </div>
      </DashboardLayout>
    )
  }

  if (!dados) {
    return (
      <DashboardLayout navItems={navItems} title="Orientador" subtitle="Solicitação de orientação">
        <div style={{ textAlign: "center", color: "#e03d3d", padding: "60px" }}>
          Erro ao carregar dados
        </div>
      </DashboardLayout>
    )
  }

  // Não está no último ano do curso
  if (!dados.isFinalista) {
    const anoSolicitacao = dados.duracao_anos ?? 4
    return (
      <DashboardLayout navItems={navItems} title="Orientador" subtitle="Solicitação de orientação">
        <div style={{
          background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px", padding: "40px", textAlign: "center"
        }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔒</div>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8eaf0", marginBottom: "8px" }}>
            Orientação disponível no {anoSolicitacao}º ano
          </div>
          <div style={{ fontSize: "13px", color: "#555e78" }}>
            A solicitação de orientação só está disponível para estudantes do {anoSolicitacao}º ano.
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Propina pendente (mas finalistas podem não ter propina mensal)
  // Finalistas só pagam taxa de monografia, não propinas mensais
  if (!dados.isFinalista && dados.pagamentoEstado !== "Pago") {
    return (
      <DashboardLayout navItems={navItems} title="Orientador" subtitle="Solicitação de orientação">
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
            <div style={{ fontSize: "13px", color: "#9098b0" }}>
              Precisa de estar com a propina em dia para solicitar orientação.
            </div>
          </div>
          <a href="/estudante/pagamentos" style={{
            marginLeft: "auto", padding: "8px 16px",
            background: "#f0a500", color: "#0d0f14",
            borderRadius: "8px", fontSize: "13px", fontWeight: "600",
            textDecoration: "none"
          }}>
            Ver Pagamentos
          </a>
        </div>
      </DashboardLayout>
    )
  }

  // Já tem solicitação
  if (dados.solicitacao) {
    const s = dados.solicitacao
    return (
      <DashboardLayout navItems={navItems} title="Orientador" subtitle="Solicitação de orientação">
        <div style={{
          background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px", padding: "24px", marginBottom: "16px"
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: "16px"
          }}>
            <div>
              <div style={{ fontSize: "11px", color: "#555e78", marginBottom: "4px" }}>
                Solicitado em {new Date(s.data_solicitacao).toLocaleDateString("pt-AO")}
              </div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#e8eaf0" }}>
                Pedido de Orientação
              </div>
            </div>
            <BadgeEstado estado={s.estado} />
          </div>

          {/* Info do orientador */}
          <div style={{
            background: "rgba(13,15,20,0.5)", borderRadius: "10px",
            padding: "16px", marginBottom: "16px"
          }}>
            <div style={{ fontSize: "12px", color: "#555e78", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Orientador Selecionado
            </div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0", marginBottom: "4px" }}>
              {s.orientador.nome_completo}
            </div>
            <div style={{ fontSize: "12px", color: "#555e78" }}>
              {s.orientador.especialidade}
            </div>
          </div>

          {/* Observações */}
          {s.observacoes && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "#555e78", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Observações
              </div>
              <div style={{ fontSize: "13px", color: "#9098b0", lineHeight: "1.6" }}>
                {s.observacoes}
              </div>
            </div>
          )}

          {/* Mensagem de estado */}
          {s.estado === "Pendente" && (
            <div style={{
              marginTop: "16px", padding: "12px",
              background: "rgba(240,165,0,0.08)", borderRadius: "8px"
            }}>
              <div style={{ fontSize: "12px", color: "#f0a500" }}>
                O seu pedido está a aguardar resposta do orientador.
              </div>
            </div>
          )}

          {s.estado === "Aceite" && (
            <div style={{
              marginTop: "16px", padding: "12px",
              background: "rgba(34,197,94,0.08)", borderRadius: "8px"
            }}>
              <div style={{ fontSize: "12px", color: "#22c55e" }}>
                Orientação aceite! Pode agora submeter o seu pré-projecto na página de Monografia.
              </div>
            </div>
          )}

          {s.estado === "Recusado" && (
            <div style={{
              marginTop: "16px", padding: "12px",
              background: "rgba(224,61,61,0.08)", borderRadius: "8px"
            }}>
              <div style={{ fontSize: "12px", color: "#e03d3d" }}>
                O seu pedido foi recusado. Pode fazer um novo pedido com outro orientador.
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    )
  }

  // Formulário de solicitação
  return (
    <DashboardLayout navItems={navItems} title="Orientador" subtitle="Solicitação de orientação">
      {sucesso ? (
        <div style={{
          background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "14px", padding: "24px", textAlign: "center"
        }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#22c55e", marginBottom: "8px" }}>
            Solicitação submetida com sucesso!
          </div>
          <div style={{ fontSize: "13px", color: "#9098b0" }}>
            O seu pedido de orientação foi enviado. Aguarde a resposta do orientador.
          </div>
        </div>
      ) : (
        <div style={{
          background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px", padding: "24px"
        }}>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8eaf0", marginBottom: "8px" }}>
            Solicitar Orientação
          </div>
          <div style={{ fontSize: "13px", color: "#555e78", marginBottom: "20px" }}>
            Selecione um orientador para a sua monografia. O orientador irá rever o seu pré-projecto e monografia.
          </div>

          {/* Lista de orientadores */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#555e78", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Orientadores Disponíveis *
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {dados.orientadores.map(o => (
                <div
                  key={o.id_orientador}
                  onClick={() => setOrientadorSelecionado(o.id_orientador)}
                  style={{
                    background: orientadorSelecionado === o.id_orientador ? "rgba(45,212,191,0.1)" : "#13161e",
                    border: orientadorSelecionado === o.id_orientador ? "1px solid #2dd4bf" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    padding: "14px 18px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ color: "#e8eaf0", fontSize: "14px", fontWeight: "500" }}>
                      {o.nome_completo}
                    </div>
                    <div style={{ color: "#555e78", fontSize: "12px", marginTop: "2px" }}>
                      {o.especialidade}
                    </div>
                  </div>
                  {orientadorSelecionado === o.id_orientador && (
                    <div style={{ color: "#2dd4bf", fontSize: "18px" }}>✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#555e78", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Observações (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={e => { setObservacoes(e.target.value); setErro("") }}
              placeholder="Descreva brevemente o tema ou área de interesse para a sua monografia..."
              rows={3}
              style={{
                width: "100%", padding: "10px 14px",
                background: "#0d0f14", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px", color: "#e8eaf0", fontSize: "13px",
                outline: "none", resize: "vertical", boxSizing: "border-box"
              }}
            />
          </div>

          {erro && (
            <div style={{
              background: "rgba(224,61,61,0.08)", border: "1px solid rgba(224,61,61,0.2)",
              borderRadius: "8px", padding: "12px", marginBottom: "16px",
              fontSize: "13px", color: "#e03d3d"
            }}>
              {erro}
            </div>
          )}

          <button
            onClick={submeterSolicitacao}
            disabled={submetendo || !orientadorSelecionado}
            style={{
              width: "100%", padding: "12px",
              background: submetendo || !orientadorSelecionado ? "#555e78" : "#e03d3d",
              color: "white", border: "none",
              borderRadius: "8px", fontSize: "14px",
              fontWeight: "600", cursor: submetendo || !orientadorSelecionado ? "not-allowed" : "pointer"
            }}
          >
            {submetendo ? "A submeter..." : "Submeter Solicitação"}
          </button>
        </div>
      )}
    </DashboardLayout>
  )
}