import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { SERVICOS } from "@/lib/servicos-tipos"

// GET: List orientadores in the gestor's department for assignment
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const resolvedParams = await params
  const idEstudante = parseInt(resolvedParams.id)
  if (isNaN(idEstudante)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  const gestor = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true, id_departamento: true }
  })

  if (!gestor) return NextResponse.json({ error: "Gestor não encontrado" }, { status: 404 })

  // Get student info and current orientation
  const estudante = await prisma.estudante.findUnique({
    where: { id_estudante: idEstudante },
    select: {
      id_estudante: true,
      nome_completo: true,
      ano_current: true,
      curso: {
        select: {
          id_departamento: true,
          nome_curso: true,
          duracao_anos: true
        }
      },
      solicitacoes: {
        where: { estado: "Aceite" },
        include: {
          orientador: {
            select: {
              id_orientador: true,
              nome_completo: true,
              especialidade: true,
            }
          }
        }
      }
    }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  // Verify student is in gestor's department
  if (gestor.id_departamento && estudante.curso.id_departamento !== gestor.id_departamento) {
    return NextResponse.json({ error: "Estudante não pertence ao seu departamento" }, { status: 403 })
  }

  // Check tutor assignment conditions
  const motivos: string[] = []
  const ultimoAno = estudante.ano_current === estudante.curso.duracao_anos
  if (!ultimoAno) motivos.push("Estudante não está no último ano do curso")

  const taxaMonografiaPaga = await prisma.factura.findFirst({
    where: {
      id_estudante: idEstudante,
      descricao_servico: SERVICOS.TAXA_MONOGRAFIA,
      estado: "Pago"
    }
  })
  if (!taxaMonografiaPaga) motivos.push("Taxa de Monografia não foi paga")

  // Get all orientadores in the department
  const orientadores = await prisma.orientador.findMany({
    where: {
      id_departamento: gestor.id_departamento ?? undefined,
    },
    select: {
      id_orientador: true,
      nome_completo: true,
      especialidade: true,
      e_gestor: true,
    },
    orderBy: { nome_completo: "asc" }
  })

  // Current orientador (if any)
  const currentOrientacao = estudante.solicitacoes[0] || null

  return NextResponse.json({
    estudante: {
      id_estudante: estudante.id_estudante,
      nome: estudante.nome_completo,
      curso: estudante.curso.nome_curso,
      duracao_anos: estudante.curso.duracao_anos,
      ano_current: estudante.ano_current,
    },
    podeAtribuir: motivos.length === 0,
    motivosBloqueio: motivos,
    currentOrientador: currentOrientacao ? {
      id_solicitacao: currentOrientacao.id_solicitacao,
      id_orientador: currentOrientacao.orientador.id_orientador,
      nome: currentOrientacao.orientador.nome_completo,
      especialidade: currentOrientacao.orientador.especialidade,
      gestor_assigned: currentOrientacao.observacoes?.includes("GESTOR_ASSIGNED") ?? false,
    } : null,
    orientadoresDisponiveis: orientadores.map(o => ({
      id_orientador: o.id_orientador,
      nome: o.nome_completo,
      especialidade: o.especialidade,
      e_gestor: o.e_gestor,
    }))
  })
}

// POST: Assign orientador directly to student
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const resolvedParams = await params
  const idEstudante = parseInt(resolvedParams.id)
  if (isNaN(idEstudante)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  const body = await request.json()
  const { id_orientador } = body

  if (!id_orientador) {
    return NextResponse.json({ error: "id_orientador é obrigatório" }, { status: 400 })
  }

  const gestor = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true, id_departamento: true }
  })

  if (!gestor) return NextResponse.json({ error: "Gestor não encontrado" }, { status: 404 })

  // Verify the target orientador exists and is in the same department
  const targetOrientador = await prisma.orientador.findUnique({
    where: { id_orientador },
    select: { id_orientador: true, nome_completo: true, id_departamento: true }
  })

  if (!targetOrientador) {
    return NextResponse.json({ error: "Orientador não encontrado" }, { status: 404 })
  }

  // Verify student exists and is in the gestor's department
  const estudante = await prisma.estudante.findUnique({
    where: { id_estudante: idEstudante },
    include: {
      curso: { select: { id_departamento: true, nome_curso: true, duracao_anos: true } }
    }
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  if (gestor.id_departamento && estudante.curso.id_departamento !== gestor.id_departamento) {
    return NextResponse.json({ error: "Estudante não pertence ao seu departamento" }, { status: 403 })
  }

  // Gate: Check if student is in last year of course
  if (estudante.ano_current !== estudante.curso.duracao_anos) {
    return NextResponse.json({ error: "Estudante deve estar no último ano do curso para receber orientador" }, { status: 400 })
  }

  // Gate: Check if Taxa de Monografia has been paid
  const taxaMonografiaPaga = await prisma.factura.findFirst({
    where: {
      id_estudante: idEstudante,
      descricao_servico: SERVICOS.TAXA_MONOGRAFIA,
      estado: "Pago"
    }
  })
  if (!taxaMonografiaPaga) {
    return NextResponse.json({ error: "Estudante deve ter a Taxa de Monografia paga para receber orientador" }, { status: 400 })
  }

  // Use a transaction to ensure consistency
  const result = await prisma.$transaction(async (tx) => {
    // 1. Deny all existing pending/accepted requests for this student
    await tx.solicitacaoOrientacao.updateMany({
      where: {
        id_estudante: idEstudante,
        estado: { in: ["Pendente", "Aceite"] },
      },
      data: { estado: "Recusado" }
    })

    // 2. Create new solicitation with Aceite status (gestor-assigned)
    const novaSolicitacao = await tx.solicitacaoOrientacao.create({
      data: {
        id_estudante: idEstudante,
        id_orientador,
        data_solicitacao: new Date(),
        estado: "Aceite",
        observacoes: `GESTOR_ASSIGNED:id_gestor=${gestor.id_orientador}`,
      }
    })

    // 3. Link orientador to student's monografia
    const monografia = await tx.monografia.findFirst({
      where: { id_estudante: idEstudante }
    })
    if (monografia) {
      await tx.monografia.update({
        where: { id_monografia: monografia.id_monografia },
        data: { id_orientador }
      })
    }

    return novaSolicitacao
  })

  // 4. Log to audit system
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "GESTOR_ATRIBUIR_ORIENTADOR",
      tabela: "SolicitacaoOrientacao",
      id_registro: result.id_solicitacao,
      valor_antes: null,
      valor_depois: {
        id_estudante: idEstudante,
        nome_estudante: estudante.nome_completo,
        id_orientador,
        nome_orientador: targetOrientador.nome_completo,
      },
      ip_address: ip,
    })
  } catch (err) {
    console.error("Erro ao registrar audit log:", err)
  }

  return NextResponse.json({
    id_solicitacao: result.id_solicitacao,
    estado: result.estado,
    orientador: {
      id_orientador: targetOrientador.id_orientador,
      nome: targetOrientador.nome_completo,
    }
  })
}

// DELETE: Remove orientador from student
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const resolvedParams = await params
  const idEstudante = parseInt(resolvedParams.id)
  if (isNaN(idEstudante)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  const gestor = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true, id_departamento: true }
  })

  if (!gestor) return NextResponse.json({ error: "Gestor não encontrado" }, { status: 404 })

  // Verify student exists and is in gestor's department
  const estudante = await prisma.estudante.findUnique({
    where: { id_estudante: idEstudante },
    include: {
      curso: { select: { id_departamento: true } }
    }
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  if (gestor.id_departamento && estudante.curso.id_departamento !== gestor.id_departamento) {
    return NextResponse.json({ error: "Estudante não pertence ao seu departamento" }, { status: 403 })
  }

  // Find current accepted solicitation
  const currentSolicitacao = await prisma.solicitacaoOrientacao.findFirst({
    where: {
      id_estudante: idEstudante,
      estado: "Aceite",
    }
  })

  if (!currentSolicitacao) {
    return NextResponse.json({ error: "Estudante não tem orientador atribuído" }, { status: 404 })
  }

  const orientadorAnterior = currentSolicitacao.id_orientador

  // Use transaction to ensure consistency
  await prisma.$transaction(async (tx) => {
    // 1. Cancel the accepted solicitation
    await tx.solicitacaoOrientacao.update({
      where: { id_solicitacao: currentSolicitacao.id_solicitacao },
      data: { estado: "Cancelado" }
    })

    // 2. Remove orientador from monografia
    const monografia = await tx.monografia.findFirst({
      where: { id_estudante: idEstudante }
    })
    if (monografia && monografia.id_orientador === orientadorAnterior) {
      await tx.monografia.update({
        where: { id_monografia: monografia.id_monografia },
        data: { id_orientador: null }
      })
    }
  })

  // 3. Log to audit system
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "GESTOR_REMOVER_ORIENTADOR",
      tabela: "SolicitacaoOrientacao",
      id_registro: currentSolicitacao.id_solicitacao,
      valor_antes: { estado: "Aceite", id_orientador: orientadorAnterior },
      valor_depois: { estado: "Cancelado" },
      ip_address: ip,
    })
  } catch (err) {
    console.error("Erro ao registrar audit log:", err)
  }

  return NextResponse.json({ success: true })
}