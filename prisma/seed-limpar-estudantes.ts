import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("=============================================")
  console.log("🧹 LIMPAR APENAS ESTUDANTES")
  console.log("=============================================\n")
  console.log("   Mantém: admins, orientadores, recepcionistas,")
  console.log("   departamentos, cursos, disciplinas, taxas\n")

  const tabelas = [
    'SnapshotSemestre', 'Declaracao', 'CertificadoDisciplinas', 'Certificado',
    'SolicitacaoOrientacao', 'Premonografia', 'MonografiasParaCorrecao', 'Monografia',
    'Nota', 'PagamentoPropina', 'NotaCobranca', 'Factura', 'CurriculoAcademico',
    'Estudante',
  ]

  for (const tabela of tabelas) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tabela}" CASCADE`)
      console.log(`   ✅ ${tabela} limpa`)
    } catch {
      console.log(`   ⏭️  ${tabela} — não existe, ignorada`)
    }
  }

  // Apagar usuários do tipo estudante que ficaram órfãos
  try {
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "Usuario" WHERE tipo_usuario = 'estudante'`
    )
    console.log(`   ✅ Usuários estudantes apagados: ${result}`)
  } catch (err) {
    console.log(`   ⏭️  Usuários estudantes — erro ao apagar: ${err}`)
  }

  console.log("\n=============================================")
  console.log("✅ LIMPEZA CONCLUÍDA!")
  console.log("=============================================")
  console.log("\n   Agora podes executar:")
  console.log("   npm run seed-estudantes\n")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())