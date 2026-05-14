/**
 * Phase 2 — Fix Script: Student Data Integrity Correction
 *
 * Reads the audit-log.json from Phase 1 and applies automated fixes.
 *
 * Fixes applied:
 *   1. Missing Nota records  → created with null grades + aprovado: false
 *   2. Missing turno         → NOT auto-fixed (manual review list)
 *   3. Course/year mismatch  → NOT auto-fixed (manual review list)
 *   4. Missing propina       → created as "Pendente" with correct pricing
 *   5. Phone format          → normalized via formatPhone(), or set to null
 *
 * Outputs:
 *   - Console: Human-readable plain text fix report
 *   - File:    fix-log.json (machine-readable, full change log)
 *
 * Usage: npx tsx prisma/fix-estudantes.ts
 *
 * Requires: audit-log.json from Phase 1 in project root
 */

import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── Helpers ──────────────────────────────────────────────────────────

/** Extract only digits from a string */
function stripNonDigits(raw: string): string {
  return raw.replace(/\D/g, "")
}

/**
 * Formats phone number into canonical "+244 9XXXXXXXX" format.
 * Mirrors lib/phone.ts logic.
 */
function formatPhone(raw: string): string | null {
  const digits = stripNonDigits(raw)

  let subscriberDigits: string

  if (digits.length === 9 && digits.startsWith("9")) {
    // Full local number: "992345678" → extract "92345678"
    subscriberDigits = digits.slice(1, 9)
  } else if (digits.length === 12 && digits.startsWith("244")) {
    // International: "244992345678" → extract "92345678"
    subscriberDigits = digits.slice(4, 12)
  } else if (digits.length === 8) {
    // Already just subscriber digits
    subscriberDigits = digits
  } else {
    // Cannot normalize — try last 8 digits as fallback
    if (digits.length >= 8) {
      subscriberDigits = digits.slice(-8)
    } else {
      return null // too few digits, unrecoverable
    }
  }

  // Ensure subscriber part starts with 9 (Angolan mobile prefix)
  if (!subscriberDigits.startsWith("9")) {
    return null
  }

  return `+244 ${subscriberDigits}`
}

/** Generate a random 3-digit confirmation code as string */
function generateCodigoConfirmacao(): string {
  return String(Math.floor(100 + Math.random() * 900))
}

/**
 * Generate a propina reference code.
 * Format: PROP-{YEAR}-{MONTH}-{INITIALS}-{3_DIGIT_CODE}
 */
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

/**
 * Calculate the student's propina value and multa (replicating lib/precos.ts logic).
 * Returns valor_base and valor_multa in cents (as Decimal-compatible numbers).
 */
async function getPrecoEstudanteRaw(id_estudante: number): Promise<{
  valor_base: number
  valor_multa: number
  tipo_bolsa: string
  desconto: number
}> {
  const estudante = await prisma.estudante.findUnique({
    where: { id_estudante },
    select: {
      id_curso: true,
      ano_current: true,
      tipo_bolsa: true,
    },
  })

  if (!estudante) {
    throw new Error(`Estudante ${id_estudante} não encontrado`)
  }

  const anoCurricular = estudante.ano_current || 1

  // Try course-specific price first
  const precoCurso = await prisma.precoCurso.findUnique({
    where: {
      id_curso_ano_curricular: {
        id_curso: estudante.id_curso,
        ano_curricular: anoCurricular,
      },
    },
  })

  let valor_propina: number
  let valor_multa: number

  if (precoCurso) {
    valor_propina = Number(precoCurso.valor_propina)
    valor_multa = Number(precoCurso.valor_multa)
  } else {
    // Fallback to global config
    const config = await prisma.configuracaoTaxas.findUnique({
      where: { id_configuracao: 1 },
    })

    if (!config) {
      throw new Error("Configuração de taxas não encontrada (id=1)")
    }

    const campoPropina = `Propina_ano${anoCurricular}` as keyof typeof config
    valor_propina = Number(config[campoPropina])
    valor_multa = Number(config.valor_multa_atraso)
  }

  // Apply scholarship discount
  const getDescontoBolsa = (tipoBolsa: string | null): number => {
    switch (tipoBolsa) {
      case "Cem":
        return 0
      case "Cinquenta":
        return 0.5
      case "Nenhuna":
      default:
        return 1
    }
  }

  const desconto = getDescontoBolsa(estudante.tipo_bolsa)
  const valor_com_desconto = valor_propina * desconto

  return {
    valor_base: valor_com_desconto,
    valor_multa,
    tipo_bolsa: estudante.tipo_bolsa || "Nenhuma",
    desconto,
  }
}

/**
 * Parse an "ano_lectivo" string like "2025/2026" into start/end years.
 */
function parseAnoLectivo(ano: string): { startYear: number; endYear: number } | null {
  const parts = ano.split("/")
  if (parts.length !== 2) return null
  const sy = parseInt(parts[0], 10)
  const ey = parseInt(parts[1], 10)
  if (isNaN(sy) || isNaN(ey)) return null
  return { startYear: sy, endYear: ey }
}

// ── Fix Log Types ────────────────────────────────────────────────────

interface ChangeLog {
  timestamp: string
  student: string
  studentNumber: string | null
  id_estudante: number
  field: string
  action: string
  details: string
}

interface FixLog {
  started: string
  completed: string
  academicYear: string
  changes: ChangeLog[]
  manualReview: {
    turno: { student: string; number: string | null; id_estudante: number }[]
    courseYear: { student: string; number: string | null; id_estudante: number; detail: string }[]
    phoneFlagged: { student: string; number: string | null; id_estudante: number; originalPhone: string | null }[]
  }
  summary: {
    notasCriadas: number
    propinasCriadas: number
    phonesCorrected: number
    phonesFlagged: number
    turnoFlagged: number
    courseYearFlagged: number
  }
}

function createFixLog(academicYear: string): FixLog {
  return {
    started: new Date().toISOString(),
    completed: "",
    academicYear,
    changes: [],
    manualReview: {
      turno: [],
      courseYear: [],
      phoneFlagged: [],
    },
    summary: {
      notasCriadas: 0,
      propinasCriadas: 0,
      phonesCorrected: 0,
      phonesFlagged: 0,
      turnoFlagged: 0,
      courseYearFlagged: 0,
    },
  }
}

// ── Main Fix Logic ───────────────────────────────────────────────────

async function fixAllStudents(): Promise<void> {
  console.log("=".repeat(72))
  console.log("  SGE ATLÂNTIDA — CORREÇÃO DE INTEGRIDADE DOS DADOS DE ESTUDANTES")
  console.log("=".repeat(72))

  // ── 1. Detect current academic year ──────────────────────────────
  const latestNotaAno = await prisma.nota.findFirst({
    orderBy: { ano_lectivo: "desc" },
    select: { ano_lectivo: true },
  })

  let academicYear = ""
  if (latestNotaAno?.ano_lectivo) {
    academicYear = latestNotaAno.ano_lectivo
  } else {
    const y = new Date().getFullYear()
    academicYear = `${y}/${y + 1}`
  }

  console.log(`\n  Ano Lectivo detectado: ${academicYear}\n`)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const fixLog = createFixLog(academicYear)

  // ── 2. Fetch all active students ─────────────────────────────────
  const estudantes = await prisma.estudante.findMany({
    where: { estado: "EmCurso" },
    include: {
      curso: {
        select: {
          nome_curso: true,
          duracao_anos: true,
        },
      },
    },
    orderBy: { nome_completo: "asc" },
  })

  console.log(`  Total de estudantes activos: ${estudantes.length}\n`)

  for (const est of estudantes) {
    // ── Fix 1: Missing Nota records ────────────────────────────────
    if (est.ano_current && academicYear) {
      await fixMissingNotas(est, academicYear, fixLog)
    }

    // ── Fix 2: Missing Turno — flag only ──────────────────────────
    if (!est.turno || est.turno.trim() === "") {
      fixLog.manualReview.turno.push({
        student: est.nome_completo,
        number: est.numero_estudante,
        id_estudante: est.id_estudante,
      })
      fixLog.summary.turnoFlagged++
    }

    // ── Fix 3: Course/Year Mismatch — flag only ───────────────────
    checkAndFlagCourseYear(est, fixLog)

    // ── Fix 4: Missing Propina records ────────────────────────────
    await fixMissingPropinas(est, currentYear, currentMonth, fixLog)

    // ── Fix 5: Phone format ──────────────────────────────────────
    await fixPhoneFormat(est, fixLog)
  }

  // ── Print fix report ──────────────────────────────────────────────
  printFixReport(fixLog)

  // ── Write JSON log file ───────────────────────────────────────────
  fixLog.completed = new Date().toISOString()
  const logPath = path.resolve(__dirname, "..", "fix-log.json")
  fs.writeFileSync(logPath, JSON.stringify(fixLog, null, 2), "utf-8")
  console.log(`\n📄 Fix log (JSON) salvo em: ${logPath}\n`)
}

// ── Fix Functions ────────────────────────────────────────────────────

async function fixMissingNotas(
  est: { id_estudante: number; nome_completo: string; numero_estudante: string | null; id_curso: number; ano_current: number | null },
  anoLectivo: string,
  fixLog: FixLog,
): Promise<void> {
  if (!est.ano_current) return

  // Get curriculum for this year
  const curriculum = await prisma.cursoDisciplina.findMany({
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
          ano_curricular: true,
        },
      },
    },
  })

  if (curriculum.length === 0) return

  // Get existing Nota records
  const existingNotas = await prisma.nota.findMany({
    where: {
      id_estudante: est.id_estudante,
      ano_lectivo: anoLectivo,
    },
    select: { id_disciplina: true },
  })

  const existingIds = new Set(existingNotas.map((n) => n.id_disciplina))

  for (const cd of curriculum) {
    if (!existingIds.has(cd.disciplina.id_disciplina)) {
      // Create missing Nota record
      await prisma.nota.create({
        data: {
          id_estudante: est.id_estudante,
          id_disciplina: cd.disciplina.id_disciplina,
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

      fixLog.changes.push({
        timestamp: new Date().toISOString(),
        student: est.nome_completo,
        studentNumber: est.numero_estudante,
        id_estudante: est.id_estudante,
        field: "Nota",
        action: "CRIADA",
        details: `Disciplina ${cd.disciplina.codigo_disciplina} (${cd.disciplina.nome_disciplina}) — ${cd.ano_curricular}º Ano • ${cd.disciplina.semestre} — criada com nota_final=null, aprovado=false`,
      })

      console.log(`  📝 Criada Nota: ${est.nome_completo} → ${cd.disciplina.codigo_disciplina} (${cd.ano_curricular}º Ano)`)
      fixLog.summary.notasCriadas++
    }
  }
}

function checkAndFlagCourseYear(
  est: { id_estudante: number; nome_completo: string; numero_estudante: string | null; ano_current: number | null; curso: { nome_curso: string; duracao_anos: number | null } },
  fixLog: FixLog,
): void {
  let detail = ""

  if (est.ano_current === null || est.ano_current === undefined) {
    detail = "ano_current is null"
  } else if (est.curso.duracao_anos && est.ano_current > est.curso.duracao_anos) {
    detail = `ano_current=${est.ano_current} excede duração do curso (${est.curso.duracao_anos} anos)`
  } else if (est.ano_current < 1) {
    detail = `ano_current=${est.ano_current} is less than 1`
  }

  if (detail) {
    fixLog.manualReview.courseYear.push({
      student: est.nome_completo,
      number: est.numero_estudante,
      id_estudante: est.id_estudante,
      detail,
    })
    fixLog.summary.courseYearFlagged++
  }
}

async function fixMissingPropinas(
  est: { id_estudante: number; nome_completo: string; numero_estudante: string | null; data_cadastro: Date | null },
  currentYear: number,
  currentMonth: number,
  fixLog: FixLog,
): Promise<void> {
  // Build expected months from enrollment date
  const expectedMonths = getExpectedMonths(est.data_cadastro, currentYear, currentMonth)
  if (expectedMonths.length === 0) return

  // Get existing propinas
  const existingPropinas = await prisma.pagamentoPropina.findMany({
    where: { id_estudante: est.id_estudante },
    select: { mes: true, ano: true },
  })

  const existingSet = new Set(existingPropinas.map((p) => `${p.ano}-${p.mes}`))

  // Get pricing for this student
  let valorBase = 0
  let valorMulta = 0
  try {
    const preco = await getPrecoEstudanteRaw(est.id_estudante)
    valorBase = preco.valor_base
    valorMulta = preco.valor_multa
  } catch (err) {
    console.warn(`  ⚠ ${est.nome_completo}: não foi possível obter preço — usando zero`)
  }

  for (const em of expectedMonths) {
    const key = `${em.ano}-${em.mes}`
    if (!existingSet.has(key)) {
      // Parse the academic year for reference generation (use the propina month's year)
      const mesAno = em.mes
      const ano = em.ano
      const dataVencimento = new Date(ano, mesAno - 1, 10) // 10th of month

      const referencia = generateReferencia(ano, mesAno, est.nome_completo)
      const codigoConfirmacao = generateCodigoConfirmacao()

      await prisma.pagamentoPropina.create({
        data: {
          id_estudante: est.id_estudante,
          referencia,
          codigo_confirmacao: codigoConfirmacao,
          mes: mesAno,
          ano,
          valor_base: valorBase,
          valor_multa: valorMulta,
          valor_total: valorBase + valorMulta,
          data_vencimento: dataVencimento,
          estado: "Pendente",
        },
      })

      fixLog.changes.push({
        timestamp: new Date().toISOString(),
        student: est.nome_completo,
        studentNumber: est.numero_estudante,
        id_estudante: est.id_estudante,
        field: "PagamentoPropina",
        action: "CRIADA",
        details: `Mês ${mesAno}/${ano} — valor_base=${valorBase} Kz, data_vencimento=${dataVencimento.toISOString().split("T")[0]}, estado=Pendente, ref=${referencia}`,
      })

      console.log(`  💰 Criada Propina: ${est.nome_completo} → ${mesAno}/${ano} (${valorBase} Kz, Pendente)`)
      fixLog.summary.propinasCriadas++
    }
  }
}

/** Build list of expected (month, year) from enrollment date to now */
function getExpectedMonths(
  dataCadastro: Date | null,
  currentYear: number,
  currentMonth: number,
): { mes: number; ano: number }[] {
  const months: { mes: number; ano: number }[] = []
  const startMonth = dataCadastro ? dataCadastro.getMonth() + 1 : 7
  const startYear = dataCadastro ? dataCadastro.getFullYear() : currentYear

  let cursorYear = startYear
  let cursorMonth = startMonth

  while (cursorYear < currentYear || (cursorYear === currentYear && cursorMonth <= currentMonth)) {
    months.push({ mes: cursorMonth, ano: cursorYear })
    cursorMonth++
    if (cursorMonth > 12) {
      cursorMonth = 1
      cursorYear++
    }
  }

  return months
}

async function fixPhoneFormat(
  est: { id_estudante: number; nome_completo: string; numero_estudante: string | null; numero_telemovel: string | null },
  fixLog: FixLog,
): Promise<void> {
  const phone = est.numero_telemovel

  // Already canonical or null — skip
  if (!phone || phone.trim() === "") {
    // Null is already acceptable, no action needed (we audit it, but don't "fix" null)
    return
  }

  // Check if already in canonical format
  if (/^\+244\s9\d{8}$/.test(phone.trim())) {
    return // already correct
  }

  // Try to normalize
  const formatted = formatPhone(phone)

  if (formatted) {
    // Update the phone
    await prisma.estudante.update({
      where: { id_estudante: est.id_estudante },
      data: { numero_telemovel: formatted },
    })

    fixLog.changes.push({
      timestamp: new Date().toISOString(),
      student: est.nome_completo,
      studentNumber: est.numero_estudante,
      id_estudante: est.id_estudante,
      field: "numero_telemovel",
      action: "ACTUALIZADO",
      details: `"${phone}" → "${formatted}"`,
    })

    console.log(`  📞 Telefone corrigido: ${est.nome_completo} → "${formatted}"`)
    fixLog.summary.phonesCorrected++
  } else {
    // Cannot normalize — set to null
    await prisma.estudante.update({
      where: { id_estudante: est.id_estudante },
      data: { numero_telemovel: null },
    })

    fixLog.changes.push({
      timestamp: new Date().toISOString(),
      student: est.nome_completo,
      studentNumber: est.numero_estudante,
      id_estudante: est.id_estudante,
      field: "numero_telemovel",
      action: "REMOVIDO (não normalizável)",
      details: `"${phone}" não pôde ser normalizado — definido como NULL`,
    })

    fixLog.manualReview.phoneFlagged.push({
      student: est.nome_completo,
      number: est.numero_estudante,
      id_estudante: est.id_estudante,
      originalPhone: phone,
    })

    console.log(`  📞 Telefone INVALIDÁVEL: ${est.nome_completo} — "${phone}" → NULL (requer revisão)`)
    fixLog.summary.phonesFlagged++
  }
}

// ── Report Printing ──────────────────────────────────────────────────

function printFixReport(fixLog: FixLog): void {
  console.log("=".repeat(72))
  console.log("  RELATÓRIO DE CORREÇÃO — RESUMO")
  console.log("=".repeat(72))
  console.log(`  Iniciado: ${fixLog.started}`)
  console.log(`  Concluído: ${fixLog.completed}`)
  console.log(`  Ano Lectivo: ${fixLog.academicYear}`)
  console.log()

  // --- Changes Made ---
  const changes = fixLog.changes
  if (changes.length > 0) {
    console.log(`--- CORREÇÕES APLICADAS (${changes.length} alterações) ---`)
    console.log()

    // Group by action type for readability
    const notasCriadas = changes.filter((c) => c.field === "Nota")
    const propinasCriadas = changes.filter((c) => c.field === "PagamentoPropina")
    const phonesCorrigidos = changes.filter((c) => c.field === "numero_telemovel" && c.action === "ACTUALIZADO")
    const phonesRemovidos = changes.filter((c) => c.field === "numero_telemovel" && c.action.startsWith("REMOVIDO"))

    if (notasCriadas.length > 0) {
      console.log(`  📝 Disciplinas (Notas) criadas: ${notasCriadas.length}`)
      for (const c of notasCriadas) {
        console.log(`     [${c.student}] (${c.studentNumber || "sem nº"}) — ${c.details}`)
      }
      console.log()
    }

    if (propinasCriadas.length > 0) {
      console.log(`  💰 Mensalidades (Propinas) criadas: ${propinasCriadas.length}`)
      for (const c of propinasCriadas) {
        console.log(`     [${c.student}] (${c.studentNumber || "sem nº"}) — ${c.details}`)
      }
      console.log()
    }

    if (phonesCorrigidos.length > 0) {
      console.log(`  📞 Telefones corrigidos: ${phonesCorrigidos.length}`)
      for (const c of phonesCorrigidos) {
        console.log(`     [${c.student}] (${c.studentNumber || "sem nº"}) — ${c.details}`)
      }
      console.log()
    }

    if (phonesRemovidos.length > 0) {
      console.log(`  📞 Telefones removidos (não normalizáveis): ${phonesRemovidos.length}`)
      for (const c of phonesRemovidos) {
        console.log(`     [${c.student}] — ${c.details}`)
      }
      console.log()
    }
  }

  // --- Manual Review Flags ---
  const turnos = fixLog.manualReview.turno
  const anos = fixLog.manualReview.courseYear
  const phonesFlagged = fixLog.manualReview.phoneFlagged

  if (turnos.length > 0 || anos.length > 0 || phonesFlagged.length > 0) {
    console.log(`--- REVISÃO MANUAL REQUERIDA ---`)
    console.log()

    if (turnos.length > 0) {
      console.log(`  🕐 Turno em falta (${turnos.length} estudantes) — definir manualmente:`)
      for (const t of turnos) {
        console.log(`     [${t.student}] (${t.number || "sem nº"})`)
      }
      console.log()
    }

    if (anos.length > 0) {
      console.log(`  📅 Ano curricular inválido (${anos.length} estudantes) — verificar:`)
      for (const a of anos) {
        console.log(`     [${a.student}] (${a.number || "sem nº"}) — ${a.detail}`)
      }
      console.log()
    }

    if (phonesFlagged.length > 0) {
      console.log(`  📞 Telefones sem formato válido (${phonesFlagged.length} estudantes) — definir manualmente:`)
      for (const p of phonesFlagged) {
        console.log(`     [${p.student}] (${p.number || "sem nº"}) — original: "${p.originalPhone}"`)
      }
      console.log()
    }
  }

  // --- Summary ---
  console.log("─".repeat(72))
  console.log(`  📊 RESUMO FINAL:`)
  console.log(`     ✅ Notas (disciplinas) criadas: ${fixLog.summary.notasCriadas}`)
  console.log(`     ✅ Propinas criadas: ${fixLog.summary.propinasCriadas}`)
  console.log(`     ✅ Telefones corrigidos: ${fixLog.summary.phonesCorrected}`)
  console.log(`     ⚠  Telefones removidos (revisão): ${fixLog.summary.phonesFlagged}`)
  console.log(`     ⚠  Turno para definir (revisão): ${fixLog.summary.turnoFlagged}`)
  console.log(`     ⚠  Ano curricular inválido (revisão): ${fixLog.summary.courseYearFlagged}`)
  const totalAuto = fixLog.summary.notasCriadas + fixLog.summary.propinasCriadas + fixLog.summary.phonesCorrected
  const totalManual = fixLog.summary.phonesFlagged + fixLog.summary.turnoFlagged + fixLog.summary.courseYearFlagged
  console.log()
  console.log(`     🟢 Correcções automáticas: ${totalAuto}`)
  console.log(`     🟡 Pendentes (revisão manual): ${totalManual}`)
  console.log()
  if (totalAuto === 0 && totalManual === 0) {
    console.log("  ✅ Não foram necessárias correcções — todos os dados estão íntegros.\n")
  }
  console.log("=".repeat(72))
}

// ── Execute ──────────────────────────────────────────────────────────

fixAllStudents()
  .catch((err) => {
    console.error("\n❌ Erro na correcção:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())