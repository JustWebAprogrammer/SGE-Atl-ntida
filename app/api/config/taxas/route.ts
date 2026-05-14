import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const config = await prisma.configuracaoTaxas.findUnique({
    where: { id_configuracao: 1 }
  })

  if (!config) {
    return NextResponse.json({ error: "Configuração não encontrada" }, { status: 404 })
  }

  return NextResponse.json({
    propina_ano1: Number(config.Propina_ano1),
    propina_ano2: Number(config.Propina_ano2),
    propina_ano3: Number(config.Propina_ano3),
    propina_ano4: Number(config.Propina_ano4),
    propina_ano5: Number(config.Propina_ano5),
    propina_ano6: Number(config.Propina_ano6),
    valor_multa_atraso: Number(config.valor_multa_atraso),
    duracao_aula_minutos: config.duracao_aula_minutos,
    intervalo_aula_minutos: config.intervalo_aula_minutos,
    atualizado_em: config.atualizado_em
  })
}
