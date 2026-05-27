import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { headers } from "next/headers"
import QRCode from "qrcode"
import { readFileSync } from "fs"
import { join } from "path"
import { mergeLayoutConfig, replacePlaceholders } from "@/lib/layout-defaults"
import { getAnoLectivo, getSystemDate } from "@/lib/sistema"
import { arredondarNota } from "@/lib/notas"

// GET /api/estudante/certificado/conclusao/pdf - Return JSON data for client-side PDF generation
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "estudante") {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const id_usuario = parseInt(session.user.id)

    // Fetch student
    const student = await prisma.estudante.findUnique({
      where: { id_usuario },
      include: {
        curso: true
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: "Estudante não encontrado" },
        { status: 404 }
      )
    }

    // Check if student has estado: "Finalizado"
    if (student.estado !== "Finalizado") {
      return NextResponse.json(
        { error: "Apenas estudantes finalizados podem gerar o certificado de conclusão" },
        { status: 403 }
      )
    }

    // Null safety checks
    if (!student.numero_estudante) {
      return NextResponse.json(
        { error: "Número de estudante não definido. Contacte a secretaria." },
        { status: 400 }
      )
    }

    const anoLectivo = student.ano_electivo || await getAnoLectivo()
    const duracaoAnos = student.curso.duracao_anos || 3

    // Usar CursoDisciplina para saber a que ano cada disciplina pertence no currículo do estudante
    // (igual ao que o Certificado de Disciplinas faz correctamente)
    const notas = await prisma.nota.findMany({
      where: {
        id_estudante: student.id_estudante,
      },
      include: {
        disciplina: {
          include: {
            cursos: {
              where: { id_curso: student.id_curso }
            }
          }
        }
      }
    })

    // Agrupar notas por ano curricular usando CursoDisciplina (com fallback para Disciplina.ano_curricular)
    // A monografia substitui as disciplinas do último ano do curso.
    // Portanto, só processamos anos 1..duracaoAnos-1 (anos com disciplinas normais).
    const anosComDisciplinas = duracaoAnos - 1
    const notasPorAno: Record<number, typeof notas> = {}
    for (const nota of notas) {
      const curriculo = nota.disciplina.cursos[0]
      const ano = curriculo?.ano_curricular ?? nota.disciplina.ano_curricular
      // Só nos interessam anos dentro do range normal (1..duracaoAnos-1)
      if (ano >= 1 && ano <= anosComDisciplinas) {
        if (!notasPorAno[ano]) notasPorAno[ano] = []
        notasPorAno[ano].push(nota)
      }
    }

    const allYears = Array.from({ length: anosComDisciplinas }, (_, i) => i + 1)
    const gradesByYear = allYears.map(year => {
      const yearNotas = notasPorAno[year] || []
      const validGrades = yearNotas.filter(n => n.nota_final !== null && !n.dispensada)
      const average = validGrades.length > 0
        ? (validGrades.reduce((sum, n) => sum + Number(n.nota_final || 0), 0) / validGrades.length)
        : 0

      return {
        year,
        average: average.toFixed(2)
      }
    })

    // Fetch monografia grade — substitui o valor do último ano
    const monografia = await prisma.monografia.findFirst({
      where: {
        id_estudante: student.id_estudante,
        estado: "Defendida"
      }
    })

    const monografiaGrade = monografia?.nota_final ? Number(monografia.nota_final) : 0

    // Calculate final grade: average of all year averages + monografia (equal weight)
    // A monografia tem o mesmo peso que cada ano curricular
    const yearAverages = gradesByYear.map(y => Number(y.average))
    const allGrades = [...yearAverages, monografiaGrade]
    const finalGradeRaw = allGrades.reduce((sum, g) => sum + g, 0) / allGrades.length
    const finalGrade = arredondarNota(finalGradeRaw)

    // Get active president signature
    const presidentSignature = await prisma.assinaturaPresidente.findFirst({
      where: {
        data_fim: null
      }
    })

    if (!presidentSignature) {
      return NextResponse.json(
        { error: "Assinatura do presidente não encontrada" },
        { status: 500 }
      )
    }

    // Get active director signature
    const directorSignature = await prisma.assinaturaDiretor.findFirst({
      where: {
        data_fim: null
      }
    })

    // Generate sequential document number
    const certificadoCount = await prisma.certificado.count({
      where: {
        id_estudante: student.id_estudante,
        tipo_certificado: "Conclusao"
      }
    })
    const sequence = (certificadoCount + 1).toString().padStart(3, '0')
    const numero_documento = `CERT-${anoLectivo}-${student.numero_estudante}-${sequence}`

    // Create certificado record in Certificado table
    const certificado = await prisma.certificado.create({
      data: {
        id_estudante: student.id_estudante,
        tipo_certificado: "Conclusao",
        descricao: `Certificado de Conclusão - ${anoLectivo}`,
        data_emissao: new Date()
      }
    })

    // Generate QR code — usa request.nextUrl.origin para funcionar em qualquer ambiente (dev/produção)
    const qrCodeUrl = `${request.nextUrl.origin}/verificar/${certificado.id_certificado}`
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl, {
      width: 200,
      margin: 1
    })
    const qrCodeBase64 = `data:image/png;base64,${qrCodeBuffer.toString("base64")}`

    // Load signature image - use base64 from DB if available, fallback to disk
    let signatureBase64 = presidentSignature.imagem_base64 || ""
    if (!signatureBase64) {
      try {
        const signaturePath = join(process.cwd(), "public", presidentSignature.caminho_arquivo)
        const signatureBuffer = readFileSync(signaturePath)
        signatureBase64 = `data:image/png;base64,${signatureBuffer.toString("base64")}`
      } catch (signatureError) {
        console.warn("Could not load signature file:", signatureError)
        return NextResponse.json(
          { error: "Erro ao carregar assinatura do presidente" },
          { status: 500 }
        )
      }
    }

    // Load director signature if available - use base64 from DB if available, fallback to disk
    let directorSignatureBase64 = ""
    let directorName = ""
    if (directorSignature) {
      directorSignatureBase64 = directorSignature.imagem_base64 || ""
      if (!directorSignatureBase64) {
        try {
          const directorSignaturePath = join(process.cwd(), "public", directorSignature.caminho_arquivo)
          const directorSignatureBuffer = readFileSync(directorSignaturePath)
          directorSignatureBase64 = `data:image/png;base64,${directorSignatureBuffer.toString("base64")}`
        } catch (signatureError) {
          console.warn("Could not load director signature file:", signatureError)
        }
      }
      directorName = directorSignature.nome_diretor
    }

    // Load logo
    let logoBase64 = ""
    try {
      const logoPath = join(process.cwd(), "public", "documentos", "logo.png")
      const logoBuffer = readFileSync(logoPath)
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`
    } catch (logoError) {
      console.warn("Could not load logo file:", logoError)
      logoBase64 = ""
    }

    // Fetch layout config for Certificado de Conclusão
    const dbLayout = await prisma.layoutDocumento.findFirst({
      where: {
        tipo_documento: "CertificadoConclusao",
        activo: true,
      }
    })
    const layoutConfig = mergeLayoutConfig("CertificadoConclusao", dbLayout?.conteudo)

    // Replace placeholders in texto_corpo
    const studentData = {
      nome_completo: student.nome_completo,
      numero_estudante: student.numero_estudante || "",
      nome_curso: student.curso.nome_curso,
      duracao_anos: (student.curso.duracao_anos || 3).toString(),
      nota_final: finalGrade?.toFixed(2) || "0,00",
      nota_por_extenso: numberToExtenso(finalGrade || 0),
      nome_universidade: layoutConfig.nome_universidade,
    }
    const textoCorpoProcessado = replacePlaceholders(layoutConfig.texto_corpo, studentData)
    const layoutConfigProcessado = {
      ...layoutConfig,
      texto_corpo: textoCorpoProcessado,
    }

    // Get system date for PDF
    const systemDate = await getSystemDate()

    // Audit log
    const headersList = await headers()
    const ipAddress = headersList.get("x-forwarded-for") || "unknown"

    await logAudit({
      id_usuario,
      acao: "Gerar Certificado de Conclusão Digital",
      tabela: "Certificado",
      id_registro: certificado.id_certificado,
      valor_depois: {
        id_estudante: student.id_estudante,
        numero_documento,
        gerado_por: "estudante"
      },
      ip_address: ipAddress
    })

    // Return JSON data for client-side PDF generation
    return NextResponse.json({
      layoutConfig: layoutConfigProcessado,
      studentName: student.nome_completo,
      studentNumber: student.numero_estudante,
      courseName: student.curso.nome_curso,
      courseDuration: student.curso.duracao_anos || 3,
      anoLectivo: anoLectivo,
      gradesByYear: gradesByYear,
      monografiaGrade: monografiaGrade.toFixed(2),
      finalGrade: finalGrade?.toFixed(2) || "0.00",
      finalGradeExtenso: numberToExtenso(finalGrade || 0),
      presidentSignature: signatureBase64,
      presidentName: presidentSignature.nome_presidente,
      directorSignature: directorSignatureBase64,
      directorName: directorName,
      documentNumber: numero_documento,
      qrCodeUrl: qrCodeBase64,
      logoUrl: logoBase64,
      systemDate: systemDate?.toISOString() || null,
    })
  } catch (error) {
    console.error("Error generating certificado PDF:", error)
    return NextResponse.json(
      { error: "Erro ao gerar certificado" },
      { status: 500 }
    )
  }
}

// Helper function to convert number to Portuguese extenso (simplified)
function numberToExtenso(num: number): string {
  const inteiro = Math.floor(num)
  if (inteiro === 14) return "catorze"
  if (inteiro === 15) return "quinze"
  if (inteiro === 16) return "dezasseis"
  if (inteiro === 17) return "dezassete"
  if (inteiro === 18) return "dezoito"
  if (inteiro === 19) return "dezanove"
  if (inteiro === 20) return "vinte"
  return num.toFixed(2).replace(".", ",")
}