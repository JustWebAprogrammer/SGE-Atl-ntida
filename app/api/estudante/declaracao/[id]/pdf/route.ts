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
import { mergeLayoutConfig, replacePlaceholders } from "@/lib/layout-defaults"
import { getSystemDate } from "@/lib/sistema"
import { logAudit } from "@/lib/audit"
import { headers } from "next/headers"

// GET /api/estudante/declaracao/[id]/pdf - Download existing declaration PDF from history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "estudante") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const resolvedParams = await params
    const id_usuario = parseInt(session.user.id)
    const id_declaracao = parseInt(resolvedParams.id)

    if (isNaN(id_declaracao)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    // Fetch student
    const student = await prisma.estudante.findUnique({
      where: { id_usuario },
      include: { curso: true }
    })

    if (!student) {
      return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
    }

    // Fetch the declaration and verify ownership
    const declaracao = await prisma.declaracao.findUnique({
      where: { id_declaracao }
    })

    if (!declaracao || declaracao.id_estudante !== student.id_estudante) {
      return NextResponse.json({ error: "Declaração não encontrada" }, { status: 404 })
    }

    const anoLectivo = declaracao.ano_lectivo

    // Get grades for completed years
    const currentYear = student.ano_current || 1
    const completedYears = Array.from({ length: Math.max(currentYear - 1, 0) }, (_, i) => i + 1)

    const gradesByYear = await Promise.all(
      completedYears.map(async (year) => {
        const notas = await prisma.nota.findMany({
          where: {
            id_estudante: student.id_estudante,
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

    // Get active signatures
    const presidentSignature = await prisma.assinaturaPresidente.findFirst({
      where: { data_fim: null }
    })

    if (!presidentSignature) {
      return NextResponse.json({ error: "Assinatura do presidente não encontrada" }, { status: 500 })
    }

    const directorSignature = await prisma.assinaturaDiretor.findFirst({
      where: { data_fim: null }
    })

    // Generate QR code
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const qrCodeUrl = `${baseUrl}/verificar/${declaracao.id_declaracao}`
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl, { width: 200, margin: 1 })
    const qrCodeBase64 = `data:image/png;base64,${qrCodeBuffer.toString("base64")}`

    // Load signatures - use base64 from DB if available, fallback to disk
    let signatureBase64 = presidentSignature.imagem_base64 || ""
    if (!signatureBase64) {
      try {
        const signaturePath = join(process.cwd(), "public", presidentSignature.caminho_arquivo)
        const signatureBuffer = readFileSync(signaturePath)
        signatureBase64 = `data:image/png;base64,${signatureBuffer.toString("base64")}`
      } catch (_) {
        return NextResponse.json({ error: "Erro ao carregar assinatura" }, { status: 500 })
      }
    }

    let directorSignatureBase64 = ""
    let directorName = ""
    if (directorSignature) {
      directorSignatureBase64 = directorSignature.imagem_base64 || ""
      if (!directorSignatureBase64) {
        try {
          const dirPath = join(process.cwd(), "public", directorSignature.caminho_arquivo)
          const dirBuffer = readFileSync(dirPath)
          directorSignatureBase64 = `data:image/png;base64,${dirBuffer.toString("base64")}`
        } catch (_) { /* optional */ }
      }
      directorName = directorSignature.nome_diretor
    }

    // Load logo
    let logoBase64 = ""
    try {
      const logoPath = join(process.cwd(), "public", "documentos", "logo.png")
      const logoBuffer = readFileSync(logoPath)
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`
    } catch (_) { /* optional */ }

    // Fetch layout config
    const dbLayout = await prisma.layoutDocumento.findFirst({
      where: { tipo_documento: "DeclaracaoAcademica", activo: true }
    })
    const layoutConfig = mergeLayoutConfig("DeclaracaoAcademica", dbLayout?.conteudo)

    // Replace placeholders
    const studentData = {
      nome_completo: student.nome_completo,
      numero_estudante: student.numero_estudante || "",
      nome_curso: student.curso.nome_curso,
      ano_lectivo: anoLectivo,
      ano_curricular: currentYear.toString(),
      nome_universidade: layoutConfig.nome_universidade,
    }
    const textoCorpoProcessado = replacePlaceholders(layoutConfig.texto_corpo, studentData)
    const layoutConfigProcessado = { ...layoutConfig, texto_corpo: textoCorpoProcessado }

    const systemDate = await getSystemDate()

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(DeclaracaoPDF, {
        layoutConfig: layoutConfigProcessado,
        studentName: student.nome_completo,
        studentNumber: student.numero_estudante || "",
        courseName: student.curso.nome_curso,
        currentYear,
        anoLectivo,
        presidentSignature: signatureBase64,
        presidentName: presidentSignature.nome_presidente,
        directorSignature: directorSignatureBase64,
        directorName,
        documentNumber: declaracao.numero_documento,
        qrCodeUrl: qrCodeBase64,
        logoUrl: logoBase64,
        systemDate: systemDate || undefined,
      }) as any
    )

    // Audit
    const headersList = await headers()
    const ipAddress = headersList.get("x-forwarded-for") || "unknown"
    await logAudit({
      id_usuario,
      acao: "Download Declaração Académica (histórico)",
      tabela: "Declaracao",
      id_registro: declaracao.id_declaracao,
      valor_depois: { id_estudante: student.id_estudante, numero_documento: declaracao.numero_documento },
      ip_address: ipAddress
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${declaracao.numero_documento}.pdf"`
      }
    })
  } catch (error) {
    console.error("Error downloading declaration PDF:", error)
    return NextResponse.json({ error: "Erro ao baixar declaração" }, { status: 500 })
  }
}