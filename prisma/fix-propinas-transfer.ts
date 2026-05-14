/**
 * Script de correção: cria retroativamente registos de PagamentoPropina
 * com estado "Pago" para estudantes transferidos que entraram após o 1º ano.
 *
 * Para cada estudante EmCurso com ano_current > 1, identifica se existem
 * propinas em falta para os meses de anos anteriores e cria-as como "Pago".
 *
 * Uso: npx tsx prisma/fix-propinas-transfer.ts
 */

import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── Helpers (replicados de atribuirDisciplinas.ts) ────────────────────

function generateCodigoConfirmacao(): string {
  return String(Math.floor(100 + Math.random() * 900))
}

function generateReferencia(ano: number, mes: number, nomeCompleto: string): string {
  const initials = nomeCompleto
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 4)
  const code = generateCodigoConfirmacao()
  return `PROP-${ano}-${String(mes).padStart(2, "0")}-${initials}-${code}`
}

async function getPrecoEstudanteAno(id_curso: number, ano_curricular: number): Promise<number> {
  const precoCurso = await prisma.precoCurso.findUnique({
    where: {
      id_curso_ano_curricular: { id_curso, ano_curricular },
    },
  })

  if (precoCurso) {
    return Number(precoCurso.valor_propina)
  }

  const config = await prisma.configuracaoTaxas.findUnique({
    where: { id_configuracao: 1 },
  })

  if (!config) {
    throw new Error("Configuração de taxas não encontrada (id=1)")
  }

  const campoPropina = `Propina_ano${ano_curricular}` as keyof typeof config
  return Number(config[campoPropina])
}

// ── Log Types ─────────────────────────────────────────────────────────

interface ChangeLog {
  timestamp: string
  student: string
  studentNumber: string | null
  id_estudante: number
  action: string
  details: string
}

interface FixLog {
  started: string
  completed: string
  changes: ChangeLog[]
  summary: {
    estudantesAnalisados: number
    estudantesComPropinasCriadas: number
    propinasCriadas: number
    estudantesSemPreco: number
  }
}

function createFixLog(): FixLog {
  return {
    started: new Date().toISOString(),
    completed: "",
    changes: [],
    summary: {
      estudantesAnalisados: 0,
      estudantesComPropinasCriadas: 0,
      propinasCriadas: 0,
      estudantesSemPreco: 0,
    },
  }
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(72))
  console.log("  SGE ATLÂNTIDA — CORREÇÃO RETROACTIVA DE PROPINAS (FIX 4)")
  console.log("  Estudantes transferidos → Propinas 'Pago' para anos anteriores")
  console.log("=".repeat(72))

  const fixLog = createFixLog()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Buscar todos os estudantes activos com ano_current > 1
  const estudantes = await prisma.estudante.findMany({
    where: {
      estado: "EmCurso",
      ano_current: { gt: 1 },
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

  console.log(`\n  Total de estudantes EmCurso com ano_current > 1: ${estudantes.length}\n`)

  for (const est of estudantes) {
    const anoAtual = est.ano_current!
    const mesesAnteriores = (anoAtual - 1) * 12

    // Obter propinas já existentes
    const propinasExistentes = await prisma.pagamentoPropina.findMany({
      where: { id_estudante: est.id_estudante },
      select: { mes: true, ano: true },
    })
    const existingSet = new Set(propinasExistentes.map((p) => `${p.ano}-${p.mes}`))

    let criadasEstudante = 0

    // Percorrer meses de trás para a frente
    for (let i = 1; i <= mesesAnteriores; i++) {
      let mes = currentMonth - i
      let ano = currentYear
      while (mes < 1) {
        mes += 12
        ano--
      }

      const key = `${ano}-${mes}`
      if (existingSet.has(key)) continue

      // Determinar ano curricular de destino
      const anoCurricularDestino = Math.max(1, anoAtual - Math.floor((i - 1) / 12))

      // Obter preço
      let valorBase = 0
      try {
        valorBase = await getPrecoEstudanteAno(est.id_curso, anoCurricularDestino)
      } catch {
        console.warn(`  ⚠ ${est.nome_completo}: sem preço para ano ${anoCurricularDestino}`)
        fixLog.summary.estudantesSemPreco++
      }

      const dataVencimento = new Date(ano, mes, 0)
      dataVencimento.setHours(0, 0, 0, 0)

      const referencia = generateReferencia(ano, mes, est.nome_completo)
      const codigoConfirmacao = generateCodigoConfirmacao()

      await prisma.pagamentoPropina.create({
        data: {
          id_estudante: est.id_estudante,
          referencia,
          codigo_confirmacao: codigoConfirmacao,
          mes,
          ano,
          valor_base: valorBase,
          valor_multa: 0,
          valor_total: valorBase,
          data_vencimento: dataVencimento,
          estado: "Pago",
        },
      })

      criadasEstudante++

      fixLog.changes.push({
        timestamp: new Date().toISOString(),
        student: est.nome_completo,
        studentNumber: est.numero_estudante,
        id_estudante: est.id_estudante,
        action: "PROPINA_CRIADA",
        details: `Mês ${mes}/${ano} — valor_base=${valorBase} Kz, estado=Pago, ref=${referencia}, ano_curricular_destino=${anoCurricularDestino}º`,
      })
    }

    if (criadasEstudante > 0) {
      console.log(
        `  💰 ${est.nome_completo} (${est.numero_estudante || "sem nº"}) — ${est.ano_current}º Ano: ${criadasEstudante} propinas Pago criadas`
      )
      fixLog.summary.estudantesComPropinasCriadas++
    } else {
      console.log(
        `  ✅ ${est.nome_completo} (${est.numero_estudante || "sem nº"}) — sem propinas em falta`
      )
    }

    fixLog.summary.propinasCriadas += criadasEstudante
    fixLog.summary.estudantesAnalisados++
  }

  // ── Report ──────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(72))
  console.log("  RELATÓRIO DE CORREÇÃO RETROACTIVA DE PROPINAS")
  console.log("=".repeat(72))
  console.log(`  Iniciado: ${fixLog.started}`)
  console.log(`  Estudantes analisados: ${fixLog.summary.estudantesAnalisados}`)
  console.log(`  Estudantes com propinas criadas: ${fixLog.summary.estudantesComPropinasCriadas}`)
  console.log(`  Propinas criadas (estado=Pago): ${fixLog.summary.propinasCriadas}`)
  if (fixLog.summary.estudantesSemPreco > 0) {
    console.log(`  ⚠ Estudantes sem preço definido: ${fixLog.summary.estudantesSemPreco}`)
  }
  console.log(`  Total de alterações registadas: ${fixLog.changes.length}`)

  fixLog.completed = new Date().toISOString()
  const logPath = path.resolve(__dirname, "..", "fix-propinas-log.json")
  fs.writeFileSync(logPath, JSON.stringify(fixLog, null, 2), "utf-8")
  console.log(`\n📄 Log salvo em: ${logPath}`)

  if (fixLog.summary.propinasCriadas === 0) {
    console.log("\n  ✅ Nenhuma correcção necessária — todas as propinas já existem.")
  }

  console.log("\n" + "=".repeat(72))
}

main()
  .catch((err) => {
    console.error("\n❌ Erro na correcção:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())