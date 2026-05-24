import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { criarNotificacao } from "@/lib/notificacoes"
import { SERVICOS } from "@/lib/servicos-tipos"
import { getAnoLectivo, getSystemDate } from "@/lib/sistema"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "estudante") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const estudante = await prisma.estudante.findUnique({
      where: { id_usuario: parseInt(session.user.id) },
      select: {
        id_estudante: true,
        nome_completo: true,
        numero_estudante: true,
        curso: {
          select: { nome_curso: true }
        }
      }
    })

    if (!estudante) {
      return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const { id_servico, quantidade } = body

    if (!id_servico) {
      return NextResponse.json({ error: "ID do serviço é obrigatório" }, { status: 400 })
    }

    const servico = await prisma.servico.findUnique({
      where: { id_servico: id_servico, activo: true }
    })

    if (!servico) {
      return NextResponse.json({ error: "Serviço não encontrado ou inativo" }, { status: 404 })
    }

    // Para Taxa de Monografia: verificar one-time (pago)
    if (servico.nome_servico === SERVICOS.TAXA_MONOGRAFIA) {
      const facturaExistente = await prisma.factura.findFirst({
        where: {
          id_estudante: estudante.id_estudante,
          descricao_servico: SERVICOS.TAXA_MONOGRAFIA,
          estado: "Pago"
        }
      })

      if (facturaExistente) {
        return NextResponse.json({
          error: `Já comprou este serviço (${servico.nome_servico})`,
          id_factura: facturaExistente.id_factura
        }, { status: 400 })
      }
    }

    // Para Certificado de Conclusão: verificar se já tem pedido pendente
    if (servico.nome_servico === SERVICOS.CERTIFICADO_CONCLUSAO) {
      const facturaPendente = await prisma.factura.findFirst({
        where: {
          id_estudante: estudante.id_estudante,
          descricao_servico: SERVICOS.CERTIFICADO_CONCLUSAO,
          estado: { not: "Pago" }
        }
      })

      if (facturaPendente) {
        return NextResponse.json({
          error: "Já tem um pedido de certificado pendente. Aguarde a confirmação da secretaria antes de solicitar outro.",
        }, { status: 400 })
      }
    }

    // Para Folha de Prova: aceitar quantidade
    const folhaQuantidade = (servico.nome_servico === SERVICOS.FOLHA_PROVA)
      ? Math.max(1, Math.min(10, parseInt(quantidade) || 1))
      : 1

    // Calcular valor total
    const valorTotal = Number(servico.valor) * folhaQuantidade

    // Gerar descrição com quantidade se aplicável
    const descricaoServico = folhaQuantidade > 1
      ? `${servico.nome_servico} (x${folhaQuantidade})`
      : servico.nome_servico

    // Count existing facturas for this student to generate unique sequence
    const existingFacturas = await prisma.factura.count({
      where: { id_estudante: estudante.id_estudante }
    })

    // Generate sequence number (001, 002, etc.)
    const sequencia = String(existingFacturas + 1).padStart(3, '0')

    // Gerar referência: ANO/CURSO/NUMESTUDANTE/SEQUENCIA
    const systemDate = await getSystemDate()
    const ano = systemDate.getFullYear()
    const cursoAbrev = (estudante.curso?.nome_curso ?? 'GERAL')
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 6)
    const numero = estudante.numero_estudante ?? String(estudante.id_estudante)
    const numero_factura = `${ano}/${cursoAbrev}/${numero}/${sequencia}`

    const anoLectivo = await getAnoLectivo()

    // Gerar código de confirmação de 3 dígitos (Multicaixa mockup)
    const codigoConfirmacao = String(Math.floor(100 + Math.random() * 900))

    // DESIGN DECISION: Serviços agora usam fluxo Multicaixa como propinas.
    // A factura é criada como "Pendente" com código de confirmação.
    // O estudante confirma via POST /api/estudante/servicos/confirmar.
    const factura = await prisma.factura.create({
      data: {
        id_estudante: estudante.id_estudante,
        descricao_servico: descricaoServico,
        valor_total: valorTotal,
        valor_final: valorTotal,
        data_emissao: systemDate,
        data_vencimento: systemDate,
        estado: "Pendente",
        metodo_pagamento: "Multicaixa",
        ano_lectivo: anoLectivo,
        numero_factura,
        codigo_confirmacao: codigoConfirmacao,
      }
    })

    // Notificar recepcionistas
    try {
      const recepcionistas = await prisma.recepcionista.findMany({
        select: { id_usuario: true }
      })
      for (const r of recepcionistas) {
        await criarNotificacao({
          id_usuario: r.id_usuario,
          tipo: "pagamento_documento",
          titulo: `Novo pedido: ${descricaoServico}`,
          mensagem: `${estudante.nome_completo} (${estudante.numero_estudante}) solicitou ${descricaoServico} — valor ${valorTotal} Kz`,
          link_url: "/recepcionista/estudante"
        })
      }
    } catch (err) {
      console.error("Erro ao notificar recepcionistas:", err)
    }

    // Registar no audit log
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "COMPRAR_SERVICO",
      tabela: "Factura",
      id_registro: factura.id_factura,
      valor_depois: {
        servico: descricaoServico,
        valor: valorTotal,
        estado: "Pendente",
        numero_factura,
      },
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
    })

    return NextResponse.json({
      success: true,
      mensagem: `${descricaoServico} — use o código Multicaixa para confirmar o pagamento`,
      id_factura: factura.id_factura,
      codigo_confirmacao: codigoConfirmacao,
      numero_factura,
      valor: valorTotal,
      quantidade: folhaQuantidade,
    })
  } catch (error) {
    console.error("Erro ao comprar serviço:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}