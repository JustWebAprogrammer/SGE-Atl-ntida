import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { Semestre } from "@prisma/client"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "estudante") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const ano = parseInt(searchParams.get("ano") ?? "1")
  const semestreParam = searchParams.get("semestre") ?? "S1"
  const semestre = semestreParam === "S2" ? Semestre.S2 : Semestre.S1

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: {
      id_estudante: true,
      curso: {
        select: { id_departamento: true }
      }
    }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  const disciplinas = await prisma.disciplina.findMany({
    where: {
      id_departamento: estudante.curso.id_departamento,
      ano_curricular: ano,
      semestre: semestre,
    },
    include: {
      notas: {
        where: { id_estudante: estudante.id_estudante },
        take: 1,
      }
    },
    orderBy: { nome_disciplina: "asc" }
  })

  const resultado = disciplinas.map(d => {
    const nota = d.notas[0]
    const notaFinal = nota?.nota_final ? Number(nota.nota_final) : null

    return {
      id: d.id_disciplina,
      nome: d.nome_disciplina,
      creditos: d.creditos,
      nota: notaFinal,
      aprovado: notaFinal !== null ? notaFinal >= 10 : null,
      dispensada: nota?.dispensada ?? false,
    }
  })

  return NextResponse.json(resultado)
}