/**
 * Phase 1 — Audit Script: Student Data Integrity Check
 *
 * Examines all active students for data integrity issues resulting from
 * system fixes that were applied after certain students were created.
 *
 * Outputs:
 *   - Console: Human-readable plain text report
 *   - File:    audit-log.json (machine-readable)
 *
 * Usage: npx tsx prisma/audit-estudantes.ts
 *
 * No database writes — read-only script.
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
 * Validate phone number in the same way lib/phone.ts does.
 * Accepts: 8 digits, 9 digits starting with 9, or 12 digits starting with 244.
 */
function validatePhone(raw: string | null): boolean {
  if (!raw || raw.trim() === "") return false
  const digits = stripNonDigits(raw)
  if (digits.length === 9 && digits.startsWith("9")) return true
  if (digits.length === 12 && digits.startsWith("244")) return true
  if (digits.length === 8) return true
  return false
}

/** Determine if the stored phone is already in canonical "+244 9XXXXXXXX" format */
function isCanonicalPhone(raw: string | null): boolean {
  if (!raw) return false
  return /^\+244\s9\d{8}$/.test(raw.trim())
}

/**
 * Parse an "ano_lectivo" string like "2025/2026" into start/end years.
 * Returns { startYear, endYear } or null if unparseable.
 */
function parseAnoLectivo(ano: string): { startYear: number; endYear: number } | null {
  const parts = ano.split("/")
  if (parts.length !== 2) return null
  const sy = parseInt(parts[0], 10)
  const ey = parseInt(parts[1], 10)
  if (isNaN(sy) || isNaN(ey)) return null
  return { startYear: sy, endYear: ey }
}

/**
 * Get the academic year start month (0-indexed).
 * In Angola, the academic year typically starts in September (month 8).
 * We derive this by checking existing PagamentoPropina records for the current
 * academic year to see which months they cover. If none exist, default to Sep.
 */
async function detectAcademicYearStartMonth(anoLectivo: string): Promise<number> {
  // Look at existing propina months to infer academic year structure
  const parsed = parseAnoLectivo(anoLectivo)
  if (!parsed) return 8 // default September

  // Check a sample of propina records in this academic year
  const sample = await prisma.pagamentoPropina.findFirst({
    where: {
      OR: [
        { ano: parsed.startYear },
        { ano: parsed.endYear },
      ],
    },
    orderBy: { id_pagamento: "asc" },
    select: { ano: true, mes: true },
  })

  if (!sample) return 8 // no data → assume September start

  // If we find records starting early in the year (Jan-Mar), assume calendar year
  // If records start later (Aug-Sep), assume Sep start
  // This is heuristic: look at the earliest month in the academic year
  const earliest = await prisma.pagamentoPropina.findFirst({
    where: {
      OR: [
        { ano: parsed.startYear },
        { ano: parsed.endYear },
      ],
    },
    orderBy: [{ ano: "asc" }, { mes: "asc" }],
    select: { mes: true, ano: true },
  })

  if (!earliest) return 8
  // If earliest month is Jan-Apr, assume calendar year (Jan start)
  // If earliest is Jul-Dec, assume academic year start around Sep
  if (earliest.mes <= 4) return 0 // January start
  return 8 // September start
}

/**
 * Build the list of (month, year) pairs a student should have propina for,
 * starting from their enrollment date up to the current month.
 */
function getExpectedPropinaMonths(
  dataCadastro: Date | null,
  currentYear: number,
  currentMonth: number, // 1-based
): { mes: number; ano: number }[] {
  const months: { mes: number; ano: number }[] = []

  // If no enrollment date, use July of the current year as fallback start
  const startMonth = dataCadastro ? dataCadastro.getMonth() + 1 : 7 // 1-based
  const startYear = dataCadastro ? dataCadastro.getFullYear() : currentYear

  // Clamp: if enrollment month is in the future (shouldn't happen), use current
  let cursorYear = startYear
  let cursorMonth = startMonth

  // If enrollment is before academic year started, cap at 12 months back max
  // Walk from start to current month
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

// ── Core Audit ───────────────────────────────────────────────────────

interface StudentInfo {
  id_estudante: number
  nome_completo: string
  numero_estudante: string | null
  id_curso: number
  ano_current: number | null
  turno: string
  data_cadastro: Date | null
  numero_telemovel: string | null
  cursoNome: string
  duracao_anos: number | null
}

interface IssueRecord {
  student: string
  number: string | null
  issue: string
  detail: string
}

interface AuditReport {
  generated: string
  academicYear: string
  totalStudentsAudited: number
  issues: {
    missingSubjects: {
      student: string
      number: string | null
      course: string
      ano_current: number | null
      missing: { codigo: string; nome: string; ano_curricular: number; semestre: string }[]
      extra: { codigo: string; nome: string; ano_lectivo: string }[]
    }[]
    missingTurno: { student: string; number: string | null }[]
    courseYearMismatch: {
      student: string
      number: string | null
      course: string
      ano_current: number | null
      duracao_anos: number | null
      detail: string
    }[]
    missingPropina: {
      student: string
      number: string | null
      enrolled: string
      missingMonths: string[]
    }[]
    phoneFormat: {
      student: string
      number: string | null
      currentPhone: string | null
      detail: string
    }[]
  }
}

function createEmptyReport(academicYear: string): AuditReport {
  return {
    generated: new Date().toISOString(),
    academicYear,
    totalStudentsAudited: 0,
    issues: {
      missingSubjects: [],
      missingTurno: [],
      courseYearMismatch: [],
      missingPropina: [],
      phoneFormat: [],
    },
  }
}

async function auditAllStudents(): Promise<void> {
  console.log("=".repeat(72))
  console.log("  SGE ATLÂNTIDA — AUDITORIA DE INTEGRIDADE DOS DADOS DE ESTUDANTES")
  console.log("=".repeat(72))

  // ── 1. Detect current academic year ──────────────────────────────
  const latestPropinaAno = await prisma.pagamentoPropina.findFirst({
    orderBy: { ano: "desc" },
    select: { ano: true },
  })
  const latestNotaAno = await prisma.nota.findFirst({
    orderBy: { ano_lectivo: "desc" },
    select: { ano_lectivo: true },
  })

  // Determine the most recent ano_lectivo string
  let academicYear = ""
  if (latestNotaAno?.ano_lectivo) {
    academicYear = latestNotaAno.ano_lectivo
  } else if (latestPropinaAno) {
    const y = latestPropinaAno.ano
    academicYear = `${y}/${y + 1}`
  } else {
    // Fallback — no data at all
    academicYear = new Date().getFullYear().toString()
    console.log("\n⚠ No academic year data found in database.")
    console.log(`  Using fallback: ${academicYear}\n`)
  }

  console.log(`\n  Ano Lectivo detectado: ${academicYear}\n`)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-based

  const report = createEmptyReport(academicYear)

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

  report.totalStudentsAudited = estudantes.length
  console.log(`  Total de estudantes activos auditados: ${estudantes.length}\n`)

  let issueCount = 0

  for (const est of estudantes) {
    const studentInfo: StudentInfo = {
      id_estudante: est.id_estudante,
      nome_completo: est.nome_completo,
      numero_estudante: est.numero_estudante,
      id_curso: est.id_curso,
      ano_current: est.ano_current,
      turno: est.turno,
      data_cadastro: est.data_cadastro,
      numero_telemovel: est.numero_telemovel,
      cursoNome: est.curso.nome_curso,
      duracao_anos: est.curso.duracao_anos,
    }

    // ── 3. Check subject assignments ──────────────────────────────
    if (est.ano_current && academicYear) {
      await checkSubjectAssignments(studentInfo, academicYear, report, issueCount)
    }

    // ── 4. Check turno ────────────────────────────────────────────
    checkTurno(studentInfo, report, issueCount)

    // ── 5. Check course/year mismatch ─────────────────────────────
    checkCourseYearMismatch(studentInfo, report, issueCount)

    // ── 6. Check propina records ──────────────────────────────────
    await checkPropinaRecords(studentInfo, currentYear, currentMonth, academicYear, report, issueCount)

    // ── 7. Check phone format ─────────────────────────────────────
    checkPhoneFormat(studentInfo, report, issueCount)
  }

  // ── Print summary grouped by issue type ────────────────────────────
  printReportByIssueType(report)

  // ── Write JSON log file ───────────────────────────────────────────
  const logPath = path.resolve(__dirname, "..", "audit-log.json")
  fs.writeFileSync(logPath, JSON.stringify(report, null, 2), "utf-8")
  console.log(`\n📄 Audit log (JSON) salvo em: ${logPath}\n`)
}

// ── Issue Checkers ───────────────────────────────────────────────────

async function checkSubjectAssignments(
  est: StudentInfo,
  anoLectivo: string,
  report: AuditReport,
  _counter: number,
): Promise<void> {
  if (!est.ano_current) return

  // Get curriculum disciplines for the student's current course + year
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
        },
      },
    },
  })

  if (curriculum.length === 0) {
    // Course has no curriculum defined for this year — not necessarily an issue
    return
  }

  // Get existing Nota records for this student in the current academic year
  const existingNotas = await prisma.nota.findMany({
    where: {
      id_estudante: est.id_estudante,
      ano_lectivo: anoLectivo,
    },
    select: {
      id_disciplina: true,
    },
  })

  const existingDisciplineIds = new Set(existingNotas.map((n) => n.id_disciplina))

  // Find missing disciplines (in curriculum but no Nota)
  const missing: { codigo: string; nome: string; ano_curricular: number; semestre: string }[] = []
  for (const cd of curriculum) {
    if (!existingDisciplineIds.has(cd.disciplina.id_disciplina)) {
      missing.push({
        codigo: cd.disciplina.codigo_disciplina,
        nome: cd.disciplina.nome_disciplina,
        ano_curricular: cd.ano_curricular,
        semestre: cd.semestre,
      })
    }
  }

  // Find extra disciplines (have Nota but not in curriculum for this year)
  const extra: { codigo: string; nome: string; ano_lectivo: string }[] = []
  for (const nota of existingNotas) {
    const inCurriculum = curriculum.some((cd) => cd.id_disciplina === nota.id_disciplina)
    if (!inCurriculum) {
      const disc = await prisma.disciplina.findUnique({
        where: { id_disciplina: nota.id_disciplina },
        select: { codigo_disciplina: true, nome_disciplina: true },
      })
      if (disc) {
        extra.push({
          codigo: disc.codigo_disciplina,
          nome: disc.nome_disciplina,
          ano_lectivo: anoLectivo,
        })
      }
    }
  }

  if (missing.length > 0 || extra.length > 0) {
    report.issues.missingSubjects.push({
      student: est.nome_completo,
      number: est.numero_estudante,
      course: est.cursoNome,
      ano_current: est.ano_current,
      missing,
      extra,
    })
  }
}

function checkTurno(
  est: StudentInfo,
  report: AuditReport,
  _counter: number,
): void {
  if (!est.turno || est.turno.trim() === "") {
    report.issues.missingTurno.push({
      student: est.nome_completo,
      number: est.numero_estudante,
    })
  }
}

function checkCourseYearMismatch(
  est: StudentInfo,
  report: AuditReport,
  _counter: number,
): void {
  if (est.ano_current === null || est.ano_current === undefined) {
    report.issues.courseYearMismatch.push({
      student: est.nome_completo,
      number: est.numero_estudante,
      course: est.cursoNome,
      ano_current: est.ano_current,
      duracao_anos: est.duracao_anos,
      detail: "ano_current is null",
    })
    return
  }

  if (est.duracao_anos && est.ano_current > est.duracao_anos) {
    report.issues.courseYearMismatch.push({
      student: est.nome_completo,
      number: est.numero_estudante,
      course: est.cursoNome,
      ano_current: est.ano_current,
      duracao_anos: est.duracao_anos,
      detail: `ano_current=${est.ano_current} excede duração do curso (${est.duracao_anos} anos)`,
    })
  }

  if (est.ano_current < 1) {
    report.issues.courseYearMismatch.push({
      student: est.nome_completo,
      number: est.numero_estudante,
      course: est.cursoNome,
      ano_current: est.ano_current,
      duracao_anos: est.duracao_anos,
      detail: `ano_current=${est.ano_current} is less than 1`,
    })
  }
}

async function checkPropinaRecords(
  est: StudentInfo,
  currentYear: number,
  currentMonth: number,
  _academicYear: string,
  report: AuditReport,
  _counter: number,
): Promise<void> {
  // Get expected months from enrollment date
  const expectedMonths = getExpectedPropinaMonths(
    est.data_cadastro,
    currentYear,
    currentMonth,
  )

  if (expectedMonths.length === 0) return

  // Fetch existing propina records for this student
  const existingPropinas = await prisma.pagamentoPropina.findMany({
    where: { id_estudante: est.id_estudante },
    select: { mes: true, ano: true },
  })

  const existingSet = new Set(existingPropinas.map((p) => `${p.ano}-${p.mes}`))

  // Find missing months
  const missingMonths: string[] = []
  for (const em of expectedMonths) {
    const key = `${em.ano}-${em.mes}`
    if (!existingSet.has(key)) {
      missingMonths.push(`${em.mes}/${em.ano}`)
    }
  }

  if (missingMonths.length > 0) {
    report.issues.missingPropina.push({
      student: est.nome_completo,
      number: est.numero_estudante,
      enrolled: est.data_cadastro ? est.data_cadastro.toISOString().split("T")[0] : "N/A",
      missingMonths,
    })
  }
}

function checkPhoneFormat(
  est: StudentInfo,
  report: AuditReport,
  _counter: number,
): void {
  const phone = est.numero_telemovel

  // No phone at all
  if (!phone || phone.trim() === "") {
    report.issues.phoneFormat.push({
      student: est.nome_completo,
      number: est.numero_estudante,
      currentPhone: phone,
      detail: "phone number is null/empty",
    })
    return
  }

  // Already in canonical format
  if (isCanonicalPhone(phone)) return

  // Try to validate
  if (validatePhone(phone)) {
    report.issues.phoneFormat.push({
      student: est.nome_completo,
      number: est.numero_estudante,
      currentPhone: phone,
      detail: `"${phone}" can be formatted to canonical "+244 9XXXXXXXX"`,
    })
  } else {
    report.issues.phoneFormat.push({
      student: est.nome_completo,
      number: est.numero_estudante,
      currentPhone: phone,
      detail: `"${phone}" is not a valid Angolan mobile number — cannot normalize`,
    })
  }
}

// ── Report Printing ──────────────────────────────────────────────────

function printReportByIssueType(report: AuditReport): void {
  console.log("=".repeat(72))
  console.log("  RELATÓRIO DE AUDITORIA — RESUMO POR TIPO DE PROBLEMA")
  console.log("=".repeat(72))
  console.log(`  Gerado em: ${report.generated}`)
  console.log(`  Ano Lectivo: ${report.academicYear}`)
  console.log(`  Estudantes auditados: ${report.totalStudentsAudited}`)
  console.log()

  // --- Missing Subjects ---
  const subj = report.issues.missingSubjects
  if (subj.length > 0) {
    console.log(`--- PROBLEMA: Disciplinas em Falta / Extras (${subj.length} estudantes) ---`)
    for (const s of subj) {
      console.log(`  [${s.student}] (${s.number || "sem nº"}) — ${s.course} • ${s.ano_current}º Ano`)
      if (s.missing.length > 0) {
        console.log(`    ❌ Em falta:`)
        for (const m of s.missing) {
          console.log(`       - ${m.codigo} (${m.nome}) — ${m.ano_curricular}º Ano • ${m.semestre}`)
        }
      }
      if (s.extra.length > 0) {
        console.log(`    ⚠ Extras (não pertencem ao currículo do ano):`)
        for (const e of s.extra) {
          console.log(`       - ${e.codigo} (${e.nome}) — ${e.ano_lectivo}`)
        }
      }
    }
    console.log()
  }

  // --- Missing Turno ---
  const turnos = report.issues.missingTurno
  if (turnos.length > 0) {
    console.log(`--- PROBLEMA: Turno em Falta (${turnos.length} estudantes) ---`)
    for (const t of turnos) {
      console.log(`  [${t.student}] (${t.number || "sem nº"}) — turno: "" (vazio/nulo)`)
    }
    console.log(`  ⚠ Não será corrigido automaticamente — requer revisão manual`)
    console.log()
  }

  // --- Course/Year Mismatch ---
  const anos = report.issues.courseYearMismatch
  if (anos.length > 0) {
    console.log(`--- PROBLEMA: Ano Curricular Inválido (${anos.length} estudantes) ---`)
    for (const a of anos) {
      console.log(`  [${a.student}] (${a.number || "sem nº"}) — ${a.course}`)
      console.log(`    ${a.detail}`)
    }
    console.log(`  ⚠ Não será corrigido automaticamente — requer revisão manual`)
    console.log()
  }

  // --- Missing Propina ---
  const propinas = report.issues.missingPropina
  if (propinas.length > 0) {
    console.log(`--- PROBLEMA: Mensalidades (Propina) em Falta (${propinas.length} estudantes) ---`)
    for (const p of propinas) {
      console.log(`  [${p.student}] (${p.number || "sem nº"})`)
      console.log(`    Inscrito desde: ${p.enrolled}`)
      console.log(`    Meses em falta:`)
      for (const m of p.missingMonths) {
        console.log(`       - ${m}`)
      }
    }
    console.log()
  }

  // --- Phone Format ---
  const phones = report.issues.phoneFormat
  if (phones.length > 0) {
    console.log(`--- PROBLEMA: Formato de Telefone Inválido (${phones.length} estudantes) ---`)
    for (const p of phones) {
      console.log(`  [${p.student}] (${p.number || "sem nº"})`)
      console.log(`    Actual: "${p.currentPhone || "vazio"}"`)
      console.log(`    ${p.detail}`)
    }
    console.log()
  }

  // --- Summary ---
  const totalIssues =
    subj.length + turnos.length + anos.length + propinas.length + phones.length
  console.log("─".repeat(72))
  console.log(`  📊 RESUMO FINAL:`)
  console.log(`     Estudantes com problemas: ${totalIssues > 0 ? "⚠ " + totalIssues : "✅ 0"}`)
  console.log(`     Disciplinas em falta/extras: ${subj.length} estudantes`)
  console.log(`     Turno em falta: ${turnos.length} estudantes`)
  console.log(`     Ano curricular inválido: ${anos.length} estudantes`)
  console.log(`     Mensalidades em falta: ${propinas.length} estudantes`)
  console.log(`     Telefone inválido: ${phones.length} estudantes`)
  console.log()
  if (totalIssues === 0) {
    console.log("  ✅ Não foram encontrados problemas de integridade.")
    console.log("  Todos os estudantes activos estão em conformidade.\n")
  } else {
    console.log("  ⚠ Corra o script de correcção para resolver os problemas identificados:\n")
    console.log("     npx tsx prisma/fix-estudantes.ts\n")
  }
  console.log("=".repeat(72))
}

// ── Execute ──────────────────────────────────────────────────────────

auditAllStudents()
  .catch((err) => {
    console.error("\n❌ Erro na auditoria:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())