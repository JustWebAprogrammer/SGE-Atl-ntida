/**
 * Script de limpeza: remove notas (grade values) que foram colocadas em disciplinas
 * cujo ano curricular no currículo é superior ao ano actual do estudante.
 *
 * Por exemplo: um estudante do 1º ano que tenha notas preenchidas para uma
 * disciplina do 2º ano — essas notas são inválidas e serão limpas.
 *
 * Uso: npx tsx prisma/seed-limpar-notas-futuras.ts
 */

import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🔍 A procurar notas de disciplinas de anos futuros...\n")

  const anoLectivo = "2025/2026"

  // Buscar todos os estudantes activos com ano definido
  const estudantes = await prisma.estudante.findMany({
    where: {
      estado: "EmCurso",
      ano_current: { not: null }
    },
    select: {
      id_estudante: true,
      nome_completo: true,
      id_curso: true,
      ano_current: true
    }
  })

  console.log(`📊 Total de estudantes activos: ${estudantes.length}\n`)

  let totalNotasLimpas = 0
  let estudantesComNotasFuturas = 0

  for (const est of estudantes) {
    if (!est.ano_current) continue

    // Buscar as notas do estudante para este ano lectivo
    const notas = await prisma.nota.findMany({
      where: {
        id_estudante: est.id_estudante,
        ano_lectivo: anoLectivo
      },
      include: {
        disciplina: {
          select: {
            id_disciplina: true,
            codigo_disciplina: true,
            nome_disciplina: true
          }
        }
      }
    })

    if (notas.length === 0) continue

    let notasLimpaNesteEstudante = 0

    for (const nota of notas) {
      // Verificar se a nota tem algum valor preenchido
      const temValor = nota.ac1 !== null || nota.ac2 !== null || nota.ac3 !== null ||
        nota.ttp !== null || nota.pp1 !== null || nota.pp2 !== null ||
        nota.exame !== null || nota.recurso !== null || nota.exame_especial !== null ||
        nota.nota_final !== null || nota.dispensada === true

      if (!temValor) continue // já está vazia, ignorar

      // Verificar em que ano curricular esta disciplina está no currículo
      const curriculo = await prisma.cursoDisciplina.findFirst({
        where: {
          id_disciplina: nota.id_disciplina,
          id_curso: est.id_curso
        },
        select: { ano_curricular: true }
      })

      if (!curriculo) continue // disciplina não está no currículo deste curso, ignorar

      // Se o ano curricular da disciplina for MAIOR que o ano actual do estudante
      if (curriculo.ano_curricular > est.ano_current) {
        // Limpar todos os valores da nota
        await prisma.nota.update({
          where: { id_nota: nota.id_nota },
          data: {
            ac1: null,
            ac2: null,
            ac3: null,
            ttp: null,
            pp1: null,
            pp2: null,
            exame: null,
            recurso: null,
            exame_especial: null,
            nota_final: null,
            dispensada: false,
            tipo_avaliacao: "Normal"
          }
        })

        console.log(`   🧹 ${est.nome_completo}: ${nota.disciplina.codigo_disciplina} (${nota.disciplina.nome_disciplina}) — ${curriculo.ano_curricular}º Ano > ${est.ano_current}º Ano → LIMPA`)
        notasLimpaNesteEstudante++
        totalNotasLimpas++
      }
    }

    if (notasLimpaNesteEstudante > 0) {
      estudantesComNotasFuturas++
    }
  }

  console.log(`\n✅ Resumo:`)
  console.log(`   Estudantes com notas futuras limpas: ${estudantesComNotasFuturas}`)
  console.log(`   Total de notas limpas: ${totalNotasLimpas}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())