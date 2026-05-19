// Helper para gerar PDFs com debug detalhado
import { renderToBuffer } from "@react-pdf/renderer"
import { Document, Page, Text, View } from "@react-pdf/renderer"
import RecepcionistaCertificadoConclusaoPDF from "@/app/components/RecepcionistaCertificadoConclusaoPDF"
import RecepcionistaCertificadoDisciplinasPDF from "@/app/components/RecepcionistaCertificadoDisciplinasPDF"
import RecepcionistaDeclaracaoPDF from "@/app/components/RecepcionistaDeclaracaoPDF"

// Componente PDF minímo para teste
function PDFTeste({ mensagem }: { mensagem: string }) {
  return (
    <Document>
      <Page size="A4" style={{ padding: 40 }}>
        <Text>{mensagem}</Text>
      </Page>
    </Document>
  )
}

// Teste básico: gera um PDF simples para ver se renderToBuffer funciona
export async function renderPDFTeste(): Promise<Buffer> {
  console.log("[DEBUG] renderPDFTeste: starting...")
  try {
    const buf = await renderToBuffer(<PDFTeste mensagem="Teste OK" />)
    console.log("[DEBUG] renderPDFTeste: success, size=" + buf.length)
    return buf
  } catch (e) {
    console.error("[DEBUG] renderPDFTeste: FAILED", e)
    throw e
  }
}

// ===== RECEPCIONISTA: Certificado de Conclusão =====
export async function renderCertificadoConclusao(data: {
  studentName: string
  studentNumber: string
  courseName: string
  courseDuration: number
  anoLectivo: string
  gradesByYear: { year: number; average: string }[]
  monografiaGrade: string
  finalGrade: string
  finalGradeExtenso: string
  presidentSignature: string
  presidentName: string
  documentNumber: string
  logoUrl?: string
  systemDate?: Date
}): Promise<Buffer> {
  console.log("[DEBUG] renderCertificadoConclusao: starting...")
  try {
    const element = (
      <RecepcionistaCertificadoConclusaoPDF
        studentName={data.studentName}
        studentNumber={data.studentNumber}
        courseName={data.courseName}
        courseDuration={data.courseDuration}
        anoLectivo={data.anoLectivo}
        gradesByYear={data.gradesByYear}
        monografiaGrade={data.monografiaGrade}
        finalGrade={data.finalGrade}
        finalGradeExtenso={data.finalGradeExtenso}
        presidentSignature={data.presidentSignature}
        presidentName={data.presidentName}
        documentNumber={data.documentNumber}
        logoUrl={data.logoUrl}
        systemDate={data.systemDate}
      />
    )
    console.log("[DEBUG] renderCertificadoConclusao: element created, calling renderToBuffer...")
    const buf = await renderToBuffer(element)
    console.log("[DEBUG] renderCertificadoConclusao: success, size=" + buf.length)
    return buf
  } catch (e) {
    console.error("[DEBUG] renderCertificadoConclusao: FAILED", e)
    throw e
  }
}

// ===== RECEPCIONISTA: Certificado de Disciplinas =====
export async function renderCertificadoDisciplinas(data: {
  studentName: string
  studentNumber: string
  courseName: string
  anoLectivo: string
  notas: { id_nota: number; nota_final: number | null; dispensada: boolean; disciplina: { nome_disciplina: string; codigo_disciplina: string; creditos: number } }[]
  presidentSignature: string
  presidentName: string
  documentNumber: string
  logoUrl?: string
  systemDate?: Date
}): Promise<Buffer> {
  console.log("[DEBUG] renderCertificadoDisciplinas: starting...")
  try {
    const element = (
      <RecepcionistaCertificadoDisciplinasPDF
        studentName={data.studentName}
        studentNumber={data.studentNumber}
        courseName={data.courseName}
        anoLectivo={data.anoLectivo}
        notas={data.notas}
        presidentSignature={data.presidentSignature}
        presidentName={data.presidentName}
        documentNumber={data.documentNumber}
        logoUrl={data.logoUrl}
        systemDate={data.systemDate}
      />
    )
    console.log("[DEBUG] renderCertificadoDisciplinas: element created, calling renderToBuffer...")
    const buf = await renderToBuffer(element)
    console.log("[DEBUG] renderCertificadoDisciplinas: success, size=" + buf.length)
    return buf
  } catch (e) {
    console.error("[DEBUG] renderCertificadoDisciplinas: FAILED", e)
    throw e
  }
}

// ===== RECEPCIONISTA: Declaração Académica =====
export async function renderRecepcionistaDeclaracao(data: {
  studentName: string
  studentNumber: string
  courseName: string
  currentYear: number
  anoLectivo: string
  presidentSignature: string
  presidentName: string
  documentNumber: string
  logoUrl?: string
  systemDate?: Date
}): Promise<Buffer> {
  console.log("[DEBUG] renderRecepcionistaDeclaracao: starting...")
  try {
    const element = (
      <RecepcionistaDeclaracaoPDF
        studentName={data.studentName}
        studentNumber={data.studentNumber}
        courseName={data.courseName}
        currentYear={data.currentYear}
        anoLectivo={data.anoLectivo}
        presidentSignature={data.presidentSignature}
        presidentName={data.presidentName}
        documentNumber={data.documentNumber}
        logoUrl={data.logoUrl}
        systemDate={data.systemDate}
      />
    )
    console.log("[DEBUG] renderRecepcionistaDeclaracao: element created, calling renderToBuffer...")
    const buf = await renderToBuffer(element)
    console.log("[DEBUG] renderRecepcionistaDeclaracao: success, size=" + buf.length)
    return buf
  } catch (e) {
    console.error("[DEBUG] renderRecepcionistaDeclaracao: FAILED", e)
    throw e
  }
}