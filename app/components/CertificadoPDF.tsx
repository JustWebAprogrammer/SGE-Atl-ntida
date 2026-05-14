"use client"

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import { arredondarNota } from "@/lib/notas"

// Estilos para o PDF
const styles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: "#ffffff",
  },
  // Página de cabeçalho
  header: {
    marginBottom: 30,
    textAlign: "center",
    borderBottom: "2px solid #e03d3d",
    paddingBottom: 20,
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e03d3d",
    marginBottom: 5,
  },
  instituto: {
    fontSize: 14,
    color: "#333333",
    marginBottom: 3,
  },
  departamento: {
    fontSize: 11,
    color: "#666666",
  },
  titulo: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1e2230",
    marginBottom: 30,
    textTransform: "uppercase",
  },
  corpo: {
    fontSize: 12,
    lineHeight: 1.8,
    textAlign: "justify",
    color: "#333333",
    marginBottom: 20,
  },
  nomeEstudante: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e03d3d",
    textAlign: "center",
    marginVertical: 15,
  },
  infoBox: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 5,
    marginVertical: 15,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#555555",
    width: 120,
  },
  infoValue: {
    fontSize: 10,
    color: "#333333",
  },
  // Página por ano
  anoTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e2230",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  tabelaHeader: {
    flexDirection: "row",
    backgroundColor: "#1e2230",
    color: "#ffffff",
    padding: 8,
    fontSize: 9,
    fontWeight: "bold",
  },
  tabelaRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e0e0e0",
    padding: 8,
    fontSize: 9,
  },
  tabelaRowAlt: {
    flexDirection: "row",
    borderBottom: "1px solid #e0e0e0",
    padding: 8,
    fontSize: 9,
    backgroundColor: "#f9f9f9",
  },
  colCodigo: { width: 60 },
  colNome: { width: 200 },
  colCreditos: { width: 60, textAlign: "center" },
  colNota: { width: 60, textAlign: "center" },
  notaFinalBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#e8f5e9",
    borderRadius: 5,
    alignItems: "center",
  },
  notaFinalLabel: {
    fontSize: 11,
    color: "#2e7d32",
    marginBottom: 5,
  },
  notaFinalValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1b5e20",
  },
  // Página de assinaturas
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: "1px solid #e0e0e0",
  },
  assinatura: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  assinaturaBox: {
    width: 200,
    textAlign: "center",
  },
  assinaturaLinha: {
    borderBottom: "1px solid #333333",
    marginBottom: 5,
    height: 30,
  },
  assinaturaTexto: {
    fontSize: 9,
    color: "#666666",
  },
  dataLocal: {
    fontSize: 10,
    color: "#666666",
    textAlign: "right",
    marginTop: 20,
  },
  numeroCertificado: {
    fontSize: 9,
    color: "#999999",
    textAlign: "center",
    marginTop: 10,
  },
  // New styles for QR code and page border
  qrSection: {
    position: "absolute",
    bottom: 40,
    right: 40,
    alignItems: "center",
  },
  qrText: {
    fontSize: 9,
    marginTop: 5,
    color: "#666666",
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

type Nota = {
  id_nota: number
  nota_final: number | null
  dispensada: boolean
  disciplina: {
    nome_disciplina: string
    codigo_disciplina: string
    creditos: number
    ano_curricular: number
  }
}

type CertificadoPDFProps = {
  tipo: "Disciplina" | "Conclusao"
  estudante: {
    nome_completo: string
    numero_estudante: string
    curso: {
      nome_curso: string
      duracao_anos: number
    }
  }
  notas: Nota[]
  dataEmissao: Date
  numeroCertificado: string
  qrCodeUrl?: string
  logoUrl?: string
}

export default function CertificadoPDF({
  tipo,
  estudante,
  notas,
  dataEmissao,
  numeroCertificado,
  qrCodeUrl = "",
  logoUrl = "",
}: CertificadoPDFProps) {
  // Agrupar notas por ano
  const notasPorAno: Record<number, Nota[]> = {}
  for (const nota of notas) {
    const ano = nota.disciplina.ano_curricular
    if (!notasPorAno[ano]) notasPorAno[ano] = []
    notasPorAno[ano].push(nota)
  }

  // Calcular nota final por ano
  const notasFinaisPorAno: Record<number, number> = {}
  for (const [ano, notasAno] of Object.entries(notasPorAno)) {
    const notasValidas = notasAno.filter((n) => n.nota_final !== null)
    if (notasValidas.length > 0) {
      notasFinaisPorAno[Number(ano)] =
        notasValidas.reduce((sum, n) => sum + Number(n.nota_final || 0), 0) / notasValidas.length
    }
  }

  const dataFormatada = new Date(dataEmissao).toLocaleDateString("pt-AO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const anos = Object.keys(notasPorAno).map(Number).sort()

  return (
    <Document>
      {/* Página 1: Cabeçalho + Info do estudante */}
      <Page size="A4" style={styles.page}>
        {/* Page border */}
        <View style={styles.pageBorder} />

        {/* Document number */}
        <Text style={{ position: "absolute", top: 40, right: 40, fontSize: 10, color: "#666" }}>
          {numeroCertificado}
        </Text>

        <View style={styles.header}>
          {logoUrl && <Image src={logoUrl} style={{ width: 60, height: 60, marginRight: 20 }} />}
          <View>
            <Text style={styles.logo}>ISP ATLÂNTIDA</Text>
            <Text style={styles.instituto}>Instituto Superior Politécnico Atlântida</Text>
            <Text style={styles.departamento}>Departamento de Engenharia Informática e Civil</Text>
          </View>
        </View>

        <Text style={styles.titulo}>
          {tipo === "Conclusao"
            ? "Certificado de Conclusão de Curso"
            : "Certificado de Disciplinas"}
        </Text>

        <Text style={styles.corpo}>
          {tipo === "Conclusao"
            ? "Certificamos que o(a) estudante abaixo identificado(a) concluiu com êxito o curso de"
            : "Certificamos que o(a) estudante abaixo identificado(a) frequentou e foi aprovado(a) nas seguintes disciplinas do curso de"}
        </Text>

        <Text style={styles.nomeEstudante}>{estudante.nome_completo}</Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Número de Estudante:</Text>
            <Text style={styles.infoValue}>{estudante.numero_estudante}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Curso:</Text>
            <Text style={styles.infoValue}>{estudante.curso.nome_curso}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duração:</Text>
            <Text style={styles.infoValue}>{estudante.curso.duracao_anos} anos</Text>
          </View>
        </View>
      </Page>

      {/* Páginas por ano (só para certificado de disciplina) */}
      {tipo === "Disciplina" &&
        anos.map((ano) => (
          <Page key={ano} size="A4" style={styles.page}>
            {/* Page border */}
            <View style={styles.pageBorder} />

            <Text style={styles.anoTitulo}>{ano}º Ano</Text>

            <View style={styles.tabelaHeader}>
              <Text style={styles.colCodigo}>Código</Text>
              <Text style={styles.colNome}>Disciplina</Text>
              <Text style={styles.colCreditos}>Créditos</Text>
              <Text style={styles.colNota}>Nota</Text>
            </View>

            {notasPorAno[ano].map((nota, i) => (
              <View
                key={nota.id_nota}
                style={i % 2 === 0 ? styles.tabelaRow : styles.tabelaRowAlt}
              >
                <Text style={styles.colCodigo}>{nota.disciplina.codigo_disciplina}</Text>
                <Text style={styles.colNome}>{nota.disciplina.nome_disciplina}</Text>
                <Text style={styles.colCreditos}>{nota.disciplina.creditos}</Text>
                <Text style={styles.colNota}>
                  {nota.nota_final != null ? arredondarNota(Number(nota.nota_final)) : "-"}
                </Text>
              </View>
            ))}

            {notasFinaisPorAno[ano] !== undefined && (
              <View style={styles.notaFinalBox}>
                <Text style={styles.notaFinalLabel}>Nota Final {ano}º Ano</Text>
                <Text style={styles.notaFinalValue}>{arredondarNota(notasFinaisPorAno[ano])}</Text>
              </View>
            )}
          </Page>
        ))}

      {/* Última página: Assinaturas */}
      <Page size="A4" style={styles.page}>
        {/* Page border */}
        <View style={styles.pageBorder} />

        <View style={{ flex: 1 }} />

        <View style={styles.footer}>
          <Text style={styles.dataLocal}>Luanda, {dataFormatada}</Text>

          <View style={styles.assinatura}>
            <View style={styles.assinaturaBox}>
              <View style={styles.assinaturaLinha} />
              <Text style={styles.assinaturaTexto}>Director da Unidade Orgânica</Text>
            </View>
            <View style={styles.assinaturaBox}>
              <View style={styles.assinaturaLinha} />
              <Text style={styles.assinaturaTexto}>Secretário Académico</Text>
            </View>
          </View>

          <Text style={styles.numeroCertificado}>Certificado nº {numeroCertificado}</Text>
        </View>

        {/* QR Code - only for Disciplina type with QR */}
        {tipo === "Disciplina" && qrCodeUrl && (
          <View style={styles.qrSection}>
            <Image src={qrCodeUrl} style={{ width: 80, height: 80 }} />
            <Text style={styles.qrText}>Verifique a autenticidade deste documento em linha</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}