import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    include: {
      curso: {
        select: {
          id_curso: true,
          nome_curso: true,
          duracao_anos: true,
          turnos: true,
        },
      },
      usuario: {
        select: {
          email: true,
          nome_usuario: true,
        },
      },
    },
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  return NextResponse.json({
    id_estudante: estudante.id_estudante,
    nome_completo: estudante.nome_completo,
    numero_estudante: estudante.numero_estudante,
    numero_telemovel: estudante.numero_telemovel,
    email: estudante.usuario.email,
    turno: estudante.turno,
    ano_current: estudante.ano_current,
    ano_electivo: estudante.ano_electivo,
    estado: estudante.estado,
    tipo_bolsa: estudante.tipo_bolsa,
    curso: {
      id_curso: estudante.curso.id_curso,
      nome_curso: estudante.curso.nome_curso,
      duracao_anos: estudante.curso.duracao_anos,
    },
  })
}