import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getPrecoEstudante } from "@/lib/precos"
import { aplicarMultaAtraso } from "@/lib/multa-atraso"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "estudante") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_estudante: true, tipo_bolsa: true }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  // Aplicar multa de atraso automaticamente (RN-PAG02) antes de listar
  await aplicarMultaAtraso()

  // Propinas mensais (Multicaixa)
  const propinas = await prisma.pagamentoPropina.findMany({
    where: { id_estudante: estudante.id_estudante },
    orderBy: [{ ano: "desc" }, { mes: "desc" }]
  })

  // Facturas registadas pela recepcionista (folha de prova, taxa monografia, etc.)
  const facturas = await prisma.factura.findMany({
    where: { id_estudante: estudante.id_estudante },
    orderBy: { data_emissao: "desc" }
  })

  // DESCONTO JÁ APLICADO NA ORIGEM (geração/avanço).
  // valor_base = valor original, valor_total = valor com desconto de bolsa.
  // NÃO reaplicar o desconto aqui — isso causaria double discount.
  const resultadoPropinas = propinas.map(p => ({
    id: `propina-${p.id_pagamento}`,
    origem: "propina" as const,
    referencia: p.referencia,
    descricao: null,
    mes: p.mes,
    ano: p.ano,
    codigo_confirmacao: p.codigo_confirmacao,
    valor_base: Number(p.valor_base),
    valor_multa: Number(p.valor_multa),
    valor_total: Number(p.valor_total),
    data_vencimento: p.data_vencimento,
    data_pagamento: p.data_pagamento,
    forma_pagamento: p.forma_pagamento,
    estado: p.estado,
    tipo_bolsa: estudante.tipo_bolsa
  }))

  const resultadoFacturas = facturas.map(f => ({
    id: `factura-${f.id_factura}`,
    origem: "factura" as const,
    referencia: f.numero_factura ?? null,
    descricao: f.descricao_servico ?? "Serviço",
    mes: null,
    ano: null,
    valor_base: Number(f.valor_total),
    valor_multa: 0,
    valor_total: Number(f.valor_total),
    data_vencimento: f.data_vencimento,
    data_pagamento: f.data_pagamento ?? null,
    forma_pagamento: f.metodo_pagamento ?? "Dinheiro",
    estado: f.estado,
  }))

  // Ordenar tudo pelo mais recente primeiro
  const todos = [...resultadoPropinas, ...resultadoFacturas].sort((a, b) => {
    const dataA = a.data_pagamento ?? a.data_vencimento
    const dataB = b.data_pagamento ?? b.data_vencimento
    return new Date(dataB).getTime() - new Date(dataA).getTime()
  })

  return NextResponse.json(todos)
}