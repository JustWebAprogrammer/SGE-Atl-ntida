import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mergeLayoutConfig } from "@/lib/layout-defaults"
import type { DocumentoTipo } from "@/lib/layout-defaults"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/admin/layout-documentos - Returns all layout configs (with defaults merged)
export async function GET(request: NextRequest) {
  try {
    // Check authentication (admin only)
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const tipos: DocumentoTipo[] = ["DeclaracaoAcademica", "CertificadoConclusao", "CertificadoDisciplinas"]
    
    const layouts = await Promise.all(
      tipos.map(async (tipo) => {
        // Fetch active layout from database
        const dbLayout = await prisma.layoutDocumento.findFirst({
          where: {
            tipo_documento: tipo,
            activo: true,
          }
        })

        // Merge database config with defaults
        const config = mergeLayoutConfig(tipo, dbLayout?.conteudo)
        
        return {
          tipo_documento: tipo,
          nome_layout: dbLayout?.nome_layout || tipo,
          conteudo: config,
          activo: dbLayout?.activo ?? true,
          id_layout: dbLayout?.id_layout || null,
        }
      })
    )

    return NextResponse.json({ layouts })
  } catch (error) {
    console.error("Error fetching layout configs:", error)
    return NextResponse.json(
      { error: "Erro ao buscar configurações de layout" },
      { status: 500 }
    )
  }
}