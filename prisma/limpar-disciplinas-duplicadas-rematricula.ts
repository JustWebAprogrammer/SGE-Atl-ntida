import "dotenv/config"

/**
 * Script de limpeza: Remove disciplinas duplicadas criadas pela rematrícula.
 *
 * Problema original:
 * Quando um estudante avançava de ano, a função atribuirDisciplinasAoEstudante()
 * recriava disciplinas de TODOS os anos desde o 1º, em vez de só do novo ano.
 * Isto resultava em disciplinas duplicadas no novo ano lectivo.
 *
 * Este script:
 * 1. Encontra estudantes que têm disciplinas no ano lectivo novo
 * 2. Verifica quais dessas disciplinas são de anos ANTERIORES (duplicadas)
 * 3. Remove apenas as duplicadas (mantém as do ano actual)
 *
 * Uso: npx tsx prisma/limpar-disciplinas-duplicadas-rematricula.ts
 */
import { prisma } from "../lib/prisma"
import { getAnoLectivo } from "../lib/sistema"

async function main() {
  console.log("🔍 A procurar disciplinas duplicadas...\n")

  const anoLectivoActual = await getAnoLectivo()

  // Buscar todos os estudantes activos
  const estudantes = await prisma.estudante.findMany({
    where: {
      estado: "EmCurso",
      ano_electivo: anoLectivoActual,
      ano_current: { not: null },
    },
    select: {
      id_estudante: true,
      nome_completo: true,
      ano_current: true,
      ano_electivo: true,
    },
  })

  console.log(`📊 Encontrados ${estudantes.length} estudantes activos no ano lectivo ${anoLectivoActual}\n`)

  let totalRemovidas = 0
  let totalEstudantesComDuplicadas = 0

  for (const estudante of estudantes) {
    const anoCurrent = estudante.ano_current ?? 1

    // Obter todas as disciplinas do currículo para este estudante (via CursoDisciplina)
    // Vamos buscar o curso do estudante
    const estudanteComCurso = await prisma.estudante.findUnique({
      where: { id_estudante: estudante.id_estudante },
      select: { id_curso: true },
    })

    if (!estudanteComCurso) continue

    // Obter TODAS as disciplinas do currículo do curso
    const todasDisciplinasCurriculo = await prisma.cursoDisciplina.findMany({
      where: { id_curso: estudanteComCurso.id_curso },
      select: { id_disciplina: true, ano_curricular: true },
    })

    // Mapa de disciplina -> ano curricular
    const disciplinaParaAno = new Map(
      todasDisciplinasCurriculo.map((d) => [d.id_disciplina, d.ano_curricular])
    )

    // Obter as notas deste estudante no ano lectivo actual
    const notasEsteAno = await prisma.nota.findMany({
      where: {
        id_estudante: estudante.id_estudante,
        ano_lectivo: anoLectivoActual,
      },
      select: {
        id_nota: true,
        id_disciplina: true,
        disciplina: {
          select: { nome_disciplina: true, codigo_disciplina: true },
        },
      },
    })

    // Filtrar: disciplinas que são de anos ANTERIORES ao ano actual
    // Ex: estudante no 2º ano, disciplinas do 1º ano no ano lectivo novo = duplicadas
    const duplicadas = notasEsteAno.filter((n) => {
      const anoCurricularDisciplina = disciplinaParaAno.get(n.id_disciplina)
      return anoCurricularDisciplina !== undefined && anoCurricularDisciplina < anoCurrent
    })

    if (duplicadas.length > 0) {
      totalEstudantesComDuplicadas++
      console.log(`📌 ${estudante.nome_completo} (${anoCurrent}º ano): ${duplicadas.length} duplicada(s)`)

      for (const d of duplicadas) {
        console.log(`   ❌ Removendo: ${d.disciplina.codigo_disciplina} - ${d.disciplina.nome_disciplina}`)
        await prisma.nota.delete({ where: { id_nota: d.id_nota } })
        totalRemovidas++
      }
    }
  }

  console.log(`\n✅ Limpeza concluída!`)
  console.log(`   Estudantes afectados: ${totalEstudantesComDuplicadas}`)
  console.log(`   Total de disciplinas duplicadas removidas: ${totalRemovidas}`)

  if (totalRemovidas === 0) {
    console.log(`   🎉 Nenhuma duplicata encontrada — base de dados limpa!`)
  }
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })