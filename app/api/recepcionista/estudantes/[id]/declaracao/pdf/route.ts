import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { readFileSync } from "fs"
import { join } from "path"
import { getSystemDate } from "@/lib/sistema"
import { renderRecepcionistaDeclaracao } from "@/app/lib/render-pdf-helper"

// GET /api/recepcionista/estudantes/[id]/declaracao/pdf - View latest declaration PDF for a student
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !["admin", "recepcionista"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const { id } = await params
    const studentId = parseInt(id)

    // Fetch the latest declaration for this student
    const declaracao = await prisma.declaracao.findFirst({
      where: { id_estudante: studentId },
      orderBy: { data_emissao: "desc" },
      include: {
        estudante: {
          include: { curso: true }
        }
      }
    })

    if (!declaracao) {
      return NextResponse.json(
        { error: "Nenhuma declaração encontrada para este estudante" },
        { status: 404 }
      )
    }

    const student = declaracao.estudante
    const anoLectivo = declaracao.ano_lectivo
    const currentYear = student.ano_current || 3

    // Get president signature
    const presidentSignature = await prisma.assinaturaPresidente.findFirst({
      where: { data_fim: null }
    })

    let signatureBase64 = presidentSignature?.imagem_base64 || ""
    if (!signatureBase64 && presidentSignature) {
      try {
        const signaturePath = join(process.cwd(), "public", presidentSignature.caminho_arquivo)
        const signatureBuffer = readFileSync(signaturePath)
        signatureBase64 = `data:image/png;base64,${signatureBuffer.toString("base64")}`
      } catch { }
    }

    // Load logo
    let logoBase64 = ""
    try {
      const logoPath = join(process.cwd(), "public", "documentos", "logo.png")
      const logoBuffer = readFileSync(logoPath)
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`
    } catch { }

    const systemDate = await getSystemDate()

    const pdfBuffer = await renderRecepcionistaDeclaracao({
      studentName: student.nome_completo,
      studentNumber: student.numero_estudante || "",
      courseName: student.curso.nome_curso,
      currentYear,
      anoLectivo,
      presidentSignature: signatureBase64,
      presidentName: presidentSignature?.nome_presidente || "",
      documentNumber: declaracao.numero_documento,
      logoUrl: logoBase64,
      systemDate
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${declaracao.numero_documento || 'declaracao'}.pdf"`
      }
    })

  } catch (error) {
    console.error("Error viewing declaration PDF:", error)
    return NextResponse.json(
      { error: "Erro ao visualizar declaração" },
      { status: 500 }
    )
  }
}