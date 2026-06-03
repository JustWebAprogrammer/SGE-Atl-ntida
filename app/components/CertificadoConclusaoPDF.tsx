import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import * as React from "react"
import type { LayoutConfig } from "@/lib/layout-defaults"
import { getLayoutDefaults } from "@/lib/layout-defaults"

interface CertificadoConclusaoPDFProps {
  layoutConfig?: LayoutConfig
  studentName: string
  studentNumber: string
  courseName: string
  courseDuration: number
  anoLectivo: string
  systemDate?: Date
  gradesByYear?: { year: number; average: string }[]
  monografiaGrade?: string
  finalGrade?: string
  finalGradeExtenso?: string
  presidentSignature: string
  presidentName: string
  directorSignature?: string
  directorName?: string
  documentNumber: string
  qrCodeUrl: string
  logoUrl?: string
}

export default function CertificadoConclusaoPDF({
  layoutConfig,
  presidentSignature,
  presidentName,
  directorSignature,
  directorName,
  documentNumber,
  qrCodeUrl,
  logoUrl = "",
  systemDate,
}: CertificadoConclusaoPDFProps) {
  const config = layoutConfig ?? getLayoutDefaults("CertificadoConclusao")
  
  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 11,
      fontFamily: "Helvetica",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
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
      marginVertical: 15,
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      textAlign: "center",
      marginVertical: 20,
      textTransform: "uppercase",
    },
    documentNumber: {
      position: "absolute",
      top: 40,
      right: 40,
      fontSize: 10,
      color: "#666",
    },
    body: {
      marginBottom: 20,
    },
    bodyText: {
      lineHeight: 1.6,
      marginBottom: 10,
      textAlign: "justify",
    },
    studentName: {
      fontWeight: "bold",
    },
    footer: {
      marginTop: 30,
    },
    signatureSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 40,
    },
    signatureBlock: {
      width: "45%",
      textAlign: "center",
    },
    signatureLine: {
      borderTop: "1px solid #000",
      marginTop: 50,
      marginBottom: 5,
    },
    signatureImage: {
      width: 100,
      height: 50,
      objectFit: "contain",
      marginTop: 10,
    },
    qrSection: {
      position: "absolute",
      bottom: 40,
      right: 40,
      alignItems: "center",
    },
    qrText: {
      fontSize: 9,
      marginTop: 5,
      color: "#666",
    },
    pageBorder: {
      position: "absolute",
      top: 20,
      left: 20,
      right: 20,
      bottom: 20,
      border: "1px solid #000",
    },
  })

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

        {/* Body - texto_corpo já vem com placeholders substituídos pela API */}
        <View style={styles.body}>
          <Text style={styles.bodyText}>
            {config.texto_corpo}
          </Text>
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
              <Text style={{ fontSize: 11, marginTop: 5 }}>{config.label_assinatura_diretor}</Text>
              {directorName && (
                <Text style={{ fontSize: 11 }}>{directorName}</Text>
              )}
            </View>

            <View style={styles.signatureBlock}>
              {presidentSignature && (
                <Image src={presidentSignature} style={styles.signatureImage} />
              )}
              <View style={styles.signatureLine} />
              <Text style={{ fontSize: 11, marginTop: 5 }}>{config.label_assinatura_presidente}</Text>
              <Text style={{ fontSize: 11 }}>{presidentName}</Text>
            </View>
          </View>

          {/* QR Code - only if enabled in layout config */}
          {config.tem_qr_code && (
            <View style={styles.qrSection}>
              <Image src={qrCodeUrl} style={{ width: 80, height: 80 }} />
              <Text style={styles.qrText}>{config.texto_verificacao}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}