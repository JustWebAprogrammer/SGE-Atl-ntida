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

    const total = await prisma.notificacao.count({
      where: { id_usuario, lida: false }
    })

    return NextResponse.json({ total })
  } catch (error) {
    console.error("Erro ao contar notificações:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}