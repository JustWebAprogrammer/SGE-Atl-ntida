import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { gerarPropinasAteData } from "@/lib/propinas"
import { logAudit } from "@/lib/audit"
import { criarNotificacao } from "@/lib/notificacoes"
import { getSystemDate } from "@/lib/sistema"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const result = await gerarPropinasAteData()

    // Notificar estudantes com propinas em atraso pendentes
    const propinasAtraso = await prisma.pagamentoPropina.findMany({
      where: { estado: "Pendente" },
      select: { id_estudante: true, mes: true, ano: true, valor_total: true },
      distinct: ["id_estudante"]
    })
    for (const p of propinasAtraso) {
      const est = await prisma.estudante.findUnique({
        where: { id_estudante: p.id_estudante },
        select: { id_usuario: true }
      })
      if (est) {
        const nomeMes = new Date(p.ano, p.mes - 1).toLocaleDateString('pt-PT', { month: 'long' })
        await criarNotificacao({
          id_usuario: est.id_usuario,
          tipo: "propina",
          titulo: `Propina em atraso — ${nomeMes}`,
          mensagem: `A propina de ${nomeMes}/${p.ano} no valor de ${Number(p.valor_total)} Kz está em atraso. Regularize o pagamento.`,
          link_url: "/estudante/pagamentos"
        })
      }
    }

    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "GERAR_PROPINAS_FALTA_MANUAL",
      tabela: "PagamentoPropina",
      id_registro: 0,
      valor_antes: null,
      valor_depois: {
        gerados: result.gerados,
        meses: result.meses,
      },
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("Erro ao gerar propinas em falta:", error)
    return NextResponse.json(
      { error: "Erro interno ao gerar propinas" },
      { status: 500 }
    )
  }
}