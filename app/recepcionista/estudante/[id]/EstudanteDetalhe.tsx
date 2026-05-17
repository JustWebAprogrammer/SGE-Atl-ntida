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
  status: string
}

// Workflow de status dos certificados
const CERT_STATUS_FLOW = [
  { value: "Solicitado", label: "Solicitado", color: "rgba(240,165,0,0.12)", textColor: "#f0a500" },
  { value: "EmPreparacao", label: "Em Preparação", color: "rgba(59,130,246,0.12)", textColor: "#3b82f6" },
  { value: "ProntoParaLevantamento", label: "Pronto para Levantamento", color: "rgba(168,85,247,0.12)", textColor: "#a855f7" },
  { value: "Entregue", label: "Entregue", color: "rgba(34,197,94,0.12)", textColor: "#22c55e" },
]

function getNextCertStatus(current: string): string | null {
  const idx = CERT_STATUS_FLOW.findIndex(s => s.value === current)
  if (idx === -1 || idx === CERT_STATUS_FLOW.length - 1) return null
  return CERT_STATUS_FLOW[idx + 1].value
}

function getCertStatusConfig(value: string) {
  return CERT_STATUS_FLOW.find(s => s.value === value) || CERT_STATUS_FLOW[0]
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

export default function EstudanteDetalhe({ id }: { id: string }) {
  const router = useRouter()
  const [dados, setDados] = useState<EstudanteDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [acaoLoading, setAcaoLoading] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: "ok" | "erro" } | null>(null)
  const [recepcionistaNome, setRecepcionistaNome] = useState<string>("")
  const [propinasExpandido, setPropinasExpandido] = useState(true)


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

  async function auditarImpressao(id_factura: number) {
    try {
      const res = await fetch("/api/recepcionista/auditar/impressao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_factura, tipo: "fatura" }),
      })
      if (!res.ok) {
        const data = await res.json()
        setMensagem({ texto: data.error ?? "Erro ao registar impressão", tipo: "erro" })
        return false
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
          {/* Botão de expandir/recolher quando tem muitas propinas */}
          {dados.pagamentos_propina.length > 3 && (
            <div style={{ padding: "0 24px 12px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setPropinasExpandido(!propinasExpandido)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  color: "#d0d7e8",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                {propinasExpandido ? "▲ Recolher" : `▼ Mostrar tudo (${dados.pagamentos_propina.length})`}
              </button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {(propinasExpandido
              ? dados.pagamentos_propina
              : dados.pagamentos_propina.slice(0, 3)
            ).map(p => {
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
                          await auditarImpressao(f.id_factura)
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
                          await auditarImpressao(f.id_factura)
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
                </div>
              </div>
            ))}
          </div>
        </Secao>
      )}

      {/* ─── CERTIFICADOS ─── */}
      {dados.certificados.length > 0 && (
        <Secao titulo={`Certificados (${dados.certificados.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {dados.certificados.map(c => {
              const statusCfg = getCertStatusConfig(c.status)
              const nextStatus = getNextCertStatus(c.status)
              const isEntregue = c.status === "Entregue"

              return (
                <div key={c.id_certificado} style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center",
                  background: isEntregue ? "rgba(34,197,94,0.05)" : "rgba(13,15,20,0.4)",
                  border: `1px solid ${isEntregue ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: "10px", padding: "12px 16px",
                  flexWrap: "wrap", gap: "10px"
                }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8eaf0" }}>
                      {c.tipo_certificado === "Conclusao" ? "Certificado de Conclusão" :
                       c.tipo_certificado === "Participacao" ? "Declaração Académica" :
                       `Certificado de ${c.tipo_certificado}`}
                    </div>
                    <div style={{ fontSize: "11px", color: "#b0b8cf", marginTop: "2px" }}>
                      Emitido em {new Date(c.data_emissao).toLocaleDateString("pt-AO")}
                    </div>
                    <div style={{ marginTop: "6px" }}>
                      <span style={{
                        background: statusCfg.color, color: statusCfg.textColor,
                        padding: "3px 10px", borderRadius: "20px",
                        fontSize: "11px", fontWeight: "600"
                      }}>
                        {statusCfg.label}
                      </span>
                    </div>
                    {c.descricao && (
                      <div style={{ fontSize: "11px", color: "#d0d7e8", marginTop: "4px" }}>
                        {c.descricao}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {/* Botão de imprimir (abre PDF) */}
                    <a
                      href={`/api/recepcionista/certificados/${c.id_certificado}/pdf`}
                      target="_blank"
                      style={{
                        padding: "8px 12px",
                        background: "rgba(45,212,191,0.15)",
                        border: "1px solid rgba(45,212,191,0.3)",
                        color: "#2dd4bf", borderRadius: "8px",
                        fontSize: "11px", fontWeight: "600",
                        textDecoration: "none",
                        whiteSpace: "nowrap" as const
                      }}
                    >
                      🖨️ Imprimir
                    </a>
                    {/* Botão de avançar status */}
                    {nextStatus ? (
                      <button
                        onClick={async () => {
                          const key = `status-${c.id_certificado}`
                          setAcaoLoading(key)
                          setMensagem(null)
                          try {
                            const res = await fetch(`/api/recepcionista/certificados/${c.id_certificado}/status`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: nextStatus }),
                            })
                            if (!res.ok) {
                              const data = await res.json()
                              setMensagem({ texto: data.error ?? "Erro ao atualizar status", tipo: "erro" })
                              return
                            }
                            setMensagem({ texto: `Certificado atualizado para "${getCertStatusConfig(nextStatus).label}"`, tipo: "ok" })
                            // Recarregar dados
                            const r2 = await fetch(`/api/recepcionista/estudante/${id}`)
                            const d2 = await r2.json()
                            if (d2.estudante) setDados(d2.estudante)
                          } catch {
                            setMensagem({ texto: "Erro de ligação", tipo: "erro" })
                          } finally {
                            setAcaoLoading(null)
                          }
                        }}
                        disabled={acaoLoading === `status-${c.id_certificado}`}
                        style={{
                          padding: "8px 12px",
                          background: "rgba(59,130,246,0.15)",
                          border: "1px solid rgba(59,130,246,0.3)",
                          color: "#3b82f6", borderRadius: "8px",
                          fontSize: "11px", fontWeight: "600",
                          cursor: acaoLoading === `status-${c.id_certificado}` ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap" as const
                        }}
                      >
                        {acaoLoading === `status-${c.id_certificado}` ? "..." : `→ ${getCertStatusConfig(nextStatus).label}`}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
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
