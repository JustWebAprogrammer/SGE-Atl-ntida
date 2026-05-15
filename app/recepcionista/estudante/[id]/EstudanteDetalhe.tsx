"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "../../../components/DashboardLayout"

const navItems = [
  { label: "Pesquisa", path: "/recepcionista" },
]

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

type Propina = {
  id_pagamento: number
  referencia: string
  mes: number
  ano: number
  valor_base: number
  valor_multa: number
  valor_total: number
  data_vencimento: string
  data_pagamento: string | null
  estado: string
  forma_pagamento: string
}

type Certificado = {
  id_certificado: number
  tipo_certificado: string
  data_emissao: string
  descricao: string | null
}

type Factura = {
  id_factura: number
  numero_factura: string | null
  descricao_servico: string | null
  valor_total: number
  valor_final: number | null
  data_emissao: string
  data_vencimento: string
  data_pagamento: string | null
  estado: string
  periodo: string | null
  ano_lectivo: string | null
  metodo_pagamento: string | null
  entregue: boolean
}

type EstudanteDetalhe = {
  id_estudante: number
  nome_completo: string
  numero_estudante: string | null
  numero_telemovel: string | null
  ano_current: number | null
  ano_electivo: string | null
  estado: string
  pagamento: string
  data_cadastro: string | null
  usuario: { email: string }
  curso: { nome_curso: string; id_curso: number }
  pagamentos_propina: Propina[]
  certificados: Certificado[]
  facturas: Factura[]
  notas_cobranca: { id_nota_cobranca: number; descricao: string; valor: number; data_vencimento: string }[]
  monografias: { id_monografia: number; titulo: string; estado: string; data_submissao: string }[]
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      background: bg, color,
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "11px", fontWeight: "600"
    }}>{label}</span>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#1e2230",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "14px", overflow: "hidden",
      marginBottom: "16px"
    }}>
      <div style={{
        padding: "14px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        fontSize: "12px", fontWeight: "600",
        color: "#d0d7e8", textTransform: "uppercase" as const,
        letterSpacing: "0.5px"
      }}>{titulo}</div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  )
}

type ContagemImpressao = {
  id_factura: number
  count: number
  limite: number
  bloqueado: boolean
}

export default function EstudanteDetalhe({ id }: { id: string }) {
  const router = useRouter()
  const [dados, setDados] = useState<EstudanteDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [acaoLoading, setAcaoLoading] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: "ok" | "erro" } | null>(null)
  const [contagens, setContagens] = useState<Record<number, ContagemImpressao>>({})
  const [recepcionistaNome, setRecepcionistaNome] = useState<string>("")


  useEffect(() => {
    fetch(`/api/recepcionista/estudante/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setErro(data.error)
        else setDados(data.estudante)
      })
      .catch(() => setErro("Erro de ligação"))
      .finally(() => setLoading(false))

    // Buscar nome do recepcionista actual
    fetch("/api/recepcionista/me")
      .then(r => r.json())
      .then(data => {
        if (data.nome_completo) setRecepcionistaNome(data.nome_completo)
      })
      .catch(() => {})
  }, [id])

  // Buscar contagem de impressões para facturas com documentos
  useEffect(() => {
    if (!dados) return

    const facturasComDocumento = dados.facturas.filter(f =>
      f.descricao_servico &&
      ((f.descricao_servico.toLowerCase().includes("certificado") && f.descricao_servico.toLowerCase().includes("conclus")) ||
       (f.descricao_servico.toLowerCase().includes("declara") && f.descricao_servico.toLowerCase().includes("acad")))
    )

    if (facturasComDocumento.length === 0) return

    async function carregarContagens() {
      const novasContagens: Record<number, ContagemImpressao> = {}
      await Promise.all(
        facturasComDocumento.map(async (f) => {
          try {
            const res = await fetch(`/api/recepcionista/auditar/contagem?id_factura=${f.id_factura}`)
            const data = await res.json()
            if (res.ok) {
              novasContagens[f.id_factura] = {
                id_factura: f.id_factura,
                count: data.count,
                limite: data.limite,
                bloqueado: data.bloqueado,
              }
            }
          } catch {
            // silencioso
          }
        })
      )
      setContagens(novasContagens)
    }

    carregarContagens()
  }, [dados])

  async function emitir(tipo: string, extra?: Record<string, unknown>) {
    if (!dados) return
    setAcaoLoading(tipo)
    setMensagem(null)

    try {
      const res = await fetch("/api/recepcionista/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, id_estudante: dados.id_estudante, ...extra }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMensagem({ texto: data.error ?? "Erro desconhecido", tipo: "erro" })
        return
      }

      setMensagem({ texto: data.mensagem, tipo: "ok" })

      // Refazer fetch para actualizar dados
      const r2 = await fetch(`/api/recepcionista/estudante/${id}`)
      const d2 = await r2.json()
      if (d2.estudante) setDados(d2.estudante)
    } catch {
      setMensagem({ texto: "Erro de ligação", tipo: "erro" })
    } finally {
      setAcaoLoading(null)
    }
  }

  async function marcarEntregue(id_factura: number) {
    setAcaoLoading(`entregar_${id_factura}`)
    setMensagem(null)
    try {
      const res = await fetch("/api/recepcionista/factura/entregar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_factura }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMensagem({ texto: data.error ?? "Erro", tipo: "erro" })
        return
      }

      setMensagem({ texto: data.mensagem, tipo: "ok" })

      // Refazer fetch
      const r2 = await fetch(`/api/recepcionista/estudante/${id}`)
      const d2 = await r2.json()
      if (d2.estudante) setDados(d2.estudante)
    } catch {
      setMensagem({ texto: "Erro de ligação", tipo: "erro" })
    } finally {
      setAcaoLoading(null)
    }
  }

  async function auditarImpressao(id_factura: number, tipo: "fatura" | "documento") {
    try {
      const res = await fetch("/api/recepcionista/auditar/impressao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_factura, tipo }),
      })
      if (!res.ok) {
        const data = await res.json()
        setMensagem({ texto: data.error ?? "Erro ao registar impressão", tipo: "erro" })
        return false
      }
      // Actualizar contagem local após impressão bem-sucedida
      if (tipo === "documento") {
        setContagens(prev => {
          const atual = prev[id_factura]
          if (!atual) return prev
          const novoCount = atual.count + 1
          return {
            ...prev,
            [id_factura]: {
              ...atual,
              count: novoCount,
              bloqueado: novoCount >= 2,
            },
          }
        })
      }
      return true
    } catch {
      setMensagem({ texto: "Erro de ligação ao registar impressão", tipo: "erro" })
      return false
    }
  }

  async function imprimirTalaoPropina(propina: Propina) {
    if (!dados) return
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { default: FacturaTalao } = await import("../../../components/FacturaTalao")

      const data = {
        numero_factura: propina.referencia,
        descricao_servico: `Propina - ${MESES[propina.mes - 1]} ${propina.ano}`,
        valor_total: Number(propina.valor_total),
        valor_base: Number(propina.valor_base),
        valor_multa: Number(propina.valor_multa),
        data_emissao: new Date().toISOString(),
        data_pagamento: propina.data_pagamento,
        metodo_pagamento: propina.forma_pagamento,
        mes: propina.mes,
        ano: propina.ano,
        origem: "propina" as const,
        emitido_por: recepcionistaNome || null,
        estudante: {
          nome_completo: dados.nome_completo,
          numero_estudante: dados.numero_estudante,
          curso: dados.curso.nome_curso,
        },
      }

      const blob = await pdf(<FacturaTalao data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      // silently fail
    }
  }

  async function imprimirFaturaPropina(propina: Propina) {
    if (!dados) return
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { default: FacturaPDF } = await import("../../../components/FacturaPDF")

      const data = {
        numero_factura: propina.referencia,
        descricao_servico: `Propina - ${MESES[propina.mes - 1]} ${propina.ano}`,
        valor_total: Number(propina.valor_total),
        valor_base: Number(propina.valor_base),
        valor_multa: Number(propina.valor_multa),
        data_emissao: new Date().toISOString(),
        data_pagamento: propina.data_pagamento,
        estado: propina.estado,
        metodo_pagamento: propina.forma_pagamento,
        mes: propina.mes,
        ano: propina.ano,
        origem: "propina" as const,
        referencia: propina.referencia,
        emitido_por: recepcionistaNome || null,
        estudante: {
          nome_completo: dados.nome_completo,
          numero_estudante: dados.numero_estudante,
          curso: dados.curso.nome_curso,
          email: dados.usuario?.email || "",
        },
      }

      const blob = await pdf(<FacturaPDF data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      // silently fail
    }
  }

  async function imprimirTalaoServico(factura: Factura) {
    if (!dados) return
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { default: FacturaTalao } = await import("../../../components/FacturaTalao")

      const data = {
        numero_factura: factura.numero_factura || "",
        descricao_servico: factura.descricao_servico || "Serviço",
        valor_total: Number(factura.valor_final ?? factura.valor_total),
        data_emissao: factura.data_emissao,
        data_pagamento: factura.data_pagamento,
        metodo_pagamento: factura.metodo_pagamento,
        mes: null,
        ano: null,
        origem: "factura" as const,
        emitido_por: recepcionistaNome || null,
        estudante: {
          nome_completo: dados.nome_completo,
          numero_estudante: dados.numero_estudante,
          curso: dados.curso.nome_curso,
        },
      }

      const blob = await pdf(<FacturaTalao data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      // silently fail
    }
  }

  async function imprimirFaturaServico(factura: Factura) {
    if (!dados) return
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { default: FacturaPDF } = await import("../../../components/FacturaPDF")

      const data = {
        numero_factura: factura.numero_factura || "",
        descricao_servico: factura.descricao_servico || "Serviço",
        valor_total: Number(factura.valor_final ?? factura.valor_total),
        valor_base: Number(factura.valor_total),
        valor_multa: 0,
        data_emissao: factura.data_emissao,
        data_pagamento: factura.data_pagamento,
        estado: factura.estado,
        metodo_pagamento: factura.metodo_pagamento || "—",
        mes: null,
        ano: null,
        origem: "factura" as const,
        referencia: factura.numero_factura,
        emitido_por: recepcionistaNome || null,
        estudante: {
          nome_completo: dados.nome_completo,
          numero_estudante: dados.numero_estudante,
          curso: dados.curso.nome_curso,
          email: dados.usuario?.email || "",
        },
      }

      const blob = await pdf(<FacturaPDF data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      // silently fail
    }
  }

  function imprimirDocumento(factura: Factura) {
    if (!dados || !factura.descricao_servico) return

    const desc = factura.descricao_servico.toLowerCase()
    const isCertificado = desc.includes("certificado") && desc.includes("conclus")
    const isDeclaracao = desc.includes("declara") && desc.includes("acad")

    if (!isCertificado && !isDeclaracao) return

    const titulo = isCertificado ? "CERTIFICADO DE CONCLUSÃO" : "DECLARAÇÃO ACADÉMICA"
    const texto = isCertificado
      ? `Certificamos que <strong>${dados.nome_completo}</strong>, portador do Nº de Estudante <strong>${dados.numero_estudante ?? "—"}</strong>, concluiu com aproveitamento o curso de <strong>${dados.curso.nome_curso}</strong>, no ano lectivo de <strong>${dados.ano_electivo ?? dados.ano_current + "º ano"}</strong>.`
      : `Declaramos para os devidos efeitos que <strong>${dados.nome_completo}</strong>, portador do Nº de Estudante <strong>${dados.numero_estudante ?? "—"}</strong>, é estudante regular do curso de <strong>${dados.curso.nome_curso}</strong>, frequentando actualmente o <strong>${dados.ano_current ?? "—"}º ano</strong>, no ano lectivo de <strong>${dados.ano_electivo ?? "2024/2025"}</strong>.`

    const conteudo = `
      <html>
        <head>
          <title>${titulo} - ${dados.nome_completo}</title>
          <style>
            body { font-family: "Times New Roman", serif; padding: 60px; color: #333; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 60px; }
            .header h1 { margin: 0; font-size: 18px; color: #333; letter-spacing: 2px; }
            .header .sub { font-size: 14px; color: #666; margin-top: 5px; }
            .title { text-align: center; font-size: 22px; font-weight: bold; margin: 40px 0; text-decoration: underline; }
            .content { text-align: justify; font-size: 16px; margin: 40px 0; }
            .footer { margin-top: 80px; text-align: center; }
            .footer .date { margin-bottom: 60px; }
            .signature { margin-top: 40px; }
            .signature-line { border-top: 1px solid #333; width: 300px; margin: 0 auto; padding-top: 5px; }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(0,0,0,0.03); pointer-events: none; }
          </style>
        </head>
        <body>
          <div class="watermark">ISP ATLÂNTIDA</div>
          <div class="header">
            <h1>INSTITUTO SUPERIOR POLITÉCNICO ATLÂNTIDA</h1>
            <div class="sub">Angola | Sede em Luanda</div>
          </div>

          <div class="title">${titulo}</div>

          <div class="content">
            <p>${texto}</p>
            <p style="margin-top: 30px;">O presente documento destina-se a servir de comprovativo perante quem de direito.</p>
          </div>

          <div class="footer">
            <div class="date">Luanda, ${new Date().toLocaleDateString("pt-AO", { day: "numeric", month: "long", year: "numeric" })}</div>
            <div class="signature">
              <div class="signature-line">O Director Geral</div>
            </div>
          </div>
        </body>
      </html>
    `

    const janela = window.open("", "_blank", "width=800,height=900")
    if (janela) {
      janela.document.write(conteudo)
      janela.document.close()
      janela.focus()
      setTimeout(() => janela.print(), 300)
    }
  }

  if (loading) return (
    <DashboardLayout navItems={navItems} title="Recepção" subtitle="Ficha de estudante">
      <div style={{ textAlign: "center", color: "#b0b8cf", padding: "80px" }}>
        A carregar...
      </div>
    </DashboardLayout>
  )

  if (erro || !dados) return (
    <DashboardLayout navItems={navItems} title="Recepção" subtitle="Ficha de estudante">
      <div style={{
        background: "#1e2230", border: "1px solid rgba(224,61,61,0.3)",
        borderRadius: "14px", padding: "40px", textAlign: "center", color: "#e03d3d"
      }}>
        {erro || "Estudante não encontrado"}
      </div>
    </DashboardLayout>
  )

  const propinasPagas = dados.pagamentos_propina.filter(p => p.estado === "Pago")
  const propinasPendentes = dados.pagamentos_propina.filter(p => p.estado !== "Pago")
  // Facturas que não são propinas (outros serviços)
  const outrasFacturas = dados.facturas.filter(f =>
    f.descricao_servico && !f.descricao_servico.toLowerCase().includes("propina")
  )

  return (
    <DashboardLayout navItems={navItems} title="Recepção" subtitle="Ficha de estudante">

      {/* Botão voltar */}
      <button
        onClick={() => router.push("/recepcionista")}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#d0d7e8", borderRadius: "8px",
          padding: "8px 16px", fontSize: "13px",
          cursor: "pointer", marginBottom: "20px",
          display: "flex", alignItems: "center", gap: "6px"
        }}
      >
        ← Voltar à pesquisa
      </button>

      {/* Mensagem de feedback global */}
      {mensagem && (
        <div style={{
          background: mensagem.tipo === "ok"
            ? "rgba(34,197,94,0.1)"
            : "rgba(224,61,61,0.1)",
          border: `1px solid ${mensagem.tipo === "ok" ? "rgba(34,197,94,0.3)" : "rgba(224,61,61,0.3)"}`,
          borderRadius: "10px", padding: "12px 20px",
          color: mensagem.tipo === "ok" ? "#22c55e" : "#e03d3d",
          fontSize: "13px", marginBottom: "16px",
          display: "flex", alignItems: "center", gap: "8px"
        }}>
          {mensagem.tipo === "ok" ? "✓" : "✕"} {mensagem.texto}
        </div>
      )}

      {/* Header do estudante */}
      <div style={{
        background: "#1e2230",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px", padding: "24px 28px",
        marginBottom: "16px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexWrap: "wrap" as const, gap: "16px"
      }}>
        <div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#e8eaf0", marginBottom: "6px" }}>
            {dados.nome_completo}
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" as const }}>
            {dados.numero_estudante && (
              <span style={{ fontSize: "13px", color: "#d0d7e8" }}>
                Nº <strong style={{ color: "#e8eaf0" }}>{dados.numero_estudante}</strong>
              </span>
            )}
            <span style={{ fontSize: "13px", color: "#d0d7e8" }}>
              {dados.curso.nome_curso}
            </span>
            {dados.ano_current && (
              <span style={{ fontSize: "13px", color: "#d0d7e8" }}>
                {dados.ano_current}º ano
              </span>
            )}
            {dados.numero_telemovel && (
              <span style={{ fontSize: "13px", color: "#d0d7e8" }}>
                📞 {dados.numero_telemovel}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const, alignItems: "center" }}>
          {{
            EmCurso:    <Badge label="Em Curso"   color="#2dd4bf" bg="rgba(45,212,191,0.1)" />,
            Finalizado: <Badge label="Finalizado" color="#22c55e" bg="rgba(34,197,94,0.12)" />,
            Desistente: <Badge label="Desistente" color="#e03d3d" bg="rgba(224,61,61,0.12)" />,
          }[dados.estado] ?? null}
          {{
            Pago:     <Badge label="Propina OK" color="#22c55e" bg="rgba(34,197,94,0.12)" />,
            Pendente: <Badge label="Propina Pendente" color="#f0a500" bg="rgba(240,165,0,0.12)" />,
            Atrasado: <Badge label="Propina Atrasada" color="#e03d3d" bg="rgba(224,61,61,0.12)" />,
          }[dados.pagamento] ?? null}
        </div>
      </div>

      {/* ─── HISTÓRICO DE PROPINAS ─── */}
      {dados.pagamentos_propina.length > 0 && (
        <Secao titulo={`Histórico de Propinas (${dados.pagamentos_propina.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {dados.pagamentos_propina.map(p => {
              const isPago = p.estado === "Pago"
              return (
                <div key={p.id_pagamento} style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center",
                  background: isPago ? "rgba(34,197,94,0.05)" : "rgba(224,61,61,0.05)",
                  border: `1px solid ${isPago ? "rgba(34,197,94,0.15)" : "rgba(224,61,61,0.15)"}`,
                  borderRadius: "10px", padding: "12px 16px",
                  flexWrap: "wrap", gap: "10px"
                }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0" }}>
                      {MESES[p.mes - 1]} {p.ano}
                    </div>
                    <div style={{ fontSize: "11px", color: "#b0b8cf", marginTop: "2px" }}>
                      Ref: {p.referencia} | Venc: {new Date(p.data_vencimento).toLocaleDateString("pt-AO")}
                    </div>
                    {p.data_pagamento && (
                      <div style={{ fontSize: "11px", color: "#22c55e", marginTop: "2px" }}>
                        Pago em {new Date(p.data_pagamento).toLocaleDateString("pt-AO")} via {p.forma_pagamento}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "right" }}>
                      {p.valor_multa > 0 && (
                        <div style={{ fontSize: "11px", color: "#e03d3d" }}>
                          Multa: +{Number(p.valor_multa).toLocaleString("pt-AO")} Kz
                        </div>
                      )}
                      <div style={{ fontSize: "15px", fontWeight: "700", color: isPago ? "#22c55e" : "#e03d3d" }}>
                        {Number(p.valor_total).toLocaleString("pt-AO")} Kz
                      </div>
                    </div>
                    <Badge
                      label={p.estado}
                      color={isPago ? "#22c55e" : p.estado === "Atrasado" ? "#e03d3d" : "#f0a500"}
                      bg={isPago ? "rgba(34,197,94,0.12)" : p.estado === "Atrasado" ? "rgba(224,61,61,0.12)" : "rgba(240,165,0,0.12)"}
                    />
                    {isPago && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => imprimirFaturaPropina(p)}
                          style={{
                            padding: "8px 10px",
                            background: "rgba(45,212,191,0.15)",
                            border: "1px solid rgba(45,212,191,0.3)",
                            color: "#2dd4bf", borderRadius: "8px",
                            fontSize: "11px", fontWeight: "600",
                            cursor: "pointer", whiteSpace: "nowrap" as const
                          }}
                        >
                          🖨️ A4
                        </button>
                        <button
                          onClick={() => imprimirTalaoPropina(p)}
                          style={{
                            padding: "8px 10px",
                            background: "rgba(155,89,182,0.15)",
                            border: "1px solid rgba(155,89,182,0.3)",
                            color: "#9b59b6", borderRadius: "8px",
                            fontSize: "11px", fontWeight: "600",
                            cursor: "pointer", whiteSpace: "nowrap" as const
                          }}
                        >
                          🧾 Talão
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Resumo */}
          <div style={{
            marginTop: "16px",
            padding: "12px 16px",
            background: "rgba(13,15,20,0.4)",
            borderRadius: "10px",
            display: "flex",
            gap: "24px",
            flexWrap: "wrap",
            fontSize: "13px"
          }}>
            <span style={{ color: "#22c55e" }}>
              ✓ {propinasPagas.length} paga{propinasPagas.length !== 1 ? "s" : ""}
            </span>
            <span style={{ color: "#e03d3d" }}>
              ⚠ {propinasPendentes.length} pendente{propinasPendentes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </Secao>
      )}

      {/* ─── HISTÓRICO DE PAGAMENTOS E DOCUMENTOS ─── */}
      {outrasFacturas.length > 0 && (
        <Secao titulo={`Histórico de Pagamentos e Documentos (${outrasFacturas.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {outrasFacturas.map(f => (
              <div key={f.id_factura} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center",
                background: f.entregue ? "rgba(34,197,94,0.05)" : "rgba(13,15,20,0.4)",
                border: `1px solid ${f.entregue ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: "10px", padding: "12px 16px",
                flexWrap: "wrap", gap: "10px"
              }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0" }}>
                    {f.descricao_servico ?? "Serviço"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#b0b8cf", marginTop: "2px" }}>
                    {f.numero_factura && `Nº ${f.numero_factura} | `}
                    {new Date(f.data_emissao).toLocaleDateString("pt-AO")}
                    {f.ano_lectivo && ` | ${f.ano_lectivo}`}
                  </div>
                  {f.metodo_pagamento && (
                    <div style={{ fontSize: "11px", color: "#d0d7e8", marginTop: "2px" }}>
                      Pagamento: {f.metodo_pagamento}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#e8eaf0" }}>
                      {Number(f.valor_final ?? f.valor_total).toLocaleString("pt-AO")} Kz
                    </div>
                  </div>
                  <Badge
                    label={f.estado}
                    color={f.estado === "Pago" ? "#22c55e" : f.estado === "Atrasado" ? "#e03d3d" : "#f0a500"}
                    bg={f.estado === "Pago" ? "rgba(34,197,94,0.12)" : f.estado === "Atrasado" ? "rgba(224,61,61,0.12)" : "rgba(240,165,0,0.12)"}
                  />
                  {f.estado === "Pago" && (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={async () => {
                          await auditarImpressao(f.id_factura, "fatura")
                          imprimirFaturaServico(f)
                        }}
                        style={{
                          padding: "8px 10px",
                          background: "rgba(45,212,191,0.15)",
                          border: "1px solid rgba(45,212,191,0.3)",
                          color: "#2dd4bf", borderRadius: "8px",
                          fontSize: "11px", fontWeight: "600",
                          cursor: "pointer", whiteSpace: "nowrap" as const
                        }}
                      >
                        🖨️ A4
                      </button>
                      <button
                        onClick={async () => {
                          await auditarImpressao(f.id_factura, "fatura")
                          imprimirTalaoServico(f)
                        }}
                        style={{
                          padding: "8px 10px",
                          background: "rgba(155,89,182,0.15)",
                          border: "1px solid rgba(155,89,182,0.3)",
                          color: "#9b59b6", borderRadius: "8px",
                          fontSize: "11px", fontWeight: "600",
                          cursor: "pointer", whiteSpace: "nowrap" as const
                        }}
                      >
                        🧾 Talão
                      </button>
                    </div>
                  )}
                  {f.estado === "Pago" && f.descricao_servico && (
                    (f.descricao_servico.toLowerCase().includes("certificado") && f.descricao_servico.toLowerCase().includes("conclus")) ||
                    (f.descricao_servico.toLowerCase().includes("declara") && f.descricao_servico.toLowerCase().includes("acad"))
                  ) && (() => {
                    const c = contagens[f.id_factura]
                    const bloqueado = c?.bloqueado ?? false
                    const count = c?.count ?? 0
                    const label = bloqueado
                      ? `📄 Documento (${count}/2)`
                      : `📄 Documento ${count > 0 ? `(${count}/2)` : ""}`
                    return (
                      <button
                        onClick={async () => {
                          const ok = await auditarImpressao(f.id_factura, "documento")
                          if (ok) imprimirDocumento(f)
                        }}
                        disabled={bloqueado}
                        title={bloqueado ? "Limite de 2 impressões atingido" : undefined}
                        style={{
                          padding: "8px 14px",
                          background: bloqueado
                            ? "rgba(85,94,120,0.15)"
                            : "rgba(155,89,182,0.15)",
                          border: `1px solid ${bloqueado ? "rgba(85,94,120,0.3)" : "rgba(155,89,182,0.3)"}`,
                          color: bloqueado ? "#b0b8cf" : "#9b59b6",
                          borderRadius: "8px",
                          fontSize: "12px", fontWeight: "600",
                          cursor: bloqueado ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap" as const,
                          opacity: bloqueado ? 0.7 : 1,
                        }}
                      >
                        {label}
                      </button>
                    )
                  })()}
                  {f.entregue ? (
                    <Badge
                      label="Entregue"
                      color="#22c55e"
                      bg="rgba(34,197,94,0.12)"
                    />
                  ) : (
                    <button
                      onClick={() => marcarEntregue(f.id_factura)}
                      disabled={acaoLoading === `entregar_${f.id_factura}`}
                      style={{
                        padding: "8px 14px",
                        background: "rgba(240,165,0,0.15)",
                        border: "1px solid rgba(240,165,0,0.3)",
                        color: "#f0a500", borderRadius: "8px",
                        fontSize: "12px", fontWeight: "600",
                        cursor: acaoLoading === `entregar_${f.id_factura}` ? "not-allowed" : "pointer",
                        whiteSpace: "nowrap" as const,
                        opacity: acaoLoading === `entregar_${f.id_factura}` ? 0.6 : 1
                      }}
                    >
                      {acaoLoading === `entregar_${f.id_factura}` ? "..." : "📦 Entregar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Secao>
      )}

      {/* ─── CERTIFICADOS PARA LEVANTAR ─── */}
      {dados.certificados.length > 0 && (
        <Secao titulo={`Certificados (${dados.certificados.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {dados.certificados.map(c => (
              <div key={c.id_certificado} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(13,15,20,0.4)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px", padding: "12px 16px"
              }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0" }}>
                    Certificado de {c.tipo_certificado}
                  </div>
                  <div style={{ fontSize: "11px", color: "#b0b8cf", marginTop: "2px" }}>
                    Emitido em {new Date(c.data_emissao).toLocaleDateString("pt-AO")}
                  </div>
                  {c.descricao && (
                    <div style={{ fontSize: "11px", color: "#d0d7e8", marginTop: "2px" }}>
                      {c.descricao}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => emitir("levantamento_certificado", { id_certificado: c.id_certificado })}
                  disabled={acaoLoading === "levantamento_certificado"}
                  style={{
                    padding: "8px 16px",
                    background: "rgba(34,197,94,0.15)",
                    border: "1px solid rgba(34,197,94,0.3)",
                    color: "#22c55e", borderRadius: "8px",
                    fontSize: "12px", fontWeight: "600",
                    cursor: acaoLoading === "levantamento_certificado" ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap" as const
                  }}
                >
                  {acaoLoading === "levantamento_certificado" ? "..." : "✓ Confirmar Levantamento"}
                </button>
              </div>
            ))}
          </div>
        </Secao>
      )}

      {/* ─── NOTAS DE COBRANÇA PENDENTES ─── */}
      {dados.notas_cobranca.length > 0 && (
        <Secao titulo={`Outras cobranças pendentes (${dados.notas_cobranca.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {dados.notas_cobranca.map(n => (
              <div key={n.id_nota_cobranca} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "rgba(13,15,20,0.4)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px", padding: "12px 16px"
              }}>
                <div style={{ fontSize: "14px", color: "#e8eaf0" }}>{n.descricao}</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#f0a500" }}>
                  {Number(n.valor).toLocaleString("pt-AO")} Kz
                </div>
              </div>
            ))}
          </div>
        </Secao>
      )}

    </DashboardLayout>
  )
}
