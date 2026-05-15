// DESIGN DECISION: Recepcionista role is read/delivery only. Payment processing is out of scope by requirement.
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "recepcionista") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const id_estudante = parseInt(id)
  if (isNaN(id_estudante)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  const estudante = await prisma.estudante.findUnique({
    where: { id_estudante },
    select: {
      id_estudante: true,
      nome_completo: true,
      numero_estudante: true,
      numero_telemovel: true,
      ano_current: true,
      ano_electivo: true,
      estado: true,
      pagamento: true,
      data_cadastro: true,
      usuario: {
        select: { email: true },
      },
      curso: {
        select: { nome_curso: true, id_curso: true },
      },
      // Histórico COMPLETO de pagamentos de propina (pagos e pendentes)
      pagamentos_propina: {
        select: {
          id_pagamento: true,
          referencia: true,
          mes: true,
          ano: true,
          valor_base: true,
          valor_multa: true,
          valor_total: true,
          data_vencimento: true,
          data_pagamento: true,
          estado: true,
          forma_pagamento: true,
        },
        orderBy: [{ ano: "desc" }, { mes: "desc" }],
      },
      certificados: {
        where: { isFisico: true },
        select: {
          id_certificado: true,
          tipo_certificado: true,
          data_emissao: true,
          descricao: true,
        },
        orderBy: { data_emissao: "desc" },
      },
      // Todas as facturas (serviços) com estado de entrega
      facturas: {
        select: {
          id_factura: true,
          numero_factura: true,
          descricao_servico: true,
          valor_total: true,
          valor_final: true,
          data_emissao: true,
          data_vencimento: true,
          data_pagamento: true,
          estado: true,
          periodo: true,
          ano_lectivo: true,
          metodo_pagamento: true,
          entregue: true,
        },
        orderBy: { data_emissao: "desc" },
      },
      notas_cobranca: {
        where: { estado: "Pendente" },
        select: {
          id_nota_cobranca: true,
          descricao: true,
          valor: true,
          data_vencimento: true,
          estado: true,
        },
        orderBy: { data_vencimento: "asc" },
      },
      monografias: {
        select: {
          id_monografia: true,
          titulo: true,
          estado: true,
          data_submissao: true,
          nota_final: true,
        },
        orderBy: { data_submissao: "desc" },
        take: 1,
      },
    },
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  return NextResponse.json({ estudante })
}
