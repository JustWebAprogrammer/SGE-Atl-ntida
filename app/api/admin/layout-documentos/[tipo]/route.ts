import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { headers } from "next/headers"

// Valid document types
const validTipos = ["DeclaracaoAcademica", "CertificadoConclusao", "CertificadoDisciplinas"]

// PUT /api/admin/layout-documentos/[tipo] - Upsert layout config for a document type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string }> }
) {
  try {
    const { tipo } = await params

    // Check authentication (admin only)
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }
    
    // Validate tipo
    if (!validTipos.includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo de documento inválido" },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { conteudo } = body

    if (!conteudo) {
      return NextResponse.json(
        { error: "Conteúdo do layout é obrigatório" },
        { status: 400 }
      )
    }

    // Upsert: find existing active layout or create new one
    const existingLayout = await prisma.layoutDocumento.findFirst({
      where: {
        tipo_documento: tipo as any,
        activo: true,
      }
    })

    let layout
    if (existingLayout) {
      // Update existing
      layout = await prisma.layoutDocumento.update({
        where: { id_layout: existingLayout.id_layout },
        data: { conteudo: conteudo }
      })
    } else {
      // Create new
      layout = await prisma.layoutDocumento.create({
        data: {
          tipo_documento: tipo as any,
          nome_layout: tipo,
          conteudo: conteudo,
          activo: true,
        }
      })
    }

    // Log audit
    const headersList = await headers()
    const ipAddress = headersList.get("x-forwarded-for") || "unknown"
    
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "Atualizar Layout Documento",
      tabela: "LayoutDocumento",
      id_registro: layout.id_layout,
      valor_depois: {
        tipo_documento: tipo,
        conteudo: conteudo,
        actualizado_por: session.user.id
      },
      ip_address: ipAddress
    })

    return NextResponse.json({
      success: true,
      layout: {
        id_layout: layout.id_layout,
        tipo_documento: layout.tipo_documento,
        conteudo: layout.conteudo,
        activo: layout.activo,
      }
    })
  } catch (error) {
    console.error("Error updating layout config:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar configuração de layout" },
      { status: 500 }
    )
  }
}