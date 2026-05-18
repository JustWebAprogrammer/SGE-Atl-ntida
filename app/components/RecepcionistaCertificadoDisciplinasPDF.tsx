"use client"

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import * as React from "react"
import type { LayoutConfig } from "@/lib/layout-defaults"
import { getLayoutDefaults } from "@/lib/layout-defaults"

interface Props {
  studentName: string
  studentNumber: string
  courseName: string
  anoLectivo: string
  systemDate?: Date
  notas: { id_nota: number; nota_final: number | null; dispensada: boolean; disciplina: { nome_disciplina: string; codigo_disciplina: string; creditos: number } }[]
  presidentSignature: string
  presidentName: string
  documentNumber: string
  logoUrl?: string
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  logo: { width: 60, height: 60, marginRight: 20 },
  headerText: { flex: 1, textAlign: "center" },
  universityName: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#666" },
  divider: { borderBottom: "1px solid #000", marginVertical: 15 },
  title: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginVertical: 20, textTransform: "uppercase" },
  documentNumber: { position: "absolute", top: 40, right: 40, fontSize: 10, color: "#666" },
  body: { marginBottom: 20 },
  bodyText: { lineHeight: 1.6, marginBottom: 15, textAlign: "justify" },
  dataHeader: { fontWeight: "bold", marginBottom: 10 },
  disciplinaRow: { flexDirection: "row", paddingVertical: 4, borderBottom: "1px solid #eee" },
  disciplinaCell: { flex: 1, fontSize: 10 },
  footer: { marginTop: 30 },
  signatureSection: { flexDirection: "row", justifyContent: "center", marginTop: 40 },
  signatureBlock: { width: "45%", textAlign: "center" },
  signatureLine: { borderTop: "1px solid #000", marginTop: 50, marginBottom: 5 },
  signatureImage: { width: 100, height: 50, objectFit: "contain", marginTop: 10 },
  pageBorder: { position: "absolute", top: 20, left: 20, right: 20, bottom: 20, border: "1px solid #000" },
})

export default function RecepcionistaCertificadoDisciplinasPDF({
  studentName, studentNumber, courseName, anoLectivo,
  notas, presidentSignature, presidentName, documentNumber,
  logoUrl = "", systemDate,
}: Props) {
  const config: LayoutConfig = {
    ...getLayoutDefaults("CertificadoDisciplinas"),
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
              .replace(/{ANO_LECTIVO}/g, anoLectivo)
              .replace(/{NOME_UNIVERSIDADE}/g, config.nome_universidade)
            }
          </Text>

          <Text style={[styles.dataHeader, { marginTop: 20 }]}>Disciplinas Aprovadas:</Text>

          {notas.map((n) => (
            <View key={n.id_nota} style={styles.disciplinaRow}>
              <Text style={[styles.disciplinaCell, { flex: 3 }]}>
                {n.disciplina.codigo_disciplina} - {n.disciplina.nome_disciplina}
              </Text>
              <Text style={[styles.disciplinaCell, { flex: 1, textAlign: "center" }]}>
                {n.dispensada ? "Dispensado" : `${n.nota_final?.toFixed(1) ?? "-"} valores`}
              </Text>
            </View>
          ))}
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