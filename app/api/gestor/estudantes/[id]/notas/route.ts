import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const id_estudante = parseInt(id)
  if (isNaN(id_estudante)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { id_disciplina, ano_lectivo, semestre } = body

    if (!id_disciplina || !ano_lectivo || !semestre) {
      return NextResponse.json({ error: "Campos obrigatórios: id_disciplina, ano_lectivo, semestre" }, { status: 400 })
    }

    // Verificar se já existe uma nota para esta disciplina + estudante + ano_lectivo
    const notaExistente = await prisma.nota.findFirst({
      where: {
        id_estudante,
        id_disciplina,
        ano_lectivo,
      },
    })

    if (notaExistente) {
      // Já existe — devolver o id_nota existente
      return NextResponse.json({ id_nota: notaExistente.id_nota, created: false })
    }

    // Criar nota em branco
    const nota = await prisma.nota.create({
      data: {
        id_estudante,
        id_disciplina,
        ano_lectivo,
        semestre,
        ac1: null,
        ac2: null,
        ac3: null,
        ttp: null,
        pp1: null,
        pp2: null,
        exame: null,
        recurso: null,
        exame_especial: null,
        nota_final: null,
        dispensada: false,
        tipo_avaliacao: "Normal",
      },
    })

    return NextResponse.json({ id_nota: nota.id_nota, created: true })
  } catch (error) {
    console.error("Erro ao criar nota:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}