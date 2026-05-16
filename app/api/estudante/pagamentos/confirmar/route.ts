import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getSystemDate } from "@/lib/sistema"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "estudante") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id_pagamento, codigo } = await req.json()

  if (!id_pagamento || !codigo) {
    return NextResponse.json({ error: "Dados em falta" }, { status: 400 })
  }

  // Extract numeric ID from prefixed ID (e.g., "propina-123" -> 123)
  const numericId = id_pagamento.replace(/^(propina|factura)-/, "")
  const idPagamentoNumerico = parseInt(numericId)
  
  if (isNaN(idPagamentoNumerico)) {
    return NextResponse.json({ error: "ID de pagamento inválido" }, { status: 400 })
  }

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_estudante: true }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  const pagamento = await prisma.pagamentoPropina.findFirst({
    where: {
      id_pagamento: idPagamentoNumerico,
      id_estudante: estudante.id_estudante,
    }
  })

  if (!pagamento) {
    return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 })
  }

  if (pagamento.estado === "Pago") {
    return NextResponse.json({ error: "Este pagamento já foi confirmado" }, { status: 400 })
  }

  // Verifica se já existe outro pagamento Pago para o mesmo mês/ano
  const duplicado = await prisma.pagamentoPropina.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      mes: pagamento.mes,
      ano: pagamento.ano,
      estado: "Pago",
      NOT: { id_pagamento: pagamento.id_pagamento }
    }
  })

  if (duplicado) {
    return NextResponse.json(
      { error: `Propina de ${pagamento.mes}/${pagamento.ano} já foi paga anteriormente` },
      { status: 400 }
    )
  }

  if (pagamento.codigo_confirmacao !== codigo.trim()) {
    return NextResponse.json({ error: "Código de confirmação incorrecto" }, { status: 400 })
  }

  // Confirma pagamento
  await prisma.pagamentoPropina.update({
    where: { id_pagamento: idPagamentoNumerico },
    data: {
      estado: "Pago",
      data_pagamento: new Date(),
    }
  })

  // Registar no audit log
  await logAudit({
    id_usuario: parseInt(session.user.id),
    acao: "CONFIRMAR_PAGAMENTO_PROPINA",
    tabela: "PagamentoPropina",
    id_registro: idPagamentoNumerico,
    valor_antes: { estado: pagamento.estado },
    valor_depois: { estado: "Pago", mes: pagamento.mes, ano: pagamento.ano, valor: Number(pagamento.valor_total), referencia: pagamento.referencia },
    ip_address: req.headers.get("x-forwarded-for") || "127.0.0.1"
  })

  // Verificar se ainda existem propinas vencidas e não pagas
  const hoje = await getSystemDate()
  hoje.setHours(23, 59, 59, 999)
  const propinasVencidasNaoPagas = await prisma.pagamentoPropina.findMany({
    where: {
      id_estudante: estudante.id_estudante,
      data_vencimento: { lte: hoje },
      estado: { not: "Pago" },
    },
    select: { id_pagamento: true }
  })

  // Só marca como "Pago" se não houver nenhuma pendente vencida.
  // Se houver, marca como "Devedor" para evitar falso positivo.
  const novoEstadoPagamento = propinasVencidasNaoPagas.length === 0 ? "Pago" : "Devedor"

  await prisma.estudante.update({
    where: { id_estudante: estudante.id_estudante },
    data: { pagamento: novoEstadoPagamento }
  })

  return NextResponse.json({ success: true })
}