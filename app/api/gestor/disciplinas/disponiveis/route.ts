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

  // Buscar TODAS as disciplinas de TODOS os departamentos
  const disciplinas = await prisma.disciplina.findMany({
    include: {
      departamento: {
        select: {
          id_departamento: true,
          nome_departamento: true
        }
      }
    },
    orderBy: [
      { departamento: { nome_departamento: "asc" } },
      { nome_disciplina: "asc" }
    ]
  })

  // Buscar todos os departamentos para o filtro
  const departamentos = await prisma.departamento.findMany({
    select: {
      id_departamento: true,
      nome_departamento: true
    },
    orderBy: { nome_departamento: "asc" }
  })

  const disciplinasFormatadas = disciplinas.map(d => ({
    id_disciplina: d.id_disciplina,
    nome_disciplina: d.nome_disciplina,
    codigo_disciplina: d.codigo_disciplina,
    creditos: d.creditos,
    id_departamento: d.departamento.id_departamento,
    nome_departamento: d.departamento.nome_departamento
  }))

  return NextResponse.json({
    disciplinas: disciplinasFormatadas,
    departamentos
  })
}
