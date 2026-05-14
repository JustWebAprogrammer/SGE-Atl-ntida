/**
 * Script de limpeza e correcção de dados existentes nas Notas:
 *
 * 1. Remove notas duplicadas (mesmo id_estudante + id_disciplina + ano_lectivo)
 * 2. Corrige o semestre das Notas para o valor correcto do CursoDisciplina
 * 3. Garante que cada estudante tem Notas para todas as disciplinas do currículo
 *
 * Uso: npx tsx prisma/fix-notas-limpeza.ts
 */
import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("==========================================")
  console.log("🧹 FIX: Limpeza e Correção de Notas")
  console.log("==========================================\n")

  // ── Passo 1: Remover notas duplicadas ────────────────
  console.log("📋 Passo 1: Identificar e remover notas duplicadas...\n")

  // Buscar todas as notas agrupadas por estudante + disciplina + ano lectivo
  const duplicados = await prisma.$queryRaw<Array<{ id_estudante: number; id_disciplina: number; ano_lectivo: string; cnt: bigint }>>`
    SELECT id_estudante, id_disciplina, ano_lectivo, COUNT(*) as cnt
    FROM "Nota"
    GROUP BY id_estudante, id_disciplina, ano_lectivo
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
  `

  console.log(`   🔍 Encontrados ${duplicados.length} grupos de notas duplicadas\n`)

  let totalRemovidas = 0
  let totalCorrigidasSemestre = 0
  let totalCriadas = 0

  for (const grupo of duplicados) {
    const notas = await prisma.nota.findMany({
      where: {
        id_estudante: grupo.id_estudante,
        id_disciplina: grupo.id_disciplina,
        ano_lectivo: grupo.ano_lectivo,
      },
      orderBy: { id_nota: "asc" },
    })

    if (notas.length <= 1) continue

    // Estratégia: manter a nota que tem mais dados preenchidos
    // Se uma tem nota_final e a outra não, manter a que tem nota_final
    // Caso contrário, manter a primeira (mais antiga)

    function contarCamposPreenchidos(n: typeof notas[0]): number {
      let count = 0
      if (n.ac1 != null) count++
      if (n.ac2 != null) count++
      if (n.ac3 != null) count++
      if (n.ttp != null) count++
      if (n.pp1 != null) count++
      if (n.pp2 != null) count++
      if (n.exame != null) count++
      if (n.recurso != null) count++
      if (n.exame_especial != null) count++
      if (n.nota_final != null) count += 5 // nota_final é mais importante
      return count
    }

    // Ordenar: primeiro as que têm mais dados, depois por id (mais antiga primeiro)
    const ordenadas = [...notas].sort((a, b) => {
      const scoreA = contarCamposPreenchidos(a)
      const scoreB = contarCamposPreenchidos(b)
      if (scoreB !== scoreA) return scoreB - scoreA
      return a.id_nota - b.id_nota
    })

    const manter = ordenadas[0]
    const apagar = ordenadas.slice(1)

    for (const nota of apagar) {
      await prisma.nota.delete({ where: { id_nota: nota.id_nota } })
      totalRemovidas++
    }

    console.log(`   🗑️  ${grupo.id_estudante}#${grupo.id_disciplina} (${grupo.ano_lectivo}): removidas ${apagar.length}, mantida #${manter.id_nota}`)
  }

  console.log(`\n   ✅ Total removidas: ${totalRemovidas}\n`)

  // ── Passo 2: Corrigir semestre das Notas ─────────────
  console.log("📋 Passo 2: Corrigir semestre das Notas...\n")

  // Buscar todas as notas com informações do estudante e currículo
  const todasNotas = await prisma.nota.findMany({
    include: {
      estudante: { select: { id_curso: true } },
    },
  })

  // Construir um mapa de CursoDisciplina por (id_curso + id_disciplina)
  const todosCurriculos = await prisma.cursoDisciplina.findMany({
    select: { id_curso: true, id_disciplina: true, semestre: true },
  })
  const curriculoMap = new Map<string, string>()
  for (const cd of todosCurriculos) {
    curriculoMap.set(`${cd.id_curso}-${cd.id_disciplina}`, cd.semestre)
  }

  for (const nota of todasNotas) {
    const key = `${nota.estudante.id_curso}-${nota.id_disciplina}`
    const semestreCorrecto = curriculoMap.get(key)

    if (semestreCorrecto && nota.semestre !== semestreCorrecto) {
      await prisma.nota.update({
        where: { id_nota: nota.id_nota },
        data: { semestre: semestreCorrecto as any },
      })
      totalCorrigidasSemestre++
      console.log(`   🔧 #${nota.id_nota}: semestre ${nota.semestre} → ${semestreCorrecto} (estudante ${nota.id_estudante}, disciplina ${nota.id_disciplina})`)
    }
  }

  console.log(`\n   ✅ Total corrigidas (semestre): ${totalCorrigidasSemestre}\n`)

  // ── Passo 3: Garantir que não faltam Notas ───────────
  console.log("📋 Passo 3: Verificar se faltam Notas para disciplinas do currículo...\n")

  // Buscar todos os estudantes EmCurso
  const estudantes = await prisma.estudante.findMany({
    where: { estado: "EmCurso" },
    select: { id_estudante: true, id_curso: true, ano_current: true, ano_electivo: true, nome_completo: true },
  })

  for (const est of estudantes) {
    if (!est.ano_electivo || !est.ano_current) continue

    // Disciplinas que deveriam estar atribuídas (todos os anos até ao ano actual)
    for (let ano = 1; ano <= est.ano_current; ano++) {
      const disciplinasCurriculo = await prisma.cursoDisciplina.findMany({
        where: { id_curso: est.id_curso, ano_curricular: ano },
        select: { id_disciplina: true, semestre: true },
      })

      for (const cd of disciplinasCurriculo) {
        const notaExistente = await prisma.nota.findFirst({
          where: {
            id_estudante: est.id_estudante,
            id_disciplina: cd.id_disciplina,
            ano_lectivo: est.ano_electivo,
          },
        })

        if (!notaExistente) {
          await prisma.nota.create({
            data: {
              id_estudante: est.id_estudante,
              id_disciplina: cd.id_disciplina,
              ano_lectivo: est.ano_electivo,
              semestre: cd.semestre,
              ac1: null, ac2: null, ac3: null,
              ttp: null, pp1: null, pp2: null,
              exame: null, recurso: null, exame_especial: null,
              nota_final: null, dispensada: false, tipo_avaliacao: "Normal",
            },
          })
          totalCriadas++
          console.log(`   ➕ Criada Nota para estudante ${est.id_estudante} (${est.nome_completo}), disciplina ${cd.id_disciplina}, ano ${ano}, ${est.ano_electivo}`)
        }
      }
    }
  }

  console.log(`\n   ✅ Total criadas (em falta): ${totalCriadas}\n`)

  // ── Resumo Final ──────────────────────────────────────
  console.log("==========================================")
  console.log("✅ FIX CONCLUÍDO!")
  console.log("==========================================")
  console.log(`\n📊 Resumo:`)
  console.log(`   🗑️  Duplicadas removidas: ${totalRemovidas}`)
  console.log(`   🔧 Semestres corrigidos: ${totalCorrigidasSemestre}`)
  console.log(`   ➕ Notas criadas (em falta): ${totalCriadas}`)
  console.log(`   📚 Estudantes processados: ${estudantes.length}\n`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())