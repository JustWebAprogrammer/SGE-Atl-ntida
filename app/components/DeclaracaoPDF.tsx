import React from "react"
import { Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer"
import type { LayoutConfig } from "@/lib/layout-defaults"
import { getLayoutDefaults } from "@/lib/layout-defaults"

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,      // ~15mm
    paddingHorizontal: 71, // ~25mm
    paddingBottom: 71,    // ~25mm
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  // ── Código do documento ──
  documentNumber: {
    position: "absolute",
    top: 42,           // ~15mm
    right: 71,         // ~25mm
    fontSize: 9,       // 8-9pt
    color: "#555",
    fontFamily: "Helvetica",
  },
  // ── Cabeçalho ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 16,
    objectFit: "contain",
  },
  headerText: {
    flex: 1,
    textAlign: "center",
  },
  universityName: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Helvetica",
  },
  subtitle: {
    fontSize: 10,
    color: "#777",
    letterSpacing: 1,
    fontFamily: "Helvetica",
    marginTop: 2,
  },
  // ── Separador ──
  divider: {
    borderBottomColor: "#ccc",
    borderBottomWidth: 1,
    marginTop: 10,
    marginBottom: 40, // ~40mm antes do título
  },
  // ── Título ──
  title: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Helvetica",
    textAlign: "center",
    marginBottom: 40, // ~20mm depois do título
  },
  // ── Corpo do texto ──
  body: {
    marginBottom: 80, // espaço generoso antes da data (~80px)
  },
  bodyText: {
    fontFamily: "Times-Roman",
    fontSize: 12,
    lineHeight: 1.8,
    textAlign: "justify",
  },
  // ── Data ──
  dateSection: {
    textAlign: "right",
    marginBottom: 57, // ~20mm antes das assinaturas
    fontFamily: "Times-Roman",
    fontSize: 11,
  },
  // ── Área de Assinaturas ──
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 50,
  },
  signatureBlock: {
    width: "45%",
    textAlign: "center",
    alignItems: "center",
  },
  signatureImage: {
    width: 120,
    height: 50,
    objectFit: "contain",
    marginBottom: 4,
  },
  signatureLine: {
    width: 200,
    borderBottomColor: "#000",
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 10,
    fontFamily: "Helvetica",
    marginBottom: 2,
  },
  signatureName: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "Helvetica",
  },
  // ── QR Code (abaixo de tudo) ──
  qrSection: {
    alignItems: "center",
    marginTop: 10,
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
  // ── Borda da página ──
  pageBorder: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderWidth: 1,
    borderColor: "#ccc",
  },
})

interface DeclaracaoPDFProps {
  layoutConfig?: LayoutConfig
  studentName: string
  studentNumber: string
  courseName: string
  currentYear: number
  anoLectivo: string
  systemDate?: Date
  presidentSignature: string
  presidentName: string
  directorSignature?: string
  directorName?: string
  documentNumber: string
  qrCodeUrl: string
  logoUrl?: string
}

export const DeclaracaoPDF = ({
  layoutConfig,
  studentName,
  studentNumber,
  courseName,
  currentYear,
  anoLectivo,
  presidentSignature,
  presidentName,
  directorSignature,
  directorName,
  documentNumber,
  qrCodeUrl,
  logoUrl = "",
  systemDate,
}: DeclaracaoPDFProps) => {
  const config = layoutConfig ?? getLayoutDefaults("DeclaracaoAcademica")
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Page border */}
        <View style={styles.pageBorder} />

        {/* Document number — top right */}
        <Text style={styles.documentNumber}>{documentNumber}</Text>

        {/* ── Header ── */}
        <View style={styles.header}>
          {logoUrl && <Image src={logoUrl} style={styles.logo} />}
          <View style={styles.headerText}>
            <Text style={styles.universityName}>
              {config.nome_universidade}
            </Text>
            <Text style={styles.subtitle}>DIRECÇÃO ACADÉMICA</Text>
          </View>
        </View>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Title ── */}
        <Text style={styles.title}>{config.titulo}</Text>

        {/* ── Body text ── */}
        <View style={styles.body}>
          <Text style={styles.bodyText}>
            {config.texto_corpo}
          </Text>
        </View>

        {/* ── Date ── */}
        <Text style={styles.dateSection}>
          {config.localidade}, {(systemDate ?? new Date()).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
        </Text>

        {/* ── Signature blocks side by side ── */}
        <View style={styles.signatureSection}>
          {/* Left: Director */}
          <View style={styles.signatureBlock}>
            {directorSignature && (
              <Image src={directorSignature} style={styles.signatureImage} />
            )}
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{config.label_assinatura_diretor}</Text>
            {directorName && (
              <Text style={styles.signatureName}>{directorName}</Text>
            )}
          </View>

          {/* Right: President */}
          <View style={styles.signatureBlock}>
            {presidentSignature && (
              <Image src={presidentSignature} style={styles.signatureImage} />
            )}
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{config.label_assinatura_presidente}</Text>
            <Text style={styles.signatureName}>{presidentName}</Text>
          </View>
        </View>

        {/* ── QR Code (below everything, centered) ── */}
        {config.tem_qr_code && (
          <View style={styles.qrSection}>
            <Image src={qrCodeUrl} style={styles.qrImage} />
            <Text style={styles.qrText}>{config.texto_verificacao}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}

export default DeclaracaoPDF