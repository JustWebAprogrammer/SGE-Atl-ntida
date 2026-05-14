/**
 * Script de correção: atribui disciplinas (cria Notas) para estudantes existentes
 * que foram criados antes do sistema de atribuição automática de disciplinas.
 *
 * Para cada estudante activo, verifica se faltam Notas para as disciplinas
 * do seu ano curricular actual e cria-as se necessário.
 *
 * Uso: npx tsx prisma/seed-fix-estudantes-disciplinas.ts
 */

import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🔍 A procurar estudantes activos sem disciplinas atribuídas...\n")

  const anoLectivo = "2025/2026"

  // Buscar todos os estudantes activos
  const estudantes = await prisma.estudante.findMany({
    where: {
      estado: "EmCurso",
      ano_current: { not: null }
    },
    select: {
      id_estudante: true,
      nome_completo: true,
      id_curso: true,
      ano_current: true,
      turno: true
    },
    orderBy: { nome_completo: "asc" }
  })

  console.log(`📊 Total de estudantes activos: ${estudantes.length}`)

  let totalNotasCriadas = 0
  let estudantesProcessados = 0

  for (const est of estudantes) {
    if (!est.ano_current) continue

    // Buscar as disciplinas do curso para este ano (via CursoDisciplina)
    const disciplinasDoAno = await prisma.cursoDisciplina.findMany({
      where: {
        id_curso: est.id_curso,
        ano_curricular: est.ano_current,
      },
      include: {
        disciplina: {
          select: {
            id_disciplina: true,
            nome_disciplina: true,
            codigo_disciplina: true,
            semestre: true,
          },
        },
      },
    })

    if (disciplinasDoAno.length === 0) continue

    let notasCriadas = 0

    for (const cd of disciplinasDoAno) {
      // Verificar se já existe Nota
      const notaExistente = await prisma.nota.findFirst({
        where: {
          id_estudante: est.id_estudante,
          id_disciplina: cd.id_disciplina,
          ano_lectivo: anoLectivo,
        },
      })

      if (!notaExistente) {
        await prisma.nota.create({
          data: {
            id_estudante: est.id_estudante,
            id_disciplina: cd.id_disciplina,
            ano_lectivo: anoLectivo,
            semestre: cd.disciplina.semestre,
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
            tipo_avaliacao: "Normal",
          },
        })
        notasCriadas++
      }
    }

    if (notasCriadas > 0) {
      console.log(`   👤 ${est.nome_completo} (${est.turno}) — ${est.ano_current}º Ano → ${notasCriadas} disciplinas atribuídas`)
      totalNotasCriadas += notasCriadas
    }

    estudantesProcessados++
  }

  console.log(`\n✅ Resumo:`)
  console.log(`   Estudantes processados: ${estudantesProcessados}`)
  console.log(`   Total de Notas criadas: ${totalNotasCriadas}`)
  console.log(`   Disciplinas por estudante: varia conforme o ano curricular`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())