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
  if (!session) return NextResponse.json({ error: "Unauthorized", estudantes: [] }, { status: 401 })
  
  // Gestor (orientador com e_gestor=true) ou admin podem acessar
  const isGestor = session.user.role === "orientador" && session.user.e_gestor === true
  const isAdmin = session.user.role === "admin"
  
  if (!isGestor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden: Acesso restrito ao gestor ou admin", estudantes: [] }, { status: 403 })
  }

  const resolvedParams = await params
  const disciplinaId = parseInt(resolvedParams.id)
  if (isNaN(disciplinaId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const anoLectivo = await getAnoLectivo()

  // Obter parâmetros de query: cursoId e turno
  const url = new URL(request.url)
  const cursoIdQuery = url.searchParams.get("cursoId")
  const cursoId = cursoIdQuery ? parseInt(cursoIdQuery) : null
  const turnoQuery = url.searchParams.get("turno")

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

  if (!disciplina) {
    return NextResponse.json({ disciplina: null, estudantes: [], ano_lectivo: anoLectivo })
  }

  // Buscar professor/orientador da disciplina
  const professorDisciplina = await prisma.professorDisciplina.findFirst({
    where: {
      id_disciplina: disciplinaId,
      ano_lectivo: anoLectivo
    },
    include: {
      usuario: {
        select: {
          nome_usuario: true
        }
      }
    }
  })

  const orientador = professorDisciplina?.usuario?.nome_usuario || null

  // Get the discipline's year placements in the curriculum
  let curriculoPlacements = await prisma.cursoDisciplina.findMany({
    where: { id_disciplina: disciplinaId },
    select: { ano_curricular: true, id_curso: true }
  })

  // ── RESTRIÇÃO DE DEPARTAMENTO ──
  // Se for gestor (não admin), filtrar apenas cursos do departamento do gestor
  if (isGestor) {
    const gestor = await prisma.orientador.findUnique({
      where: { id_usuario: parseInt(session.user.id) },
      select: { id_departamento: true }
    })

    if (gestor?.id_departamento) {
      // Buscar IDs dos cursos que pertencem ao departamento do gestor
      const cursosDoDepartamento = await prisma.curso.findMany({
        where: { id_departamento: gestor.id_departamento },
        select: { id_curso: true }
      })
      const cursoIds = cursosDoDepartamento.map(c => c.id_curso)

      // Filtrar apenas placements que pertencem ao departamento do gestor
      curriculoPlacements = curriculoPlacements.filter(cp => cursoIds.includes(cp.id_curso))
    }
  }

  // Build filter for students based on course + year
  let studentFilter: any = {}
  
  if (cursoId) {
    const placement = curriculoPlacements.find(cp => cp.id_curso === cursoId)
    if (placement) {
      studentFilter = {
        id_curso: cursoId,
        ano_current: placement.ano_curricular
      }
    } else {
      return NextResponse.json({
        disciplina,
        orientador,
        estudantes: [],
        ano_lectivo: anoLectivo
      })
    }
  } else {
    const orFilters = curriculoPlacements.map(vp => ({
      id_curso: vp.id_curso,
      ano_current: vp.ano_curricular
    }))
    if (orFilters.length > 0) {
      studentFilter = { OR: orFilters }
    }
  }

  const estudanteWhere: any = {
    estado: "EmCurso",
    ...studentFilter
  }
  if (turnoQuery) {
    estudanteWhere.turno = turnoQuery
  }

  const notas = await prisma.nota.findMany({
    where: {
      id_disciplina: disciplinaId,
      ano_lectivo: anoLectivo,
      estudante: estudanteWhere
    },
    include: {
      estudante: {
        select: {
          id_estudante: true,
          nome_completo: true,
          numero_estudante: true,
          turno: true
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
      turno: n.estudante.turno,
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
    orientador,
    estudantes,
    ano_lectivo: anoLectivo
  })
}