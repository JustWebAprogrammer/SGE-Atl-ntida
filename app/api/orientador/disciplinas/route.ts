import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getAnoLectivo, getSemestreAtual } from "@/lib/sistema"
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "orientador") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true }
  })

  if (!orientador) return NextResponse.json({ error: "Orientador não encontrado" }, { status: 404 })

  // Parse query params for filtering
  const url = new URL(request.url)
  const cursoIdFiltro = url.searchParams.get("cursoId") ? parseInt(url.searchParams.get("cursoId")!) : null
  const turnoFiltro = url.searchParams.get("turno")

  const anoLectivoAtual = await getAnoLectivo()
  const semestreAtual = await getSemestreAtual()

  const disciplinas = await prisma.professorDisciplina.findMany({
    where: {
      id_usuario: parseInt(session.user.id),
      ano_lectivo: anoLectivoAtual,
      semestre: semestreAtual
    },
    include: {
      disciplina: {
        include: {
          cursos: {
            include: {
              curso: {
                select: {
                  id_curso: true,
                  nome_curso: true,
                  duracao_anos: true
                }
              }
            }
          }
        }
      }
    }
  })

  // Contar estudantes por disciplina, aplicando filtros de curso e turno (sem restrição de departamento)
  const disciplinasComContagem = await Promise.all(
    disciplinas.map(async (pd) => {
      // Build the estudante filter based on discipline placements and query params
      let estudanteWhere: any = {}

      // Get all placements for this discipline (no department filter — professor sees all students)
      const placements = pd.disciplina.cursos.map(cd => ({
        id_curso: cd.curso.id_curso,
        ano_curricular: cd.ano_curricular
      }))

      if (cursoIdFiltro) {
        // Specific course filter: find matching placement
        const placement = placements.find(p => p.id_curso === cursoIdFiltro)
        if (placement) {
          estudanteWhere.id_curso = cursoIdFiltro
          estudanteWhere.ano_current = placement.ano_curricular
        } else {
          // Discipline not in this course — count is 0
          const cursos = pd.disciplina.cursos.map(cd => ({
            id_curso: cd.curso.id_curso,
            nome_curso: cd.curso.nome_curso,
            duracao_anos: cd.curso.duracao_anos,
            ano_curricular: cd.ano_curricular,
            semestre: cd.semestre
          }))
          const duracaoMaxima = cursos.length > 0
            ? Math.max(...cursos.map(c => c.duracao_anos || 6))
            : 6
          return {
            id: pd.disciplina.id_disciplina,
            nome: pd.disciplina.nome_disciplina,
            codigo: pd.disciplina.codigo_disciplina,
            creditos: pd.disciplina.creditos,
            total_estudantes: 0,
            cursos,
            duracao_maxima: duracaoMaxima
          }
        }
      } else {
        // No specific course: use OR between all placements
        const orConditions = placements.map(p => ({
          id_curso: p.id_curso,
          ano_current: p.ano_curricular
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
          id_disciplina: pd.disciplina.id_disciplina,
          ano_lectivo: anoLectivoAtual,
          estudante: estudanteWhere
        }
      })

      const cursos = pd.disciplina.cursos.map(cd => ({
        id_curso: cd.curso.id_curso,
        nome_curso: cd.curso.nome_curso,
        duracao_anos: cd.curso.duracao_anos,
        ano_curricular: cd.ano_curricular,
        semestre: cd.semestre
      }))

      // Duração máxima entre todos os cursos
      const duracaoMaxima = cursos.length > 0
        ? Math.max(...cursos.map(c => c.duracao_anos || 6))
        : 6

      return {
        id: pd.disciplina.id_disciplina,
        nome: pd.disciplina.nome_disciplina,
        codigo: pd.disciplina.codigo_disciplina,
        creditos: pd.disciplina.creditos,
        total_estudantes: totalEstudantes,
        cursos,
        duracao_maxima: duracaoMaxima
      }
    })
  )

  // Ordenar: primeiro ano_curricular mais baixo dos cursos, depois semestre, depois nome
  disciplinasComContagem.sort((a, b) => {
    const anoA = a.cursos.length > 0 ? Math.min(...a.cursos.map(c => c.ano_curricular)) : 1
    const anoB = b.cursos.length > 0 ? Math.min(...b.cursos.map(c => c.ano_curricular)) : 1
    if (anoA !== anoB) return anoA - anoB

    const semA = a.cursos.length > 0 ? a.cursos[0].semestre : 'S1'
    const semB = b.cursos.length > 0 ? b.cursos[0].semestre : 'S1'
    if (semA !== semB) return semA.localeCompare(semB)

    return a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' })
  })

  return NextResponse.json({
    disciplinas: disciplinasComContagem,
    ano_lectivo: anoLectivoAtual
  })
}