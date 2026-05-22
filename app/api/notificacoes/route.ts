import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const id_usuario = parseInt(session.user.id)

    const notificacoes = await prisma.notificacao.findMany({
      where: { id_usuario },
      orderBy: { data_hora: "desc" },
      take: 30
    })

    return NextResponse.json(notificacoes)
  } catch (error) {
    console.error("Erro ao listar notificações:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}