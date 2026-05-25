/**
 * Seed: Fix links de notificações antigas
 *
 * Corrige notificações que foram criadas com link_url a apontar
 * para páginas que não existem na área do estudante.
 *
 * Links corrigidos:
 *   /estudante/plano-provas → /estudante       (não existe página separada)
 *   /estudante/servicos     → /estudante/certificados  (a página de servicos não existe)
 *
 * Uso: npx tsx prisma/seed-fix-notificacoes-links.ts
 *       (Certifique-se que 'npm run dev' está a correr)
 */
import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("=============================================")
  console.log("🔗 FIX LINKS DE NOTIFICAÇÕES")
  console.log("=============================================\n")

  // ── 1. Corrigir /estudante/plano-provas → /estudante ──
  console.log("🔍 A procurar notificações com link /estudante/plano-provas...")
  const countProvas = await prisma.notificacao.count({
    where: { link_url: "/estudante/plano-provas" },
  })
  console.log(`   📊 Encontradas: ${countProvas}\n`)

  if (countProvas > 0) {
    const fixProvas = await prisma.notificacao.updateMany({
      where: { link_url: "/estudante/plano-provas" },
      data: { link_url: "/estudante" },
    })
    console.log(`   ✅ ${fixProvas.count} corrigidas → "/estudante"\n`)
  }

  // ── 2. Corrigir /estudante/servicos → /estudante/certificados ──
  console.log("🔍 A procurar notificações com link /estudante/servicos...")
  const countServicos = await prisma.notificacao.count({
    where: { link_url: "/estudante/servicos" },
  })
  console.log(`   📊 Encontradas: ${countServicos}\n`)

  if (countServicos > 0) {
    const fixServicos = await prisma.notificacao.updateMany({
      where: { link_url: "/estudante/servicos" },
      data: { link_url: "/estudante/certificados" },
    })
    console.log(`   ✅ ${fixServicos.count} corrigidas → "/estudante/certificados"\n`)
  }

  // ── Resumo ──
  console.log("=============================================")
  console.log("✅ FIX CONCLUÍDO!")
  console.log("=============================================\n")
  console.log(`   /estudante/plano-provas → /estudante:           ${countProvas > 0 ? countProvas : 0} corrigida(s)`)
  console.log(`   /estudante/servicos → /estudante/certificados:  ${countServicos > 0 ? countServicos : 0} corrigida(s)`)
  console.log("\n📌 Agora as notificações antigas também levam ao destino correcto.\n")
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })