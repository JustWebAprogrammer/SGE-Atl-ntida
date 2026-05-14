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

// GET /api/estudante/certificado/disciplinas/pdf - Return JSON data for client-side PDF generation
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

    // Null safety checks
    if (!student.numero_estudante) {
      return NextResponse.json(
        { error: "Número de estudante não definido. Contacte a secretaria." },
        { status: 400 }
      )
    }

    const anoLectivo = student.ano_electivo || await getAnoLectivo()

      // Fetch ALL disciplines with a final grade (nota_final not null) or dispensada
    const notas = await prisma.nota.findMany({
      where: {
        id_estudante: student.id_estudante,
        OR: [
          { nota_final: { not: null } },
          { dispensada: true }
        ]
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

    // Map to disciplina format for PDF — use CursoDisciplina values for correct ano/semestre
    const disciplinas = notas.map(nota => {
      const curriculo = nota.disciplina.cursos[0] // CursoDisciplina for this student's course
      const ano_curricular = curriculo?.ano_curricular ?? nota.disciplina.ano_curricular
      const semestre = curriculo?.semestre ?? nota.disciplina.semestre
      return {
        nome_disciplina: nota.disciplina.nome_disciplina,
        semestre: semestre === "S1" ? "1º Semestre" : "2º Semestre",
        ano_curricular,
        nota_final: nota.nota_final?.toString() || "-",
        situacao: nota.dispensada ? "Dispensada" : (nota.nota_final && Number(nota.nota_final) >= 10 ? "Aprovado" : "Reprovado")
      }
    })

    // Sort by ano_curricular, semestre, nome_disciplina using the resolved curriculum values
    const ordemSemestre: Record<string, number> = { "1º Semestre": 1, "2º Semestre": 2 }
    disciplinas.sort((a, b) => {
      if (a.ano_curricular !== b.ano_curricular) return a.ano_curricular - b.ano_curricular
      const semA = ordemSemestre[a.semestre] ?? 0
      const semB = ordemSemestre[b.semestre] ?? 0
      if (semA !== semB) return semA - semB
      return a.nome_disciplina.localeCompare(b.nome_disciplina)
    })

    // Get active president signature
    const presidentSignature = await prisma.assinaturaPresidente.findFirst({
      where: { data_fim: null }
    })

    if (!presidentSignature) {
      return NextResponse.json(
        { error: "Assinatura do presidente não encontrada" },
        { status: 500 }
      )
    }

    // Get active director signature
    const directorSignature = await prisma.assinaturaDiretor.findFirst({
      where: { data_fim: null }
    })

    // Generate sequential document number
    const certificadoCount = await prisma.certificado.count({
      where: {
        id_estudante: student.id_estudante,
        tipo_certificado: "Disciplina"
      }
    })
    const sequence = (certificadoCount + 1).toString().padStart(3, '0')
    const numero_documento = `DISC-${anoLectivo}-${student.numero_estudante}-${sequence}`

    // Create certificado record
    const certificado = await prisma.certificado.create({
      data: {
        id_estudante: student.id_estudante,
        tipo_certificado: "Disciplina",
        descricao: `Certificado de Disciplinas - ${anoLectivo}`,
        data_emissao: new Date()
      }
    })

    // Generate QR code — todos os documentos usam /verificar/{id} para simplificar
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const qrCodeUrl = `${baseUrl}/verificar/${certificado.id_certificado}`
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl, {
      width: 200,
      margin: 1
    })
    const qrCodeBase64 = `data:image/png;base64,${qrCodeBuffer.toString("base64")}`

    // Load president signature image - use base64 from DB if available, fallback to disk
    let signatureBase64 = presidentSignature.imagem_base64 || ""
    if (!signatureBase64) {
      try {
        const signaturePath = join(process.cwd(), "public", presidentSignature.caminho_arquivo)
        const signatureBuffer = readFileSync(signaturePath)
        signatureBase64 = `data:image/png;base64,${signatureBuffer.toString("base64")}`
      } catch (signatureError) {
        console.warn("Could not load president signature file:", signatureError)
        signatureBase64 = ""
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
          // Continue without director signature - it's optional
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

    // Fetch layout config for Certificado de Disciplinas
    const dbLayout = await prisma.layoutDocumento.findFirst({
      where: {
        tipo_documento: "CertificadoDisciplinas",
        activo: true,
      }
    })
    const layoutConfig = mergeLayoutConfig("CertificadoDisciplinas", dbLayout?.conteudo)

    // Replace placeholders in texto_corpo
    const studentData = {
      nome_completo: student.nome_completo,
      numero_estudante: student.numero_estudante || "",
      nome_curso: student.curso.nome_curso,
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
      acao: "Gerar Certificado de Disciplinas Digital",
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
      anoLectivo: anoLectivo,
      disciplinas: disciplinas,
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
    console.error("Error generating certificado disciplinas PDF:", error)
    return NextResponse.json(
      { error: "Erro ao gerar certificado" },
      { status: 500 }
    )
  }
}