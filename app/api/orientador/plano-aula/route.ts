import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getAnoLectivo, getSemestreAtual } from "@/lib/sistema"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "orientador") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true }
  })

  if (!orientador) return NextResponse.json({ error: "Orientador não encontrado" }, { status: 404 })

  const anoLectivo = await getAnoLectivo()
  const semestre = await getSemestreAtual()

  // Buscar disciplinas do orientador no semestre actual
  const disciplinas = await prisma.professorDisciplina.findMany({
    where: {
      id_usuario: parseInt(session.user.id),
      ano_lectivo: anoLectivo,
      semestre: semestre
    },
    select: { id_disciplina: true }
  })

  const idsDisciplinas = disciplinas.map(d => d.id_disciplina)

  if (idsDisciplinas.length === 0) {
    return NextResponse.json({
      horarios: [],
      provas: [],
      ano_lectivo: anoLectivo,
      semestre: semestre
    })
  }

  // Buscar horários das disciplinas do orientador
  const horarios = await prisma.horarioAula.findMany({
    where: {
      id_disciplina: { in: idsDisciplinas },
      ano_lectivo: anoLectivo,
      semestre: semestre
    },
    include: {
      disciplina: {
        select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true }
      },
      curso: {
        select: { id_curso: true, nome_curso: true }
      }
    },
    orderBy: [{ dia_semana: "asc" }, { hora_inicio: "asc" }]
  })

  // Buscar provas das disciplinas do orientador
  const provas = await prisma.planoProva.findMany({
    where: {
      id_disciplina: { in: idsDisciplinas },
      ano_lectivo: anoLectivo,
      semestre: semestre
    },
    include: {
      disciplina: {
        select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true }
      },
      curso: {
        select: { id_curso: true, nome_curso: true }
      }
    },
    orderBy: [{ data_prova: "asc" }, { hora_inicio: "asc" }]
  })

  // Buscar configuração de duração de aula
  const config = await prisma.configuracaoTaxas.findUnique({
    where: { id_configuracao: 1 },
  })
  const duracao = config?.duracao_aula_minutos || 90
  const intervalo = config?.intervalo_aula_minutos || 10

  const horariosFormatados = horarios.map(h => ({
    id_aula: h.id_aula,
    dia_semana: h.dia_semana,
    hora_inicio: h.hora_inicio,
    hora_fim: h.hora_fim,
    sala: h.sala,
    nome_disciplina: h.disciplina.nome_disciplina,
    codigo_disciplina: h.disciplina.codigo_disciplina,
    nome_curso: h.curso.nome_curso,
    ano_curricular: h.ano_curricular,
    turno: h.turno
  }))

  const provasFormatadas = provas.map(p => ({
    id_prova: p.id_prova,
    tipo_prova: p.tipo_prova,
    data_prova: `${p.data_prova.getFullYear()}-${String(p.data_prova.getMonth() + 1).padStart(2, "0")}-${String(p.data_prova.getDate()).padStart(2, "0")}`,
    hora_inicio: p.hora_inicio,
    hora_fim: p.hora_fim,
    nome_disciplina: p.disciplina.nome_disciplina,
    codigo_disciplina: p.disciplina.codigo_disciplina,
    nome_curso: p.curso.nome_curso,
    ano_curricular: p.ano_curricular,
    turno: p.turno
  }))

  return NextResponse.json({
    horarios: horariosFormatados,
    provas: provasFormatadas,
    duracao,
    intervalo,
    ano_lectivo: anoLectivo,
    semestre: semestre
  })
}