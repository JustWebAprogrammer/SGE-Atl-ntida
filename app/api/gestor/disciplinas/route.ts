import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getAnoLectivo } from "@/lib/sistema"
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const anoLectivoAtual = await getAnoLectivo()

  // Obter parâmetros de query: cursoId, turno, professorId
  const url = new URL(request.url)
  const cursoIdFiltro = url.searchParams.get("cursoId") ? parseInt(url.searchParams.get("cursoId")!) : null
  const turnoFiltro = url.searchParams.get("turno")
  const professorIdFiltro = url.searchParams.get("professorId") ? parseInt(url.searchParams.get("professorId")!) : null

  // Get the gestor's department from the Orientador record
  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_departamento: true }
  })

  if (!orientador?.id_departamento) {
    return NextResponse.json({ error: "Gestor sem departamento atribuído" }, { status: 400 })
  }

  const idDepartamentoGestor = orientador.id_departamento

  // Get all courses in the gestor's department
  const cursos = await prisma.curso.findMany({
    where: { id_departamento: idDepartamentoGestor },
    select: { id_curso: true, nome_curso: true, duracao_anos: true }
  })

  const cursoIds = cursos.map(c => c.id_curso)

  // If filtering by professor, first get the discipline IDs assigned to that professor
  let disciplinaIdsFiltro: number[] | null = null
  if (professorIdFiltro) {
    const professorDisciplinas = await prisma.professorDisciplina.findMany({
      where: {
        id_usuario: professorIdFiltro,
        ano_lectivo: anoLectivoAtual
      },
      select: { id_disciplina: true }
    })
    disciplinaIdsFiltro = professorDisciplinas.map(pd => pd.id_disciplina)
  }

  // Get all CursoDisciplina entries for the department's courses
  // If professorId filter is active, restrict to that professor's disciplines
  const curriculoWhere: any = {
    id_curso: { in: cursoIds }
  }
  if (disciplinaIdsFiltro !== null) {
    curriculoWhere.id_disciplina = { in: disciplinaIdsFiltro }
  }

  const curriculo = await prisma.cursoDisciplina.findMany({
    where: curriculoWhere,
    include: {
      disciplina: {
        include: {
          departamento: { select: { nome_departamento: true } }
        }
      },
      curso: {
        select: { id_curso: true, nome_curso: true, duracao_anos: true }
      }
    },
    orderBy: [
      { ano_curricular: "asc" },
      { semestre: "asc" },
      { disciplina: { nome_disciplina: "asc" } }
    ]
  })

  // Group by discipline to avoid duplicates
  const disciplinaMap = new Map<number, any>()

  for (const item of curriculo) {
    const discId = item.disciplina.id_disciplina

    if (!disciplinaMap.has(discId)) {
      disciplinaMap.set(discId, {
        id: discId,
        nome: item.disciplina.nome_disciplina,
        codigo: item.disciplina.codigo_disciplina,
        creditos: item.disciplina.creditos,
        id_departamento: item.disciplina.id_departamento,
        departamento: item.disciplina.departamento.nome_departamento,
        cursos: []
      })
    }

    const entry = disciplinaMap.get(discId)
    const alreadyExists = entry.cursos.some(
      (c: any) => c.id_curso === item.curso.id_curso
        && c.ano_curricular === item.ano_curricular
        && c.semestre === item.semestre
    )
    if (!alreadyExists) {
      entry.cursos.push({
        id_curso: item.curso.id_curso,
        nome_curso: item.curso.nome_curso,
        duracao_anos: item.curso.duracao_anos,
        ano_curricular: item.ano_curricular,
        semestre: item.semestre
      })
    }
  }

  // For each discipline, also load assigned professors
  const disciplinaIds = Array.from(disciplinaMap.keys())
  const professorAssignments = await prisma.professorDisciplina.findMany({
    where: {
      id_disciplina: { in: disciplinaIds },
      ano_lectivo: anoLectivoAtual
    },
    include: {
      usuario: {
        select: {
          id_usuario: true,
          nome_usuario: true
        }
      }
    }
  })

  // Build a map: disciplineId -> [{ id_usuario, nome }]
  const professoresPorDisciplina = new Map<number, { id_usuario: number; nome: string }[]>()
  for (const pa of professorAssignments) {
    if (!professoresPorDisciplina.has(pa.id_disciplina)) {
      professoresPorDisciplina.set(pa.id_disciplina, [])
    }
    professoresPorDisciplina.get(pa.id_disciplina)!.push({
      id_usuario: pa.id_usuario,
      nome: pa.usuario.nome_usuario
    })
  }

  // Count active students per discipline, filtered by course+year+turno placements
  const disciplinasComContagem = await Promise.all(
    Array.from(disciplinaMap.values()).map(async (d) => {
      // Build filter conditions considering cursoId and turno filters
      let estudanteWhere: any = { estado: "EmCurso" }

      if (cursoIdFiltro) {
        // Filter by specific course only
        const placement = d.cursos.find((c: any) => c.id_curso === cursoIdFiltro)
        if (placement) {
          estudanteWhere.id_curso = cursoIdFiltro
          estudanteWhere.ano_current = placement.ano_curricular
        } else {
          // Discipline not in this course — count is 0
          const duracaoMaxima = d.cursos.length > 0
            ? Math.max(...d.cursos.map((c: any) => c.duracao_anos || 6))
            : 6
          return {
            ...d,
            professores: professoresPorDisciplina.get(d.id) || [],
            total_estudantes: 0,
            duracao_maxima: duracaoMaxima
          }
        }
      } else {
        // No specific course: use OR between all placements
        const orConditions = d.cursos.map((c: any) => ({
          id_curso: c.id_curso,
          ano_current: c.ano_curricular
        }))
        if (orConditions.length > 0) {
          estudanteWhere.OR = orConditions
        }
      }

      // Add turno filter if specified
      if (turnoFiltro) {
        estudanteWhere.turno = turnoFiltro
      }

      const totalEstudantes = await prisma.nota.count({
        where: {
          id_disciplina: d.id,
          ano_lectivo: anoLectivoAtual,
          estudante: estudanteWhere
        }
      })

      const duracaoMaxima = d.cursos.length > 0
        ? Math.max(...d.cursos.map((c: any) => c.duracao_anos || 6))
        : 6

      return {
        ...d,
        professores: professoresPorDisciplina.get(d.id) || [],
        total_estudantes: totalEstudantes,
        duracao_maxima: duracaoMaxima
      }
    })
  )

  return NextResponse.json({
    disciplinas: disciplinasComContagem,
    ano_lectivo: anoLectivoAtual,
    id_departamento_gestor: idDepartamentoGestor
  })
}