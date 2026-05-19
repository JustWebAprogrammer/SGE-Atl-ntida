// Helper para gerar PDFs - usa pdf() em vez de renderToBuffer para evitar erro React #31
import { pdf } from "@react-pdf/renderer"
import RecepcionistaCertificadoConclusaoPDF from "@/app/components/RecepcionistaCertificadoConclusaoPDF"
import RecepcionistaCertificadoDisciplinasPDF from "@/app/components/RecepcionistaCertificadoDisciplinasPDF"
import RecepcionistaDeclaracaoPDF from "@/app/components/RecepcionistaDeclaracaoPDF"

async function renderPDF(element: React.ReactElement): Promise<Buffer> {
  const instance = pdf(element)
  const blob = await instance.toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ===== RECEPCIONISTA: Certificado de Conclusão =====
export async function renderCertificadoConclusao(data: Parameters<typeof RecepcionistaCertificadoConclusaoPDF>[0]): Promise<Buffer> {
  return renderPDF(<RecepcionistaCertificadoConclusaoPDF {...data} />)
}

// ===== RECEPCIONISTA: Certificado de Disciplinas =====
export async function renderCertificadoDisciplinas(data: Parameters<typeof RecepcionistaCertificadoDisciplinasPDF>[0]): Promise<Buffer> {
  return renderPDF(<RecepcionistaCertificadoDisciplinasPDF {...data} />)
}

// ===== RECEPCIONISTA: Declaração Académica (física, sem QR) =====
export async function renderRecepcionistaDeclaracao(data: Parameters<typeof RecepcionistaDeclaracaoPDF>[0]): Promise<Buffer> {
  return renderPDF(<RecepcionistaDeclaracaoPDF {...data} />)
}
