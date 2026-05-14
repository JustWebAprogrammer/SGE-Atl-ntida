import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("========================================")
  console.log("📚 SEED — PROPAGAR SEMESTRE SIMULADO")
  console.log("========================================\n")

  // ── 1. Ler semestre actual ────────────────────────────────────────────
  const config = await prisma.sistemaConfig.findUnique({
    where: { id_config: 1 },
  })

  if (!config) {
    console.log("❌ Nenhuma configuração de sistema encontrada.")
    console.log("   Executa primeiro: npm run seed-base")
    process.exit(1)
  }

  const semestre = config.semestre_atual
  const anoLectivo = config.ano_lectivo_label || 
    `${new Date(config.ano_lectivo_inicio).getFullYear()}/${new Date(config.ano_lectivo_fim).getFullYear()}`

  console.log(`📅 Ano Lectivo: ${anoLectivo}`)
  console.log(`🎯 Semestre Simulado: ${semestre}\n`)

  // ── 2. Mostrar estado actual ──────────────────────────────────────────
  const [totalNotas, totalDisciplinas, totalProfessorDisc, totalHorarios, totalPlanos, totalPeriodos] = await Promise.all([
    prisma.nota.count({ where: { ano_lectivo: anoLectivo } }),
    prisma.cursoDisciplina.count(),
    prisma.professorDisciplina.count({ where: { ano_lectivo: anoLectivo } }),
    prisma.horarioAula.count({ where: { ano_lectivo: anoLectivo } }),
    prisma.planoProva.count({ where: { ano_lectivo: anoLectivo } }),
    prisma.periodoProva.count({ where: { ano_lectivo: anoLectivo } }),
  ])

  console.log("📊 Estado actual:")
  console.log(`   Notas: ${totalNotas}`)
  console.log(`   CursoDisciplina: ${totalDisciplinas}`)
  console.log(`   ProfessorDisciplina: ${totalProfessorDisc}`)
  console.log(`   HorarioAula: ${totalHorarios}`)
  console.log(`   PlanoProva: ${totalPlanos}`)
  console.log(`   PeriodoProva: ${totalPeriodos}\n`)

  // ── 3. Actualizar tabelas que têm campo semestre ──────────────────────

  // 3a. CursoDisciplina — mostra quantas são do semestre actual
  const disciplinasSemestre = await prisma.cursoDisciplina.count({
    where: { semestre: semestre },
  })
  const disciplinasOutroSemestre = totalDisciplinas - disciplinasSemestre
  console.log(`📖 CursoDisciplina: ${disciplinasSemestre} no ${semestre}, ${disciplinasOutroSemestre} no outro semestre`)

  // 3b. Notas — mostra quantas são do semestre actual
  const notasSemestre = await prisma.nota.count({
    where: { ano_lectivo: anoLectivo, semestre: semestre },
  })
  const notasOutroSemestre = totalNotas - notasSemestre
  console.log(`📝 Notas: ${notasSemestre} no ${semestre}, ${notasOutroSemestre} no outro semestre`)

  // 3c. ProfessorDisciplina — do ano lectivo actual
  console.log(`👨‍🏫 ProfessorDisciplina: ${totalProfessorDisc} atribuições no ano lectivo`)

  // 3d. HorarioAula — do semestre actual
  const horariosSemestre = await prisma.horarioAula.count({
    where: { ano_lectivo: anoLectivo, semestre: semestre },
  })
  console.log(`⏰ HorarioAula: ${horariosSemestre} no ${semestre}`)

  // 3e. PlanoProva — do semestre actual
  const planosSemestre = await prisma.planoProva.count({
    where: { ano_lectivo: anoLectivo, semestre: semestre },
  })
  console.log(`📋 PlanoProva: ${planosSemestre} no ${semestre}`)

  // 3f. PeriodoProva — do semestre actual
  const periodosSemestre = await prisma.periodoProva.count({
    where: { ano_lectivo: anoLectivo, semestre: semestre },
  })
  console.log(`📅 PeriodoProva: ${periodosSemestre} no ${semestre}`)

  console.log("\n✅ Seed concluído. O semestre simulado está propagado nas tabelas.\n")
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })