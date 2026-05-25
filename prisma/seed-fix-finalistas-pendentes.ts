/**
 * Seed: Fix finalistas pendentes de defesa
 *
 * Corrige estudantes que foram afectados pelo bug onde finalistas
 * (ano_current >= duracao_anos) eram bloqueados na rematrícula e/ou suspensos
 * quando o ano lectivo avançava.
 *
 * O que este seed faz:
 * 1. Procura estudantes EmCurso (ou Suspendido) com ano_current >= duracao_anos do curso
 * 2. Verifica se têm monografia pendente (não defendida) ou nenhuma monografia
 * 3. Actualiza ano_electivo para o ano lectivo actual do sistema
 * 4. Garante que estado = "EmCurso" (reactiva se foi suspenso)
 *
 * Uso: npx tsx prisma/seed-fix-finalistas-pendentes.ts
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
  console.log("🔄 FIX FINALISTAS PENDENTES DE DEFESA")
  console.log("=============================================\n")

  // ── Passo 1: Obter o ano lectivo actual directamente da BD ──
  console.log("🔍 A consultar ano lectivo do sistema...")

  const sistemaConfig = await prisma.sistemaConfig.findUnique({ where: { id_config: 1 } })
  const anoLectivoAtual = sistemaConfig?.ano_lectivo_label || ""

  if (!anoLectivoAtual) {
    console.error("❌ ERRO: Não foi possível obter o ano lectivo do sistema (ano_lectivo_label vazio).\n")
    process.exit(1)
  }

  console.log(`   ✅ Ano lectivo do sistema: ${anoLectivoAtual}`)
  if (sistemaConfig?.data_simulada) {
    console.log(`   📅 Data simulada: ${new Date(sistemaConfig.data_simulada).toLocaleDateString("pt-PT")}`)
  }
  console.log()

  // ── Passo 2: Buscar estudantes EmCurso ou Suspendido com curso ──
  console.log("🔍 A procurar finalistas pendentes de defesa...")

  const estudantes = await prisma.estudante.findMany({
    where: {
      estado: { in: ["EmCurso", "Suspendido"] },
    },
    include: {
      curso: { select: { duracao_anos: true, nome_curso: true } },
      monografias: {
        orderBy: { data_submissao: "desc" },
        take: 1,
      },
    },
  })

  console.log(`   📊 Encontrados ${estudantes.length} estudantes (EmCurso + Suspendido)\n`)

  // ── Passo 3: Identificar finalistas pendentes ──
  // Finalista = ano_current >= duracao_anos do curso
  // Pendente = monografia não defendida OU nenhuma monografia
  const finalistasPendentes = estudantes.filter((est) => {
    const duracao = est.curso?.duracao_anos ?? 4
    const isFinalista = (est.ano_current ?? 1) >= duracao
    if (!isFinalista) return false

    const monografia = est.monografias[0]
    // Pendente = não tem monografia OU a monografia não está defendida
    if (!monografia) return true
    return monografia.estado !== "Defendida"
  })

  console.log(`   🎯 ${finalistasPendentes.length} finalistas pendentes encontrados\n`)

  if (finalistasPendentes.length === 0) {
    console.log("✅ Nenhum finalista pendente para corrigir.\n")
    return
  }

  // ── Passo 4: Mostrar detalhes antes de corrigir ──
  console.log("📋 Lista de finalistas pendentes:\n")
  for (const est of finalistasPendentes) {
    const duracao = est.curso?.duracao_anos ?? 4
    const monografia = est.monografias[0]
    const estadoMonografia = monografia?.estado || "sem monografia"
    const precisaCorrecao = est.ano_electivo !== anoLectivoAtual || est.estado !== "EmCurso"

    console.log(`   ${precisaCorrecao ? "⬜" : "✅"} ${est.nome_completo} (${est.numero_estudante})`)
    console.log(`      Curso: ${est.curso?.nome_curso} (${duracao} anos)`)
    console.log(`      Ano actual: ${est.ano_current}º | Ano lectivo: ${est.ano_electivo || "vazio"} | Estado: ${est.estado}`)
    console.log(`      Monografia: ${estadoMonografia}`)
    if (precisaCorrecao) console.log(`      ⚠️ Precisa correcção`)
    console.log()
  }

  // ── Passo 5: Corrigir cada finalista ──
  console.log("🛠️ A corrigir...\n")

  let corrigidos = 0
  let reactivados = 0

  for (const est of finalistasPendentes) {
    const duracao = est.curso?.duracao_anos ?? 4
    const acoes: string[] = []

    // 5a. Actualizar ano_electivo se desactualizado
    if (est.ano_electivo !== anoLectivoAtual) {
      await prisma.estudante.update({
        where: { id_estudante: est.id_estudante },
        data: { ano_electivo: anoLectivoAtual },
      })
      acoes.push(`ano_electivo: ${est.ano_electivo || "vazio"} → ${anoLectivoAtual}`)
    }

    // 5b. Se foi suspenso, reactivar
    if (est.estado !== "EmCurso") {
      await prisma.estudante.update({
        where: { id_estudante: est.id_estudante },
        data: { estado: "EmCurso" },
      })
      reactivados++
      acoes.push(`estado: ${est.estado} → EmCurso`)
    }

    // 5c. Garantir que ano_current está correcto (não pode ser < duracao)
    if ((est.ano_current ?? 1) < duracao) {
      await prisma.estudante.update({
        where: { id_estudante: est.id_estudante },
        data: { ano_current: duracao },
      })
      acoes.push(`ano_current: ${est.ano_current} → ${duracao}`)
    }

    corrigidos++
    console.log(`   ✅ ${est.nome_completo}`)
    if (acoes.length > 0) {
      console.log(`      📝 ${acoes.join(" | ")}`)
    }
  }

  // ── Resumo Final ──
  console.log("\n=============================================")
  console.log("✅ FIX CONCLUÍDO!")
  console.log("=============================================")
  console.log(`\n📆 Ano lectivo actual: ${anoLectivoAtual}`)
  console.log(`\n📊 Resumo:`)
  console.log(`   Finalistas pendentes encontrados: ${finalistasPendentes.length}`)
  console.log(`   Corrigidos (ano_electivo):        ${corrigidos}`)
  console.log(`   Reactivados (estado → EmCurso):   ${reactivados}`)
  console.log(`\n📌 Estes estudantes agora aparecerão no ano lectivo ${anoLectivoAtual}.`)
  console.log(`📌 Quando defenderem a monografia, o ano de conclusão será ${anoLectivoAtual}.`)
  console.log(`📌 Se houverem estudantes 'Suspendido' por engano, execute:`)
  console.log(`   UPDATE "Estudante" SET estado='EmCurso' WHERE estado='Suspendido' AND ...\n`)
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })