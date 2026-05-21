import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { gerarPropinasAteData } from "@/lib/propinas"
import { getAnoLectivo } from "@/lib/sistema"

export async function GET() {
  try {
    const ano_lectivo = await getAnoLectivo()
    const config = await prisma.sistemaConfig.findUnique({
      where: { id_config: 1 },
      select: { simulador_ativo: true, data_simulada: true }
    })

    return NextResponse.json({
      ano_lectivo,
      simulador_ativo: config?.simulador_ativo ?? false,
      data_simulada: config?.data_simulada ?? null,
    })
  } catch {
    return NextResponse.json({
      ano_lectivo: "2025/2026",
      simulador_ativo: false,
      data_simulada: null,
    })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { data_simulada, simulador_ativo } = body

    // Validate that both fields are provided
    if (simulador_ativo === undefined) {
      return NextResponse.json(
        { error: "O campo 'simulador_ativo' é obrigatório" },
        { status: 400 }
      )
    }

    // Upsert the simulator config
    const config = await prisma.sistemaConfig.upsert({
      where: { id_config: 1 },
      create: {
        data_simulada: data_simulada ? new Date(data_simulada) : null,
        simulador_ativo: simulador_ativo,
        // Set default values for other required fields
        ano_lectivo_inicio: new Date(),
        ano_lectivo_fim: new Date(),
        matricula_data_inicio: new Date(),
        matricula_data_fim: new Date(),
      },
      update: {
        data_simulada: data_simulada ? new Date(data_simulada) : null,
        simulador_ativo: simulador_ativo,
      },
    })

    // ── Geração automática de propinas ──
    // Se o simulador está activo (ou foi actualizado para uma nova data),
    // verificar se há propinas pendentes para gerar baseado no dia configurado
    let propinasResult = null
    if (simulador_ativo && data_simulada) {
      try {
        propinasResult = await gerarPropinasAteData()
        if (propinasResult.gerados > 0) {
          console.log(`🎯 Simulador: ${propinasResult.mensagem}`)
        }
      } catch (err) {
        console.error("Erro ao gerar propinas automaticamente:", err)
        // Não falha a operação principal — apenas loga o erro
      }
    }

    // Log to audit
    const action = simulador_ativo ? "Ativar Simulador de Tempo" : "Desativar Simulador de Tempo"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: action,
      tabela: "SistemaConfig",
      id_registro: config.id_config,
      valor_depois: config,
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
    })

    const responsePayload: Record<string, unknown> = {
      success: true,
      message: simulador_ativo 
        ? "Simulador de tempo ativado com sucesso" 
        : "Simulador de tempo desativado com sucesso",
      config: {
        data_simulada: config.data_simulada,
        simulador_ativo: config.simulador_ativo,
      },
      warning: simulador_ativo 
        ? "⚠️ MODO DE TESTE ATIVO — A data do sistema está simulada. Desative antes de usar em produção."
        : undefined,
    }

    if (propinasResult && propinasResult.gerados > 0) {
      responsePayload.propinas = propinasResult
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error("Error updating time simulator:", error)
    return NextResponse.json(
      { error: "Error interno do servidor" },
      { status: 500 }
    )
  }
}
