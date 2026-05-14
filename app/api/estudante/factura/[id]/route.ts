import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { id } = await params
  const idNum = parseInt(id)

  if (isNaN(idNum)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    include: {
      usuario: { select: { email: true } },
      curso: { select: { nome_curso: true } },
    }
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  // Tentar buscar como propina primeiro
  const propina = await prisma.pagamentoPropina.findFirst({
    where: {
      id_pagamento: idNum,
      id_estudante: estudante.id_estudante,
    }
  })

  if (propina) {
    const MESES_NOMES = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]

    return NextResponse.json({
      numero_factura: propina.referencia,
      descricao_servico: `Propina — ${MESES_NOMES[propina.mes - 1]} ${propina.ano}`,
      valor_total: Number(propina.valor_total),
      valor_base: Number(propina.valor_base),
      valor_multa: Number(propina.valor_multa),
      data_emissao: propina.data_vencimento?.toISOString() || null,
      data_pagamento: propina.data_pagamento?.toISOString() || null,
      estado: propina.estado,
      metodo_pagamento: "Multicaixa Express",
      mes: propina.mes,
      ano: propina.ano,
      origem: "propina" as const,
      referencia: propina.referencia,
      estudante: {
        nome_completo: estudante.nome_completo,
        numero_estudante: estudante.numero_estudante,
        curso: estudante.curso.nome_curso,
        email: estudante.usuario.email,
      }
    })
  }

  // Tentar buscar como factura (serviço)
  const factura = await prisma.factura.findFirst({
    where: {
      id_factura: idNum,
      id_estudante: estudante.id_estudante,
    }
  })

  if (factura) {
    return NextResponse.json({
      numero_factura: factura.numero_factura,
      descricao_servico: factura.descricao_servico || "Serviço",
      valor_total: Number(factura.valor_total),
      valor_base: Number(factura.valor_total),
      valor_multa: 0,
      data_emissao: factura.data_emissao?.toISOString() || null,
      data_pagamento: factura.data_pagamento?.toISOString() || null,
      estado: factura.estado,
      metodo_pagamento: factura.metodo_pagamento || "Multicaixa Express",
      mes: null,
      ano: null,
      origem: "factura" as const,
      referencia: factura.numero_factura,
      estudante: {
        nome_completo: estudante.nome_completo,
        numero_estudante: estudante.numero_estudante,
        curso: estudante.curso.nome_curso,
        email: estudante.usuario.email,
      }
    })
  }

  return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 })
}