import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { id } = await params
  const idPagamento = parseInt(id)
  if (isNaN(idPagamento)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  // Find the payment
  const pagamento = await prisma.pagamentoPropina.findUnique({
    where: { id_pagamento: idPagamento },
    select: {
      id_estudante: true,
      emitido_por: true,
      estado: true,
    },
  })

  if (!pagamento) {
    return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 })
  }

  // Verify the payment belongs to the logged-in student
  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_estudante: true },
  })

  if (!estudante || pagamento.id_estudante !== estudante.id_estudante) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  // Protect against deletion of system-generated payments
  if (pagamento.emitido_por === "sistema") {
    return NextResponse.json(
      { error: "Não é possível eliminar pagamentos gerados pelo sistema" },
      { status: 403 }
    )
  }

  // Protect against deletion of paid payments
  if (pagamento.estado === "Pago") {
    return NextResponse.json(
      { error: "Não é possível eliminar pagamentos já pagos" },
      { status: 403 }
    )
  }

  // Delete the payment
  await prisma.pagamentoPropina.delete({
    where: { id_pagamento: idPagamento },
  })

  return NextResponse.json({
    success: true,
    message: "Pagamento eliminado com sucesso",
  })
}