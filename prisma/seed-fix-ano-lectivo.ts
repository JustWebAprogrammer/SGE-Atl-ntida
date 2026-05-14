import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("=============================================")
  console.log("🔄 FIX ANO LECTIVO (Sistema Simulado)")
  console.log("=============================================\n")

  // ── Passo 1: Buscar ano lectivo do sistema via API ───────────────────
  console.log("🔍 A consultar ano lectivo do sistema simulado...")
  console.log("   (Certifique-se que o servidor está a correr: npm run dev)\n")

  let anoLectivoAtual = ""
  try {
    const res = await fetch("http://localhost:3000/api/admin/sistema/config")
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    anoLectivoAtual = data.ano_lectivo_atual || ""
    
    if (!anoLectivoAtual) {
      console.error("❌ ERRO: Não foi possível obter o ano lectivo do sistema.\n")
      process.exit(1)
    }

    console.log(`   ✅ Ano lectivo do sistema: ${anoLectivoAtual}`)
    console.log(`   📅 Data simulada: ${data.system_date || "desconhecida"}\n`)
  } catch (err) {
    console.error("❌ ERRO: Não foi possível contactar o servidor em http://localhost:3000")
    console.error("   Certifique-se que 'npm run dev' está a correr.\n")
    process.exit(1)
  }

  // ── Passo 2: ProfessorDisciplina ─────────────────────────────────────
  console.log("👨‍🏫 A actualizar ProfessorDisciplina...")

  const profDiscs = await prisma.professorDisciplina.findMany()
  console.log(`   📊 Encontrados ${profDiscs.length} registos`)

  let profAtualizados = 0
  for (const pd of profDiscs) {
    if (pd.ano_lectivo === anoLectivoAtual) continue

    // Verificar se já existe registo para o novo ano (unique constraint)
    const existente = await prisma.professorDisciplina.findUnique({
      where: {
        id_usuario_id_disciplina_ano_lectivo_semestre: {
          id_usuario: pd.id_usuario,
          id_disciplina: pd.id_disciplina,
          ano_lectivo: anoLectivoAtual,
          semestre: pd.semestre
        }
      }
    })

    if (existente) {
      // Já existe registo para o novo ano, apagar o antigo
      await prisma.professorDisciplina.delete({
        where: { id: pd.id }
      })
    } else {
      // Actualizar para o novo ano
      await prisma.professorDisciplina.update({
        where: { id: pd.id },
        data: { ano_lectivo: anoLectivoAtual }
      })
    }
    profAtualizados++
  }
  console.log(`   ✅ ${profAtualizados} registos actualizados para ${anoLectivoAtual}\n`)

  // ── Passo 3: Estudante (ano_electivo) ────────────────────────────────
  console.log("🎓 A actualizar Estudante.ano_electivo...")

  const estudantes = await prisma.estudante.findMany({
    where: { estado: "EmCurso" }
  })
  console.log(`   📊 Encontrados ${estudantes.length} estudantes activos`)

  let estAtualizados = 0
  for (const est of estudantes) {
    if (est.ano_electivo === anoLectivoAtual) continue

    await prisma.estudante.update({
      where: { id_estudante: est.id_estudante },
      data: { ano_electivo: anoLectivoAtual }
    })
    estAtualizados++
  }
  console.log(`   ✅ ${estAtualizados} estudantes actualizados para ${anoLectivoAtual}\n`)

  // ── Passo 4: HorarioAula ─────────────────────────────────────────────
  console.log("📅 A actualizar HorarioAula...")

  const horarios = await prisma.horarioAula.findMany()
  console.log(`   📊 Encontrados ${horarios.length} horários`)

  let horariosAtualizados = 0
  for (const h of horarios) {
    if (h.ano_lectivo === anoLectivoAtual) continue

    await prisma.horarioAula.update({
      where: { id_aula: h.id_aula },
      data: { ano_lectivo: anoLectivoAtual }
    })
    horariosAtualizados++
  }
  console.log(`   ✅ ${horariosAtualizados} horários actualizados para ${anoLectivoAtual}\n`)

  // ── Passo 5: PlanoProva ──────────────────────────────────────────────
  console.log("📝 A actualizar PlanoProva...")

  const planos = await prisma.planoProva.findMany()
  console.log(`   📊 Encontrados ${planos.length} planos de prova`)

  let planosAtualizados = 0
  for (const p of planos) {
    if (p.ano_lectivo === anoLectivoAtual) continue

    await prisma.planoProva.update({
      where: { id_prova: p.id_prova },
      data: { ano_lectivo: anoLectivoAtual }
    })
    planosAtualizados++
  }
  console.log(`   ✅ ${planosAtualizados} planos actualizados para ${anoLectivoAtual}\n`)

  // ── Passo 6: PeriodoProva ────────────────────────────────────────────
  console.log("📆 A actualizar PeriodoProva...")

  const periodos = await prisma.periodoProva.findMany()
  console.log(`   📊 Encontrados ${periodos.length} períodos de prova`)

  let periodosAtualizados = 0
  for (const p of periodos) {
    if (p.ano_lectivo === anoLectivoAtual) continue

    await prisma.periodoProva.update({
      where: { id_periodo: p.id_periodo },
      data: { ano_lectivo: anoLectivoAtual }
    })
    periodosAtualizados++
  }
  console.log(`   ✅ ${periodosAtualizados} períodos actualizados para ${anoLectivoAtual}\n`)

  // ── Resumo Final ─────────────────────────────────────────────────────
  console.log("=============================================")
  console.log("✅ FIX CONCLUÍDO!")
  console.log("=============================================")
  console.log(`\n📆 Ano lectivo actual: ${anoLectivoAtual}`)
  console.log(`\n📊 Resumo:`)
  console.log(`   ProfessorDisciplina: ${profAtualizados} actualizados`)
  console.log(`   Estudante:           ${estAtualizados} actualizados`)
  console.log(`   HorarioAula:         ${horariosAtualizados} actualizados`)
  console.log(`   PlanoProva:          ${planosAtualizados} actualizados`)
  console.log(`   PeriodoProva:        ${periodosAtualizados} actualizados`)
  console.log(`\n📌 Notas e Currículos NÃO foram alterados (são históricos)\n`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())