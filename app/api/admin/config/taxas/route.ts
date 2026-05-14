import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"

// GET - Obter configuração atual de taxas
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const config = await prisma.configuracaoTaxas.findUnique({
      where: { id_configuracao: 1 }
    })

    if (!config) {
      // Criar configuração padrão se não existir
      const novaConfig = await prisma.configuracaoTaxas.create({
        data: { id_configuracao: 1 }
      })
      return NextResponse.json(novaConfig)
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Erro ao obter taxas:', error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// PUT - Atualizar configuração de taxas
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const data = await request.json()

  const configAnterior = await prisma.configuracaoTaxas.findUnique({
    where: { id_configuracao: 1 }
  })

  if (!configAnterior) {
    return NextResponse.json({ error: "Configuração não encontrada" }, { status: 404 })
  }

  const configNova = await prisma.configuracaoTaxas.update({
    where: { id_configuracao: 1 },
    data: {
      Propina_ano1: data.propina_ano1,
      Propina_ano2: data.propina_ano2,
      Propina_ano3: data.propina_ano3,
      Propina_ano4: data.propina_ano4,
      Propina_ano5: data.propina_ano5,
      Propina_ano6: data.propina_ano6,
      valor_multa_atraso: data.valor_multa_atraso,
      duracao_aula_minutos: data.duracao_aula_minutos ?? 90,
      intervalo_aula_minutos: data.intervalo_aula_minutos ?? 10,
      atualizado_por: parseInt(session.user.id),
      atualizado_em: new Date()
    }
  })

  // Registar alteração no AuditLog
  await logAudit({
    id_usuario: parseInt(session.user.id),
    acao: "ALTERAR_TAXAS_GLOBAIS",
    tabela: "ConfiguracaoTaxas",
    id_registro: 1,
    valor_antes: configAnterior,
    valor_depois: configNova,
    ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
  })

  return NextResponse.json({ success: true })
}
