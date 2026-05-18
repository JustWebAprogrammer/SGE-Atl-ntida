import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import * as React from "react"
import type { LayoutConfig } from "@/lib/layout-defaults"
import { getLayoutDefaults } from "@/lib/layout-defaults"

interface Props {
  studentName: string
  studentNumber: string
  courseName: string
  currentYear: number
  anoLectivo: string
  systemDate?: Date
  presidentSignature: string
  presidentName: string
  documentNumber: string
  logoUrl?: string
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingHorizontal: 71,
    paddingBottom: 71,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  documentNumber: {
    position: "absolute",
    top: 42,
    right: 71,
    fontSize: 9,
    color: "#555",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  logo: { width: 60, height: 60, marginRight: 16, objectFit: "contain" },
  headerText: { flex: 1, textAlign: "center" },
  universityName: { fontSize: 14, fontWeight: "bold", fontFamily: "Helvetica" },
  subtitle: { fontSize: 10, color: "#777", letterSpacing: 1, fontFamily: "Helvetica", marginTop: 2 },
  divider: { borderBottomColor: "#ccc", borderBottomWidth: 1, marginTop: 10, marginBottom: 40 },
  title: { fontSize: 18, fontWeight: "bold", fontFamily: "Helvetica", textAlign: "center", marginBottom: 40 },
  body: { marginBottom: 80 },
  bodyText: { fontFamily: "Times-Roman", fontSize: 12, lineHeight: 1.8, textAlign: "justify" },
  dateSection: { textAlign: "right", marginBottom: 57, fontFamily: "Times-Roman", fontSize: 11 },
  signatureSection: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", marginBottom: 50 },
  signatureBlock: { width: "45%", textAlign: "center", alignItems: "center" },
  signatureImage: { width: 120, height: 50, objectFit: "contain", marginBottom: 4 },
  signatureLine: { width: 200, borderBottomColor: "#000", borderBottomWidth: 1, marginBottom: 4 },
  signatureLabel: { fontSize: 10, fontFamily: "Helvetica", marginBottom: 2 },
  signatureName: { fontSize: 10, fontWeight: "bold", fontFamily: "Helvetica" },
  pageBorder: {
    position: "absolute", top: 20, left: 20, right: 20, bottom: 20,
    borderWidth: 1, borderColor: "#ccc",
  },
})

export default function RecepcionistaDeclaracaoPDF({
  studentName, studentNumber, courseName, currentYear, anoLectivo,
  systemDate, presidentSignature, presidentName, documentNumber, logoUrl = "",
}: Props) {
  const config: LayoutConfig = {
    ...getLayoutDefaults("DeclaracaoAcademica"),
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
              .replace(/{ANO_CURRICULAR}/g, String(currentYear))
              .replace(/{ANO_LECTIVO}/g, anoLectivo)
              .replace(/{NOME_UNIVERSIDADE}/g, config.nome_universidade)
            }
          </Text>
        </View>

        <Text style={styles.dateSection}>
          {config.localidade}, {(systemDate ?? new Date()).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
        </Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            {presidentSignature && <Image src={presidentSignature} style={styles.signatureImage} />}
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{config.label_assinatura_presidente}</Text>
            <Text style={styles.signatureName}>{presidentName}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}