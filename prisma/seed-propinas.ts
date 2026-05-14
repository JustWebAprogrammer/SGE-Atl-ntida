import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Seed de Propinas - Iniciado...")

  // ── Verificar se o estudante Ben existe ──────────────────────────────────────
  const benUsuario = await prisma.usuario.findUnique({
    where: { email: "estudante@ispatlantida.ao" }
  })

  if (!benUsuario) {
    console.log("❌ Estudante Ben não encontrado. Execute o seed principal primeiro.")
    process.exit(1)
  }

  const benEstudante = await prisma.estudante.findUnique({
    where: { id_usuario: benUsuario.id_usuario }
  })

  if (!benEstudante) {
    console.log("❌ Registro de estudante Ben não encontrado.")
    process.exit(1)
  }

  // ── Criar propinas para os próximos 3 meses (não existentes) ──────────────────
  const now = new Date()
  const mesAtual = now.getMonth() + 1
  const anoAtual = now.getFullYear()

  // Calcular os próximos 3 meses
  const mesesParaCriar: { mes: number; ano: number }[] = []
  for (let i = 1; i <= 3; i++) {
    let mes = mesAtual + i
    let ano = anoAtual
    if (mes > 12) {
      mes = mes - 12
      ano = anoAtual + 1
    }
    mesesParaCriar.push({ mes, ano })
  }

  console.log(`📅 Propinas a criar para Ben: ${mesesParaCriar.map(m => `${m.mes}/${m.ano}`).join(", ")}`)

  let criadas = 0
  let ignoradas = 0

  for (const { mes, ano } of mesesParaCriar) {
    // Verificar se já existe pagamento para este mês/ano
    const existe = await prisma.pagamentoPropina.findFirst({
      where: {
        id_estudante: benEstudante.id_estudante,
        mes,
        ano
      }
    })

    if (existe) {
      console.log(`⏭️  Pagamento já existe para ${mes}/${ano} - ignorando`)
      ignoradas++
      continue
    }

    // Criar propina
    const valorBase = 28000
    const codigo = String(Math.floor(100 + Math.random() * 900))
    const referencia = `PROP-${ano}-${String(mes).padStart(2, "0")}-BEN-${codigo}`

    await prisma.pagamentoPropina.create({
      data: {
        id_estudante: benEstudante.id_estudante,
        referencia,
        codigo_confirmacao: codigo,
        mes,
        ano,
        valor_base: valorBase,
        valor_multa: 0,
        valor_total: valorBase,
        data_vencimento: new Date(ano, mes - 1, 10),
        estado: "Pendente",
        emitido_por: "sistema",
      }
    })

    console.log(`✅ Propina criada: ${referencia}`)
    criadas++
  }

  console.log(`\n📊 Resumo:`)
  console.log(`   ✅ Propinas criadas: ${criadas}`)
  console.log(`   ⏭️  Propinas ignoradas (já existiam): ${ignoradas}`)
  console.log(`\n🌱 Seed de Propinas concluído com sucesso!`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())