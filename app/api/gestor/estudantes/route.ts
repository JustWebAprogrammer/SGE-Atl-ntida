import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { getAnoLectivo } from "@/lib/sistema"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const curso = searchParams.get("curso")
  const ano = searchParams.get("ano")
  const pesquisa = searchParams.get("pesquisa")
  const tipoPesquisa = searchParams.get("tipoPesquisa") // "numero" ou "nome"

  const anoLectivoAtual = await getAnoLectivo()

  // Get the gestor's department from the Orientador record
  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_departamento: true }
  })

  if (!orientador?.id_departamento) {
    return NextResponse.json({ error: "Gestor sem departamento atribuído" }, { status: 400 })
  }

  // Get all course IDs belonging to the gestor's department
  const cursosDoDepartamento = await prisma.curso.findMany({
    where: { id_departamento: orientador.id_departamento },
    select: { id_curso: true }
  })
  const cursoIds = cursosDoDepartamento.map(c => c.id_curso)

  // Construir where dinâmico
  const where: Prisma.EstudanteWhereInput = {
    // Restrict to courses in the gestor's department
    id_curso: { in: cursoIds }
  }

  // Filtro por curso
  if (curso) {
    where.curso = { nome_curso: curso }
  }

  // Filtro por ano
  if (ano) {
    where.ano_current = parseInt(ano)
  }

  // Filtro por pesquisa (número ou nome)
  if (pesquisa) {
    if (tipoPesquisa === "numero") {
      where.numero_estudante = { contains: pesquisa, mode: "insensitive" }
    } else {
      where.nome_completo = { contains: pesquisa, mode: "insensitive" }
    }
  }

  // Buscar todos os estudantes com suas notas do ano atual
  const estudantes = await prisma.estudante.findMany({
    where,
    include: {
      curso: {
        select: {
          nome_curso: true,
          departamento: {
            select: {
              nome_departamento: true
            }
          }
        }
      },
      notas: {
        where: { ano_lectivo: anoLectivoAtual },
        include: {
          disciplina: {
            select: {
              id_disciplina: true,
              nome_disciplina: true,
              codigo_disciplina: true,
              ano_curricular: true,
              semestre: true
            }
          }
        }
      }
    },
    orderBy: { nome_completo: "asc" }
  })

  const estudantesFormatados = estudantes.map(e => {
    const notasFormatadas = e.notas.map(n => ({
      id_nota: n.id_nota,
      id_disciplina: n.disciplina.id_disciplina,
      disciplina: n.disciplina.nome_disciplina,
      codigo: n.disciplina.codigo_disciplina,
      ano_curricular: n.disciplina.ano_curricular,
      semestre: n.disciplina.semestre,
      nota_final: n.nota_final != null ? Number(n.nota_final) : null,
      dispensada: n.dispensada,
      tipo_avaliacao: n.tipo_avaliacao,
      aprovado: n.nota_final != null ? Number(n.nota_final) >= 10 : null
    }))

    return {
      id_estudante: e.id_estudante,
      nome: e.nome_completo,
      numero_estudante: e.numero_estudante,
      turno: e.turno,
      ano_current: e.ano_current,
      estado: e.estado,
      pagamento: e.pagamento,
      curso: e.curso.nome_curso,
      departamento: e.curso.departamento.nome_departamento,
      notas: notasFormatadas
    }
  })

  return NextResponse.json({
    estudantes: estudantesFormatados,
    ano_lectivo: anoLectivoAtual
  })
}