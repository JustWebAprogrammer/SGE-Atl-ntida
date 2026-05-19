import { NextResponse } from "next/server"
import { renderRecepcionistaDeclaracao } from "@/app/lib/render-pdf-helper"

// GET /api/recepcionista/pdf-test - Testar se pdf().toBlob() funciona com dados reais
export async function GET() {
  try {
    console.log("[PDF-TEST] Starting test...")

    const buf = await renderRecepcionistaDeclaracao({
      studentName: "Estudante Teste",
      studentNumber: "TEST-001",
      courseName: "Curso de Teste",
      currentYear: 3,
      anoLectivo: "2026",
      presidentSignature: "",
      presidentName: "Presidente da Instituição",
      documentNumber: "DECL-TEST-001",
      systemDate: new Date()
    })

    console.log("[PDF-TEST] Success! Size:", buf.length)
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=teste.pdf"
      }
    })
  } catch (error) {
    console.error("[PDF-TEST] FAILED:", error)
    return NextResponse.json({
      error: "Erro ao gerar PDF de teste",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}