import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const id_usuario = parseInt(session.user.id)

    await prisma.notificacao.updateMany({
      where: { id_usuario, lida: false },
      data: { lida: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao marcar todas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}