import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { headers } from "next/headers"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// GET /api/admin/assinaturas/presidente - Returns all president signatures
export async function GET() {
  try {
    const signatures = await prisma.assinaturaPresidente.findMany({
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
    console.error("Error fetching president signatures:", error)
    return NextResponse.json(
      { error: "Erro ao buscar assinaturas" },
      { status: 500 }
    )
  }
}

// POST /api/admin/assinaturas/presidente - Upload new president signature
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
    const nome_presidente = formData.get("nome_presidente") as string
    const ano_lectivo = formData.get("ano_lectivo") as string
    const assinatura = formData.get("assinatura") as File | null

    if (!nome_presidente || !ano_lectivo || !assinatura) {
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
    const previousSignature = await prisma.assinaturaPresidente.findFirst({
      where: {
        ano_lectivo,
        data_fim: null
      }
    })

    if (previousSignature) {
      await prisma.assinaturaPresidente.update({
        where: { id_assinatura: previousSignature.id_assinatura },
        data: { data_fim: new Date() }
      })

      // Audit log: deactivate previous signature
      await logAudit({
        id_usuario: parseInt(session.user.id),
        acao: "Desativar Assinatura Presidente Anterior",
        tabela: "AssinaturaPresidente",
        id_registro: previousSignature.id_assinatura,
        valor_antes: { data_fim: null },
        valor_depois: { data_fim: new Date() },
        ip_address: ipAddress
      })
    }

    // Create directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "documentos", "assinaturas")
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file
    const fileName = `presidente-${ano_lectivo}.png`
    const filePath = join(uploadDir, fileName)
    const fileBuffer = Buffer.from(await assinatura.arrayBuffer())
    await writeFile(filePath, fileBuffer)

    // Create new signature record
    const newSignature = await prisma.assinaturaPresidente.create({
      data: {
        nome_presidente,
        ano_lectivo,
        caminho_arquivo: `/documentos/assinaturas/${fileName}`,
        nome_arquivo: fileName,
        data_inicio: new Date()
      }
    })

    // Audit log: create new signature
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "Upload Assinatura Presidente",
      tabela: "AssinaturaPresidente",
      id_registro: newSignature.id_assinatura,
      valor_depois: {
        nome_presidente,
        ano_lectivo,
        caminho_arquivo: newSignature.caminho_arquivo
      },
      ip_address: ipAddress
    })

    return NextResponse.json(newSignature, { status: 201 })
  } catch (error) {
    console.error("Error uploading president signature:", error)
    return NextResponse.json(
      { error: "Erro ao fazer upload da assinatura" },
      { status: 500 }
    )
  }
}