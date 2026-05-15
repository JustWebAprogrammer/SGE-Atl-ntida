"use client"

import { useState, useEffect, useCallback } from "react"
import DashboardLayout from "../../components/DashboardLayout"
import MulticaixaModal from "../../components/MulticaixaModal"
import { estudanteNavItems } from "../estudanteNav"

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

type Pagamento = {
  id: string
  origem: "propina" | "factura"
  referencia: string | null
  descricao: string | null
  mes: number | null
  ano: number | null
  codigo_confirmacao: string | null
  valor_base: number
  valor_multa: number
  valor_total: number
  data_vencimento: string
  data_pagamento: string | null
  estado: string
}

type PrecoInfo = {
  valor_propina: number
  valor_com_desconto: number
  valor_multa: number
  tipo_bolsa: string
  desconto: string
  origem: string
  curso: string
  ano_curricular: number
}

type Servico = {
  id_servico: number
  nome_servico: string
  descricao: string | null
  valor: number
  ja_pago: boolean
  pendente: boolean
  aceita_quantidade: boolean
}

function BadgeEstado({ estado }: { estado: string }) {
  const config = {
    Pago:     { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
    Pendente: { bg: "rgba(240,165,0,0.12)",    color: "#f0a500" },
    Atrasado: { bg: "rgba(224,61,61,0.12)",    color: "#e03d3d" },
  }[estado] ?? { bg: "rgba(85,94,120,0.2)", color: "#b0b8cf" }

  return (
    <span style={{
      background: config.bg, color: config.color,
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "11px", fontWeight: "600"
    }}>{estado}</span>
  )
}

export default function PagamentosDashboard() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"propinas" | "servicos">("propinas")
  const [precoInfo, setPrecoInfo] = useState<PrecoInfo | null>(null)

  // Re-enrollment state
  const [estudanteInfo, setEstudanteInfo] = useState<{
    ano_electivo: string | null
    estado: string
    ano_current: number | null
    notas_resumo: { nome_disciplina: string; nota_final: number | null; dispensada: boolean }[]
  } | null>(null)
  const [currentAnoLectivo, setCurrentAnoLectivo] = useState<string>("")

  // Advance payment state
  const [avancando, setAvancando] = useState(false)
  const [avancoErro, setAvancoErro] = useState("")
  const [avancoSucesso, setAvancoSucesso] = useState("")

  // Multicaixa modal state (for both propinas and servicos)
  const [modalAberto, setModalAberto] = useState(false)
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<Pagamento | null>(null)
  const [codigoGeradoServico, setCodigoGeradoServico] = useState<string | undefined>(undefined)
  const [modalIsServico, setModalIsServico] = useState(false)

  // PDF download state
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null)

  // Services state
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loadingServicos, setLoadingServicos] = useState(false)
  const [comprando, setComprando] = useState<number | null>(null)
  const [compraErro, setCompraErro] = useState<Record<number, string>>({})

  // Folha de Prova quantity modal
  const [folhaModal, setFolhaModal] = useState<Servico | null>(null)
  const [folhaQtd, setFolhaQtd] = useState(1)

  const carregarPagamentos = useCallback(() => {
    fetch("/api/estudante/pagamentos")
      .then(r => r.json())
      .then(setPagamentos)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    carregarPagamentos()
    fetch("/api/estudante/preco-atual")
      .then(r => r.json())
      .then(setPrecoInfo)
      .catch(() => {})

    // Fetch current academic year and student info for re-enrollment check
    fetch("/api/admin/sistema/config")
      .then(r => r.json())
      .then(data => {
        if (data.ano_lectivo_atual) {
          setCurrentAnoLectivo(data.ano_lectivo_atual)
        }
      })
      .catch(() => {})

    fetch("/api/estudante/me")
      .then(r => r.json())
      .then(data => {
        if (data.ano_electivo || data.estado) {
          // Fetch failed subjects too
          fetch("/api/estudante/notas-resumo")
            .then(r => r.json())
            .then(notas => {
              const notasArray = Array.isArray(notas) ? notas : (notas.notas || [])
              setEstudanteInfo({
                ano_electivo: data.ano_electivo,
                estado: data.estado,
                ano_current: data.ano_current,
                notas_resumo: notasArray.map((n: any) => ({
                  nome_disciplina: n.nome_disciplina || n.disciplina?.nome_disciplina || "",
                  nota_final: n.nota_final,
                  dispensada: n.dispensada,
                })),
              })
            })
            .catch(() => {
              setEstudanteInfo({
                ano_electivo: data.ano_electivo,
                estado: data.estado,
                ano_current: data.ano_current,
                notas_resumo: [],
              })
            })
        }
      })
      .catch(() => {})
  }, [carregarPagamentos])

  useEffect(() => {
    if (activeTab === "servicos") {
      setLoadingServicos(true)
      fetch("/api/estudante/servicos")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setServicos(data)
        })
        .finally(() => setLoadingServicos(false))
    }
  }, [activeTab])

  // ── Advance Payment ──
  async function pagarAvancado(meses: number) {
    setAvancando(true)
    setAvancoErro("")
    setAvancoSucesso("")

    try {
      const res = await fetch("/api/estudante/pagamentos/avancar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meses }),
      })
      const data = await res.json()

      if (!res.ok) {
        setAvancoErro(data.error || "Erro ao criar pagamentos avançados")
        return
      }

      setAvancoSucesso(`${data.total_meses} mês(es) criado(s) — Total: ${data.valor_total_grupo.toLocaleString("pt-AO")} Kz`)
      carregarPagamentos()
    } catch {
      setAvancoErro("Erro de conexão")
    } finally {
      setAvancando(false)
    }
  }

  // ── Multicaixa Modal ──
  function abrirMulticaixa(p: Pagamento) {
    // Se a propina tem código de confirmação, passá-lo para o modal
    setCodigoGeradoServico(p.codigo_confirmacao ?? undefined)
    setModalIsServico(false)
    setPagamentoSelecionado(p)
    setModalAberto(true)
  }

  function onPagamentoConfirmado() {
    // Busca dados actualizados do servidor (usa getSystemDate())
    carregarPagamentos()
    setPagamentoSelecionado(null)
    setCodigoGeradoServico(undefined)
    setModalIsServico(false)
  }

  // ── Serviços: comprar e abrir Multicaixa ──
  async function comprarServico(id_servico: number, quantidade?: number) {
    setComprando(id_servico)
    setCompraErro(e => ({ ...e, [id_servico]: "" }))

    try {
      const res = await fetch("/api/estudante/servicos/comprar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_servico, quantidade }),
      })

      const data = await res.json()

      if (!res.ok) {
        setCompraErro(e => ({ ...e, [id_servico]: data.error || "Erro ao comprar" }))
        return
      }

      // Abrir MulticaixaModal com o código gerado para confirmar pagamento
      const pagamentoSimulado: Pagamento = {
        id: String(data.id_factura),
        origem: "factura",
        referencia: data.numero_factura || "",
        descricao: data.mensagem || "Serviço",
        mes: null,
        ano: null,
        codigo_confirmacao: data.codigo_confirmacao || null,
        valor_base: data.valor,
        valor_multa: 0,
        valor_total: data.valor,
        data_vencimento: new Date().toISOString(),
        data_pagamento: null,
        estado: "Pendente",
      }
      setPagamentoSelecionado(pagamentoSimulado)
      setCodigoGeradoServico(data.codigo_confirmacao)
      setModalIsServico(true)
      setModalAberto(true)

      // Refresh servicos to update pendente state
      fetch("/api/estudante/servicos")
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setServicos(d) })
    } finally {
      setComprando(null)
    }
  }

  function onServicoConfirmado() {
    setCodigoGeradoServico(undefined)
    setModalIsServico(false)
    setPagamentoSelecionado(null)
    carregarPagamentos()
    fetch("/api/estudante/servicos")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setServicos(d) })
  }

  // ── PDF Download ──
  async function downloadFactura(pagamentoId: string) {
    setDownloadingPdf(pagamentoId)
    try {
      const numericId = pagamentoId.replace(/^(propina|factura)-/, "")
      const res = await fetch(`/api/estudante/factura/${numericId}`)
      const data = await res.json()
      if (!res.ok) return

      const { pdf } = await import("@react-pdf/renderer")
      const { default: FacturaPDF } = await import("../../components/FacturaPDF")

      const blob = await pdf(<FacturaPDF data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `factura-${data.numero_factura || numericId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail
    } finally {
      setDownloadingPdf(null)
    }
  }

  // Pendentes: só propinas (serviços pendentes ficam na tab Serviços)
  const pendentes = pagamentos.filter(p => p.origem === "propina" && p.estado !== "Pago")
  // Propinas pagas
  const pagos = pagamentos.filter(p => p.origem === "propina" && p.estado === "Pago")
  // Facturas de serviços pagas
  const servicosPagos = pagamentos.filter(p => p.origem === "factura" && p.estado === "Pago")
  // Histórico: propinas pagas + serviços pagos, ordenados por data (mais recente primeiro)
  const historico = [...pagos, ...servicosPagos].sort((a, b) => {
    const dataA = a.data_pagamento ?? a.data_vencimento
    const dataB = b.data_pagamento ?? b.data_vencimento
    return new Date(dataB).getTime() - new Date(dataA).getTime()
  })

  const totalEmDivida = pendentes.reduce((s, p) => s + p.valor_total, 0)

  return (
    <DashboardLayout navItems={estudanteNavItems} title="Pagamentos" subtitle="Propinas, serviços e histórico">

      {/* ── Re-enrollment Banner ── */}
      {estudanteInfo && currentAnoLectivo && estudanteInfo.estado === "EmCurso" && estudanteInfo.ano_electivo !== currentAnoLectivo && (
        <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #1e2230 100%)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
            <div style={{ fontSize: "28px" }}>📋</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#e8eaf0", marginBottom: "8px" }}>
                Rematrícula para o Ano Lectivo {currentAnoLectivo}
              </div>
              <div style={{ fontSize: "13px", color: "#d0d7e8", lineHeight: "1.6", marginBottom: "12px" }}>
                A Taxa de Rematrícula determina a sua continuidade no curso. 
                {estudanteInfo.ano_current && (
                  <span> Seu ano curricular actual é <strong style={{ color: "#e8eaf0" }}>{estudanteInfo.ano_current}º</strong>.</span>
                )}
              </div>

              {/* Failed subjects warning */}
              {(() => {
                const failedSubjects = estudanteInfo.notas_resumo.filter(
                  n => n.nota_final !== null && n.nota_final < 10 && !n.dispensada
                )
                if (failedSubjects.length > 0) {
                  return (
                    <div style={{ background: "rgba(224,61,61,0.1)", border: "1px solid rgba(224,61,61,0.2)", borderRadius: "8px", padding: "12px", marginBottom: "12px" }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#e03d3d", marginBottom: "6px" }}>
                        ⚠ Atenção: tem {failedSubjects.length} disciplina(s) reprovada(s)
                      </div>
                      <div style={{ fontSize: "12px", color: "#e8eaf0", marginBottom: "4px" }}>
                        Ao rematricular, estas disciplinas serão reiniciadas para o novo ano lectivo:
                      </div>
                      <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px", fontSize: "12px", color: "#d0d7e8" }}>
                        {failedSubjects.map((n, i) => (
                          <li key={i}>{n.nome_disciplina} (Nota: {n.nota_final})</li>
                        ))}
                      </ul>
                    </div>
                  )
                }
                return null
              })()}

              <div style={{ fontSize: "13px", color: "#d0d7e8" }}>
                A Taxa de Rematrícula está disponível na tab <strong style={{ color: "#3b82f6", cursor: "pointer" }} onClick={() => setActiveTab("servicos")}>Serviços</strong> para pagamento.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "8px" }}>
        <button onClick={() => setActiveTab("propinas")} style={{ padding: "10px 20px", background: activeTab === "propinas" ? "#3b82f6" : "transparent", color: activeTab === "propinas" ? "white" : "#d0d7e8", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Propinas</button>
        <button onClick={() => setActiveTab("servicos")} style={{ padding: "10px 20px", background: activeTab === "servicos" ? "#3b82f6" : "transparent", color: activeTab === "servicos" ? "white" : "#d0d7e8", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Serviços</button>
      </div>

      {/* ── Propinas Tab ── */}
      {activeTab === "propinas" && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
            {[
              { label: "Total em Dívida", value: loading ? "..." : `${totalEmDivida.toLocaleString("pt-AO")} Kz`, color: totalEmDivida > 0 ? "#e03d3d" : "#22c55e" },
              { label: "Pagamentos Pendentes", value: loading ? "..." : `${pendentes.length}`, color: pendentes.length > 0 ? "#f0a500" : "#22c55e" },
              { label: "Pagamentos Efectuados", value: loading ? "..." : `${pagos.length}`, color: "#22c55e" },
            ].map(s => (
              <div key={s.label} style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px", borderTop: `2px solid ${s.color}` }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#b0b8cf", marginBottom: "10px" }}>{s.label}</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {precoInfo && (
            <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "16px 20px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#b0b8cf", marginBottom: "4px" }}>Valor Mensal (Propina)</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#2dd4bf" }}>{precoInfo.valor_com_desconto.toLocaleString("pt-AO")} Kz</div>
              </div>
              <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#d0d7e8" }}>
                <span>Curso: <strong style={{ color: "#e8eaf0" }}>{precoInfo.curso}</strong></span>
                <span>Ano: <strong style={{ color: "#e8eaf0" }}>{precoInfo.ano_curricular}º</strong></span>
                {precoInfo.tipo_bolsa !== "Nenhuma" && (
                  <span style={{ color: "#22c55e" }}>Bolsa: {precoInfo.desconto}</span>
                )}
                <span style={{ fontSize: "10px", color: "#b0b8cf" }}>(Fonte: {precoInfo.origem === "curso" ? "Preço do curso" : "Fallback global"})</span>
              </div>
            </div>
          )}

          {/* Advance payment button */}
          <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => pagarAvancado(n)}
                  disabled={avancando}
                  style={{
                    padding: "10px 18px",
                    background: avancando ? "#b0b8cf" : "#3b82f6",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: avancando ? "not-allowed" : "pointer",
                  }}
                >
                  {avancando ? "..." : `Pagar ${n} mês${n > 1 ? "es" : ""}`}
                </button>
              ))}
            </div>
            {avancoErro && <span style={{ color: "#e03d3d", fontSize: "13px" }}>{avancoErro}</span>}
            {avancoSucesso && <span style={{ color: "#22c55e", fontSize: "13px" }}>✓ {avancoSucesso}</span>}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", color: "#b0b8cf", padding: "60px" }}>A carregar pagamentos...</div>
          ) : (
            <>
              {pendentes.length > 0 && (
                <div style={{ marginBottom: "32px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ background: "#f0a500", color: "#13161e", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>PENDENTES</span>
                    Pagamentos por efectuar
                  </div>
                  <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
                    {pendentes.map((p, i) => (
                      <div key={p.id} style={{ padding: "18px 24px", borderBottom: i < pendentes.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0" }}>
                              {p.origem === "propina" && p.mes && p.ano
                                ? `${MESES[p.mes - 1]} ${p.ano}`
                                : (p.descricao ?? "Serviço")}
                            </div>
                            <div style={{ fontSize: "11px", color: "#b0b8cf", marginTop: "2px" }}>
                              {p.referencia ? `Ref: ${p.referencia}` : ""}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "13px", color: "#d0d7e8" }}>
                                Base: <span style={{ color: "#e8eaf0", fontWeight: "600" }}>{(p.valor_base ?? 0).toLocaleString("pt-AO")} Kz</span>
                              </div>
                              {(p.valor_multa ?? 0) > 0 && (
                                <div style={{ fontSize: "12px", color: "#e03d3d", marginTop: "2px" }}>Multa: +{(p.valor_multa ?? 0).toLocaleString("pt-AO")} Kz</div>
                              )}
                              <div style={{ fontSize: "14px", fontWeight: "700", color: "#e8eaf0", marginTop: "2px" }}>Total: {(p.valor_total ?? 0).toLocaleString("pt-AO")} Kz</div>
                            </div>
                            <BadgeEstado estado={p.estado} />
                          </div>
                        </div>
                        <div style={{ marginTop: "12px", textAlign: "right" }}>
                          <button
                            onClick={() => abrirMulticaixa(p)}
                            style={{
                              padding: "8px 20px",
                              background: "#c0392b",
                              border: "none",
                              borderRadius: "8px",
                              color: "white",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            Pagar via Multicaixa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pagos.length > 0 && pendentes.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "24px 0" }}>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
                  <span style={{ fontSize: "12px", color: "#b0b8cf", textTransform: "uppercase", letterSpacing: "1px" }}>Histórico de Pagamentos</span>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
                </div>
              )}

              {historico.length > 0 && (
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ background: "#22c55e", color: "#13161e", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>HISTÓRICO</span>
                    Pagamentos efectuados
                  </div>
                  <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
                    {historico.map((p, i) => (
                      <div key={p.id} style={{ padding: "18px 24px", borderBottom: i < historico.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0" }}>
                              {p.origem === "propina" && p.mes && p.ano
                                ? `${MESES[p.mes - 1]} ${p.ano}`
                                : (p.descricao ?? "Serviço")}
                            </div>
                            <div style={{ fontSize: "11px", color: "#b0b8cf", marginTop: "2px" }}>
                              {p.referencia ? `Ref: ${p.referencia}` : ""}
                              {p.data_pagamento && ` · Pago em ${new Date(p.data_pagamento).toLocaleDateString("pt-AO")}`}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ fontSize: "14px", fontWeight: "700", color: "#e8eaf0" }}>{(p.valor_total ?? 0).toLocaleString("pt-AO")} Kz</div>
                            <BadgeEstado estado={p.estado} />
                            <button
                              onClick={() => downloadFactura(p.id)}
                              disabled={downloadingPdf === p.id}
                              style={{
                                padding: "6px 12px",
                                background: "rgba(59,130,246,0.1)",
                                border: "1px solid rgba(59,130,246,0.3)",
                                borderRadius: "6px",
                                color: "#3b82f6",
                                fontSize: "12px",
                                cursor: "pointer",
                                opacity: downloadingPdf === p.id ? 0.5 : 1,
                              }}
                              title="Download Factura"
                            >
                              {downloadingPdf === p.id ? "..." : "📄 PDF"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pagamentos.length === 0 && (
                <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "60px", textAlign: "center", color: "#b0b8cf" }}>
                  Sem pagamentos registados. Use os botões acima para pagar adiantado.
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Serviços Tab ── */}
      {activeTab === "servicos" && (
        <>
          {loadingServicos ? (
            <div style={{ textAlign: "center", color: "#b0b8cf", padding: "60px" }}>A carregar serviços...</div>
          ) : servicos.length === 0 ? (
            <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "60px", textAlign: "center", color: "#b0b8cf" }}>Nenhum serviço disponível.</div>
          ) : (
            <div style={{ background: "#1e2230", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
              {servicos.map((servico, i) => (
                <div key={servico.id_servico} style={{ padding: "18px 24px", borderBottom: i < servicos.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0" }}>{servico.nome_servico}</div>
                    {servico.descricao && <div style={{ fontSize: "12px", color: "#b0b8cf", marginTop: "4px" }}>{servico.descricao}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ fontSize: "18px", fontWeight: "700", color: "#3b82f6" }}>{Number(servico.valor).toLocaleString("pt-AO")} Kz</div>

                    {servico.ja_pago && (
                      <span style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600" }}>✓ Pago</span>
                    )}

                    {servico.pendente && !servico.ja_pago && (
                      <span style={{ background: "rgba(240,165,0,0.12)", color: "#f0a500", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600" }}>Pedido pendente</span>
                    )}

                    {!servico.ja_pago && !servico.pendente && (
                      <button
                        onClick={() => {
                          if (servico.aceita_quantidade) {
                            setFolhaModal(servico)
                            setFolhaQtd(1)
                          } else {
                            comprarServico(servico.id_servico)
                          }
                        }}
                        disabled={comprando === servico.id_servico}
                        style={{ padding: "8px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", opacity: comprando === servico.id_servico ? 0.7 : 1 }}
                      >
                        {comprando === servico.id_servico ? "A pagar..." : "Pagar"}
                      </button>
                    )}

                    {compraErro[servico.id_servico] && (
                      <span style={{ fontSize: "12px", color: "#e03d3d" }}>{compraErro[servico.id_servico]}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Multicaixa Modal ── */}
      {modalAberto && pagamentoSelecionado && (
        <MulticaixaModal
          isOpen={modalAberto}
          onClose={() => { setModalAberto(false); setPagamentoSelecionado(null); setCodigoGeradoServico(undefined); setModalIsServico(false) }}
          onSuccess={modalIsServico ? onServicoConfirmado : onPagamentoConfirmado}
          codigoGerado={codigoGeradoServico}
          isServico={modalIsServico}
          pagamento={{
            id: pagamentoSelecionado.id,
            referencia: pagamentoSelecionado.referencia || "",
            valor_total: pagamentoSelecionado.valor_total,
            descricao: pagamentoSelecionado.origem === "propina" && pagamentoSelecionado.mes && pagamentoSelecionado.ano
              ? `Propina — ${MESES[pagamentoSelecionado.mes - 1]} ${pagamentoSelecionado.ano}`
              : (pagamentoSelecionado.descricao || "Serviço"),
          }}
        />
      )}

      {/* ── Folha de Prova Quantity Modal ── */}
      {folhaModal && (
        <div
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setFolhaModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#1e2230", borderRadius: "16px", padding: "24px", width: "360px", maxWidth: "90vw" }}
          >
            <h3 style={{ margin: "0 0 8px 0", color: "#e8eaf0" }}>Folha de Prova</h3>
            <p style={{ color: "#d0d7e8", fontSize: "13px", marginBottom: "16px" }}>
              Quantas folhas deseja? (Unitário: {Number(folhaModal.valor).toLocaleString("pt-AO")} Kz)
            </p>
            <div style={{ marginBottom: "16px" }}>
              <input
                type="number"
                min={1}
                max={10}
                value={folhaQtd}
                onChange={e => setFolhaQtd(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#0d0f14",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "18px",
                  textAlign: "center",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: "#d0d7e8" }}>Total</div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#2dd4bf" }}>
                {(Number(folhaModal.valor) * folhaQtd).toLocaleString("pt-AO")} Kz
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setFolhaModal(null)}
                style={{ padding: "10px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#d0d7e8", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  comprarServico(folhaModal.id_servico, folhaQtd)
                  setFolhaModal(null)
                }}
                style={{ padding: "10px 20px", background: "#3b82f6", border: "none", borderRadius: "8px", color: "white", fontWeight: "600", cursor: "pointer" }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}