import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: {
      id_estudante: true,
      ano_current: true,
      pagamento: true,
      estado: true,
      id_curso: true,
      curso: {
        select: {
          duracao_anos: true,
        },
      },
    },
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  // 1. Check if student is in last year of course
  const duracao = estudante.curso?.duracao_anos ?? 4
  const isFinalista = estudante.ano_current === duracao || estudante.estado === "Finalizado"

  // 2. Check if student has accepted orientation
  const orientacaoAceite = await prisma.solicitacaoOrientacao.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      estado: "Aceite",
    },
    include: {
      orientador: {
        select: {
          nome_completo: true,
          especialidade: true,
        },
      },
    },
  })

  const temOrientacaoAceite = !!orientacaoAceite

  // 3. Get pre-monografias
  const premonografias = await prisma.premonografia.findMany({
    where: { id_estudante: estudante.id_estudante },
    orderBy: { data_proposta: "desc" },
    select: {
      id_premonografia: true,
      tema: true,
      data_proposta: true,
      estado: true,
      nome_arquivo: true,
      feedback: true,
    },
  })

  // 4. Get monografias
  const monografias = await prisma.monografia.findMany({
    where: { id_estudante: estudante.id_estudante },
    orderBy: { data_submissao: "desc" },
    select: {
      id_monografia: true,
      titulo: true,
      resumo: true,
      descricao: true,
      nome_arquivo: true,
      caminho_arquivo: true,
      data_submissao: true,
      estado: true,
      nota_final: true,
      feedback: true,
      feedback_gestor: true,
      data_defesa: true,
      hora_defesa: true,
      sala_defesa: true,
      nome_co_orientador: true,
      nome_co_autor: true,
      correcoes: {
        select: {
          data_correcao: true,
          observacoes: true,
          orientador: {
            select: {
              nome_completo: true,
              especialidade: true,
            },
          },
        },
      },
    },
  })

  // 5. Check conditions for monografia submission
  const blockingReasons: string[] = []

  // Condition 1: Monografia fee must be paid
  const taxaMonografiaPaga = await prisma.factura.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      descricao_servico: { contains: "Monografia" },
      estado: "Pago",
    },
  })

  if (!taxaMonografiaPaga) {
    blockingReasons.push("A taxa de monografia não está paga. Vá a Pagamentos > Serviços para efetuar o pagamento.")
  }

  // Condition 2: All subjects must be passed across ALL years
  const notasReprovadas = await prisma.nota.findMany({
    where: {
      id_estudante: estudante.id_estudante,
      dispensada: false,
      nota_final: { lt: 10 },
    },
    select: {
      id_nota: true,
      nota_final: true,
      disciplina: {
        select: {
          nome_disciplina: true,
          codigo_disciplina: true,
          ano_curricular: true,
        },
      },
    },
  })

  if (notasReprovadas.length > 0) {
    const nomesDisciplinas = notasReprovadas
      .map((n) => `${n.disciplina.nome_disciplina} (${n.disciplina.codigo_disciplina})`)
      .join(", ")
    blockingReasons.push(`Tem disciplinas sem nota de aprovação: ${nomesDisciplinas}. Precisa de aprovar todas as disciplinas antes de submeter a monografia.`)
  }

  // Condition 3: All monthly fees (propinas) from previous academic years must be paid
  // For a 4th year student, check all propinas where ano < 4
  const propinasAnterioresNaoPagas = await prisma.pagamentoPropina.findMany({
    where: {
      id_estudante: estudante.id_estudante,
      ano: { lt: estudante.ano_current ?? 4 },
      estado: { not: "Pago" },
    },
    select: {
      id_pagamento: true,
      mes: true,
      ano: true,
      estado: true,
    },
  })

  if (propinasAnterioresNaoPagas.length > 0) {
    const porAno: Record<number, number> = {}
    for (const p of propinasAnterioresNaoPagas) {
      porAno[p.ano] = (porAno[p.ano] || 0) + 1
    }
    const detalhes = Object.entries(porAno)
      .map(([ano, count]) => `${count} propina(s) do ${ano}º ano`)
      .join(", ")
    blockingReasons.push(`Tem propinas em falta de anos anteriores: ${detalhes}. Regularize a sua situação financeira antes de submeter a monografia.`)
  }

  const canSubmitMonografia = blockingReasons.length === 0

  // Se o estudante está Finalizado, carregar dados do snapshot de finalização
  if (estudante.estado === "Finalizado") {
    const snapshot = await prisma.snapshotSemestre.findFirst({
      where: {
        id_estudante: estudante.id_estudante,
        tipo: "finalizacao",
      },
      orderBy: { data_snapshot: "desc" },
    })

    if (snapshot) {
      const dadosPessoais = snapshot.dados_pessoais as Record<string, unknown> | null
      const notasSnapshot = snapshot.notas_snapshot as Record<string, unknown>[] | null
      const monografiaSnapshot = snapshot.monografia_snapshot as Record<string, unknown> | null

      const response: Record<string, unknown> = {
        isFinalista: true,
        duracao_anos: (dadosPessoais?.duracao_anos as number) || duracao,
        temOrientacaoAceite: !!monografiaSnapshot?.orientador,
        orientacao: monografiaSnapshot?.orientador ? {
          orientador: (monografiaSnapshot.orientador as Record<string, string>),
          data_solicitacao: null,
        } : null,
        premonografia: null,
        premonografias: [],
        monografia: monografiaSnapshot ? {
          id: monografiaSnapshot.id_monografia,
          titulo: monografiaSnapshot.titulo,
          resumo: null,
          descricao: null,
          nome_arquivo: null,
          caminho_arquivo: null,
          data_submissao: null,
          estado: "Defendida",
          nota_final: monografiaSnapshot.nota_final as number | null,
          feedback: null,
          feedback_gestor: null,
          data_defesa: monografiaSnapshot.data_defesa as string | null,
          hora_defesa: monografiaSnapshot.hora_defesa as string | null,
          sala_defesa: monografiaSnapshot.sala_defesa as string | null,
          nome_co_orientador: monografiaSnapshot.nome_co_orientador as string | null,
          nome_co_autor: monografiaSnapshot.nome_co_autor as string | null,
          correcoes: [],
        } : null,
        monografias: monografiaSnapshot ? [{
          id: monografiaSnapshot.id_monografia,
          titulo: monografiaSnapshot.titulo,
          resumo: null,
          descricao: null,
          nome_arquivo: null,
          caminho_arquivo: null,
          data_submissao: null,
          estado: "Defendida",
          nota_final: monografiaSnapshot.nota_final as number | null,
          feedback: null,
          feedback_gestor: null,
          data_defesa: monografiaSnapshot.data_defesa as string | null,
          hora_defesa: monografiaSnapshot.hora_defesa as string | null,
          sala_defesa: monografiaSnapshot.sala_defesa as string | null,
          nome_co_orientador: monografiaSnapshot.nome_co_orientador as string | null,
          nome_co_autor: monografiaSnapshot.nome_co_autor as string | null,
          correcoes: [],
        }] : [],
        pagamentoEstado: estudante.pagamento,
        canSubmitMonografia: false,
        blockingReasons: [],
        isFinalizado: true,
      }

      return NextResponse.json(response)
    }
  }

  // Build response matching what the frontend expects
  const response: Record<string, unknown> = {
    isFinalista,
    duracao_anos: duracao,
    temOrientacaoAceite,
    orientacao: orientacaoAceite
      ? {
          orientador: {
            nome_completo: orientacaoAceite.orientador.nome_completo,
            especialidade: orientacaoAceite.orientador.especialidade,
          },
          data_solicitacao: orientacaoAceite.data_solicitacao,
        }
      : null,
    premonografia: premonografias.length > 0 ? premonografias[0] : null,
    premonografias: premonografias.map((p) => ({
      id: p.id_premonografia,
      tema: p.tema,
      data_proposta: p.data_proposta,
      estado: p.estado,
      nome_arquivo: p.nome_arquivo,
      feedback: p.feedback,
    })),
    monografia: monografias.length > 0 ? monografias[0] : null,
    monografias: monografias.map((m) => ({
      id: m.id_monografia,
      titulo: m.titulo,
      resumo: m.resumo,
      descricao: m.descricao,
      nome_arquivo: m.nome_arquivo,
      caminho_arquivo: m.caminho_arquivo,
      data_submissao: m.data_submissao,
      estado: m.estado,
      nota_final: m.nota_final != null ? Number(m.nota_final) : null,
      feedback: m.feedback,
      feedback_gestor: m.feedback_gestor,
      data_defesa: m.data_defesa,
      hora_defesa: m.hora_defesa,
      sala_defesa: m.sala_defesa,
      nome_co_orientador: m.nome_co_orientador,
      nome_co_autor: m.nome_co_autor,
      correcoes: m.correcoes.map((c) => ({
        orientador: {
          nome_completo: c.orientador.nome_completo,
          especialidade: c.orientador.especialidade,
        },
        data_correcao: c.data_correcao,
        observacoes: c.observacoes,
      })),
    })),
    pagamentoEstado: estudante.pagamento,
    canSubmitMonografia,
    blockingReasons,
  }

  return NextResponse.json(response)
}