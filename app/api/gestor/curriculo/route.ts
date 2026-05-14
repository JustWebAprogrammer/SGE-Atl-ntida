import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET /api/gestor/curriculo?cursoId=X
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const cursoId = parseInt(searchParams.get("cursoId") || "")
  if (isNaN(cursoId)) return NextResponse.json({ error: "cursoId inválido" }, { status: 400 })

  const curso = await prisma.curso.findUnique({
    where: { id_curso: cursoId },
    select: { id_departamento: true, nome_curso: true, duracao_anos: true }
  })

  if (!curso) return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 })

  const itens = await prisma.cursoDisciplina.findMany({
    where: { id_curso: cursoId },
    include: {
      disciplina: {
        select: {
          id_disciplina: true,
          nome_disciplina: true,
          codigo_disciplina: true,
          creditos: true
        }
      }
    },
    orderBy: [
      { ano_curricular: "asc" },
      { semestre: "asc" }
    ]
  })

  const curriculo = itens.map(i => ({
    id_disciplina: i.disciplina.id_disciplina,
    nome_disciplina: i.disciplina.nome_disciplina,
    codigo_disciplina: i.disciplina.codigo_disciplina,
    creditos: i.disciplina.creditos,
    ano_curricular: i.ano_curricular,
    semestre: i.semestre
  }))

  return NextResponse.json({ curriculo, curso })
}

// POST /api/gestor/curriculo
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { id_curso, id_disciplina, ano_curricular, semestre } = body

  if (!id_curso || !id_disciplina || !ano_curricular || !semestre) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  try {
    await prisma.cursoDisciplina.create({
      data: {
        id_curso: parseInt(id_curso),
        id_disciplina: parseInt(id_disciplina),
        ano_curricular: parseInt(ano_curricular),
        semestre: semestre
      }
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: "Esta disciplina já está atribuída a este curso" }, { status: 409 })
  }
}

// DELETE /api/gestor/curriculo
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id_curso = parseInt(searchParams.get("id_curso") || "")
  const id_disciplina = parseInt(searchParams.get("id_disciplina") || "")

  if (isNaN(id_curso) || isNaN(id_disciplina)) {
    return NextResponse.json({ error: "IDs inválidos" }, { status: 400 })
  }

  await prisma.cursoDisciplina.delete({
    where: {
      id_curso_id_disciplina: {
        id_curso,
        id_disciplina
      }
    }
  })

  return NextResponse.json({ success: true })
}
