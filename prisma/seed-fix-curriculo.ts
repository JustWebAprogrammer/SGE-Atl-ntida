// Script de correção: cria registos em CursoDisciplina para disciplinas que
// foram criadas pelo seed mas não foram associadas ao curso na tabela CursoDisciplina.
//
// Uso: npx tsx prisma/seed-fix-curriculo.ts

import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const cursoId = 1
  const curso = await prisma.curso.findUnique({ where: { id_curso: cursoId } })
  if (!curso) {
    console.error("Curso não encontrado")
    return
  }

  console.log(`📚 Curso: ${curso.nome_curso} (id_curso = ${cursoId})`)

  // Todas as disciplinas que existem
  const todasDisciplinas = await prisma.disciplina.findMany({
    orderBy: [{ ano_curricular: "asc" }, { semestre: "asc" }, { codigo_disciplina: "asc" }],
  })

  let criadas = 0
  let corrigidas = 0

  for (const disc of todasDisciplinas) {
    // Verificar se já existe ligação
    const ligacao = await prisma.cursoDisciplina.findFirst({
      where: { id_curso: cursoId, id_disciplina: disc.id_disciplina },
    })

    if (!ligacao) {
      // Criar ligação em falta
      await prisma.cursoDisciplina.create({
        data: {
          id_curso: cursoId,
          id_disciplina: disc.id_disciplina,
          ano_curricular: disc.ano_curricular,
          semestre: disc.semestre,
        },
      })
      console.log(`   🆗 Criada: ${disc.codigo_disciplina} (${disc.ano_curricular}º ${disc.semestre})`)
      criadas++
    } else if (ligacao.ano_curricular !== disc.ano_curricular || ligacao.semestre !== disc.semestre) {
      // Corrigir ano/semestre errado (ex: veio como default 1/S1 pela API admin)
      await prisma.cursoDisciplina.update({
        where: { id_curso_id_disciplina: { id_curso: cursoId, id_disciplina: disc.id_disciplina } },
        data: {
          ano_curricular: disc.ano_curricular,
          semestre: disc.semestre,
        },
      })
      console.log(`   🔧 Corrigida: ${disc.codigo_disciplina} (estava ${ligacao.ano_curricular}º${ligacao.semestre} → ${disc.ano_curricular}º${disc.semestre})`)
      corrigidas++
    }
  }

  console.log(`\n📊 Resumo:`)
  console.log(`   Criadas: ${criadas}`)
  console.log(`   Corrigidas: ${corrigidas}`)
  console.log(`   OK (já correctas): ${todasDisciplinas.length - criadas - corrigidas}`)
  console.log(`   Total disciplinas: ${todasDisciplinas.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())