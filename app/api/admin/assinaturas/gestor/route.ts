import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { headers } from "next/headers"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// GET /api/admin/assinaturas/gestor - Returns all gestor signatures, filterable by department and ano lectivo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id_departamento = searchParams.get("id_departamento")
    const ano_lectivo = searchParams.get("ano_lectivo")

    const where: any = {}
    if (id_departamento) {
      where.id_departamento = parseInt(id_departamento)
    }
    if (ano_lectivo) {
      where.ano_lectivo = ano_lectivo
    }

    const signatures = await prisma.assinaturaGestor.findMany({
      where,
      include: {
        departamento: true,
        gestor: true
      },
      orderBy: {
        ano_lectivo: "desc"
      }
    })

    // Group by department
    const groupedByDepartment = signatures.reduce((acc, sig) => {
      const deptId = sig.id_departamento
      if (!acc[deptId]) {
        acc[deptId] = {
          departamento: sig.departamento,
          assinaturas: []
        }
      }
      acc[deptId].assinaturas.push({
        ...sig,
        ativo: sig.data_fim === null
      })
      return acc
    }, {} as Record<number, { departamento: any; assinaturas: any[] }>)

    return NextResponse.json(Object.values(groupedByDepartment))
  } catch (error) {
    console.error("Error fetching gestor signatures:", error)
    return NextResponse.json(
      { error: "Erro ao buscar assinaturas" },
      { status: 500 }
    )
  }
}

// POST /api/admin/assinaturas/gestor - Upload new gestor signature
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
    const id_gestor = formData.get("id_gestor") as string
    const id_departamento = formData.get("id_departamento") as string
    const ano_lectivo = formData.get("ano_lectivo") as string
    const assinatura = formData.get("assinatura") as File | null

    if (!id_gestor || !id_departamento || !ano_lectivo || !assinatura) {
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

    // Deactivate previous signature for same department and ano_lectivo
    const previousSignature = await prisma.assinaturaGestor.findFirst({
      where: {
        id_departamento: parseInt(id_departamento),
        ano_lectivo,
        data_fim: null
      }
    })

    if (previousSignature) {
      await prisma.assinaturaGestor.update({
        where: { id_assinatura: previousSignature.id_assinatura },
        data: { data_fim: new Date() }
      })

      // Audit log: deactivate previous signature
      await logAudit({
        id_usuario: parseInt(session.user.id),
        acao: "Desativar Assinatura Gestor Anterior",
        tabela: "AssinaturaGestor",
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
    const fileName = `gestor-${id_departamento}-${ano_lectivo}.png`
    const filePath = join(uploadDir, fileName)
    const fileBuffer = Buffer.from(await assinatura.arrayBuffer())
    await writeFile(filePath, fileBuffer)

    // Create new signature record
    const newSignature = await prisma.assinaturaGestor.create({
      data: {
        id_gestor: parseInt(id_gestor),
        id_departamento: parseInt(id_departamento),
        ano_lectivo,
        caminho_arquivo: `/documentos/assinaturas/${fileName}`,
        nome_arquivo: fileName,
        data_inicio: new Date()
      }
    })

    // Audit log: create new signature
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "Upload Assinatura Gestor",
      tabela: "AssinaturaGestor",
      id_registro: newSignature.id_assinatura,
      valor_depois: {
        id_gestor: newSignature.id_gestor,
        id_departamento: newSignature.id_departamento,
        ano_lectivo: newSignature.ano_lectivo,
        caminho_arquivo: newSignature.caminho_arquivo
      },
      ip_address: ipAddress
    })

    return NextResponse.json(newSignature, { status: 201 })
  } catch (error) {
    console.error("Error uploading gestor signature:", error)
    return NextResponse.json(
      { error: "Erro ao fazer upload da assinatura" },
      { status: 500 }
    )
  }
}