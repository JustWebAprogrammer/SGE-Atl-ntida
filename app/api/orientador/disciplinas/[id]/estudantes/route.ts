import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getAnoLectivo } from "@/lib/sistema"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "orientador") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const disciplinaId = parseInt(id)
  if (isNaN(disciplinaId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const anoLectivo = await getAnoLectivo()

  // Verificar se o orientador tem acesso a esta disciplina
  const professorDisciplina = await prisma.professorDisciplina.findFirst({
    where: {
      id_usuario: parseInt(session.user.id),
      id_disciplina: disciplinaId,
      ano_lectivo: anoLectivo
    }
  })

  if (!professorDisciplina) {
    return NextResponse.json({ error: "Disciplina não atribuída a este orientador" }, { status: 403 })
  }

  // Buscar informações da disciplina
  const disciplina = await prisma.disciplina.findUnique({
    where: { id_disciplina: disciplinaId },
    select: {
      id_disciplina: true,
      nome_disciplina: true,
      codigo_disciplina: true,
      tem_dispensa: true,
      nota_dispensa: true
    }
  })

  // Buscar notas dos estudantes nesta disciplina
  const notas = await prisma.nota.findMany({
    where: {
      id_disciplina: disciplinaId,
      ano_lectivo: anoLectivo
    },
    include: {
      estudante: {
        select: {
          id_estudante: true,
          nome_completo: true,
          numero_estudante: true
        }
      }
    },
    orderBy: {
      estudante: { nome_completo: "asc" }
    }
  })

  const estudantes = notas.map(n => {
    const notaFinal = n.nota_final != null ? Number(n.nota_final) : null

    let avaliacao_atual: "ac" | "exame" | "recurso" | "especial" | "em_curso"
    if (n.exame_especial != null) avaliacao_atual = "especial"
    else if (n.recurso != null) avaliacao_atual = "recurso"
    else if (n.exame != null) avaliacao_atual = "exame"
    else if (n.dispensada) avaliacao_atual = "ac"
    else avaliacao_atual = "em_curso"

    return {
      id_nota: n.id_nota,
      id_estudante: n.estudante.id_estudante,
      nome: n.estudante.nome_completo,
      numero_estudante: n.estudante.numero_estudante,
      ac1: n.ac1 != null ? Number(n.ac1) : null,
      ac2: n.ac2 != null ? Number(n.ac2) : null,
      ac3: n.ac3 != null ? Number(n.ac3) : null,
      ttp: n.ttp != null ? Number(n.ttp) : null,
      pp1: n.pp1 != null ? Number(n.pp1) : null,
      pp2: n.pp2 != null ? Number(n.pp2) : null,
      exame: n.exame != null ? Number(n.exame) : null,
      recurso: n.recurso != null ? Number(n.recurso) : null,
      exame_especial: n.exame_especial != null ? Number(n.exame_especial) : null,
      nota_final: notaFinal,
      dispensada: n.dispensada,
      tipo_avaliacao: n.tipo_avaliacao,
      avaliacao_atual,
      aprovado: notaFinal !== null ? notaFinal >= 10 : null
    }
  })

  return NextResponse.json({
    disciplina,
    estudantes,
    ano_lectivo: anoLectivo
  })
}
