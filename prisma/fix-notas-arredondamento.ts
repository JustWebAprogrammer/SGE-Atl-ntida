/**
 * Script de correção: Arredonda valores de notas já guardados na base de dados
 * que foram salvos antes da correção do arredondamento.
 *
 * Lógica:
 *  - Processa todos os registos de Nota em lotes de 100 registros
 *  - Para cada campo de nota (ac1, ac2, ac3, ttp, pp1, pp2, exame, recurso, exame_especial, nota_final):
 *    - Se o valor não for nulo e tiver parte decimal, aplica arredondamento com threshold de 0.4
 *    - Só actualiza o registo se pelo menos um valor for alterado
 *  - Usa arredondarNota() de lib/notas.ts — não usa Math.round()
 *  - Não recalcula nota_final — apenas arredonda o valor existente
 *
 * Uso: npx tsx prisma/fix-notas-arredondamento.ts
 *
 * ⚠ Deve ser executado APÓS a Fix 1 (actualização do display) para garantir consistência
 */

import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

// Importar a função de arredondamento da lib/notas.ts
import { arredondarNota } from "../lib/notas"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── Configuração de Lotes ─────────────────────────────────────────────────
const BATCH_SIZE = 100 // Processa 100 registos por vez

// ── Tipos para Logging ────────────────────────────────────────────────────

interface ChangeLog {
  timestamp: string
  student: string
  studentNumber: string | null
  id_estudante: number
  id_nota: number
  codigo_disciplina: string
  nome_disciplina: string
  field: string
  oldValue: number
  newValue: number
}

interface FixLog {
  started: string
  completed: string
  changes: ChangeLog[]
  summary: {
    totalRecordsChecked: number
    totalRecordsUpdated: number
    totalFieldsCorrected: number
  }
}

function createFixLog(): FixLog {
  return {
    started: new Date().toISOString(),
    completed: "",
    changes: [],
    summary: {
      totalRecordsChecked: 0,
      totalRecordsUpdated: 0,
      totalFieldsCorrected: 0,
    },
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(72))
  console.log("  SGE ATLÂNTIDA — ARREDONDAMENTO DE NOTAS RETROATIVO (FIX 6)")
  console.log("  Arredonda valores decimais em notas já guardadas")
  console.log("=".repeat(72))

  const fixLog = createFixLog()
  const gradeFields = [
    "ac1",
    "ac2",
    "ac3",
    "ttp",
    "pp1",
    "pp2",
    "exame",
    "recurso",
    "exame_especial",
    "nota_final",
  ] as const

  let skip = 0
  let batchNumber = 1

  while (true) {
    console.log(`\n  📦 Processando lote ${batchNumber} (registos ${skip}-${skip + BATCH_SIZE - 1})...`)

    // Buscar registos em lote
    const notas = await prisma.nota.findMany({
      skip: skip,
      take: BATCH_SIZE,
      include: {
        estudante: {
          select: {
            nome_completo: true,
            numero_estudante: true,
          },
        },
        disciplina: {
          select: {
            codigo_disciplina: true,
            nome_disciplina: true,
          },
        },
      },
      orderBy: { id_nota: "asc" },
    })

    if (notas.length === 0) {
      console.log(`  ✓ Nenhum registo adicional para processar.`)
      break
    }

    fixLog.summary.totalRecordsChecked += notas.length

    // Processar cada nota no lote
    for (const nota of notas) {
      const updates: any = {}
      const changes: any[] = []

      for (const field of gradeFields) {
        const currentValue = nota[field] ? Number(nota[field]) : null

        // Verificar se o valor tem parte decimal
        if (currentValue !== null && currentValue % 1 !== 0) {
          const roundedValue = arredondarNota(currentValue)

          // Se o valor arredondado for diferente, marca para actualização
          if (roundedValue !== currentValue) {
            updates[field] = roundedValue
            changes.push({
              field,
              oldValue: currentValue,
              newValue: roundedValue,
            })
          }
        }
      }

      // Actualizar o registo se houver alterações
      if (Object.keys(updates).length > 0) {
        await prisma.nota.update({
          where: { id_nota: nota.id_nota },
          data: updates,
        })

        // Logar cada campo alterado
        for (const change of changes) {
          fixLog.changes.push({
            timestamp: new Date().toISOString(),
            student: nota.estudante.nome_completo,
            studentNumber: nota.estudante.numero_estudante,
            id_estudante: nota.id_estudante,
            id_nota: nota.id_nota,
            codigo_disciplina: nota.disciplina.codigo_disciplina,
            nome_disciplina: nota.disciplina.nome_disciplina,
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
          })

          console.log(
            `    ✓ ${nota.estudante.nome_completo} → ${nota.disciplina.codigo_disciplina} (${change.field}: ${change.oldValue} → ${change.newValue})`
          )
        }

        fixLog.summary.totalRecordsUpdated++
        fixLog.summary.totalFieldsCorrected += changes.length
      }
    }

    console.log(`  ✓ Lote ${batchNumber} concluído: ${notas.length} registos processados`)
    batchNumber++
    skip += BATCH_SIZE
  }

  // ── Relatório Final ──────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(72))
  console.log("  RELATÓRIO DE ARREDONDAMENTO DE NOTAS")
  console.log("=".repeat(72))
  console.log(`  Iniciado: ${fixLog.started}`)
  console.log(`  Registos verificados: ${fixLog.summary.totalRecordsChecked}`)
  console.log(`  Registos actualizados: ${fixLog.summary.totalRecordsUpdated}`)
  console.log(`  Campos corrigidos: ${fixLog.summary.totalFieldsCorrected}`)

  // Guardar log em ficheiro JSON
  fixLog.completed = new Date().toISOString()
  const logPath = path.resolve(__dirname, "..", "fix-notas-arredondamento-log.json")
  fs.writeFileSync(logPath, JSON.stringify(fixLog, null, 2), "utf-8")
  console.log(`\n📄 Log salvo em: ${logPath}`)

  if (fixLog.summary.totalRecordsUpdated === 0) {
    console.log("\n  ✅ Nenhuma correcção necessária — todas as notas já estão arredondadas correctamente.")
  }

  console.log("\n" + "=".repeat(72))
}

main()
  .catch((err) => {
    console.error("\n❌ Erro no arredondamento:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())