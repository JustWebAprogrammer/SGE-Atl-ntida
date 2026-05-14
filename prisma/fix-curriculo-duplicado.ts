/**
 * Fix Script: Corrige currículos duplicados e notas mal associadas
 *
 * Problema original:
 * - seed-estudantes.ts Passo 3b criava currículos com ano_lectivo = anoLectivoAtual para TODOS os anos
 * - seed-estudantes.ts Passo 4 criava OUTROS currículos com anos lectivos CORRETOS (anteriores)
 * - Resultado: currículos duplicados, e a API do gestor mostrava Notas vazias em vez das reais
 *
 * Fix:
 * 1. Remove currículos duplicados (mantém apenas o com ano_lectivo correcto para cada ano)
 * 2. Remove Notas vazias (todas null) que estão no ano lectivo errado
 * 3. Garante que o ano lectivo do ano actual está correcto
 *
 * Uso: npx tsx prisma/fix-curriculo-duplicado.ts
 */

import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// Calcula ano lectivo anterior: ex: "2025/2026" - 1 = "2024/2025"
function anoLectivoAnterior(ano: string, anosAtras: number): string {
  const [start, end] = ano.split("/").map(Number)
  return `${start - anosAtras}/${end - anosAtras}`
}

async function main() {
  console.log("========================================")
  console.log("🔧 FIX DE CURRÍCULOS DUPLICADOS E NOTAS")
  console.log("========================================\n")

  // Buscar config do sistema para saber o ano lectivo actual
  const config = await prisma.sistemaConfig.findUnique({ where: { id_config: 1 } })
  const anoLectivoAtual = config?.ano_lectivo_label || "2025/2026"
  console.log(`📆 Ano lectivo actual do sistema: ${anoLectivoAtual}\n`)

  // Buscar TODOS os estudantes
  const estudantes = await prisma.estudante.findMany({
    select: {
      id_estudante: true,
      nome_completo: true,
      ano_current: true,
      estado: true,
      ano_electivo: true,
    },
    orderBy: { id_estudante: "asc" },
  })

  console.log(`👨‍🎓 Encontrados ${estudantes.length} estudantes\n`)

  let totalCurriculosApagados = 0
  let totalNotasApagadas = 0
  let totalAnosFixados = 0

  for (const estudante of estudantes) {
    if (estudante.estado !== "EmCurso" && estudante.estado !== "Finalizado") {
      console.log(`   ⏭️  ${estudante.nome_completo} (${estudante.estado}) — ignorado`)
      continue
    }

    const ano_max = estudante.ano_current || 1
    console.log(`\n📋 ${estudante.nome_completo} (${ano_max}º ano, ${estudante.estado})`)

    // --- 1. Fix currículos duplicados ---
    const curriculos = await prisma.curriculoAcademico.findMany({
      where: { id_estudante: estudante.id_estudante },
      orderBy: { ano_lectivo: "desc" },
    })

    // Agrupar currículos por descricao (ex: "1º Ano")
    const grupos = new Map<string, typeof curriculos>()
    for (const c of curriculos) {
      const key = c.descricao ?? ""
      const existing = grupos.get(key) || []
      existing.push(c)
      grupos.set(key, existing)
    }

    for (const [descricao, curriculosDoAno] of grupos) {
      if (curriculosDoAno.length <= 1) continue // sem duplicação

      const descricaoStr = descricao || ""
      console.log(`   ⚠️  Currículo "${descricaoStr}" tem ${curriculosDoAno.length} registos duplicados`)

      // Determinar o ano lectivo correcto para este ano curricular
      // Extrair o número do ano da descricao (ex: "1º Ano" → 1)
      const anoMatch = descricaoStr.match(/^(\d+)/)
      if (!anoMatch) continue
      const anoCurricular = parseInt(anoMatch[1])

      // O ano lectivo correcto é: anoLectivoAtual - (ano_max - anoCurricular)
      const anosAtras = ano_max - anoCurricular
      const anoLectivoCorrecto = anosAtras === 0 
        ? anoLectivoAtual 
        : anoLectivoAnterior(anoLectivoAtual, anosAtras)

      // Escolher qual currículo manter
      // Para anos anteriores ao actual, manter o MAIS ANTIGO (criado pelo passo 4)
      // Para o ano actual, manter o que tem ano_lectivo = anoLectivoAtual
      let manter = curriculosDoAno[0] // default: o primeiro
      for (const c of curriculosDoAno) {
        if (c.ano_lectivo === anoLectivoCorrecto) {
          manter = c
          break
        }
      }

      // Apagar os outros
      for (const c of curriculosDoAno) {
        if (c.id_curriculo !== manter.id_curriculo) {
          await prisma.curriculoAcademico.delete({
            where: { id_curriculo: c.id_curriculo },
          })
          totalCurriculosApagados++
          console.log(`     🗑️  Apagado currículo #${c.id_curriculo} (${c.ano_lectivo}) — mantido #${manter.id_curriculo} (${manter.ano_lectivo})`)
        } else {
          // Se o currículo mantido tem ano lectivo errado, actualizar
          if (manter.ano_lectivo !== anoLectivoCorrecto) {
            await prisma.curriculoAcademico.update({
              where: { id_curriculo: manter.id_curriculo },
              data: { ano_lectivo: anoLectivoCorrecto },
            })
            console.log(`     ✏️  Currículo #${manter.id_curriculo} actualizado: ${manter.ano_lectivo} → ${anoLectivoCorrecto}`)
            totalAnosFixados++
          }
        }
      }
    }

    // --- 2. Remover Notas vazias em anos lectivos errados ---
    // Buscar todas as notas deste estudante
    const todasNotas = await prisma.nota.findMany({
      where: { id_estudante: estudante.id_estudante },
      include: {
        disciplina: {
          select: { ano_curricular: true, semestre: true },
        },
      },
    })

    for (const nota of todasNotas) {
      // Determinar o ano lectivo correcto para esta disciplina
      const anoCurricular = nota.disciplina.ano_curricular
      const anosAtras = ano_max - anoCurricular
      const anoLectivoCorrectoParaNota = anosAtras === 0 
        ? anoLectivoAtual 
        : anoLectivoAnterior(anoLectivoAtual, anosAtras)

      // Se a nota está no ano lectivo errado
      if (nota.ano_lectivo !== anoLectivoCorrectoParaNota) {
        // Verificar se a nota está vazia (todos valores null)
        const isVazia = 
          nota.ac1 == null && 
          nota.ac2 == null && 
          nota.ac3 == null && 
          nota.ttp == null && 
          nota.pp1 == null && 
          nota.pp2 == null && 
          nota.exame == null && 
          nota.recurso == null && 
          nota.exame_especial == null && 
          nota.nota_final == null

        if (isVazia) {
          // Apagar nota vazia em ano lectivo errado (criada pelo passo 3b bugado)
          await prisma.nota.delete({ where: { id_nota: nota.id_nota } })
          totalNotasApagadas++
          console.log(`     🗑️  Nota vazia #${nota.id_nota} apagada (estava em ${nota.ano_lectivo}, devia ser ${anoLectivoCorrectoParaNota})`)
        } else {
          // Nota com valores mas em ano lectivo errado — migrar
          await prisma.nota.update({
            where: { id_nota: nota.id_nota },
            data: { ano_lectivo: anoLectivoCorrectoParaNota },
          })
          totalAnosFixados++
          console.log(`     ✏️  Nota #${nota.id_nota} migrada: ${nota.ano_lectivo} → ${anoLectivoCorrectoParaNota}`)
        }
      }
    }
  }

  // --- Resumo ---
  console.log("\n========================================")
  console.log("✅ FIX CONCLUÍDO!")
  console.log("========================================")
  console.log(`\n📊 Resumo:`)
  console.log(`   🗑️  Currículos duplicados apagados: ${totalCurriculosApagados}`)
  console.log(`   🗑️  Notas vazias apagadas: ${totalNotasApagadas}`)
  console.log(`   ✏️  Anos lectivos corrigidos: ${totalAnosFixados}`)
  console.log("")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())