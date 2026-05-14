import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_departamento: true }
  })

  if (!orientador?.id_departamento) {
    return NextResponse.json({ cursos: [] })
  }

  const cursos = await prisma.curso.findMany({
    where: { id_departamento: orientador.id_departamento },
    select: {
      id_curso: true,
      nome_curso: true,
      duracao_anos: true,
      turnos: true
    },
    orderBy: { nome_curso: "asc" }
  })

  return NextResponse.json({ cursos })
}
