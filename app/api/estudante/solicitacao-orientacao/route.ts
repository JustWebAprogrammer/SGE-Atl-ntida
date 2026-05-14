import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "estudante") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: {
      id_estudante: true,
      ano_current: true,
      pagamento: true,
      curso: {
        select: { duracao_anos: true }
      }
    }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  // Buscar solicitação de orientação existente
  const solicitacao = await prisma.solicitacaoOrientacao.findFirst({
    where: { id_estudante: estudante.id_estudante },
    include: {
      orientador: {
        select: {
          nome_completo: true,
          especialidade: true,
        }
      }
    },
    orderBy: { data_solicitacao: "desc" }
  })

  // Buscar orientadores disponíveis
  const orientadores = await prisma.orientador.findMany({
    select: {
      id_orientador: true,
      nome_completo: true,
      especialidade: true,
    }
  })

  const duracaoAnos = estudante.curso?.duracao_anos ?? 4

  return NextResponse.json({
    isFinalista: estudante.ano_current === duracaoAnos,
    duracao_anos: duracaoAnos,
    pagamentoEstado: estudante.pagamento,
    solicitacao: solicitacao ? {
      id_solicitacao: solicitacao.id_solicitacao,
      orientador: solicitacao.orientador,
      data_solicitacao: solicitacao.data_solicitacao,
      estado: solicitacao.estado,
      observacoes: solicitacao.observacoes,
    } : null,
    orientadores,
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "estudante") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: {
      id_estudante: true,
      ano_current: true,
      pagamento: true,
      curso: {
        select: { duracao_anos: true }
      }
    }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  // Verificar se está no último ano do curso
  const ultimoAno = estudante.curso?.duracao_anos ?? 4
  if (estudante.ano_current !== ultimoAno) {
    return NextResponse.json({ error: `Solicitação de orientação só disponível para estudantes do ${ultimoAno}º ano` }, { status: 400 })
  }

  // Verificar se propina está paga (mas finalistas podem não ter propina mensal)
  // Nota: finalistas não pagam propinas mensais, só a taxa de monografia
  if (estudante.ano_current !== ultimoAno && estudante.pagamento !== "Pago") {
    return NextResponse.json({ error: "Precisa de estar com a propina em dia para solicitar orientação" }, { status: 400 })
  }

  // Validar: todas as disciplinas devem estar aprovadas
  const notasReprovadas = await prisma.nota.findMany({
    where: {
      id_estudante: estudante.id_estudante,
      dispensada: false,
      nota_final: { lt: 10 },
    },
    select: {
      nota_final: true,
      disciplina: {
        select: {
          nome_disciplina: true,
          codigo_disciplina: true,
        },
      },
    },
  })

  if (notasReprovadas.length > 0) {
    const nomesDisciplinas = notasReprovadas
      .map((n) => `${n.disciplina.nome_disciplina} (${n.disciplina.codigo_disciplina})`)
      .join(", ")
    return NextResponse.json({
      error: `Não pode solicitar orientação. Tem disciplinas sem nota de aprovação: ${nomesDisciplinas}. Precisa de aprovar todas as disciplinas antes de prosseguir.`,
    }, { status: 400 })
  }

  // Verificar se tem pré-projecto aprovado (gestor deve aprovar primeiro)
  const premonografiaAprovada = await prisma.premonografia.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      estado: "Aprovado"
    }
  })

  if (!premonografiaAprovada) {
    return NextResponse.json({ error: "Precisa de ter um pré-projecto aprovado pelo gestor antes de solicitar orientação" }, { status: 400 })
  }

  // Verificar se já tem solicitação pendente ou aceite
  const solicitacaoExistente = await prisma.solicitacaoOrientacao.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      estado: { in: ["Pendente", "Aceite"] }
    }
  })

  if (solicitacaoExistente) {
    return NextResponse.json({ error: "Já tem uma solicitação de orientação pendente ou aceite" }, { status: 400 })
  }

  const body = await request.json()
  const { id_orientador, observacoes } = body

  if (!id_orientador) {
    return NextResponse.json({ error: "Orientador é obrigatório" }, { status: 400 })
  }

  // Verificar se orientador existe
  const orientador = await prisma.orientador.findUnique({
    where: { id_orientador: parseInt(id_orientador) }
  })

  if (!orientador) {
    return NextResponse.json({ error: "Orientador não encontrado" }, { status: 404 })
  }

  const solicitacao = await prisma.solicitacaoOrientacao.create({
    data: {
      id_estudante: estudante.id_estudante,
      id_orientador: parseInt(id_orientador),
      data_solicitacao: new Date(),
      estado: "Pendente",
      observacoes: observacoes || null,
    },
    include: {
      orientador: {
        select: {
          nome_completo: true,
          especialidade: true,
        }
      },
      estudante: {
        select: {
          nome_completo: true,
          numero_estudante: true,
        }
      }
    }
  })

  // Log audit
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "CRIAR_SOLICITACAO",
      tabela: "SolicitacaoOrientacao",
      id_registro: solicitacao.id_solicitacao,
      valor_antes: null,
      valor_depois: {
        estado: "Pendente",
        id_orientador: parseInt(id_orientador),
        nome_orientador: solicitacao.orientador.nome_completo,
        observacoes: observacoes || null,
      },
      ip_address: ip,
    })
  } catch (err) {
    console.error("Erro ao registrar audit log:", err)
  }

  return NextResponse.json({
    id_solicitacao: solicitacao.id_solicitacao,
    orientador: solicitacao.orientador,
    data_solicitacao: solicitacao.data_solicitacao,
    estado: solicitacao.estado,
    observacoes: solicitacao.observacoes,
  })
}