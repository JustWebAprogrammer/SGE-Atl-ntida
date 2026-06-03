/**
 * Geração de PDF no browser (cliente).
 * O @react-pdf/renderer funciona perfeitamente no browser.
 * Uso: import dinâmico dentro de um evento onClick
 */

// ===== DECLARAÇÃO ACADÉMICA =====
export async function gerarPDFDeclaracao(data: {
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
}): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer")
  const { default: RecepcionistaDeclaracaoPDF } = await import("@/app/components/RecepcionistaDeclaracaoPDF")
  const instance = pdf(<RecepcionistaDeclaracaoPDF {...data} />)
  return await instance.toBlob()
}

// ===== CERTIFICADO DE CONCLUSÃO =====
export async function gerarPDFCertificadoConclusao(data: {
  studentName: string
  studentNumber: string
  courseName: string
  courseDuration: number
  anoLectivo: string
  finalGrade: string
  finalGradeExtenso: string
  presidentSignature: string
  presidentName: string
  documentNumber: string
  logoUrl?: string
  systemDate?: Date
}): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer")
  const { default: RecepcionistaCertificadoConclusaoPDF } = await import("@/app/components/RecepcionistaCertificadoConclusaoPDF")
  const instance = pdf(<RecepcionistaCertificadoConclusaoPDF {...data} />)
  return await instance.toBlob()
}

// ===== CERTIFICADO DE DISCIPLINAS =====
export async function gerarPDFCertificadoDisciplinas(data: {
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
}): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer")
  const { default: RecepcionistaCertificadoDisciplinasPDF } = await import("@/app/components/RecepcionistaCertificadoDisciplinasPDF")
  const instance = pdf(<RecepcionistaCertificadoDisciplinasPDF {...data} />)
  return await instance.toBlob()
}