"use client"

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 6,
    fontFamily: "Helvetica",
    fontSize: 6,
    color: "#1a1a1a",
    width: 227,   // 80mm = ~227pt
    height: 340,  // 120mm = ~340pt
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 3,
    paddingBottom: 2,
    borderBottom: "1px solid #333",
  },
  logo: {
    width: 12,
    height: 12,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#13161e",
  },
  title: {
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 2,
    color: "#13161e",
  },
  numFactura: {
    fontSize: 4.5,
    textAlign: "center",
    color: "#666",
    marginBottom: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1,
    fontSize: 5.5,
  },
  label: {
    color: "#555",
    width: "30%",
  },
  value: {
    fontWeight: "bold",
    color: "#1a1a1a",
    width: "70%",
    textAlign: "right",
  },
  divider: {
    borderTop: "1px dashed #999",
    marginVertical: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 0.8,
    fontSize: 5,
    color: "#555",
  },
  infoLabel: {
    color: "#777",
  },
  infoValue: {
    color: "#444",
    fontWeight: "bold",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1.5,
  },
  totalLabel: {
    fontSize: 7,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#e03d3d",
  },
  multaText: {
    fontSize: 4.5,
    color: "#e03d3d",
    textAlign: "right",
  },
  statusPago: {
    color: "#22c55e",
    fontWeight: "bold",
    fontSize: 7,
    textAlign: "center",
    marginTop: 3,
    padding: 2,
    border: "1px solid #22c55e",
  },
  footer: {
    marginTop: 3,
    paddingTop: 2,
    borderTop: "1px solid #ddd",
    fontSize: 4.5,
    color: "#888",
    textAlign: "center",
  },
  emitidoPor: {
    fontSize: 4.5,
    color: "#555",
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 0.5,
  },
})

export type FacturaTalaoData = {
  numero_factura: string
  descricao_servico: string
  valor_total: number
  valor_base?: number
  valor_multa?: number
  data_emissao?: string | null
  data_pagamento?: string | null
  metodo_pagamento?: string | null
  mes?: number | null
  ano?: number | null
  origem: "propina" | "factura"
  emitido_por?: string | null
  estudante: {
    nome_completo: string
    numero_estudante: string | null
    curso: string
  }
}

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
]

export default function FacturaTalao({ data }: { data: FacturaTalaoData }) {
  const formatKz = (v: number) => `${v.toLocaleString("pt-AO")} Kz`
  const formatDate = (d: string | null) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("pt-AO", {
      day: "2-digit", month: "2-digit", year: "numeric"
    })
  }

  const periodo = data.origem === "propina" && data.mes && data.ano
    ? `${MESES[data.mes - 1]}/${data.ano}`
    : data.descricao_servico

  const temMulta = data.valor_multa && data.valor_multa > 0
  const temDesconto = data.valor_base != null && data.valor_base > data.valor_total
  const valorDesconto = temDesconto ? data.valor_base! - data.valor_total : 0

  return (
    <Document>
      <Page size={{ width: 227, height: 340 }} style={styles.page}>
        {/* Header com Logo */}
        <View style={styles.header}>
          <Image style={styles.logo} src="/documentos/logo.png" />
          <Text style={styles.headerText}>ISP ATLÂNTIDA</Text>
        </View>

        {/* Título */}
        <Text style={styles.title}>FACTURA</Text>
        <Text style={styles.numFactura}>{data.numero_factura}</Text>

        {/* Dados do estudante */}
        <View style={styles.row}>
          <Text style={styles.label}>Estudante:</Text>
          <Text style={styles.value}>{data.estudante.nome_completo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Nº:</Text>
          <Text style={styles.value}>{data.estudante.numero_estudante || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Curso:</Text>
          <Text style={styles.value}>{data.estudante.curso}</Text>
        </View>

        <View style={styles.divider} />

        {/* Período / Descrição */}
        <View style={styles.row}>
          <Text style={styles.label}>Período:</Text>
          <Text style={styles.value}>{periodo}</Text>
        </View>

        {/* Datas de emissão e pagamento */}
        {data.data_emissao && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Emissão:</Text>
            <Text style={styles.infoValue}>{formatDate(data.data_emissao)}</Text>
          </View>
        )}
        {data.data_pagamento && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pagamento:</Text>
            <Text style={styles.infoValue}>{formatDate(data.data_pagamento)}</Text>
          </View>
        )}

        {/* Método de pagamento */}
        {data.metodo_pagamento && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Método:</Text>
            <Text style={styles.infoValue}>{data.metodo_pagamento}</Text>
          </View>
        )}

        {/* Valor base (sempre mostrar se disponível) */}
        {data.valor_base != null && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Base:</Text>
            <Text style={styles.infoValue}>{formatKz(data.valor_base)}</Text>
          </View>
        )}

        {/* Desconto (bolsa) — quando base > total */}
        {temDesconto && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: "#22c55e" }]}>Desconto:</Text>
            <Text style={[styles.infoValue, { color: "#22c55e" }]}>-{formatKz(valorDesconto)}</Text>
          </View>
        )}

        {/* Multa (se houver) */}
        {temMulta && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: "#e03d3d" }]}>Multa:</Text>
            <Text style={[styles.infoValue, { color: "#e03d3d" }]}>+{formatKz(data.valor_multa!)}</Text>
          </View>
        )}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL:</Text>
          <Text style={styles.totalValue}>{formatKz(data.valor_total)}</Text>
        </View>

        {/* Status */}
        <View style={styles.statusPago}>
          <Text>✓ PAGO</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{new Date().toLocaleDateString("pt-AO")} - Talão</Text>
          {data.emitido_por && (
            <Text style={styles.emitidoPor}>Impresso: {data.emitido_por}</Text>
          )}
        </View>
      </Page>
    </Document>
  )
}