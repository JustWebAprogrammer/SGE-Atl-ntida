import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { getAnoLectivo, getSemestreAtual } from "@/lib/sistema"
import { Semestre } from "@prisma/client"

// GET: Listar todos os professores desta disciplina
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isGestor = session.user.role === "orientador" && session.user.e_gestor === true
  const isAdmin = session.user.role === "admin"

  if (!isGestor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id_disciplina = parseInt(id)
  const anoLectivoAtual = await getAnoLectivo()
  const semestreAtual = await getSemestreAtual()

  try {
    const professores = await prisma.professorDisciplina.findMany({
      where: {
        id_disciplina,
        ano_lectivo: anoLectivoAtual,
        semestre: semestreAtual
      },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome_usuario: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(professores)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao carregar professores" }, { status: 500 })
  }
}

// POST: Adicionar professor à disciplina
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isGestor = session.user.role === "orientador" && session.user.e_gestor === true
  const isAdmin = session.user.role === "admin"

  if (!isGestor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id_disciplina = parseInt(id)
  const body = await request.json()
  const { id_usuario } = body
  const anoLectivoAtual = await getAnoLectivo()
  const semestreAtual = await getSemestreAtual()

  if (!id_usuario) {
    return NextResponse.json({ error: "id_usuario é obrigatório" }, { status: 400 })
  }

  try {
    // Snapshot of current professors before change (for audit)
    const professoresAntes = await prisma.professorDisciplina.findMany({
      where: {
        id_disciplina,
        ano_lectivo: anoLectivoAtual,
        semestre: semestreAtual
      },
      select: { id_usuario: true }
    })

    // APAGAR TODOS os professores existentes desta disciplina no semestre actual (só pode haver um)
    await prisma.professorDisciplina.deleteMany({
      where: {
        id_disciplina,
        ano_lectivo: anoLectivoAtual,
        semestre: semestreAtual
      }
    })

    const professorDisciplina = await prisma.professorDisciplina.create({
      data: {
        id_usuario,
        id_disciplina,
        ano_lectivo: anoLectivoAtual,
        semestre: semestreAtual
      },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome_usuario: true,
            email: true
          }
        }
      }
    })

    // Audit log — include human-readable discipline name
    const discInfo = await prisma.disciplina.findUnique({
      where: { id_disciplina },
      select: { nome_disciplina: true, codigo_disciplina: true }
    })
    const ip_address = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "ATRIBUIR PROFESSOR",
      tabela: "ProfessorDisciplina",
      id_registro: professorDisciplina.id,
      valor_antes: professoresAntes.length > 0 ? { professores_anteriores: professoresAntes } : null,
      valor_depois: {
        nome_professor: professorDisciplina.usuario.nome_usuario,
        nome_disciplina: discInfo?.nome_disciplina ?? `ID:${id_disciplina}`,
        codigo_disciplina: discInfo?.codigo_disciplina ?? null,
        ano_lectivo: anoLectivoAtual
      },
      ip_address
    })

    return NextResponse.json(professorDisciplina)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao adicionar professor" }, { status: 500 })
  }
}

// DELETE: Remover professor da disciplina
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isGestor = session.user.role === "orientador" && session.user.e_gestor === true
  const isAdmin = session.user.role === "admin"

  if (!isGestor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id_disciplina = parseInt(id)
  const body = await request.json()
  const { id_usuario } = body
  const anoLectivoAtual = await getAnoLectivo()
  const semestreAtual = await getSemestreAtual()

  try {
    // Snapshot before delete for audit
    const professorAntes = await prisma.professorDisciplina.findFirst({
      where: {
        id_usuario,
        id_disciplina,
        ano_lectivo: anoLectivoAtual,
        semestre: semestreAtual
      },
      include: {
        usuario: { select: { nome_usuario: true } }
      }
    })

    await prisma.professorDisciplina.deleteMany({
      where: {
        id_usuario,
        id_disciplina,
        ano_lectivo: anoLectivoAtual,
        semestre: semestreAtual
      }
    })

    // Audit log — include human-readable discipline name
    if (professorAntes) {
      const discInfo = await prisma.disciplina.findUnique({
        where: { id_disciplina },
        select: { nome_disciplina: true, codigo_disciplina: true }
      })
      const ip_address = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
      await logAudit({
        id_usuario: parseInt(session.user.id),
        acao: "REMOVER PROFESSOR",
        tabela: "ProfessorDisciplina",
        id_registro: professorAntes.id,
        valor_antes: {
          nome_professor: professorAntes.usuario.nome_usuario,
          nome_disciplina: discInfo?.nome_disciplina ?? `ID:${id_disciplina}`,
          codigo_disciplina: discInfo?.codigo_disciplina ?? null,
          ano_lectivo: anoLectivoAtual
        },
        valor_depois: null,
        ip_address
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao remover professor" }, { status: 500 })
  }
}