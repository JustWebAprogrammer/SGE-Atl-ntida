import "dotenv/config"
import { Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma"

async function main() {
  console.log("🔍 A procurar estudantes finalizados sem snapshot...")

  // 1. Apagar snapshots de finalizacao existentes para poder recriar do zero
  const apagados = await prisma.snapshotSemestre.deleteMany({
    where: { tipo: "finalizacao" },
  })
  console.log(`🗑️ ${apagados.count} snapshots de finalizacao apagados`)

  // 2. Buscar todos os estudantes com estado "Finalizado"
  const estudantes = await prisma.estudante.findMany({
    where: {
      estado: "Finalizado",
    },
    include: {
      curso: {
        select: {
          nome_curso: true,
          duracao_anos: true,
          // Buscar o currículo actual do curso: disciplinas associadas
          disciplinas: {
            include: {
              disciplina: {
                select: {
                  id_disciplina: true,
                  nome_disciplina: true,
                  codigo_disciplina: true,
                  ano_curricular: true,
                  semestre: true,
                },
              },
            },
          },
        },
      },
      notas: {
        include: {
          disciplina: { select: { nome_disciplina: true, codigo_disciplina: true, ano_curricular: true, semestre: true } },
        },
      },
      monografias: {
        where: { estado: "Defendida" },
        orderBy: { data_submissao: "desc" },
        take: 1,
      },
      solicitacoes: {
        where: { estado: "Aceite" },
        include: { orientador: { select: { nome_completo: true, especialidade: true } } },
        take: 1,
      },
    },
  })

  console.log(`📋 Encontrados ${estudantes.length} estudantes finalizados`)

  if (estudantes.length === 0) {
    console.log("✅ Nenhum snapshot necessário.")
    return
  }

  const sistemaConfig = await prisma.sistemaConfig.findUnique({ where: { id_config: 1 } })
  const semestre = sistemaConfig?.semestre_atual || "S2"

  let criados = 0
  for (const estudante of estudantes) {
    // 3. Construir um Map com as disciplinas do currículo do curso:
    //    id_disciplina → { ano_curricular, semestre } vindos do CursoDisciplina
    const disciplinasCurriculoMap = new Map(
      estudante.curso.disciplinas.map((cd) => [
        cd.disciplina.id_disciplina,
        { ano_curricular: cd.ano_curricular, semestre: cd.semestre }
      ])
    )

    // 4. Filtrar notas: só as que pertencem a disciplinas do currículo
    const notasFiltradas = estudante.notas.filter((n) =>
      disciplinasCurriculoMap.has(n.id_disciplina)
    )

    // 5. Agrupar por ano_curricular -> semestre -> lista ordenada por nome_disciplina
    //    Usando os valores do CursoDisciplina (não da Disciplina genérica)
    const porAno: Record<number, Record<string, typeof notasFiltradas>> = {}
    for (const n of notasFiltradas) {
      const curriculoInfo = disciplinasCurriculoMap.get(n.id_disciplina)
      const ano = curriculoInfo?.ano_curricular ?? n.disciplina.ano_curricular
      const sem = curriculoInfo?.semestre ?? n.disciplina.semestre
      if (!porAno[ano]) porAno[ano] = {}
      if (!porAno[ano][sem]) porAno[ano][sem] = []
      porAno[ano][sem].push(n)
    }

    // Reconstruir para formato agrupado limpo (ano_curricular -> semestre -> disciplinas[])
    const notasSnapshot: Array<{
      ano_curricular: number
      semestre: string
      disciplinas: Array<{
        id_nota: number
        nome_disciplina: string
        codigo_disciplina: string
        ano_curricular: number
        semestre: string
        nota_final: number | null
        ano_lectivo: string
        dispensada: boolean
      }>
    }> = Object.entries(porAno)
      .sort(([a], [b]) => Number(a) - Number(b))
      .flatMap(([anoStr, sems]) =>
        Object.entries(sems)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([sem, lista]) => ({
            ano_curricular: Number(anoStr),
            semestre: sem,
            disciplinas: lista
              .sort((a, b) => a.disciplina.nome_disciplina.localeCompare(b.disciplina.nome_disciplina))
              .map((n) => ({
                id_nota: n.id_nota,
                nome_disciplina: n.disciplina.nome_disciplina,
                codigo_disciplina: n.disciplina.codigo_disciplina,
                ano_curricular: n.disciplina.ano_curricular,
                semestre: n.disciplina.semestre,
                nota_final: n.nota_final ? Number(n.nota_final) : null,
                ano_lectivo: n.ano_lectivo,
                dispensada: n.dispensada,
              })),
          }))
      )

    const monografia = estudante.monografias[0] || null
    const orientacao = estudante.solicitacoes[0] || null

    await prisma.snapshotSemestre.create({
      data: {
        id_estudante: estudante.id_estudante,
        ano_lectivo: estudante.ano_electivo || sistemaConfig?.ano_lectivo_label || "",
        semestre: semestre,
        tipo: "finalizacao",
        dados_pessoais: {
          nome_completo: estudante.nome_completo,
          numero_estudante: estudante.numero_estudante,
          nome_curso: estudante.curso.nome_curso,
          duracao_anos: estudante.curso.duracao_anos,
          ano_current: estudante.ano_current,
          ano_electivo: estudante.ano_electivo,
          turno: estudante.turno,
          tipo_bolsa: estudante.tipo_bolsa,
        },
        notas_snapshot: notasSnapshot.length > 0 ? notasSnapshot : estudante.notas.map((n) => ({
          id_nota: n.id_nota,
          nome_disciplina: n.disciplina.nome_disciplina,
          codigo_disciplina: n.disciplina.codigo_disciplina,
          ano_curricular: n.disciplina.ano_curricular,
          semestre: n.disciplina.semestre,
          nota_final: n.nota_final ? Number(n.nota_final) : null,
          ano_lectivo: n.ano_lectivo,
          dispensada: n.dispensada,
        })),
        monografia_snapshot: monografia
          ? {
              id_monografia: monografia.id_monografia,
              titulo: monografia.titulo,
              nota_final: monografia.nota_final ? Number(monografia.nota_final) : null,
              data_defesa: monografia.data_defesa,
              hora_defesa: monografia.hora_defesa,
              sala_defesa: monografia.sala_defesa,
              nome_co_orientador: monografia.nome_co_orientador,
              nome_co_autor: monografia.nome_co_autor,
              orientador: orientacao
                ? {
                    nome_completo: orientacao.orientador.nome_completo,
                    especialidade: orientacao.orientador.especialidade,
                  }
                : null,
            }
          : Prisma.JsonNull,
      },
    })

    criados++
    console.log(`  ✅ Snapshot criado para ${estudante.nome_completo} (${estudante.numero_estudante})`)
  }

  console.log(`\n🎉 ${criados} snapshots criados com sucesso!`)
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })