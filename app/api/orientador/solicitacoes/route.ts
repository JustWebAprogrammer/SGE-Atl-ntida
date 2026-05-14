import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse, NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "orientador") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true, id_departamento: true }
  })

  if (!orientador) return NextResponse.json({ error: "Orientador não encontrado" }, { status: 404 })

  // Parse filter params
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get("search") || ""
  const cursoId = searchParams.get("cursoId") ? parseInt(searchParams.get("cursoId")!) : null
  const turno = searchParams.get("turno") || ""

  // Build where clause: only requests from students in the orientador's department
  const where: Record<string, unknown> = {
    id_orientador: orientador.id_orientador,
  }

  // Add student name search filter
  const studentFilter: Record<string, unknown>[] = []
  if (search) {
    studentFilter.push({
      estudante: {
        nome_completo: { contains: search, mode: "insensitive" }
      }
    })
  }
  if (cursoId) {
    studentFilter.push({
      estudante: { id_curso: cursoId }
    })
  }
  if (turno) {
    studentFilter.push({
      estudante: { turno }
    })
  }

  // Only apply department filter if orientador has a department
  if (orientador.id_departamento) {
    studentFilter.push({
      estudante: {
        curso: {
          id_departamento: orientador.id_departamento
        }
      }
    })
  }

  if (studentFilter.length > 0) {
    // We need AND because all conditions must hold simultaneously.
    // Each filter is an AND condition.
    where.AND = studentFilter.map(f => f)
  }

  const solicitacoes = await prisma.solicitacaoOrientacao.findMany({
    where,
    include: {
      estudante: {
        select: {
          id_estudante: true,
          nome_completo: true,
          numero_estudante: true,
          ano_current: true,
          turno: true,
          curso: {
            select: {
              id_curso: true,
              nome_curso: true
            }
          }
        }
      }
    },
    orderBy: { data_solicitacao: "desc" }
  })

  const solicitacoesFormatadas = solicitacoes.map(s => ({
    id_solicitacao: s.id_solicitacao,
    estudante: {
      id_estudante: s.estudante.id_estudante,
      nome: s.estudante.nome_completo,
      numero_estudante: s.estudante.numero_estudante,
      curso: s.estudante.curso.nome_curso,
      id_curso: s.estudante.curso.id_curso,
      ano_current: s.estudante.ano_current,
      turno: s.estudante.turno,
    },
    data_solicitacao: s.data_solicitacao,
    estado: s.estado,
    observacoes: s.observacoes,
    gestor_assigned: s.observacoes?.includes("GESTOR_ASSIGNED") ?? false,
  }))

  // Also fetch available courses and turnos for the filter dropdowns
  const cursosDoDepartamento = orientador.id_departamento
    ? await prisma.curso.findMany({
        where: { id_departamento: orientador.id_departamento },
        select: { id_curso: true, nome_curso: true, turnos: true },
        orderBy: { nome_curso: "asc" }
      })
    : []

  // Extract unique turnos from courses
  const turnosSet = new Set<string>()
  for (const c of cursosDoDepartamento) {
    if (c.turnos) {
      c.turnos.split(",").map(t => t.trim()).filter(Boolean).forEach(t => turnosSet.add(t))
    }
  }

  return NextResponse.json({
    solicitacoes: solicitacoesFormatadas,
    cursos: cursosDoDepartamento.map(c => ({ id_curso: c.id_curso, nome_curso: c.nome_curso })),
    turnos: Array.from(turnosSet).sort()
  })
}
