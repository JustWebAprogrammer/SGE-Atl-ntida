import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const id_usuario = parseInt(session.user.id)
    const id_notificacao = parseInt(params.id)

    // Verificar se a notificação pertence ao user
    const notificacao = await prisma.notificacao.findFirst({
      where: { id: id_notificacao, id_usuario }
    })

    if (!notificacao) {
      return NextResponse.json({ error: "Notificação não encontrada" }, { status: 404 })
    }

    await prisma.notificacao.update({
      where: { id: id_notificacao },
      data: { lida: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao marcar notificação:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}