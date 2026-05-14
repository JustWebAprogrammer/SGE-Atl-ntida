"use client"

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"

// Estilos para o PDF da factura
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #2dd4bf",
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  institutionName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#13161e",
    marginBottom: 4,
  },
  institutionSub: {
    fontSize: 10,
    color: "#666",
  },
  factureTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2dd4bf",
    textAlign: "right",
  },
  factureNumber: {
    fontSize: 10,
    color: "#666",
    textAlign: "right",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#13161e",
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
    padding: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  label: {
    color: "#666",
    fontSize: 10,
  },
  value: {
    fontWeight: "bold",
    fontSize: 11,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#13161e",
    padding: 8,
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e0e0e0",
    padding: 8,
    fontSize: 10,
  },
  col1: { width: "40%" },
  col2: { width: "20%", textAlign: "center" },
  col3: { width: "20%", textAlign: "right" },
  col4: { width: "20%", textAlign: "right" },
  totalSection: {
    marginTop: 16,
    borderTop: "2px solid #13161e",
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2dd4bf",
  },
  footer: {
    marginTop: 40,
    borderTop: "1px solid #e0e0e0",
    paddingTop: 12,
    fontSize: 9,
    color: "#999",
    textAlign: "center",
  },
  statusPago: {
    color: "#22c55e",
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    padding: 6,
    backgroundColor: "#f0fdf4",
    border: "1px solid #22c55e",
  },
  emitidoPor: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    marginTop: 6,
    fontWeight: "bold",
  },
})

export type FacturaData = {
  numero_factura: string
  descricao_servico: string
  valor_total: number
  data_emissao: string
  data_pagamento: string | null
  estado: string
  metodo_pagamento: string | null
  mes?: number | null
  ano?: number | null
  origem: "propina" | "factura"
  referencia?: string | null
  valor_base?: number
  valor_multa?: number
  emitido_por?: string | null  // Nome do recepcionista que imprimiu
  estudante: {
    nome_completo: string
    numero_estudante: string | null
    curso: string
    email: string
  }
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

export default function FacturaPDF({ data, systemDate }: { data: FacturaData; systemDate?: Date }) {
  const formatDate = (d: string | null) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("pt-AO", {
      day: "2-digit", month: "long", year: "numeric"
    })
  }

  const formatKz = (v: number) => `${v.toLocaleString("pt-AO")} Kz`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Image style={{ width: 36, height: 36 }} src="/documentos/logo.png" />
              <View>
                <Text style={styles.institutionName}>ISP Atlântida</Text>
                <Text style={styles.institutionSub}>Instituto Superior Politécnico</Text>
                <Text style={styles.institutionSub}>Luanda, Angola</Text>
              </View>
            </View>
            <View>
              <Text style={styles.factureTitle}>FACTURA</Text>
              <Text style={styles.factureNumber}>Nº {data.numero_factura || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Dados do Estudante */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS DO ESTUDANTE</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome:</Text>
            <Text style={styles.value}>{data.estudante.nome_completo}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Nº Estudante:</Text>
            <Text style={styles.value}>{data.estudante.numero_estudante || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Curso:</Text>
            <Text style={styles.value}>{data.estudante.curso}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{data.estudante.email}</Text>
          </View>
        </View>

        {/* Detalhes do Pagamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DETALHES DO PAGAMENTO</Text>
          {data.origem === "propina" && data.mes && data.ano && (
            <View style={styles.row}>
              <Text style={styles.label}>Período:</Text>
              <Text style={styles.value}>{MESES[data.mes - 1]} {data.ano}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Descrição:</Text>
            <Text style={styles.value}>{data.descricao_servico}</Text>
          </View>
          {data.referencia && (
            <View style={styles.row}>
              <Text style={styles.label}>Referência:</Text>
              <Text style={styles.value}>{data.referencia}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Data de Emissão:</Text>
            <Text style={styles.value}>{formatDate(data.data_emissao)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Data de Pagamento:</Text>
            <Text style={styles.value}>{formatDate(data.data_pagamento)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Método de Pagamento:</Text>
            <Text style={styles.value}>{data.metodo_pagamento || "Multicaixa"}</Text>
          </View>
        </View>

        {/* Tabela de Valores */}
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Descrição</Text>
          <Text style={styles.col2}>Ref.</Text>
          <Text style={styles.col3}>Multa</Text>
          <Text style={styles.col4}>Total</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.col1}>{data.descricao_servico}</Text>
          <Text style={styles.col2}>{data.referencia || "—"}</Text>
          <Text style={styles.col3}>{formatKz(data.valor_multa || 0)}</Text>
          <Text style={styles.col4}>{formatKz(data.valor_total)}</Text>
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VALOR TOTAL:</Text>
            <Text style={styles.totalValue}>{formatKz(data.valor_total)}</Text>
          </View>
        </View>

        {/* Estado */}
        {data.estado === "Pago" && (
          <View style={styles.statusPago}>
            <Text>✓ PAGO</Text>
          </View>
        )}

        {/* Rodapé */}
        <View style={styles.footer}>
          <Text>Este documento é uma factura válida emitida pelo ISP Atlântida.</Text>
          <Text>Documento gerado em {(systemDate ?? new Date()).toLocaleDateString("pt-AO")} às {(systemDate ?? new Date()).toLocaleTimeString("pt-AO")}</Text>
          {data.emitido_por && (
            <Text style={styles.emitidoPor}>Impresso por: {data.emitido_por}</Text>
          )}
        </View>
      </Page>
    </Document>
  )
}