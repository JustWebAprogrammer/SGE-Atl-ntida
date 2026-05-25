import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { criarNotificacao } from "@/lib/notificacoes"

// PUT /api/recepcionista/declaracoes/[id_declaracao]/status - Update declaration delivery status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id_declaracao: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !["admin", "recepcionista"].includes(session.user.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id_declaracao } = await params
    const declaracaoId = parseInt(id_declaracao)
    if (isNaN(declaracaoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !["Solicitado", "Pronto", "Entregue"].includes(status)) {
      return NextResponse.json({ error: "Status inválido. Use: Solicitado, Pronto ou Entregue" }, { status: 400 })
    }

    const declaracao = await prisma.declaracao.findUnique({
      where: { id_declaracao: declaracaoId },
      include: {
        estudante: { select: { id_usuario: true, nome_completo: true } }
      }
    })

    if (!declaracao) {
      return NextResponse.json({ error: "Declaração não encontrada" }, { status: 404 })
    }

    await prisma.declaracao.update({
      where: { id_declaracao: declaracaoId },
      data: { status_entrega: status }
    })

    // Notificar estudante quando declaração estiver pronta
    if (status === "Pronto" && declaracao.estudante) {
      await criarNotificacao({
        id_usuario: declaracao.estudante.id_usuario,
        tipo: "declaracao",
        titulo: "Declaração disponível",
        mensagem: "A sua declaração está disponível para levantar na secretaria.",
        link_url: "/estudante/certificados"
      })
    }

    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "ATUALIZAR_STATUS_DECLARACAO",
      tabela: "Declaracao",
      id_registro: declaracaoId,
      valor_antes: { status_entrega: declaracao.status_entrega },
      valor_depois: { status_entrega: status },
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
    })

    return NextResponse.json({
      success: true,
      mensagem: `Declaração atualizada para "${status}"`,
      status_entrega: status
    })

  } catch (error) {
    console.error("Error updating declaration status:", error)
    return NextResponse.json({ error: "Erro ao atualizar status" }, { status: 500 })
  }
}