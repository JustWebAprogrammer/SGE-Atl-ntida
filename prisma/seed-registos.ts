/**
 * Seed script for test SnapshotSemestre records (Registos Lectivo).
 *
 * Creates sample snapshots so the admin "Registos Lectivo" page has data
 * to display for testing purposes.
 *
 * Run with: npx tsx prisma/seed-registos.ts
 *
 * Depends on: main seed (prisma/seed.ts) having been run first to create
 * the student "Ben Minogashita", the admin user, and disciplines.
 */
import * as dotenv from "dotenv"
dotenv.config()

import bcrypt from "bcryptjs"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

/**
 * Helper to build a snapshot entry for one discipline-grade row,
 * matching the structure created by lib/reenrollment.ts
 */
function makeNotaSnapshot(
  id_nota: number | null,
  id_disciplina: number,
  codigo_disciplina: string,
  nome_disciplina: string,
  ano_curricular: number,
  semestre: string,
  grades: {
    ac1?: number; ac2?: number; ac3?: number; ttp?: number
    pp1?: number; pp2?: number; exame?: number
    recurso?: number; exame_especial?: number
    nota_final?: number | null
  },
  dispensada: boolean,
  tem_dispensa: boolean,
  nota_dispensa: number
) {
  return {
    id_nota,
    id_disciplina,
    codigo_disciplina,
    nome_disciplina,
    ano_curricular,
    semestre,
    ac1: grades.ac1 ?? null,
    ac2: grades.ac2 ?? null,
    ac3: grades.ac3 ?? null,
    ttp: grades.ttp ?? null,
    pp1: grades.pp1 ?? null,
    pp2: grades.pp2 ?? null,
    exame: grades.exame ?? null,
    recurso: grades.recurso ?? null,
    exame_especial: grades.exame_especial ?? null,
    nota_final: grades.nota_final ?? null,
    dispensada,
    tem_dispensa,
    nota_dispensa,
  }
}

async function main() {
  console.log("📋 Registos Lectivo test seed...")

  // ── Find existing entities ──
  const adminUser = await prisma.usuario.findFirst({
    where: { tipo_usuario: "admin" },
    select: { id_usuario: true, nome_usuario: true },
  })
  if (!adminUser) {
    console.error("❌ No admin user found. Run main seed first.")
    process.exit(1)
  }
  console.log(`   Admin: ${adminUser.nome_usuario} (id=${adminUser.id_usuario})`)

  // Find Ben Minogashita
  const benEstudante = await prisma.estudante.findFirst({
    where: { numero_estudante: "20240001" },
    select: {
      id_estudante: true,
      nome_completo: true,
      id_curso: true,
      turno: true,
      curso: { select: { nome_curso: true, id_curso: true } },
    },
  })
  if (!benEstudante) {
    console.error("❌ Student Ben Minogashita not found. Run main seed first.")
    process.exit(1)
  }
  console.log(`   Estudante: ${benEstudante.nome_completo} (id=${benEstudante.id_estudante}), Curso: ${benEstudante.curso.nome_curso}, Turno: ${benEstudante.turno}`)

  // Find disciplines by code
  function findDisc(codigo: string) {
    // We'll use the codes from the main seed — match at runtime
    return prisma.disciplina.findUnique({ where: { codigo_disciplina: codigo } })
  }

  // ── Scenario A: "Avançou de Ano" — 1º Ano (2024/2025), passed everything ──
  // Based on Ben's actual grades from seed.ts:
  // MAT1: 13 (exame), PRG1: dispensou (15 media), SD1: dispensou (14 media)
  // MAT2: 12 (exame), PRG2: dispensou (16 media), MD1: 11 (recurso)
  const mat1 = await findDisc("MAT1")
  const prg1 = await findDisc("PRG1")
  const sd1  = await findDisc("SD1")
  const mat2 = await findDisc("MAT2")
  const prg2 = await findDisc("PRG2")
  const md1  = await findDisc("MD1")

  if (!mat1 || !prg1 || !sd1 || !mat2 || !prg2 || !md1) {
    console.error("❌ Could not find all 1º Ano disciplines. Run main seed first.")
    process.exit(1)
  }

  const snapshotAno1 = [
    makeNotaSnapshot(null, mat1.id_disciplina, "MAT1", "Matemática I", 1, "S1",
      { ac1: 10, ac2: 11, ac3: 12, ttp: 11, pp1: 12, pp2: 10, exame: 13, nota_final: 13 },
      false, false, 14),
    makeNotaSnapshot(null, prg1.id_disciplina, "PRG1", "Programação I", 1, "S1",
      { ac1: 15, ac2: 16, ac3: 14, ttp: 15, pp1: 16, pp2: 15, nota_final: 15 },
      true, true, 14),
    makeNotaSnapshot(null, sd1.id_disciplina, "SD1", "Sistemas Digitais", 1, "S1",
      { ac1: 14, ac2: 14, ac3: 15, ttp: 13, pp1: 14, pp2: 15, nota_final: 14 },
      true, true, 14),
    makeNotaSnapshot(null, mat2.id_disciplina, "MAT2", "Matemática II", 1, "S2",
      { ac1: 9, ac2: 10, ac3: 11, ttp: 10, pp1: 9, pp2: 11, exame: 12, nota_final: 12 },
      false, false, 14),
    makeNotaSnapshot(null, prg2.id_disciplina, "PRG2", "Programação II", 1, "S2",
      { ac1: 16, ac2: 17, ac3: 15, ttp: 16, pp1: 17, pp2: 16, nota_final: 16 },
      true, true, 14),
    makeNotaSnapshot(null, md1.id_disciplina, "MD1", "Matemática Discreta", 1, "S2",
      { ac1: 7, ac2: 8, ac3: 9, ttp: 8, pp1: 7, pp2: 9, exame: 0, recurso: 11, nota_final: 11 },
      false, false, 14),
  ]

  await prisma.snapshotSemestre.create({
    data: {
      id_estudante: benEstudante.id_estudante,
      ano_lectivo: "2024/2025",
      semestre: "S2",
      data_snapshot: new Date("2025-07-31"),
      notas_snapshot: JSON.stringify(snapshotAno1),
      criado_por: adminUser.id_usuario,
    },
  })
  console.log(`   ✅ Snapshot "Avançou de Ano" (2024/2025) — ${benEstudante.nome_completo} passou 6/6`)

  // ── Scenario B: Create a second student who failed some subjects ──
  // "Maria Reprovada" — 2º Ano, failed BD2 and ES1 in 2025/2026
  const mariaUser = await prisma.usuario.upsert({
    where: { email: "maria@ispatlantida.ao" },
    update: {},
    create: {
      nome_usuario: "Maria Reprovada",
      email: "maria@ispatlantida.ao",
      senha: bcrypt.hashSync("student123", 10),
      tipo_usuario: "estudante",
    },
  })

  await prisma.estudante.upsert({
    where: { id_usuario: mariaUser.id_usuario },
    update: {},
    create: {
      id_usuario: mariaUser.id_usuario,
      nome_completo: "Maria Reprovada",
      numero_estudante: "20240002",
      id_curso: benEstudante.id_curso,
      ano_current: 2,
      ano_electivo: "2025/2026",
      turno: "Vespertino",
      estado: "EmCurso",
      pagamento: "Pendente",
      tipo_bolsa: "Nenhuma",
    },
  })

  const mariaEstudante = await prisma.estudante.findFirst({
    where: { numero_estudante: "20240002" },
    select: { id_estudante: true, nome_completo: true },
  })

  if (!mariaEstudante) {
    console.error("❌ Failed to find/create Maria Reprovada")
    process.exit(1)
  }

  console.log(`   👤 Student: ${mariaEstudante.nome_completo} (id=${mariaEstudante.id_estudante})`)

  // Find 2º Ano disciplines
  const bd1 = await findDisc("BD1")
  const rc1 = await findDisc("RC1")
  const so1 = await findDisc("SO1")
  const bd2 = await findDisc("BD2")
  const es1 = await findDisc("ES1")

  if (!bd1 || !rc1 || !so1 || !bd2 || !es1) {
    console.error("❌ Could not find all 2º Ano disciplines. Run main seed first.")
    process.exit(1)
  }

  const snapshotAno2 = [
    // Passed subjects
    makeNotaSnapshot(null, bd1.id_disciplina, "BD1", "Base de Dados I", 2, "S1",
      { ac1: 14, ac2: 15, ac3: 13, ttp: 14, pp1: 13, pp2: 15, exame: 16, nota_final: 15 },
      false, true, 14),
    makeNotaSnapshot(null, rc1.id_disciplina, "RC1", "Redes de Computadores", 2, "S1",
      { ac1: 12, ac2: 13, ac3: 14, ttp: 12, pp1: 14, pp2: 13, exame: 11, nota_final: 12 },
      false, true, 14),
    makeNotaSnapshot(null, so1.id_disciplina, "SO1", "Sistemas Operativos", 2, "S1",
      { ac1: 10, ac2: 11, ac3: 10, ttp: 12, pp1: 11, pp2: 10, exame: 9, recurso: 10, nota_final: 10 },
      false, true, 14),
    // Failed subjects
    makeNotaSnapshot(null, bd2.id_disciplina, "BD2", "Base de Dados II", 2, "S2",
      { ac1: 6, ac2: 5, ac3: 7, ttp: 6, pp1: 5, pp2: 7, exame: 4, recurso: 5, nota_final: 5 },
      false, true, 14),
    makeNotaSnapshot(null, es1.id_disciplina, "ES1", "Engenharia de Software", 2, "S2",
      { ac1: 8, ac2: 7, ac3: 6, ttp: 7, pp1: 8, pp2: 6, exame: 5, recurso: 6, nota_final: 6 },
      false, true, 14),
  ]

  await prisma.snapshotSemestre.create({
    data: {
      id_estudante: mariaEstudante.id_estudante,
      ano_lectivo: "2025/2026",
      semestre: "S2",
      data_snapshot: new Date("2026-07-31"),
      notas_snapshot: JSON.stringify(snapshotAno2),
      criado_por: adminUser.id_usuario,
    },
  })
  console.log(`   ✅ Snapshot "Repetiu o Ano" (2025/2026) — Maria Reprovada falhou 2/5 (BD2=5, ES1=6)`)

  console.log("")
  console.log("🎉 Seed completed successfully. 2 registos created.")
  console.log("   Go to Admin > Sistema > Registos Lectivo to view them.")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())