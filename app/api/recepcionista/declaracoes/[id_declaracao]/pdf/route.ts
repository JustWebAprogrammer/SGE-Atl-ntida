import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { renderToBuffer } from "@react-pdf/renderer"
import DeclaracaoPDF from "@/app/components/DeclaracaoPDF"
import * as React from "react"
import { readFileSync } from "fs"
import { join } from "path"
import { getSystemDate } from "@/lib/sistema"
import { getLayoutDefaults } from "@/lib/layout-defaults"

// GET /api/recepcionista/declaracoes/[id_declaracao]/pdf - View existing declaration PDF by declaration ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id_declaracao: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !["admin", "recepcionista"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const { id_declaracao } = await params
    const declaracaoId = parseInt(id_declaracao)

    if (isNaN(declaracaoId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      )
    }

    // Fetch the declaration with student and course data
    const declaracao = await prisma.declaracao.findUnique({
      where: { id_declaracao: declaracaoId },
      include: {
        estudante: {
          include: { curso: true }
        }
      }
    })

    if (!declaracao) {
      return NextResponse.json(
        { error: "Declaração não encontrada" },
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
      } catch { /* optional */ }
    }

    // Load logo
    let logoBase64 = ""
    try {
      const logoPath = join(process.cwd(), "public", "documentos", "logo.png")
      const logoBuffer = readFileSync(logoPath)
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`
    } catch { /* optional */ }

    const systemDate = await getSystemDate()

    // Declaração física — não tem QR code
    const layoutConfig = {
      ...getLayoutDefaults("DeclaracaoAcademica"),
      tem_qr_code: false,
    }

    const pdfBuffer = await renderToBuffer(
      React.createElement(DeclaracaoPDF, {
        layoutConfig,
        studentName: student.nome_completo,
        studentNumber: student.numero_estudante || "",
        courseName: student.curso.nome_curso,
        currentYear,
        anoLectivo,
        presidentSignature: signatureBase64,
        presidentName: presidentSignature?.nome_presidente || "",
        documentNumber: declaracao.numero_documento,
        qrCodeUrl: "",
        logoUrl: logoBase64,
        systemDate
      }) as any
    )

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