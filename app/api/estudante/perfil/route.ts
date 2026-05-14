import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "estudante") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    include: {
      usuario: { select: { nome_usuario: true, email: true } },
      curso: { select: { nome_curso: true } },
      pagamentos_propina: {
        orderBy: { data_vencimento: "desc" },
        take: 1,
      }
    }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  const pagamentoActual = estudante.pagamentos_propina[0] ?? null

  return NextResponse.json({
    nome: estudante.usuario.nome_usuario,
    email: estudante.usuario.email,
    curso: estudante.curso.nome_curso,
    ano_actual: estudante.ano_current,
    numero_estudante: estudante.numero_estudante,
    tipo_bolsa: estudante.tipo_bolsa,
    pagamento: pagamentoActual ? {
      status: pagamentoActual.estado,
      referencia: pagamentoActual.referencia,
      valor: pagamentoActual.valor_total,
      mes: pagamentoActual.mes,
      ano: pagamentoActual.ano,
    } : null
  })
}