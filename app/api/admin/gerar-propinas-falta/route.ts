import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { gerarPropinasAteData } from "@/lib/propinas"
import { logAudit } from "@/lib/audit"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const result = await gerarPropinasAteData()

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