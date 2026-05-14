import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAnoLectivo } from "@/lib/sistema"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "orientador") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const cursoId = searchParams.get("cursoId")
  const ano = searchParams.get("ano")
  const semestre = searchParams.get("semestre")
  const anoLectivo = searchParams.get("ano_lectivo") || await getAnoLectivo()
  const turno = searchParams.get("turno") || ""

  // Build where clause - course/year/semester are optional
  const whereClause: any = {
    ano_lectivo: anoLectivo,
  }
  
  if (cursoId) whereClause.id_curso = parseInt(cursoId)
  if (ano) whereClause.ano_curricular = parseInt(ano)
  if (semestre) whereClause.semestre = semestre
  if (turno) whereClause.turno = turno

  const whereTurno = turno ? { turno } : {}

  // Get teacher's assigned subject IDs for this school year
  const professorDisciplinas = await prisma.professorDisciplina.findMany({
    where: {
      id_usuario: parseInt(session.user.id),
      ano_lectivo: anoLectivo
    },
    select: { id_disciplina: true }
  })
  const idsDisciplinasProfessor = professorDisciplinas.map(pd => pd.id_disciplina)

  // If teacher has no assigned subjects, return empty
  if (idsDisciplinasProfessor.length === 0) {
    return NextResponse.json({
      horarios: [],
      turnos: ["Matinal"],
      duracao: 90,
      intervalo: 10,
      professores: []
    })
  }

  // Add filter for teacher's own subjects
  whereClause.id_disciplina = { in: idsDisciplinasProfessor }

  // Get course info if cursoId is provided
  const cursoPromise = cursoId 
    ? prisma.curso.findUnique({ where: { id_curso: parseInt(cursoId) } })
    : Promise.resolve(null)

  // Query para obter turnos SEM filtro de turno (para manter o select sempre preenchido)
  const whereClauseTurnos = { ...whereClause }
  delete whereClauseTurnos.turno  // remove filtro de turno para esta query

  const [horarios, horariosParaTurnos, curso, config] = await Promise.all([
    // Query principal COM filtro de turno
    prisma.horarioAula.findMany({
      where: whereClause,
      include: { 
        disciplina: { select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true } },
        curso: { select: { id_curso: true, nome_curso: true } }
      },
      orderBy: [{ dia_semana: "asc" }, { hora_inicio: "asc" }]
    }),
    // Query para turnos SEM filtro de turno (apenas IDs para saber que turnos existem)
    prisma.horarioAula.findMany({
      where: whereClauseTurnos,
      select: { turno: true },
      distinct: ["turno"]
    }),
    cursoPromise,
    prisma.configuracaoTaxas.findUnique({ where: { id_configuracao: 1 } })
  ])

  const duracao = config?.duracao_aula_minutos || 90
  const intervalo = config?.intervalo_aula_minutos || 10

  // Extrair turnos únicos SEMPRE da query sem filtro de turno
  let turnos: string[] = ["Matinal"]
  if (curso?.turnos) {
    turnos = curso.turnos.split(",").map((t: string) => t.trim()).filter(Boolean)
  } else if (horariosParaTurnos.length > 0) {
    const turnosUnicos = [...new Set(horariosParaTurnos.map(h => h.turno).filter(Boolean))] as string[]
    if (turnosUnicos.length > 0) turnos = turnosUnicos
  }

  // Get teacher info for the subjects they teach
  const professores = await prisma.professorDisciplina.findMany({
    where: {
      id_disciplina: { in: idsDisciplinasProfessor },
      ano_lectivo: anoLectivo,
    },
    include: {
      disciplina: { select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true } },
      usuario: {
        include: {
          orientador: { select: { nome_completo: true } }
        }
      }
    }
  })

  const professoresFormatados = professores.map(p => ({
    id_disciplina: p.disciplina.id_disciplina,
    nome_disciplina: p.disciplina.nome_disciplina,
    codigo_disciplina: p.disciplina.codigo_disciplina,
    nome_professor: p.usuario?.orientador?.nome_completo || p.usuario?.nome_usuario || "—",
  }))

  return NextResponse.json({
    horarios,
    turnos,
    duracao,
    intervalo,
    professores: professoresFormatados,
  })
}