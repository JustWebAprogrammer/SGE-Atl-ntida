// Helper para gerar PDFs sem usar React.createElement (que causa erro React #31)
// Este ficheiro é .tsx para poder usar JSX com @react-pdf/renderer

import { renderToBuffer } from "@react-pdf/renderer"
import RecepcionistaCertificadoConclusaoPDF from "@/app/components/RecepcionistaCertificadoConclusaoPDF"
import RecepcionistaCertificadoDisciplinasPDF from "@/app/components/RecepcionistaCertificadoDisciplinasPDF"
import RecepcionistaDeclaracaoPDF from "@/app/components/RecepcionistaDeclaracaoPDF"

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
  return await renderToBuffer(
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
  return await renderToBuffer(
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
}

// ===== RECEPCIONISTA: Declaração Académica (física, sem QR) =====
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
  return await renderToBuffer(
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
}