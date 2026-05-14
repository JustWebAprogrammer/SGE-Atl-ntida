/**
 * Script de correção: atribui disciplinas (cria Notas) retroativamente para
 * TODOS os anos curriculares desde o 1º até ao ano actual de cada estudante.
 *
 * Isto cobre o período anterior à correcção onde apenas o ano actual recebia
 * disciplinas. Estudantes mais antigos no sistema podem ter Notas apenas para
 * um único ano lectivo — este script preenche os anos em falta.
 *
 * Uso: npx tsx prisma/fix-disciplinas-retroativo.ts
 */

import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── Log Types ─────────────────────────────────────────────────────────

interface ChangeLog {
  timestamp: string
  student: string
  studentNumber: string | null
  id_estudante: number
  ano_curricular: number
  action: string
  details: string
}

interface FixLog {
  started: string
  completed: string
  academicYear: string
  changes: ChangeLog[]
  summary: {
    estudantesProcessados: number
    notasCriadas: number
    curriculosCriados: number
    estudantesSemAno: number
  }
}

function createFixLog(academicYear: string): FixLog {
  return {
    started: new Date().toISOString(),
    completed: "",
    academicYear,
    changes: [],
    summary: {
      estudantesProcessados: 0,
      notasCriadas: 0,
      curriculosCriados: 0,
      estudantesSemAno: 0,
    },
  }
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(72))
  console.log("  SGE ATLÂNTIDA — CORREÇÃO RETROACTIVA DE DISCIPLINAS (FIX 2)")
  console.log("=".repeat(72))

  // Detectar ano lectivo actual
  const latestNotaAno = await prisma.nota.findFirst({
    orderBy: { ano_lectivo: "desc" },
    select: { ano_lectivo: true },
  })

  let academicYear = "2025/2026"
  if (latestNotaAno?.ano_lectivo) {
    academicYear = latestNotaAno.ano_lectivo
  }

  console.log(`\n  Ano Lectivo detectado: ${academicYear}\n`)

  const fixLog = createFixLog(academicYear)

  // Buscar todos os estudantes activos
  const estudantes = await prisma.estudante.findMany({
    where: {
      estado: "EmCurso",
    },
    select: {
      id_estudante: true,
      nome_completo: true,
      numero_estudante: true,
      id_curso: true,
      ano_current: true,
    },
    orderBy: { nome_completo: "asc" },
  })

  console.log(`  Total de estudantes activos: ${estudantes.length}\n`)

  for (const est of estudantes) {
    if (!est.ano_current || est.ano_current < 1) {
      fixLog.summary.estudantesSemAno++
      console.log(`  ⚠ ${est.nome_completo}: sem ano_current definido — ignorado`)
      continue
    }

    let notasCriadasEstudante = 0
    let curriculosCriadosEstudante = 0

    // Percorrer todos os anos desde 1 até ano_current
    for (let ano = 1; ano <= est.ano_current; ano++) {
      // Buscar disciplinas do curso para este ano
      const disciplinasDoAno = await prisma.cursoDisciplina.findMany({
        where: {
          id_curso: est.id_curso,
          ano_curricular: ano,
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

      // Obter Notas já existentes do estudante para este ano lectivo
      const notasExistentes = await prisma.nota.findMany({
        where: {
          id_estudante: est.id_estudante,
          ano_lectivo: academicYear,
        },
        select: { id_disciplina: true },
      })
      const existingIds = new Set(notasExistentes.map((n) => n.id_disciplina))

      // Criar Notas em falta
      for (const cd of disciplinasDoAno) {
        if (!existingIds.has(cd.disciplina.id_disciplina)) {
          await prisma.nota.create({
            data: {
              id_estudante: est.id_estudante,
              id_disciplina: cd.id_disciplina,
              ano_lectivo: academicYear,
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

          notasCriadasEstudante++

          fixLog.changes.push({
            timestamp: new Date().toISOString(),
            student: est.nome_completo,
            studentNumber: est.numero_estudante,
            id_estudante: est.id_estudante,
            ano_curricular: ano,
            action: "NOTA_CRIADA",
            details: `Disciplina ${cd.disciplina.codigo_disciplina} (${cd.disciplina.nome_disciplina}) — ${ano}º Ano • ${cd.disciplina.semestre}`,
          })

          console.log(
            `  📝 Criada Nota: ${est.nome_completo} → ${cd.disciplina.codigo_disciplina} (${ano}º Ano)`
          )
        }
      }

      // Garantir que existe registo CurriculoAcademico para este ano
      const curriculoExistente = await prisma.curriculoAcademico.findFirst({
        where: {
          id_estudante: est.id_estudante,
          descricao: `${ano}º Ano`,
        },
      })

      if (!curriculoExistente) {
        await prisma.curriculoAcademico.create({
          data: {
            id_estudante: est.id_estudante,
            ano_lectivo: academicYear,
            descricao: `${ano}º Ano`,
          },
        })
        curriculosCriadosEstudante++
      }
    }

    if (notasCriadasEstudante > 0 || curriculosCriadosEstudante > 0) {
      console.log(
        `  👤 ${est.nome_completo} (${est.numero_estudante || "sem nº"}) — ${est.ano_current}º Ano: ${notasCriadasEstudante} notas criadas, ${curriculosCriadosEstudante} currículos criados`
      )
    }

    fixLog.summary.notasCriadas += notasCriadasEstudante
    fixLog.summary.curriculosCriados += curriculosCriadosEstudante
    fixLog.summary.estudantesProcessados++
  }

  // ── Report ──────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(72))
  console.log("  RELATÓRIO DE CORREÇÃO RETROACTIVA")
  console.log("=".repeat(72))
  console.log(`  Iniciado: ${fixLog.started}`)
  console.log(`  Ano Lectivo: ${fixLog.academicYear}`)
  console.log(`  Estudantes processados: ${fixLog.summary.estudantesProcessados}`)
  console.log(`  Notas criadas: ${fixLog.summary.notasCriadas}`)
  console.log(`  Currículos criados: ${fixLog.summary.curriculosCriados}`)
  if (fixLog.summary.estudantesSemAno > 0) {
    console.log(`  ⚠ Estudantes sem ano_current: ${fixLog.summary.estudantesSemAno}`)
  }
  console.log(`  Total de alterações registadas: ${fixLog.changes.length}`)

  // Salvar log
  fixLog.completed = new Date().toISOString()
  const logPath = path.resolve(__dirname, "..", "fix-disciplinas-log.json")
  fs.writeFileSync(logPath, JSON.stringify(fixLog, null, 2), "utf-8")
  console.log(`\n📄 Log salvo em: ${logPath}`)

  if (fixLog.summary.notasCriadas === 0 && fixLog.summary.curriculosCriados === 0) {
    console.log("\n  ✅ Nenhuma correcção necessária — todos os dados já estão íntegros.")
  }

  console.log("\n" + "=".repeat(72))
}

main()
  .catch((err) => {
    console.error("\n❌ Erro na correcção:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())