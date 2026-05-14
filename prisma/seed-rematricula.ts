/**
 * Seed script for re-enrollment service (Taxa de Rematrícula).
 *
 * Separate from main seed.ts to avoid breaking existing seed data.
 * Run with: npx tsx prisma/seed-rematricula.ts
 *
 * Reads the fee from ConfiguracaoTaxas.taxa_reenrollment (fallback 5000 Kz).
 */
import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("📋 Re-enrollment service seed...")

  // Read the configured re-enrollment fee
  const config = await prisma.configuracaoTaxas.findUnique({
    where: { id_configuracao: 1 }
  })

  const taxaReenrollment = config?.taxa_reenrollment
    ? Number(config.taxa_reenrollment)
    : 5000

  console.log(`   ConfiguracaoTaxas.taxa_reenrollment = ${taxaReenrollment} Kz`)

  // Check if it already exists
  const existing = await prisma.servico.findFirst({
    where: { nome_servico: "Taxa de Rematrícula" }
  })

  if (existing) {
    // Update the price to match current config
    await prisma.servico.update({
      where: { id_servico: existing.id_servico },
      data: { valor: taxaReenrollment }
    })
    console.log(`   ✅ Serviço "Taxa de Rematrícula" já existia — valor actualizado para ${taxaReenrollment} Kz`)
  } else {
    // Get max ordem
    const maxOrdem = await prisma.servico.findFirst({
      orderBy: { ordem: 'desc' },
      select: { ordem: true }
    })

    await prisma.servico.create({
      data: {
        nome_servico: "Taxa de Rematrícula",
        descricao: "Taxa de rematrícula para o novo ano lectivo",
        valor: taxaReenrollment,
        activo: true,
        ordem: (maxOrdem?.ordem ?? 0) + 1,
        id_configuracao: 1
      }
    })
    console.log(`   ✅ Serviço "Taxa de Rematrícula" criado com valor ${taxaReenrollment} Kz`)
  }

  console.log("🎉 Seed completed successfully.")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())