import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { suspenderEstudantesSemRematricula } from "@/lib/reenrollment"

// POST /api/admin/sistema/suspender-sem-rematricula
// Admin-only: suspends all EmCurso students who haven't re-enrolled for the new academic year
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const count = await suspenderEstudantesSemRematricula(Number(session.user.id))

    // Log the bulk action
    await logAudit({
      id_usuario: Number(session.user.id),
      acao: "Suspensão em Massa por Falta de Rematrícula",
      tabela: "Estudante",
      id_registro: 0,
      valor_depois: {
        total_suspensos: count,
        accao: "Admin acionou suspensão de estudantes sem rematrícula",
      },
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
    })

    return NextResponse.json({
      success: true,
      total_suspensos: count,
      mensagem: `${count} estudante(s) suspenso(s) por falta de rematrícula.`,
    })
  } catch (error) {
    console.error("Erro ao suspender estudantes:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}