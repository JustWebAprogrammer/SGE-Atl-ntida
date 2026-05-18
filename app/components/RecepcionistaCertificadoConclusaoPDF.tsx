"use client"

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import * as React from "react"
import type { LayoutConfig } from "@/lib/layout-defaults"
import { getLayoutDefaults } from "@/lib/layout-defaults"

interface Props {
  studentName: string
  studentNumber: string
  courseName: string
  courseDuration: number
  anoLectivo: string
  systemDate?: Date
  gradesByYear: { year: number; average: string }[]
  monografiaGrade: string
  finalGrade: string
  finalGradeExtenso: string
  presidentSignature: string
  presidentName: string
  documentNumber: string
  logoUrl?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  logo: { width: 60, height: 60, marginRight: 20 },
  headerText: { flex: 1, textAlign: "center" },
  universityName: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#666" },
  divider: { borderBottom: "1px solid #000", marginVertical: 15 },
  title: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginVertical: 20, textTransform: "uppercase" },
  documentNumber: { position: "absolute", top: 40, right: 40, fontSize: 10, color: "#666" },
  body: { marginBottom: 20 },
  bodyText: { lineHeight: 1.6, marginBottom: 10, textAlign: "justify" },
  gradesTable: { marginVertical: 15, border: "1px solid #000" },
  tableHeader: { flexDirection: "row", borderBottom: "1px solid #000", backgroundColor: "#f0f0f0" },
  tableHeaderCell: { flex: 1, padding: 8, fontWeight: "bold", textAlign: "center" },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #ddd" },
  tableCell: { flex: 1, padding: 8, textAlign: "center" },
  footer: { marginTop: 30 },
  signatureSection: { flexDirection: "row", justifyContent: "center", marginTop: 40 },
  signatureBlock: { width: "45%", textAlign: "center" },
  signatureLine: { borderTop: "1px solid #000", marginTop: 50, marginBottom: 5 },
  signatureImage: { width: 100, height: 50, objectFit: "contain", marginTop: 10 },
  pageBorder: { position: "absolute", top: 20, left: 20, right: 20, bottom: 20, border: "1px solid #000" },
})

export default function RecepcionistaCertificadoConclusaoPDF({
  studentName, studentNumber, courseName, courseDuration, anoLectivo,
  gradesByYear, monografiaGrade, finalGrade, finalGradeExtenso,
  presidentSignature, presidentName, documentNumber,
  logoUrl = "", systemDate,
}: Props) {
  const config: LayoutConfig = {
    ...getLayoutDefaults("CertificadoConclusao"),
    tem_qr_code: false,
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.pageBorder} />
        <Text style={styles.documentNumber}>{documentNumber}</Text>

        <View style={styles.header}>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          <View style={styles.headerText}>
            <Text style={styles.universityName}>{config.nome_universidade}</Text>
            <Text style={styles.subtitle}>DIRECÇÃO ACADÉMICA</Text>
          </View>
        </View>

        <View style={styles.divider} />
        <Text style={styles.title}>{config.titulo}</Text>

        <View style={styles.body}>
          <Text style={styles.bodyText}>
            {config.texto_corpo
              .replace(/{NOME_COMPLETO}/g, studentName)
              .replace(/{NUMERO_ESTUDANTE}/g, studentNumber)
              .replace(/{NOME_CURSO}/g, courseName)
              .replace(/{DURACAO_ANOS}/g, String(courseDuration))
              .replace(/{ANO_LECTIVO}/g, anoLectivo)
              .replace(/{NOTA_FINAL}/g, finalGrade)
              .replace(/{NOTA_POR_EXTENSO}/g, finalGradeExtenso)
              .replace(/{NOME_UNIVERSIDADE}/g, config.nome_universidade)
            }
          </Text>
        </View>

        <View style={styles.gradesTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: "left" }]}>Ano Curricular</Text>
            <Text style={styles.tableHeaderCell}>Média do Ano</Text>
          </View>
          {gradesByYear.map((yd, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2, textAlign: "left" }]}>{yd.year}º Ano</Text>
              <Text style={styles.tableCell}>{yd.average}</Text>
            </View>
          ))}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2, textAlign: "left" }]}>Monografia</Text>
            <Text style={styles.tableCell}>{monografiaGrade}</Text>
          </View>
          <View style={[styles.tableRow, { backgroundColor: "#e8f5e9" }]}>
            <Text style={[styles.tableCell, { flex: 2, textAlign: "left", fontWeight: "bold" }]}>Média Final</Text>
            <Text style={[styles.tableCell, { fontWeight: "bold" }]}>{finalGrade}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={{ textAlign: "right", marginBottom: 10 }}>
            {config.localidade}, {(systemDate ?? new Date()).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
          </Text>
          <View style={styles.signatureSection}>
            <View style={styles.signatureBlock}>
              {presidentSignature && <Image src={presidentSignature} style={styles.signatureImage} />}
              <View style={styles.signatureLine} />
              <Text style={{ fontSize: 11, marginTop: 5 }}>{config.label_assinatura_presidente}</Text>
              <Text style={{ fontSize: 11 }}>{presidentName}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}