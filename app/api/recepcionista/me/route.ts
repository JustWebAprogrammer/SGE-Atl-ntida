import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "recepcionista") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const recepcionista = await prisma.recepcionista.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: {
      nome_completo: true,
      numero_telemovel: true,
      turno: true,
    },
  })

  if (!recepcionista) {
    return NextResponse.json({ error: "Recepcionista não encontrado" }, { status: 404 })
  }

  return NextResponse.json({
    nome_completo: recepcionista.nome_completo,
    numero_telemovel: recepcionista.numero_telemovel,
    turno: recepcionista.turno,
  })
}