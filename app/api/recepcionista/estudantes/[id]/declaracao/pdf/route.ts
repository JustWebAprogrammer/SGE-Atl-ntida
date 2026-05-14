import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { renderToBuffer } from "@react-pdf/renderer"
import QRCode from "qrcode"
import DeclaracaoPDF from "@/app/components/DeclaracaoPDF"
import * as React from "react"
import { readFileSync } from "fs"
import { join } from "path"
import { getAnoLectivo, getSystemDate } from "@/lib/sistema"

// GET /api/recepcionista/estudantes/[id]/declaracao/pdf - View existing declaration PDF
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
      orderBy: { data_emissao: "desc" }
    })

    if (!declaracao) {
      return NextResponse.json(
        { error: "Declaração não encontrada" },
        { status: 404 }
      )
    }

    // Fetch student data
    const student = await prisma.estudante.findUnique({
      where: { id_estudante: studentId },
      include: { curso: true }
    })

    if (!student) {
      return NextResponse.json(
        { error: "Estudante não encontrado" },
        { status: 404 }
      )
    }

    const anoLectivo = declaracao.ano_lectivo || student.ano_electivo || await getAnoLectivo()
    const currentYear = student.ano_current || 3
    const completedYears = Array.from({ length: currentYear - 1 }, (_, i) => i + 1)

    const gradesByYear = await Promise.all(
      completedYears.map(async (year) => {
        const notas = await prisma.nota.findMany({
          where: {
            id_estudante: studentId,
            disciplina: { ano_curricular: year },
            ano_lectivo: anoLectivo
          },
          include: { disciplina: true }
        })

        const subjects = notas.map(nota => ({
          discipline: nota.disciplina.nome_disciplina,
          semester: nota.semestre === "S1" ? "1º Semestre" : "2º Semestre",
          finalGrade: nota.nota_final?.toString() || "-",
          situation: nota.dispensada ? "Dispensada" : (nota.nota_final && Number(nota.nota_final) >= 10 ? "Aprovado" : "Reprovado")
        }))

        const validGrades = notas.filter(n => n.nota_final !== null && !n.dispensada)
        const average = validGrades.length > 0
          ? (validGrades.reduce((sum, n) => sum + Number(n.nota_final || 0), 0) / validGrades.length).toFixed(2)
          : "-"

        return { year, subjects, average }
      })
    )

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

    let logoBase64 = ""
    try {
      const logoPath = join(process.cwd(), "public", "documentos", "logo.png")
      const logoBuffer = readFileSync(logoPath)
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`
    } catch { }

    const qrCodeUrl = `${request.nextUrl.origin}/verificar/${declaracao.id_declaracao}`
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl, { width: 200, margin: 1 })
    const qrCodeBase64 = `data:image/png;base64,${qrCodeBuffer.toString("base64")}`

    const systemDate = await getSystemDate()

    const pdfBuffer = await renderToBuffer(
      React.createElement(DeclaracaoPDF, {
        studentName: student.nome_completo,
        studentNumber: student.numero_estudante || "",
        courseName: student.curso.nome_curso,
        currentYear,
        anoLectivo,
        presidentSignature: signatureBase64,
        presidentName: presidentSignature?.nome_presidente || "",
        documentNumber: declaracao.numero_documento || `DECL-${anoLectivo}-${student.numero_estudante}-001`,
        qrCodeUrl,
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