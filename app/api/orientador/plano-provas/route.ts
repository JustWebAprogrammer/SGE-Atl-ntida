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

  // Build where clause - all filters are optional
  const whereClause: any = {
    ano_lectivo: anoLectivo,
  }

  if (cursoId) whereClause.id_curso = parseInt(cursoId)
  if (ano) whereClause.ano_curricular = parseInt(ano)
  if (semestre) whereClause.semestre = semestre
  if (turno) whereClause.turno = turno

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
    return NextResponse.json({ provas: [], turnos: ["Matinal"] })
  }

  // Add filter for teacher's own subjects
  whereClause.id_disciplina = { in: idsDisciplinasProfessor }

  // Query para turnos SEM filtro de turno (para manter o select sempre preenchido)
  const whereClauseTurnos = { ...whereClause }
  delete whereClauseTurnos.turno

  const [provasRaw, provasParaTurnos] = await Promise.all([
    // Query principal COM filtro de turno
    prisma.planoProva.findMany({
      where: whereClause,
      include: {
        disciplina: {
          select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true },
        },
      },
      orderBy: { data_prova: "asc" },
    }),
    // Query para turnos SEM filtro de turno
    prisma.planoProva.findMany({
      where: whereClauseTurnos,
      select: { turno: true },
      distinct: ["turno"]
    }),
  ])

  // Force data_prova to local yyyy-mm-dd string
  const provas = provasRaw.map((p) => ({
    ...p,
    data_prova: `${p.data_prova.getFullYear()}-${String(p.data_prova.getMonth() + 1).padStart(2, "0")}-${String(p.data_prova.getDate()).padStart(2, "0")}`,
  }))

  // Extrair turnos únicos
  let turnos: string[] = ["Matinal"]
  if (provasParaTurnos.length > 0) {
    const turnosUnicos = [...new Set(provasParaTurnos.map(p => p.turno).filter(Boolean))] as string[]
    if (turnosUnicos.length > 0) turnos = turnosUnicos
  }

  return NextResponse.json({ provas, turnos })
}