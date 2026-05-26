import React from "react"
import { Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer"
import type { LayoutConfig } from "@/lib/layout-defaults"
import { getLayoutDefaults } from "@/lib/layout-defaults"

const styles = StyleSheet.create({
  page: {
    padding: 35,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 20,
  },
  headerText: {
    flex: 1,
    textAlign: "center",
  },
  universityName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#666",
  },
  divider: {
    borderBottom: "1px solid #000",
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 15,
    textTransform: "uppercase",
  },
  documentNumber: {
    position: "absolute",
    top: 35,
    right: 35,
    fontSize: 9,
    color: "#666",
  },
  body: {
    marginBottom: 10,
  },
  bodyText: {
    lineHeight: 1.6,
    marginBottom: 10,
    textAlign: "justify",
    fontFamily: "Times-Roman",
    fontSize: 12,
  },
  gradesTable: {
    marginVertical: 10,
    border: "1px solid #000",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1px solid #000",
    backgroundColor: "#f5f5f5",
  },
  tableHeaderCell: {
    padding: 6,
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #ddd",
  },
  tableCell: {
    padding: 6,
    textAlign: "center",
    fontSize: 10,
  },
  footer: {
    marginTop: 15,
  },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  signatureBlock: {
    width: "45%",
    textAlign: "center",
    alignItems: "center",
  },
  signatureLine: {
    borderTop: "1px solid #000",
    marginTop: 25,
    marginBottom: 5,
    width: 180,
  },
  signatureName: {
    fontSize: 10,
    marginTop: 3,
  },
  signatureImage: {
    width: 120,
    maxHeight: 30,
    objectFit: "contain",
    marginBottom: 1,
  },
  pageBorder: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    border: "1px solid #000",
  },
  // ── QR Code ──
  qrSection: {
    alignItems: "center",
    marginTop: 15,
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  qrText: {
    fontSize: 8,
    color: "#555",
    fontStyle: "italic",
    fontFamily: "Helvetica",
    marginTop: 4,
  },
})

interface Disciplina {
  nome_disciplina: string
  semestre: string
  ano_curricular: number
  nota_final: string
  situacao: string
}

interface CertificadoDisciplinasPDFProps {
  layoutConfig?: LayoutConfig
  studentName: string
  studentNumber: string
  courseName: string
  anoLectivo: string
  systemDate?: Date
  disciplinas: Disciplina[]
  presidentSignature: string
  presidentName: string
  directorSignature?: string
  directorName?: string
  documentNumber: string
  qrCodeUrl?: string
  logoUrl?: string
}

export default function CertificadoDisciplinasPDF({
  layoutConfig,
  studentName,
  studentNumber,
  courseName,
  anoLectivo,
  disciplinas,
  presidentSignature,
  presidentName,
  directorSignature,
  directorName,
  documentNumber,
  qrCodeUrl = "",
  logoUrl = "",
  systemDate,
}: CertificadoDisciplinasPDFProps) {
  const config = layoutConfig ?? getLayoutDefaults("CertificadoDisciplinas")

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Page border */}
        <View style={styles.pageBorder} />

        {/* Document number */}
        <Text style={styles.documentNumber}>{documentNumber}</Text>

        {/* Header */}
        <View style={styles.header}>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          <View style={styles.headerText}>
            <Text style={styles.universityName}>
              {config.nome_universidade}
            </Text>
            <Text style={styles.subtitle}>DIRECÇÃO ACADÉMICA</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Title */}
        <Text style={styles.title}>{config.titulo}</Text>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.bodyText}>
            {config.texto_corpo
              .replace("{NOME_COMPLETO}", studentName)
              .replace("{NUMERO_ESTUDANTE}", studentNumber)
              .replace("{NOME_CURSO}", courseName)
              .replace("{NOME_UNIVERSIDADE}", config.nome_universidade)}
          </Text>
        </View>

        {/* Grades Table */}
        <View style={styles.gradesTable}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 3.5, textAlign: "left" }]}>Disciplina</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Semestre</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Ano Curricular</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Nota Final</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>Situação</Text>
          </View>

          {/* Table rows - only passed subjects */}
          {disciplinas.map((disc, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3.5, textAlign: "left" }]}>{disc.nome_disciplina}</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>{disc.semestre}</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>{disc.ano_curricular}º Ano</Text>
              <Text style={[styles.tableCell, { flex: 1.2 }]}>{disc.nota_final}</Text>
              <Text style={[styles.tableCell, { flex: 1.3 }]}>{disc.situacao}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ textAlign: "right", marginBottom: 10 }}>
            {config.localidade}, {(systemDate ?? new Date()).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
          </Text>

          <View style={styles.signatureSection}>
            <View style={styles.signatureBlock}>
              {directorSignature && (
                <Image src={directorSignature} style={styles.signatureImage} />
              )}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{config.label_assinatura_diretor}</Text>
              {directorName && (
                <Text style={styles.signatureName}>{directorName}</Text>
              )}
            </View>

            <View style={styles.signatureBlock}>
              {presidentSignature && (
                <Image src={presidentSignature} style={styles.signatureImage} />
              )}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{config.label_assinatura_presidente}</Text>
              <Text style={styles.signatureName}>{presidentName}</Text>
            </View>
          </View>

          {/* QR Code - only if enabled in layout config */}
          {config.tem_qr_code && qrCodeUrl && (
            <View style={styles.qrSection}>
              <Image src={qrCodeUrl} style={styles.qrImage} />
              <Text style={styles.qrText}>{config.texto_verificacao}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}