import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAnoLectivo, getSemestreAtual } from "@/lib/sistema"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: {
      id_estudante: true,
      id_curso: true,
      ano_current: true,
      turno: true,
      ano_electivo: true,
    },
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  const { id_curso, turno, id_estudante } = estudante
  const anoCurricular = estudante.ano_current || 1
  const anoLectivo = estudante.ano_electivo || await getAnoLectivo()

  const config = await prisma.configuracaoTaxas.findUnique({
    where: { id_configuracao: 1 },
  })
  const duracao = config?.duracao_aula_minutos || 90
  const intervalo = config?.intervalo_aula_minutos || 10

  // Buscar aulas do horário filtradas por curso, ano curricular, turno, semestre e ano lectivo
  const semestre = await getSemestreAtual()
  const horarios = await prisma.horarioAula.findMany({
    where: {
      id_curso,
      ano_curricular: anoCurricular,
      semestre,
      turno,
      ano_lectivo: anoLectivo,
    },
    include: {
      disciplina: {
        select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true },
      },
    },
    orderBy: [{ dia_semana: "asc" }, { hora_inicio: "asc" }],
  })

  // Buscar professores das disciplinas
  const idsDisciplinas = horarios.map((h) => h.id_disciplina)

  const professores = await prisma.professorDisciplina.findMany({
    where: {
      id_disciplina: { in: idsDisciplinas },
      ano_lectivo: anoLectivo,
    },
    include: {
      disciplina: { select: { id_disciplina: true } },
      usuario: {
        include: {
          orientador: { select: { nome_completo: true } },
        },
      },
    },
  })

  const profPorDisciplina = new Map<number, string>()
  for (const p of professores) {
    if (!profPorDisciplina.has(p.disciplina.id_disciplina)) {
      profPorDisciplina.set(
        p.disciplina.id_disciplina,
        p.usuario?.orientador?.nome_completo || p.usuario?.nome_usuario || "—"
      )
    }
  }

  const horariosFormatados = horarios.map((h) => ({
    id_aula: h.id_aula,
    dia_semana: h.dia_semana,
    hora_inicio: h.hora_inicio,
    hora_fim: h.hora_fim,
    sala: h.sala,
    nome_disciplina: h.disciplina.nome_disciplina,
    codigo_disciplina: h.disciplina.codigo_disciplina,
    nome_professor: profPorDisciplina.get(h.id_disciplina) || "—",
  }))

  // ── Buscar disciplinas pendentes de anos anteriores ──
  // Disciplinas onde o estudante tem nota_final < 10 (ou null) e não dispensada
  const notasPendentes = await prisma.nota.findMany({
    where: {
      id_estudante,
      ano_lectivo: { not: anoLectivo }, // de anos anteriores
      OR: [
        { nota_final: null },
        { nota_final: { lt: 10 } },
      ],
      dispensada: false,
    },
    select: {
      id_disciplina: true,
      disciplina: {
        select: {
          id_disciplina: true,
          nome_disciplina: true,
          codigo_disciplina: true,
          ano_curricular: true,
        },
      },
    },
    distinct: ["id_disciplina"],
  })

  // Agrupar pendentes por ano_curricular
  const pendentesPorAno = new Map<number, typeof horariosFormatados>()
  for (const np of notasPendentes) {
    const ano = np.disciplina.ano_curricular
    
    // Procurar horário para esta disciplina no ano lectivo actual
    const horarioPendente = await prisma.horarioAula.findMany({
      where: {
        id_curso,
        id_disciplina: np.disciplina.id_disciplina,
        ano_curricular: ano,
        semestre,
        turno,
        ano_lectivo: anoLectivo,
      },
      include: {
        disciplina: {
          select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true },
        },
      },
    })

    if (horarioPendente.length > 0) {
      for (const hp of horarioPendente) {
        // Buscar professor
        const profPendente = await prisma.professorDisciplina.findFirst({
          where: {
            id_disciplina: hp.id_disciplina,
            ano_lectivo: anoLectivo,
          },
          include: {
            usuario: {
              include: { orientador: { select: { nome_completo: true } } },
            },
          },
        })

        const item = {
          id_aula: hp.id_aula,
          dia_semana: hp.dia_semana,
          hora_inicio: hp.hora_inicio,
          hora_fim: hp.hora_fim,
          sala: hp.sala,
          nome_disciplina: hp.disciplina.nome_disciplina,
          codigo_disciplina: hp.disciplina.codigo_disciplina,
          nome_professor: profPendente?.usuario?.orientador?.nome_completo || profPendente?.usuario?.nome_usuario || "—",
        }

        const existing = pendentesPorAno.get(ano) || []
        existing.push(item)
        pendentesPorAno.set(ano, existing)
      }
    }
  }

  // Converter para array ordenado
  const horariosPendentes = Array.from(pendentesPorAno.entries())
    .sort(([a], [b]) => a - b)
    .map(([ano, horarios]) => ({
      ano,
      horarios,
    }))

  const filtroAnos = Array.from(new Set([anoCurricular, ...pendentesPorAno.keys()])).sort()

  return NextResponse.json({
    horarios: horariosFormatados,
    horariosPendentes,
    filtroAnos,
    duracao,
    intervalo,
  })
}