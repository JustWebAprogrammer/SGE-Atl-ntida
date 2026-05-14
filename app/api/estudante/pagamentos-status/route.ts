import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasOverduePropinas } from "@/lib/propinas"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_estudante: true },
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  // Check if student has overdue propinas (shared helper uses getSystemDate)
  const mesAtualPago = !(await hasOverduePropinas(estudante.id_estudante))

  // Also get the most recent propina for display purposes
  const pagamentoActual = await prisma.pagamentoPropina.findFirst({
    where: { id_estudante: estudante.id_estudante },
    orderBy: { data_vencimento: "desc" },
    select: { estado: true, mes: true, ano: true },
  })

  return NextResponse.json({
    mesAtualPago,
    pagamento: pagamentoActual || null,
  })
}