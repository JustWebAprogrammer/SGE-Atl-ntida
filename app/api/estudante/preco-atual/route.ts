import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPrecoEstudante } from "@/lib/precos"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: {
      id_estudante: true,
      id_curso: true,
      ano_current: true,
      tipo_bolsa: true,
      curso: {
        select: { nome_curso: true }
      }
    }
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  const preco = await getPrecoEstudante(estudante.id_estudante)

  return NextResponse.json({
    ...preco,
    curso: estudante.curso.nome_curso,
    ano_curricular: estudante.ano_current || 1,
  })
}