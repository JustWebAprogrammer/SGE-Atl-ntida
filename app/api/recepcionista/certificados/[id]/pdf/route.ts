// DESIGN DECISION: Recepcionista role is read/delivery only. Payment processing is out of scope by requirement.
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { renderToBuffer } from "@react-pdf/renderer"
import QRCode from "qrcode"
import DeclaracaoPDF from "@/app/components/DeclaracaoPDF"
import CertificadoConclusaoPDF from "@/app/components/CertificadoConclusaoPDF"
import CertificadoPDF from "@/app/components/CertificadoPDF"
import * as React from "react"
import { readFileSync } from "fs"
import { join } from "path"
import { getAnoLectivo, getSystemDate } from "@/lib/sistema"

// GET /api/recepcionista/certificados/[id]/pdf - View existing certificate PDF
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
    const certificadoId = parseInt(id)

    // Fetch certificate with student data
    const certificado = await prisma.certificado.findUnique({
      where: { id_certificado: certificadoId },
      include: { estudante: { include: { curso: true } } }
    })

    if (!certificado) {
      return NextResponse.json(
        { error: "Certificado não encontrado" },
        { status: 404 }
      )
    }

    const student = certificado.estudante
    const anoLectivo = student.ano_electivo || await getAnoLectivo()

    // Generate PDF based on certificate type
    let pdfBuffer: Buffer

    if (certificado.tipo_certificado === "Conclusao") {
      // Generate Certificado de Conclusão
      const currentYear = student.ano_current || student.curso.duracao_anos || 3
      const allYears = Array.from({ length: currentYear }, (_, i) => i + 1)

      const gradesByYear = await Promise.all(
        allYears.map(async (year) => {
          const notas = await prisma.nota.findMany({
            where: {
              id_estudante: student.id_estudante,
              disciplina: { ano_curricular: year },
              ano_lectivo: anoLectivo
            },
            include: { disciplina: true }
          })

          const validGrades = notas.filter(n => n.nota_final !== null && !n.dispensada)
          const average = validGrades.length > 0
            ? (validGrades.reduce((sum, n) => sum + Number(n.nota_final || 0), 0) / validGrades.length)
            : 0

          return { year, average: average.toFixed(2) }
        })
      )

      const monografia = await prisma.monografia.findFirst({
        where: { id_estudante: student.id_estudante, estado: "Defendida" }
      })
      const monografiaGrade = monografia?.nota_final ? Number(monografia.nota_final) : 0

      const yearAverages = gradesByYear.map(y => Number(y.average))
      const allGrades = [...yearAverages, monografiaGrade]
      const finalGrade = allGrades.reduce((sum, g) => sum + g, 0) / allGrades.length

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

      const qrCodeUrl = `${request.nextUrl.origin}/verificar/${certificado.id_certificado}`
      const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl, { width: 200, margin: 1 })
      const qrCodeBase64 = `data:image/png;base64,${qrCodeBuffer.toString("base64")}`

      const systemDate = await getSystemDate()

      pdfBuffer = await renderToBuffer(
        React.createElement(CertificadoConclusaoPDF, {
          studentName: student.nome_completo,
          studentNumber: student.numero_estudante || "",
          courseName: student.curso.nome_curso,
          courseDuration: student.curso.duracao_anos || 3,
          anoLectivo,
          gradesByYear,
          monografiaGrade: monografiaGrade.toFixed(2),
          finalGrade: finalGrade.toFixed(2),
          finalGradeExtenso: finalGrade.toFixed(2).replace(".", ","),
          presidentSignature: signatureBase64,
          presidentName: presidentSignature?.nome_presidente || "",
          documentNumber: `CERT-${anoLectivo}-${student.numero_estudante}-001`,
          qrCodeUrl,
          logoUrl: logoBase64,
          systemDate
        }) as any
      )

    } else if (certificado.tipo_certificado === "Disciplina") {
      // Generate Certificado de Disciplinas
      const notas = await prisma.nota.findMany({
        where: {
          id_estudante: student.id_estudante,
          OR: [{ nota_final: { gte: 10 } }, { dispensada: true }]
        },
        include: { disciplina: true }
      })

      let logoBase64 = ""
      try {
        const logoPath = join(process.cwd(), "public", "documentos", "logo.png")
        const logoBuffer = readFileSync(logoPath)
        logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`
      } catch { }

      const qrCodeUrl = `${request.nextUrl.origin}/verificar/${certificado.id_certificado}`
      const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl, { width: 200, margin: 1 })
      const qrCodeBase64 = `data:image/png;base64,${qrCodeBuffer.toString("base64")}`

      const systemDate = await getSystemDate()

      pdfBuffer = await renderToBuffer(
        React.createElement(CertificadoPDF, {
          tipo: "Disciplina",
          estudante: {
            nome_completo: student.nome_completo,
            numero_estudante: student.numero_estudante || "",
            curso: {
              nome_curso: student.curso.nome_curso,
              duracao_anos: student.curso.duracao_anos || 3
            }
          },
          notas: notas.map(n => ({
            id_nota: n.id_nota,
            nota_final: n.nota_final ? Number(n.nota_final) : null,
            dispensada: n.dispensada,
            disciplina: n.disciplina
          })),
          dataEmissao: systemDate,
          numeroCertificado: `DISC-${anoLectivo}-${student.numero_estudante}-001`,
          qrCodeUrl,
          logoUrl: logoBase64
        }) as any
      )

    } else {
      return NextResponse.json(
        { error: "Tipo de certificado inválido" },
        { status: 400 }
      )
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="certificado-${certificadoId}.pdf"`
      }
    })

  } catch (error) {
    console.error("Error viewing certificate PDF:", error)
    return NextResponse.json(
      { error: "Erro ao visualizar certificado" },
      { status: 500 }
    )
  }
}