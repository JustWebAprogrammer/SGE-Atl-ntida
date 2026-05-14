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
import { hasOverduePropinas } from "@/lib/propinas"

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

// GET /api/estudante/declaracao/pdf - Return JSON data for client-side PDF generation
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

    if (!student.ano_current) {
      return NextResponse.json(
        { error: "Ano corrente não definido. Contacte a secretaria." },
        { status: 400 }
      )
    }

    // Estudantes finalizados já não precisam de declaração académica
    if (student.estado === "Finalizado") {
      return NextResponse.json(
        { error: "Estudantes finalizados já não necessitam de declaração académica. Solicite um certificado de conclusão." },
        { status: 403 }
      )
    }

    // Check if student has overdue propinas (shared helper uses getSystemDate)
    if (await hasOverduePropinas(student.id_estudante)) {
      return NextResponse.json(
        { error: "Propinas em atraso. Pague suas propinas para gerar a declaração." },
        { status: 403 }
      )
    }

    // Get current ano lectivo
    const anoLectivo = student.ano_electivo || await getAnoLectivo()
    const currentYear = student.ano_current

    // A declaração académica é apenas um texto confirmando a matrícula.
    // Não busca notas — isso fica para o Certificado de Disciplinas.

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

    // FIX 3: Generate sequential document number using database count
    const declarationCount = await prisma.declaracao.count({
      where: { id_estudante: student.id_estudante }
    })
    const sequence = (declarationCount + 1).toString().padStart(3, '0')
    const numero_documento = `DECL-${anoLectivo}-${student.numero_estudante}-${sequence}`

    // Create declaration record in Declaracao table
    const declaracao = await prisma.declaracao.create({
      data: {
        id_estudante: student.id_estudante,
        numero_documento,
        ano_lectivo: anoLectivo
      }
    })

    // Generate QR code
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const qrCodeUrl = `${baseUrl}/verificar/${declaracao.id_declaracao}`
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl, {
      width: 200,
      margin: 1
    })
    const qrCodeBase64 = `data:image/png;base64,${qrCodeBuffer.toString("base64")}`

    // Load president signature
    let signatureBase64 = ""
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

    // Load director signature if available
    let directorSignatureBase64 = ""
    let directorName = ""
    if (directorSignature) {
      try {
        const directorSignaturePath = join(process.cwd(), "public", directorSignature.caminho_arquivo)
        const directorSignatureBuffer = readFileSync(directorSignaturePath)
        directorSignatureBase64 = `data:image/png;base64,${directorSignatureBuffer.toString("base64")}`
        directorName = directorSignature.nome_diretor
      } catch (signatureError) {
        console.warn("Could not load director signature file:", signatureError)
      }
    }

    // Load logo
    let logoBase64 = ""
    try {
      const logoPath = join(process.cwd(), "public", "documentos", "logo.png")
      const logoBuffer = readFileSync(logoPath)
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`
    } catch (logoError) {
      console.warn("Could not load logo file, using empty:", logoError)
      logoBase64 = ""
    }

    // Fetch layout config for Declaração Académica
    const dbLayout = await prisma.layoutDocumento.findFirst({
      where: {
        tipo_documento: "DeclaracaoAcademica",
        activo: true,
      }
    })
    const layoutConfig = mergeLayoutConfig("DeclaracaoAcademica", dbLayout?.conteudo)

    // Replace placeholders in texto_corpo - a declaração usa apenas placeholders básicos
    // NOTA_FINAL e NOTA_POR_EXTENSO também são passados caso o admin os use no texto
    const studentData = {
      nome_completo: student.nome_completo,
      numero_estudante: student.numero_estudante || "",
      nome_curso: student.curso.nome_curso,
      ano_lectivo: anoLectivo,
      ano_curricular: currentYear.toString(),
      nota_final: "",
      nota_por_extenso: "",
      duracao_anos: (student.curso.duracao_anos || 3).toString(),
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
      acao: "Gerar Declaração Académica",
      tabela: "Declaracao",
      id_registro: declaracao.id_declaracao,
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
      currentYear,
      anoLectivo,
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
    console.error("Error generating declaration data:", error)
    return NextResponse.json(
      { error: "Erro ao gerar declaração" },
      { status: 500 }
    )
  }
}