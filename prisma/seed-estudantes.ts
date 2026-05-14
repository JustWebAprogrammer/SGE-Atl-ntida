import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { atribuirDisciplinasAoEstudante } from "../lib/atribuirDisciplinas"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── Helpers de cálculo de notas ───────────────────────────────────────────
function calcNotaAC(ac1: number, ac2: number, ac3: number, ttp: number, pp1: number, pp2: number) {
  const blocoAC = ((ac1 + ac2 + ac3) / 3 + ttp) / 2
  const blocoPP = (pp1 + pp2) / 2
  return (blocoAC + blocoPP) / 2
}

function calcComExame(notaAC: number, exame: number) {
  return notaAC * 0.4 + exame * 0.6
}

// Calcula ano lectivo anterior: ex: "2025/2026" - 1 = "2024/2025"
function anoLectivoAnterior(ano: string, anosAtras: number): string {
  const [start, end] = ano.split("/").map(Number)
  return `${start - anosAtras}/${end - anosAtras}`
}

type NotaSeed = {
  codigo: string
  ano_lectivo: string
  semestre: "S1" | "S2"
  ac1: number; ac2: number; ac3: number; ttp: number; pp1: number; pp2: number
  exame?: number
  recurso?: number
}

async function criarNotas(
  estudanteId: number,
  notasSeed: NotaSeed[],
  discMap: Map<string, { id_disciplina: number; tem_dispensa: boolean; nota_dispensa: number }>
) {
  for (const n of notasSeed) {
    const disc = discMap.get(n.codigo)
    if (!disc) continue

    // Verificar se já existe uma Nota para esta disciplina (criada pelo atribuirDisciplinas)
    const notaExistente = await prisma.nota.findFirst({
      where: {
        id_estudante: estudanteId,
        id_disciplina: disc.id_disciplina,
        ano_lectivo: n.ano_lectivo,
      },
    })

    const temTodosComponentes =
      n.ac1 > 0 && n.ac2 > 0 && n.ac3 > 0 &&
      n.ttp > 0 && n.pp1 > 0 && n.pp2 > 0

    let nota_final: number | null = null
    let dispensada = false
    let tipo_avaliacao: "Normal" | "Recurso" | "Especial" = "Normal"

    if (temTodosComponentes) {
      const notaAC = calcNotaAC(n.ac1, n.ac2, n.ac3, n.ttp, n.pp1, n.pp2)

      if (n.recurso !== undefined) {
        nota_final = n.recurso
        tipo_avaliacao = "Recurso"
      } else if (disc.tem_dispensa && notaAC >= disc.nota_dispensa) {
        nota_final = Math.round(notaAC * 100) / 100
        dispensada = true
      } else if (n.exame !== undefined) {
        nota_final = Math.round(calcComExame(notaAC, n.exame) * 100) / 100
      } else {
        nota_final = null
      }
    }

    if (notaExistente) {
      // Actualizar nota existente com os valores do seed
      await prisma.nota.update({
        where: { id_nota: notaExistente.id_nota },
        data: {
          semestre: n.semestre,
          ac1: n.ac1, ac2: n.ac2, ac3: n.ac3,
          ttp: n.ttp, pp1: n.pp1, pp2: n.pp2,
          exame: n.exame ?? null,
          recurso: n.recurso ?? null,
          nota_final,
          dispensada,
          tipo_avaliacao,
        },
      })
    } else {
      // Criar nova nota
      await prisma.nota.create({
        data: {
          id_estudante: estudanteId,
          id_disciplina: disc.id_disciplina,
          ano_lectivo: n.ano_lectivo,
          semestre: n.semestre,
          ac1: n.ac1, ac2: n.ac2, ac3: n.ac3,
          ttp: n.ttp, pp1: n.pp1, pp2: n.pp2,
          exame: n.exame ?? null,
          recurso: n.recurso ?? null,
          nota_final,
          dispensada,
          tipo_avaliacao,
        },
      })
    }
  }
}

// Calcula anos lectivos anteriores para currículos: ex: anoActual="2025/2026", anosCompletos=2 
// dá [0º ano atrás, 1º ano atrás] = ["2025/2026", "2024/2025"]
function anosLectivosAnteriores(anoActual: string, quantos: number): string[] {
  const anos: string[] = []
  for (let i = quantos - 1; i >= 0; i--) {
    anos.push(anoLectivoAnterior(anoActual, i))
  }
  return anos
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("==========================================")
  console.log("🎓 SEED DE ESTUDANTES")
  console.log("==========================================\n")

  // ── Passo 1: Verificar matrícula via API ─────────────────────────────────
  console.log("🔍 A verificar estado da matrícula...")
  console.log("   (Certifique-se que o servidor está a correr: npm run dev)\n")

  let enrollmentOpen = false
  let anoLectivoAtual = ""
  try {
    const res = await fetch("http://localhost:3000/api/admin/sistema/config")
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    enrollmentOpen = data.is_enrollment_open === true

    if (enrollmentOpen) {
      anoLectivoAtual = data.ano_lectivo_atual || "2025/2026"
      console.log("   ✅ Matrícula está ABERTA!\n")
      console.log(`      Data do sistema: ${data.system_date || "desconhecida"}`)
      console.log(`      Ano Lectivo: ${anoLectivoAtual}`)
      console.log(`      Período: ${data.matricula_data_inicio?.split("T")[0]} → ${data.matricula_data_fim?.split("T")[0]}\n`)
    } else {
      console.log("   ❌ Matrícula está FECHADA!\n")
      console.log(`      Data do sistema: ${data.system_date || "desconhecida"}`)
      console.log(`      Período: ${data.matricula_data_inicio?.split("T")[0]} → ${data.matricula_data_fim?.split("T")[0]}\n`)
      console.log("╔═══════════════════════════════════════════════════════════╗")
      console.log("║  Para criar estudantes, active o simulador no painel     ║")
      console.log("║  admin com uma data entre início e fim da matrícula.     ║")
      console.log("╚═══════════════════════════════════════════════════════════╝")
      process.exit(1)
    }
  } catch (err) {
    console.error("❌ ERRO: Não foi possível contactar o servidor em http://localhost:3000")
    console.error("   Certifique-se que 'npm run dev' está a correr.")
    console.error(`   Detalhes: ${err instanceof Error ? err.message : err}\n`)
    process.exit(1)
  }

  // ── Passo 2: Buscar dados base ──────────────────────────────────────────
  console.log("📦 A carregar dados base...")

  const deptos = await prisma.departamento.findMany()
  const deptoEI = deptos.find(d => d.nome_departamento.includes("Informática"))!
  const deptoEC = deptos.find(d => d.nome_departamento.includes("Civil"))!
  const deptoGE = deptos.find(d => d.nome_departamento.includes("Gestão"))!

  const cursos = await prisma.curso.findMany()
  const cursoEI = cursos.find(c => c.nome_curso.includes("Informática"))!
  const cursoEC = cursos.find(c => c.nome_curso.includes("Civil"))!
  const cursoGE = cursos.find(c => c.nome_curso.includes("Gestão"))!

  const todasDisciplinas = await prisma.disciplina.findMany()
  const discMap = new Map(todasDisciplinas.map(d => [d.codigo_disciplina, d]))

  const orientadores = await prisma.orientador.findMany()
  const oriEI = orientadores.find(o => o.e_gestor && o.id_departamento === deptoEI.id_departamento)!
  const oriEC = orientadores.find(o => o.e_gestor && o.id_departamento === deptoEC.id_departamento)!
  const oriEINaoGestor = orientadores.find(o => !o.e_gestor && o.id_departamento === deptoEI.id_departamento)!
  const oriGE = orientadores.find(o => o.id_departamento === deptoGE.id_departamento)!

  console.log(`   ✅ Dados carregados: ${cursos.length} cursos, ${todasDisciplinas.length} disciplinas, ${orientadores.length} orientadores\n`)

  // ── Passo 3: Criar estudantes ────────────────────────────────────────────
  console.log("👨‍🎓 A criar estudantes...\n")
  console.log(`   Usando ano lectivo do sistema: ${anoLectivoAtual}\n`)

  const senhaEst = await bcrypt.hash("student123", 10)
  const senhaEst4 = await bcrypt.hash("student4ano123", 10)

  interface StudentDef {
    nome: string
    email: string
    senha: string
    numero: string
    curso: typeof cursoEI
    ano: number
    turno: string
    estado: "EmCurso" | "Finalizado" | "Desistente" | "Suspendido"
    bolsa?: "Nenhuma" | "Cinquenta" | "Cem"
  }

  const studentsDef: StudentDef[] = [
    // ── Eng. Informática ──
    { nome: "Ben Minogashita", email: "estudante@ispatlantida.ao", senha: senhaEst, numero: "20240001", curso: cursoEI, ano: 2, turno: "Matinal", estado: "EmCurso", bolsa: "Cinquenta" },
    { nome: "Ana Silva",       email: "ana@ispatlantida.ao",       senha: senhaEst4, numero: "20220001", curso: cursoEI, ano: 4, turno: "Vespertino", estado: "EmCurso" },
    { nome: "Carlos Manuel",   email: "carlos@ispatlantida.ao",    senha: senhaEst4, numero: "20220002", curso: cursoEI, ano: 4, turno: "Matinal", estado: "EmCurso" },
    { nome: "Maria Santos",    email: "maria@ispatlantida.ao",     senha: senhaEst4, numero: "20220003", curso: cursoEI, ano: 4, turno: "Vespertino", estado: "EmCurso" },
    { nome: "Pedro Costa",     email: "pedro@ispatlantida.ao",     senha: senhaEst4, numero: "20220004", curso: cursoEI, ano: 4, turno: "Matinal", estado: "EmCurso" },
    { nome: "João Lucas",      email: "joao@ispatlantida.ao",      senha: senhaEst,  numero: "20230001", curso: cursoEI, ano: 3, turno: "Matinal", estado: "EmCurso" },
    { nome: "Sofia Ribeiro",   email: "sofia@ispatlantida.ao",     senha: senhaEst,  numero: "20240002", curso: cursoEI, ano: 2, turno: "Vespertino", estado: "EmCurso" },
    { nome: "Tiago Almeida",   email: "tiago@ispatlantida.ao",     senha: senhaEst,  numero: "20250001", curso: cursoEI, ano: 1, turno: "Matinal", estado: "EmCurso" },
    { nome: "Rui Martins",     email: "rui@ispatlantida.ao",       senha: senhaEst,  numero: "20210001", curso: cursoEI, ano: 4, turno: "Matinal", estado: "Finalizado" },
    { nome: "Lara Costa",      email: "lara@ispatlantida.ao",      senha: senhaEst,  numero: "20250002", curso: cursoEI, ano: 1, turno: "Vespertino", estado: "Suspendido" },
    // ── Eng. Civil ──
    { nome: "André Fernandes", email: "andre@ispatlantida.ao",     senha: senhaEst,  numero: "20230010", curso: cursoEC, ano: 3, turno: "Matinal", estado: "EmCurso" },
    { nome: "Beatriz Nunes",   email: "beatriz@ispatlantida.ao",   senha: senhaEst,  numero: "20240010", curso: cursoEC, ano: 2, turno: "Vespertino", estado: "EmCurso" },
    { nome: "Diogo Pereira",   email: "diogo@ispatlantida.ao",     senha: senhaEst,  numero: "20220010", curso: cursoEC, ano: 4, turno: "Matinal", estado: "EmCurso" },
    { nome: "Helena Mendes",   email: "helena@ispatlantida.ao",    senha: senhaEst,  numero: "20210010", curso: cursoEC, ano: 4, turno: "Matinal", estado: "Finalizado" },
    // ── Gestão ──
    { nome: "Ricardo Santos",  email: "ricardo@ispatlantida.ao",   senha: senhaEst,  numero: "20230020", curso: cursoGE, ano: 3, turno: "Noturno", estado: "EmCurso" },
    { nome: "Vera Lopes",      email: "vera@ispatlantida.ao",      senha: senhaEst,  numero: "20240020", curso: cursoGE, ano: 2, turno: "Matinal", estado: "EmCurso" },
    { nome: "Nuno Torres",     email: "nuno@ispatlantida.ao",      senha: senhaEst,  numero: "20250020", curso: cursoGE, ano: 1, turno: "Noturno", estado: "EmCurso" },
  ]

  interface CreatedStudent {
    id_estudante: number
    id_usuario: number
    def: StudentDef
    cursoId: number
  }

  const createdStudents: CreatedStudent[] = []

  for (const def of studentsDef) {
    const user = await prisma.usuario.create({
      data: {
        nome_usuario: def.nome,
        email: def.email,
        senha: def.senha,
        tipo_usuario: "estudante"
      }
    })

    const estudante = await prisma.estudante.create({
      data: {
        nome_completo: def.nome,
        numero_estudante: def.numero,
        id_curso: def.curso.id_curso,
        id_usuario: user.id_usuario,
        ano_current: def.ano,
        ano_electivo: anoLectivoAtual,
        turno: def.turno,
        estado: def.estado,
        pagamento: def.estado === "EmCurso" ? "Pendente" : "Pago",
        tipo_bolsa: def.bolsa || "Nenhuma",
        ano_bolsa: def.ano === 4 ? undefined : anoLectivoAtual,
      }
    })

    createdStudents.push({ id_estudante: estudante.id_estudante, id_usuario: user.id_usuario, def, cursoId: def.curso.id_curso })
    console.log(`   ✅ ${def.nome} (${def.ano}º ${def.estado === "Finalizado" ? "🎓 Finalizado" : def.estado === "Suspendido" ? "⛔ Suspenso" : "ano"})`)
  }

  // ── Passo 3b: Atribuir disciplinas via lib/atribuirDisciplinas ──
  // Usa a função centralizada que já trata correctamente:
  //  - Criar Notas vazias com ano_lectivo correcto para cada ano curricular
  //  - Criar/actualizar CurriculoAcademico com ano_lectivo correcto
  //  - Ser idempotente (não duplica se já existe)
  console.log("📚 A atribuir disciplinas aos estudantes...\n")
  for (const cs of createdStudents) {
    if (cs.def.estado !== "EmCurso" && cs.def.estado !== "Finalizado") continue

    const total = await atribuirDisciplinasAoEstudante(
      cs.id_estudante,
      cs.def.curso.id_curso,
      cs.def.ano,
      anoLectivoAtual,
      prisma  // ← passa o prisma do seed para evitar conflito de conexões
    )
    console.log(`   📖 ${cs.def.nome}: ${total} disciplinas atribuídas`)
  }
  console.log("")

  console.log(`\n   Total: ${createdStudents.length} estudantes criados\n`)

  // ── NOTA: Passo 4 removido — os currículos já são criados no Passo 3b
  // pela função atribuirDisciplinasAoEstudante() que já trata dos currículos.
  console.log("📜 Currículos já criados (pela função atribuirDisciplinasAoEstudante)\n")

  // ── Passo 5: Notas ────────────────────────────────────────────────────
  console.log("📊 A criar notas...")

  const A1 = anoLectivoAnterior(anoLectivoAtual, 1) // 1 ano atrás
  const A2 = anoLectivoAnterior(anoLectivoAtual, 2) // 2 anos atrás
  const A3 = anoLectivoAnterior(anoLectivoAtual, 3) // 3 anos atrás
  const A4 = anoLectivoAnterior(anoLectivoAtual, 4) // 4 anos atrás

  // Notas do Ben (2º ano, já completou 1º ano)
  await criarNotas(createdStudents[0].id_estudante, [
    { codigo: "EI-MAT1", ano_lectivo: A1, semestre: "S1", ac1: 10, ac2: 11, ac3: 12, ttp: 11, pp1: 12, pp2: 10, exame: 13 },
    { codigo: "EI-PRG1", ano_lectivo: A1, semestre: "S1", ac1: 15, ac2: 16, ac3: 14, ttp: 15, pp1: 16, pp2: 15 },
    { codigo: "EI-SD1",  ano_lectivo: A1, semestre: "S1", ac1: 14, ac2: 14, ac3: 15, ttp: 13, pp1: 14, pp2: 15 },
    { codigo: "EI-MAT2", ano_lectivo: A1, semestre: "S2", ac1: 9,  ac2: 10, ac3: 11, ttp: 10, pp1: 9,  pp2: 11, exame: 12 },
    { codigo: "EI-PRG2", ano_lectivo: A1, semestre: "S2", ac1: 16, ac2: 17, ac3: 15, ttp: 16, pp1: 17, pp2: 16 },
    { codigo: "EI-MD1",  ano_lectivo: A1, semestre: "S2", ac1: 7,  ac2: 8,  ac3: 9,  ttp: 8,  pp1: 7,  pp2: 9,  exame: 0, recurso: 11 },
  ], discMap)

  // Notas do João (3º ano, completou 1º e 2º)
  const joao = createdStudents.find(s => s.def.nome === "João Lucas")!
  await criarNotas(joao.id_estudante, [
    // 1º ano
    { codigo: "EI-MAT1", ano_lectivo: A2, semestre: "S1", ac1: 12, ac2: 13, ac3: 11, ttp: 12, pp1: 13, pp2: 12, exame: 14 },
    { codigo: "EI-PRG1", ano_lectivo: A2, semestre: "S1", ac1: 14, ac2: 15, ac3: 14, ttp: 13, pp1: 15, pp2: 14 },
    { codigo: "EI-SD1",  ano_lectivo: A2, semestre: "S1", ac1: 16, ac2: 15, ac3: 17, ttp: 16, pp1: 15, pp2: 16 },
    { codigo: "EI-MAT2", ano_lectivo: A2, semestre: "S2", ac1: 10, ac2: 11, ac3: 10, ttp: 11, pp1: 10, pp2: 12, exame: 13 },
    { codigo: "EI-PRG2", ano_lectivo: A2, semestre: "S2", ac1: 15, ac2: 16, ac3: 14, ttp: 15, pp1: 16, pp2: 15 },
    { codigo: "EI-MD1",  ano_lectivo: A2, semestre: "S2", ac1: 11, ac2: 12, ac3: 10, ttp: 11, pp1: 12, pp2: 10, exame: 13 },
    // 2º ano
    { codigo: "EI-BD1", ano_lectivo: A1, semestre: "S1", ac1: 14, ac2: 15, ac3: 13, ttp: 14, pp1: 15, pp2: 14 },
    { codigo: "EI-RC1", ano_lectivo: A1, semestre: "S1", ac1: 13, ac2: 12, ac3: 14, ttp: 13, pp1: 14, pp2: 13 },
    { codigo: "EI-SO1", ano_lectivo: A1, semestre: "S1", ac1: 12, ac2: 11, ac3: 13, ttp: 12, pp1: 13, pp2: 12 },
    { codigo: "EI-BD2", ano_lectivo: A1, semestre: "S2", ac1: 15, ac2: 16, ac3: 14, ttp: 15, pp1: 16, pp2: 15 },
    { codigo: "EI-ES1", ano_lectivo: A1, semestre: "S2", ac1: 14, ac2: 13, ac3: 15, ttp: 14, pp1: 13, pp2: 15 },
  ], discMap)

  // Notas do Rui (Finalizado - completou os 4 anos)
  const rui = createdStudents.find(s => s.def.nome === "Rui Martins")!
  await criarNotas(rui.id_estudante, [
    // 1º ano (4 anos atrás)
    { codigo: "EI-MAT1", ano_lectivo: A4, semestre: "S1", ac1: 14, ac2: 13, ac3: 15, ttp: 14, pp1: 13, pp2: 15, exame: 15 },
    { codigo: "EI-PRG1", ano_lectivo: A4, semestre: "S1", ac1: 16, ac2: 17, ac3: 16, ttp: 17, pp1: 16, pp2: 17 },
    { codigo: "EI-SD1",  ano_lectivo: A4, semestre: "S1", ac1: 15, ac2: 14, ac3: 16, ttp: 15, pp1: 16, pp2: 15 },
    { codigo: "EI-MAT2", ano_lectivo: A4, semestre: "S2", ac1: 13, ac2: 14, ac3: 12, ttp: 13, pp1: 14, pp2: 13, exame: 16 },
    { codigo: "EI-PRG2", ano_lectivo: A4, semestre: "S2", ac1: 17, ac2: 16, ac3: 18, ttp: 17, pp1: 16, pp2: 17 },
    { codigo: "EI-MD1",  ano_lectivo: A4, semestre: "S2", ac1: 12, ac2: 13, ac3: 11, ttp: 12, pp1: 13, pp2: 12, exame: 14 },
    // 2º ano (3 anos atrás)
    { codigo: "EI-BD1", ano_lectivo: A3, semestre: "S1", ac1: 16, ac2: 15, ac3: 17, ttp: 16, pp1: 17, pp2: 16 },
    { codigo: "EI-RC1", ano_lectivo: A3, semestre: "S1", ac1: 15, ac2: 14, ac3: 16, ttp: 15, pp1: 14, pp2: 16 },
    { codigo: "EI-SO1", ano_lectivo: A3, semestre: "S1", ac1: 14, ac2: 13, ac3: 15, ttp: 14, pp1: 13, pp2: 15 },
    { codigo: "EI-BD2", ano_lectivo: A3, semestre: "S2", ac1: 16, ac2: 17, ac3: 15, ttp: 16, pp1: 17, pp2: 16 },
    { codigo: "EI-ES1", ano_lectivo: A3, semestre: "S2", ac1: 15, ac2: 14, ac3: 16, ttp: 15, pp1: 14, pp2: 16 },
    // 3º ano (2 anos atrás)
    { codigo: "EI-IA1", ano_lectivo: A2, semestre: "S1", ac1: 16, ac2: 15, ac3: 17, ttp: 16, pp1: 15, pp2: 17 },
    { codigo: "EI-PA1", ano_lectivo: A2, semestre: "S1", ac1: 17, ac2: 16, ac3: 18, ttp: 17, pp1: 16, pp2: 18 },
    // 4º ano (1 ano atrás)
    { codigo: "EI-PF1",  ano_lectivo: A1, semestre: "S1", ac1: 15, ac2: 16, ac3: 14, ttp: 15, pp1: 16, pp2: 15, exame: 16 },
    { codigo: "EI-MON1", ano_lectivo: A1, semestre: "S2", ac1: 16, ac2: 17, ac3: 15, ttp: 16, pp1: 17, pp2: 16, exame: 17 },
  ], discMap)

  // Notas da Lara (Suspenso - reprovou no 1º ano)
  const lara = createdStudents.find(s => s.def.nome === "Lara Costa")!
  await criarNotas(lara.id_estudante, [
    { codigo: "EI-MAT1", ano_lectivo: anoLectivoAtual, semestre: "S1", ac1: 4,  ac2: 5,  ac3: 6,  ttp: 5,  pp1: 4,  pp2: 6,  exame: 0, recurso: 5 },
    { codigo: "EI-PRG1", ano_lectivo: anoLectivoAtual, semestre: "S1", ac1: 6,  ac2: 7,  ac3: 5,  ttp: 6,  pp1: 7,  pp2: 5,  exame: 0, recurso: 8 },
    { codigo: "EI-SD1",  ano_lectivo: anoLectivoAtual, semestre: "S1", ac1: 5,  ac2: 6,  ac3: 4,  ttp: 5,  pp1: 6,  pp2: 4,  exame: 0, recurso: 7 },
  ], discMap)

  // Notas do André (EC, 3º ano)
  const andre = createdStudents.find(s => s.def.nome === "André Fernandes")!
  await criarNotas(andre.id_estudante, [
    { codigo: "EC-MAT1", ano_lectivo: A2, semestre: "S1", ac1: 11, ac2: 12, ac3: 10, ttp: 11, pp1: 12, pp2: 11, exame: 13 },
    { codigo: "EC-DT1",  ano_lectivo: A2, semestre: "S1", ac1: 14, ac2: 15, ac3: 13, ttp: 14, pp1: 15, pp2: 14 },
    { codigo: "EC-MS1",  ano_lectivo: A1, semestre: "S1", ac1: 10, ac2: 11, ac3: 9,  ttp: 10, pp1: 11, pp2: 10, exame: 12 },
    { codigo: "EC-RM1",  ano_lectivo: A1, semestre: "S2", ac1: 12, ac2: 13, ac3: 11, ttp: 12, pp1: 13, pp2: 12, exame: 14 },
  ], discMap)

  // Helena (EC, Finalizado - completou 4 anos)
  const helena = createdStudents.find(s => s.def.nome === "Helena Mendes")!
  await criarNotas(helena.id_estudante, [
    // 1º ano (4 anos atrás)
    { codigo: "EC-MAT1", ano_lectivo: A4, semestre: "S1", ac1: 14, ac2: 15, ac3: 13, ttp: 14, pp1: 15, pp2: 14, exame: 16 },
    { codigo: "EC-DT1",  ano_lectivo: A4, semestre: "S1", ac1: 16, ac2: 17, ac3: 15, ttp: 16, pp1: 17, pp2: 16 },
    // 2º ano (3 anos atrás)
    { codigo: "EC-MS1",  ano_lectivo: A3, semestre: "S1", ac1: 13, ac2: 14, ac3: 12, ttp: 13, pp1: 14, pp2: 13, exame: 15 },
    { codigo: "EC-RM1",  ano_lectivo: A3, semestre: "S2", ac1: 14, ac2: 15, ac3: 13, ttp: 14, pp1: 15, pp2: 14, exame: 16 },
    // 3º ano (2 anos atrás)
    { codigo: "EC-HI1",  ano_lectivo: A2, semestre: "S1", ac1: 15, ac2: 16, ac3: 14, ttp: 15, pp1: 16, pp2: 15 },
    { codigo: "EC-EM1",  ano_lectivo: A2, semestre: "S2", ac1: 14, ac2: 15, ac3: 13, ttp: 14, pp1: 15, pp2: 14 },
    // 4º ano (1 ano atrás)
    { codigo: "EC-PP1",  ano_lectivo: A1, semestre: "S1", ac1: 15, ac2: 16, ac3: 14, ttp: 15, pp1: 16, pp2: 15, exame: 17 },
    { codigo: "EC-MON1", ano_lectivo: A1, semestre: "S2", ac1: 16, ac2: 17, ac3: 15, ttp: 16, pp1: 17, pp2: 16, exame: 18 },
  ], discMap)

  console.log("   ✅ Notas criadas\n")

  // ── Passo 6: Atribuir professores a disciplinas ────────────────────────
  console.log("👨‍🏫 A atribuir disciplinas aos orientadores...")

  // OriEI lecciona disciplinas de EI
  const discsEI2Ano = ["EI-BD1", "EI-RC1", "EI-SO1"]
  const discsEI3Ano = ["EI-IA1", "EI-PA1"]

  for (const codigo of [...discsEI2Ano, ...discsEI3Ano]) {
    const disc = discMap.get(codigo)
    if (!disc) continue

    const oriEIUser = (await prisma.orientador.findUnique({ where: { id_orientador: oriEI.id_orientador } }))!
    await prisma.professorDisciplina.upsert({
      where: {
        id_usuario_id_disciplina_ano_lectivo_semestre: {
          id_usuario: oriEIUser.id_usuario,
          id_disciplina: disc.id_disciplina,
          ano_lectivo: anoLectivoAtual,
          semestre: "S1"
        }
      },
      update: {},
      create: {
        id_usuario: oriEIUser.id_usuario,
        id_disciplina: disc.id_disciplina,
        ano_lectivo: anoLectivoAtual,
        semestre: "S1"
      }
    })
  }

  // OriEINaoGestor lecciona algumas disciplinas de EI também
  const discsEI1Ano = ["EI-MAT1", "EI-PRG1"]
  const oriEINaoGestorUser = (await prisma.orientador.findUnique({ where: { id_orientador: oriEINaoGestor.id_orientador } }))!
  for (const codigo of discsEI1Ano) {
    const disc = discMap.get(codigo)
    if (!disc) continue
    await prisma.professorDisciplina.upsert({
      where: {
        id_usuario_id_disciplina_ano_lectivo_semestre: {
          id_usuario: oriEINaoGestorUser.id_usuario,
          id_disciplina: disc.id_disciplina,
          ano_lectivo: anoLectivoAtual,
          semestre: "S1"
        }
      },
      update: {},
      create: {
        id_usuario: oriEINaoGestorUser.id_usuario,
        id_disciplina: disc.id_disciplina,
        ano_lectivo: anoLectivoAtual,
        semestre: "S1"
      }
    })
  }

  console.log("   ✅ Disciplinas atribuídas\n")

  // ── Passo 7: Solicitações de orientação ─────────────────────────────────
  console.log("📋 A criar solicitações de orientação...")

  // Ana → OriEI (Aceite)
  const ana = createdStudents.find(s => s.def.nome === "Ana Silva")!
  await prisma.solicitacaoOrientacao.create({
    data: {
      id_estudante: ana.id_estudante,
      id_orientador: oriEI.id_orientador,
      data_solicitacao: new Date("2025-01-15"),
      estado: "Aceite",
      observacoes: "IA aplicada à Educação"
    }
  })

  // Carlos → OriEINaoGestor (Aceite)
  const carlos = createdStudents.find(s => s.def.nome === "Carlos Manuel")!
  await prisma.solicitacaoOrientacao.create({
    data: {
      id_estudante: carlos.id_estudante,
      id_orientador: oriEINaoGestor.id_orientador,
      data_solicitacao: new Date("2025-01-20"),
      estado: "Aceite",
      observacoes: "Desenvolvimento Web com React e Node.js"
    }
  })

  // Maria → OriEI (Pendente)
  const maria = createdStudents.find(s => s.def.nome === "Maria Santos")!
  await prisma.solicitacaoOrientacao.create({
    data: {
      id_estudante: maria.id_estudante,
      id_orientador: oriEI.id_orientador,
      data_solicitacao: new Date("2025-02-01"),
      estado: "Pendente",
      observacoes: "Cibersegurança e Proteção de Dados"
    }
  })

  // Diogo → OriEC (Aceite)
  const diogo = createdStudents.find(s => s.def.nome === "Diogo Pereira")!
  await prisma.solicitacaoOrientacao.create({
    data: {
      id_estudante: diogo.id_estudante,
      id_orientador: oriEC.id_orientador,
      data_solicitacao: new Date("2025-01-25"),
      estado: "Aceite",
      observacoes: "Pontes sustentáveis em Angola"
    }
  })

  // Ricardo → OriGE (Aceite)
  const ricardo = createdStudents.find(s => s.def.nome === "Ricardo Santos")!
  await prisma.solicitacaoOrientacao.create({
    data: {
      id_estudante: ricardo.id_estudante,
      id_orientador: oriGE.id_orientador,
      data_solicitacao: new Date("2025-02-10"),
      estado: "Aceite",
      observacoes: "Empreendedorismo em Angola"
    }
  })

  console.log("   ✅ Solicitações criadas\n")

  // ── Passo 8: Monografias ──────────────────────────────────────────────
  console.log("📄 A criar monografias...")

  // Ana → monografia submetida
  await prisma.monografia.create({
    data: {
      id_estudante: ana.id_estudante,
      titulo: "Inteligência Artificial aplicada à Educação: Personalização do aprendizado",
      resumo: "Este trabalho investiga como técnicas de IA podem ser aplicadas para personalizar o processo de aprendizagem.",
      descricao: "Machine learning, PLN e sistemas de recomendação no contexto educacional.",
      data_submissao: new Date("2025-03-01"),
      estado: "Submetida",
      id_orientador: oriEI.id_orientador,
      nome_co_orientador: "Prof. Maria Santos (ULisboa)",
      nome_co_autor: "João Pedro"
    }
  })

  // Carlos → monografia submetida
  await prisma.monografia.create({
    data: {
      id_estudante: carlos.id_estudante,
      titulo: "Desenvolvimento Web Moderno: React, Node.js e Arquiteturas Escaláveis",
      resumo: "Análise e implementação de uma plataforma web utilizando React e Node.js.",
      descricao: "Stack MERN, CI/CD, deploy em cloud.",
      data_submissao: new Date("2025-03-15"),
      estado: "Submetida",
      id_orientador: oriEINaoGestor.id_orientador,
    }
  })

  // Diogo → monografia submetida
  await prisma.monografia.create({
    data: {
      id_estudante: diogo.id_estudante,
      titulo: "Pontes Sustentáveis: Análise de materiais e técnicas construtivas em Angola",
      resumo: "Estudo comparativo de métodos construtivos para pontes em Angola.",
      descricao: "Materiais sustentáveis, custos e durabilidade.",
      data_submissao: new Date("2025-02-20"),
      estado: "Submetida",
      id_orientador: oriEC.id_orientador,
    }
  })

  console.log("   ✅ Monografias criadas\n")

  // ── Passo 9: Propinas e pagamentos ─────────────────────────────────────
  console.log("💰 A criar propinas...")

  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  for (const cs of createdStudents) {
    if (cs.def.estado !== "EmCurso") continue

    const valorBase = cs.def.ano === 1 ? 15000 : cs.def.ano === 2 ? 20000 : cs.def.ano === 3 ? 25000 : 30000
    const isLate = now.getDate() > 10
    const codigo = String(Math.floor(100 + Math.random() * 900))

    await prisma.pagamentoPropina.create({
      data: {
        id_estudante: cs.id_estudante,
        referencia: `PROP-${ano}-${String(mes).padStart(2, "0")}-${cs.def.numero}-${codigo}`,
        codigo_confirmacao: codigo,
        mes, ano,
        valor_base: valorBase,
        valor_multa: isLate ? 500 : 0,
        valor_total: valorBase + (isLate ? 500 : 0),
        data_vencimento: new Date(ano, mes - 1, 10),
        estado: "Pendente",
        emitido_por: "sistema",
      }
    })
  }
  console.log("   ✅ Propinas criadas\n")

  // ── Resumo Final ────────────────────────────────────────────────────────
  console.log("==========================================")
  console.log("✅ SEED DE ESTUDANTES CONCLUÍDO!")
  console.log("==========================================")
  console.log(`\n📆 Ano Lectivo do Sistema: ${anoLectivoAtual}`)
  console.log("\n📋 Contas criadas:")
  for (const cs of createdStudents) {
    const flags = []
    if (cs.def.estado === "Finalizado") flags.push("🎓 Finalizado")
    if (cs.def.estado === "Suspendido") flags.push("⛔ Suspenso")
    if (cs.def.bolsa === "Cinquenta") flags.push("🏷️ Bolsa 50%")
    if (cs.def.bolsa === "Cem") flags.push("🏷️ Bolsa 100%")
    console.log(`   ${cs.def.email} / student${cs.def.ano === 4 ? "4ano" : ""}123 — ${cs.def.nome} (${cs.def.ano}º ${cs.def.curso.nome_curso}) ${flags.join(" ")}`)
  }

  console.log("\n⚠️  LEMBRA-TE:")
  console.log("   - Pedro Costa (4º ano, EI) NÃO tem orientação")
  console.log("   - Maria Santos (4º ano, EI) tem orientação PENDENTE")
  console.log("   - Lara Costa (1º ano, EI) está SUSPENSA")
  console.log("   - Rui Martins (EI) e Helena Mendes (EC) estão FINALIZADOS\n")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())