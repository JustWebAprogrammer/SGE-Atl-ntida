import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

// DELETE - Apagar propina gerada pelo estudante (avanço) que ainda está Pendente
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "Apenas admin pode eliminar propinas" }, { status: 403 })

  const resolvedParams = await params
  const idPropina = parseInt(resolvedParams.id)
  if (isNaN(idPropina)) {
    return NextResponse.json({ error: "ID de propina inválido" }, { status: 400 })
  }

  // Buscar a propina com dados do estudante
  const propina = await prisma.pagamentoPropina.findUnique({
    where: { id_pagamento: idPropina },
    select: {
      id_pagamento: true,
      id_estudante: true,
      emitido_por: true,
      estado: true,
      mes: true,
      ano: true,
      referencia: true,
      valor_total: true,
      estudante: {
        select: {
          nome_completo: true,
          numero_estudante: true,
        }
      }
    }
  })

  if (!propina) {
    return NextResponse.json({ error: "Propina não encontrada" }, { status: 404 })
  }

  // Apenas permitir eliminar propinas geradas pelo estudante e ainda Pendentes
  if (propina.emitido_por !== "estudante") {
    return NextResponse.json(
      { error: "Apenas propinas geradas pelo estudante (avanço) podem ser eliminadas. Propinas do sistema não podem ser removidas." },
      { status: 403 }
    )
  }

  if (propina.estado !== "Pendente") {
    return NextResponse.json(
      { error: `Propina em estado "${propina.estado}" não pode ser eliminada. Apenas propinas Pendentes.` },
      { status: 403 }
    )
  }

  // Guardar dados para o audit log antes de eliminar
  const dadosPropina = {
    referencia: propina.referencia,
    mes: propina.mes,
    ano: propina.ano,
    valor: Number(propina.valor_total),
    estudante: propina.estudante.nome_completo,
    numero_estudante: propina.estudante.numero_estudante,
    id_estudante: propina.id_estudante,
  }

  // Eliminar a propina
  await prisma.pagamentoPropina.delete({
    where: { id_pagamento: idPropina }
  })

  // Registar no AuditLog
  await logAudit({
    id_usuario: parseInt(session.user.id),
    acao: "ELIMINAR_PROPINA_AVANCO",
    tabela: "PagamentoPropina",
    id_registro: idPropina,
    valor_antes: dadosPropina,
    valor_depois: null,
    ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
  })

  return NextResponse.json({
    success: true,
    mensagem: `Propina de ${dadosPropina.mes}/${dadosPropina.ano} (${dadosPropina.referencia}) eliminada com sucesso`,
  })
}