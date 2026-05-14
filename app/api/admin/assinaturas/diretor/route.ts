import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { headers } from "next/headers"

// GET /api/admin/assinaturas/diretor - Returns all director signatures
export async function GET() {
  try {
    const signatures = await prisma.assinaturaDiretor.findMany({
      orderBy: {
        ano_lectivo: "desc"
      }
    })

    // Add active status to each signature
    const signaturesWithActive = signatures.map(sig => ({
      ...sig,
      ativo: sig.data_fim === null
    }))

    return NextResponse.json(signaturesWithActive)
  } catch (error) {
    console.error("Error fetching director signatures:", error)
    return NextResponse.json(
      { error: "Erro ao buscar assinaturas" },
      { status: 500 }
    )
  }
}

// POST /api/admin/assinaturas/diretor - Upload new director signature
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const nome_diretor = formData.get("nome_diretor") as string
    const ano_lectivo = formData.get("ano_lectivo") as string
    const assinatura = formData.get("assinatura") as File | null

    if (!nome_diretor || !ano_lectivo || !assinatura) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ["image/png", "image/jpeg"]
    if (!validTypes.includes(assinatura.type)) {
      return NextResponse.json(
        { error: "Formato de imagem inválido. Use PNG ou JPG." },
        { status: 400 }
      )
    }

    // Get IP address for audit log
    const headersList = await headers()
    const ipAddress = headersList.get("x-forwarded-for") || "unknown"

    // Deactivate previous signature for same ano_lectivo
    const previousSignature = await prisma.assinaturaDiretor.findFirst({
      where: {
        ano_lectivo,
        data_fim: null
      }
    })

    if (previousSignature) {
      await prisma.assinaturaDiretor.update({
        where: { id_assinatura: previousSignature.id_assinatura },
        data: { data_fim: new Date() }
      })

      // Audit log: deactivate previous signature
      await logAudit({
        id_usuario: parseInt(session.user.id),
        acao: "Desativar Assinatura Diretor Anterior",
        tabela: "AssinaturaDiretor",
        id_registro: previousSignature.id_assinatura,
        valor_antes: { data_fim: null },
        valor_depois: { data_fim: new Date() },
        ip_address: ipAddress
      })
    }

    // Convert image to base64 (data URL) instead of writing to disk
    // This avoids EROFS errors on serverless platforms like Vercel
    const fileBuffer = Buffer.from(await assinatura.arrayBuffer())
    const base64 = fileBuffer.toString("base64")
    const imagemBase64 = `data:${assinatura.type};base64,${base64}`

    const fileName = `diretor-${ano_lectivo}.png`

    // Create new signature record with base64 image
    const newSignature = await prisma.assinaturaDiretor.create({
      data: {
        nome_diretor,
        ano_lectivo,
        caminho_arquivo: `/documentos/assinaturas/${fileName}`,
        nome_arquivo: fileName,
        imagem_base64: imagemBase64,
        data_inicio: new Date()
      }
    })

    // Audit log: create new signature
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "Upload Assinatura Diretor",
      tabela: "AssinaturaDiretor",
      id_registro: newSignature.id_assinatura,
      valor_depois: {
        nome_diretor,
        ano_lectivo,
        caminho_arquivo: newSignature.caminho_arquivo
      },
      ip_address: ipAddress
    })

    return NextResponse.json(newSignature, { status: 201 })
  } catch (error) {
    console.error("Error uploading director signature:", error)
    return NextResponse.json(
      { error: "Erro ao fazer upload da assinatura" },
      { status: 500 }
    )
  }
}