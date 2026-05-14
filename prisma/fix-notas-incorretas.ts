/**
 * Script de correção: remove/move registos de Nota para disciplinas que
 * não pertencem ao currículo do curso do estudante.
 *
 * Lógica:
 *  - Se a disciplina NÃO existe no CursoDisciplina para o curso do estudante:
 *      - Se nota_final IS NULL: REMOVE a Nota
 *      - Se nota_final IS NOT NULL: FLAG para revisão manual
 *  - Se a disciplina existe mas noutro ano curricular: NENHUMA ACÇÃO
 *    (após Fix 1, todas as disciplinas dos anos 1-N estão correctas sob o mesmo ano_lectivo)
 *
 * Uso: npx tsx prisma/fix-notas-incorretas.ts
 *
 * ⚠ Deve ser executado APÓS o Fix 2 (prisma/fix-disciplinas-retroativo.ts)
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
  id_nota: number
  id_disciplina: number
  codigo_disciplina: string
  nome_disciplina: string
  action: string
  details: string
}

interface ManualReviewItem {
  student: string
  studentNumber: string | null
  id_estudante: number
  id_nota: number
  codigo_disciplina: string
  nome_disciplina: string
  nota_final: number | null
  detail: string
}

interface FixLog {
  started: string
  completed: string
  changes: ChangeLog[]
  manualReview: ManualReviewItem[]
  summary: {
    estudantesProcessados: number
    notasRemovidas: number
    notasFlagged: number
  }
}

function createFixLog(): FixLog {
  return {
    started: new Date().toISOString(),
    completed: "",
    changes: [],
    manualReview: [],
    summary: {
      estudantesProcessados: 0,
      notasRemovidas: 0,
      notasFlagged: 0,
    },
  }
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(72))
  console.log("  SGE ATLÂNTIDA — CORREÇÃO DE NOTAS INCORRECTAS (FIX 5)")
  console.log("  Remover/mover registos de disciplinas fora do currículo")
  console.log("=".repeat(72))

  const fixLog = createFixLog()

  // Buscar todos os estudantes activos
  const estudantes = await prisma.estudante.findMany({
    where: { estado: "EmCurso" },
    select: {
      id_estudante: true,
      nome_completo: true,
      numero_estudante: true,
      id_curso: true,
    },
    orderBy: { nome_completo: "asc" },
  })

  console.log(`\n  Total de estudantes activos: ${estudantes.length}\n`)

  for (const est of estudantes) {
    // Buscar todas as Notas do estudante
    const notas = await prisma.nota.findMany({
      where: { id_estudante: est.id_estudante },
      include: {
        disciplina: {
          select: {
            id_disciplina: true,
            nome_disciplina: true,
            codigo_disciplina: true,
            ano_curricular: true,
          },
        },
      },
    })

    if (notas.length === 0) continue

    // Buscar o currículo do curso (todas as disciplinas que pertencem ao curso)
    const curriculo = await prisma.cursoDisciplina.findMany({
      where: { id_curso: est.id_curso },
      select: { id_disciplina: true, ano_curricular: true },
    })

    const curriculoMap = new Map(curriculo.map((c) => [c.id_disciplina, c.ano_curricular]))

    let removidas = 0
    let flagged = 0

    for (const nota of notas) {
      const disciplinaNoCurso = curriculoMap.get(nota.id_disciplina)

      if (!disciplinaNoCurso) {
        // Disciplina NÃO pertence ao curso do estudante
        const notaFinal = nota.nota_final ? Number(nota.nota_final) : null

        if (notaFinal === null) {
          // Sem nota — remover com segurança
          await prisma.nota.delete({
            where: { id_nota: nota.id_nota },
          })

          fixLog.changes.push({
            timestamp: new Date().toISOString(),
            student: est.nome_completo,
            studentNumber: est.numero_estudante,
            id_estudante: est.id_estudante,
            id_nota: nota.id_nota,
            id_disciplina: nota.id_disciplina,
            codigo_disciplina: nota.disciplina.codigo_disciplina,
            nome_disciplina: nota.disciplina.nome_disciplina,
            action: "REMOVIDA",
            details: `Disciplina ${nota.disciplina.codigo_disciplina} (${nota.disciplina.nome_disciplina}) não pertence ao curso do estudante — removida (nota_final=null)`,
          })

          console.log(
            `  🗑️ Removida: ${est.nome_completo} → ${nota.disciplina.codigo_disciplina} (${nota.disciplina.nome_disciplina}) — disciplina estrangeira sem notas`
          )
          removidas++
        } else {
          // Tem nota — flag para revisão manual
          fixLog.manualReview.push({
            student: est.nome_completo,
            studentNumber: est.numero_estudante,
            id_estudante: est.id_estudante,
            id_nota: nota.id_nota,
            codigo_disciplina: nota.disciplina.codigo_disciplina,
            nome_disciplina: nota.disciplina.nome_disciplina,
            nota_final: notaFinal,
            detail: `Disciplina ${nota.disciplina.codigo_disciplina} (${nota.disciplina.nome_disciplina}) não pertence ao curso mas tem nota_final=${notaFinal} — requer revisão manual`,
          })

          console.log(
            `  ⚠️ Flagged: ${est.nome_completo} → ${nota.disciplina.codigo_disciplina} (${nota.disciplina.nome_disciplina}) — nota_final=${notaFinal}, requer revisão`
          )
          flagged++
        }
      } else {
        // Disciplina pertence ao curso — nenhuma acção necessária
        // (mesmo que seja de outro ano curricular, após Fix 1 está correcta)
      }
    }

    if (removidas > 0 || flagged > 0) {
      console.log(
        `  👤 ${est.nome_completo} (${est.numero_estudante || "sem nº"}): ${removidas} removidas, ${flagged} assinaladas`
      )
    }

    fixLog.summary.notasRemovidas += removidas
    fixLog.summary.notasFlagged += flagged
    fixLog.summary.estudantesProcessados++
  }

  // ── Report ──────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(72))
  console.log("  RELATÓRIO DE CORREÇÃO DE NOTAS INCORRECTAS")
  console.log("=".repeat(72))
  console.log(`  Iniciado: ${fixLog.started}`)
  console.log(`  Estudantes processados: ${fixLog.summary.estudantesProcessados}`)
  console.log(`  Notas removidas: ${fixLog.summary.notasRemovidas}`)
  console.log(`  Notas sinalizadas (revisão manual): ${fixLog.summary.notasFlagged}`)
  console.log(`  Total de alterações: ${fixLog.changes.length}`)

  // Listar itens de revisão manual
  if (fixLog.manualReview.length > 0) {
    console.log("\n--- REVISÃO MANUAL REQUERIDA ---")
    console.log(`  ${fixLog.manualReview.length} registos com notas atribuídas a disciplinas estrangeiras:\n`)
    for (const item of fixLog.manualReview) {
      console.log(`  ⚠ [${item.student}] (${item.studentNumber || "sem nº"})`)
      console.log(`     Disciplina: ${item.nome_disciplina} (${item.codigo_disciplina})`)
      console.log(`     Nota Final: ${item.nota_final}`)
      console.log(`     Motivo: ${item.detail}`)
      console.log()
    }
  }

  fixLog.completed = new Date().toISOString()
  const logPath = path.resolve(__dirname, "..", "fix-notas-incorretas-log.json")
  fs.writeFileSync(logPath, JSON.stringify(fixLog, null, 2), "utf-8")
  console.log(`\n📄 Log salvo em: ${logPath}`)

  if (fixLog.summary.notasRemovidas === 0 && fixLog.summary.notasFlagged === 0) {
    console.log("\n  ✅ Nenhuma correcção necessária — todas as Notas estão correctas.")
  }

  console.log("\n" + "=".repeat(72))
}

main()
  .catch((err) => {
    console.error("\n❌ Erro na correcção:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())