import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getAnoLectivo, getSemestreAtual } from "@/lib/sistema"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    include: { departamento: { select: { id_departamento: true, nome_departamento: true } } }
  })

  if (!orientador) return NextResponse.json({ error: "Orientador não encontrado" }, { status: 404 })

  const anoLectivo = await getAnoLectivo()
  const semestreAtual = await getSemestreAtual()

  // Cursos no departamento do gestor
  const totalCursos = orientador.departamento
    ? await prisma.curso.count({
        where: { id_departamento: orientador.departamento.id_departamento }
      })
    : 0

  // Disciplinas sob responsabilidade (como professor)
  const totalDisciplinas = await prisma.professorDisciplina.count({
    where: { id_usuario: parseInt(session.user.id), ano_lectivo: anoLectivo }
  })

  // Buscar IDs dos estudantes tutelados (solicitacao aceite)
  const tutorias = await prisma.solicitacaoOrientacao.findMany({
    where: { id_orientador: orientador.id_orientador, estado: "Aceite" },
    select: { id_estudante: true }
  })
  const estudantesTuteladosIds = tutorias.map(t => t.id_estudante)

  // Pré-projetos para avaliar (Proposto)
  const preProjetosParaAvaliar = estudantesTuteladosIds.length > 0
    ? await prisma.premonografia.count({
        where: { id_estudante: { in: estudantesTuteladosIds }, estado: "Proposto" }
      })
    : 0

  // Monografias para avaliar (Submetida ou EmRevisao)
  const monografiasParaAvaliar = estudantesTuteladosIds.length > 0
    ? await prisma.monografia.count({
        where: {
          id_estudante: { in: estudantesTuteladosIds },
          estado: { in: ["Submetida", "EmRevisao"] }
        }
      })
    : 0

  // Monografias para marcar defesa (ParaDefender)
  const monografiasParaDefender = estudantesTuteladosIds.length > 0
    ? await prisma.monografia.count({
        where: {
          id_estudante: { in: estudantesTuteladosIds },
          estado: "ParaDefender"
        }
      })
    : 0

  // Monografias defendidas sem nota (Defendida e nota_final null)
  const monografiasSemNota = estudantesTuteladosIds.length > 0
    ? await prisma.monografia.count({
        where: {
          id_estudante: { in: estudantesTuteladosIds },
          estado: "Defendida",
          nota_final: null
        }
      })
    : 0

  return NextResponse.json({
    anoLectivo,
    semestreAtual,
    totalCursos,
    totalDisciplinas,
    preProjetosParaAvaliar,
    monografiasParaAvaliar,
    monografiasParaDefender,
    monografiasSemNota
  })
}
