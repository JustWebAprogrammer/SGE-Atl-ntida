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

  const semestre = await getSemestreAtual()

  // ── 1. Provas do ano corrente ──
  const provasRaw = await prisma.planoProva.findMany({
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
    orderBy: { data_prova: "asc" },
  })

  // Buscar professores das disciplinas
  const idsDisciplinas = provasRaw.map((p) => p.id_disciplina)

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

  const formatProva = (p: typeof provasRaw[0]) => ({
    id_prova: p.id_prova,
    tipo_prova: p.tipo_prova,
    data_prova: `${p.data_prova.getFullYear()}-${String(p.data_prova.getMonth() + 1).padStart(2, "0")}-${String(p.data_prova.getDate()).padStart(2, "0")}`,
    hora_inicio: p.hora_inicio,
    hora_fim: p.hora_fim,
    nome_disciplina: p.disciplina.nome_disciplina,
    codigo_disciplina: p.disciplina.codigo_disciplina,
    nome_professor: profPorDisciplina.get(p.id_disciplina) || "—",
  })

  const provas = provasRaw.map(formatProva)

  // ── 2. Disciplinas pendentes de anos anteriores ──
  const notasPendentes = await prisma.nota.findMany({
    where: {
      id_estudante,
      ano_lectivo: { not: anoLectivo },
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

  // Buscar provas para cada disciplina pendente no ano lectivo actual
  const idsDisciplinasPendentes = notasPendentes.map((n) => n.disciplina.id_disciplina)

  const provasPendentesRaw = idsDisciplinasPendentes.length > 0
    ? await prisma.planoProva.findMany({
        where: {
          id_curso,
          id_disciplina: { in: idsDisciplinasPendentes },
          semestre,
          turno,
          ano_lectivo: anoLectivo,
        },
        include: {
          disciplina: {
            select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true, ano_curricular: true },
          },
        },
        orderBy: [{ disciplina: { ano_curricular: "asc" } }, { data_prova: "asc" }],
      })
    : []

  // Agrupar provas pendentes por ano_curricular
  const pendentesPorAno = new Map<number, typeof provas>()
  for (const pp of provasPendentesRaw) {
    const ano = pp.disciplina.ano_curricular

    // Buscar professor
    const profPendente = await prisma.professorDisciplina.findFirst({
      where: {
        id_disciplina: pp.id_disciplina,
        ano_lectivo: anoLectivo,
      },
      include: {
        usuario: {
          include: { orientador: { select: { nome_completo: true } } },
        },
      },
    })

    const item = {
      id_prova: pp.id_prova,
      tipo_prova: pp.tipo_prova,
      data_prova: `${pp.data_prova.getFullYear()}-${String(pp.data_prova.getMonth() + 1).padStart(2, "0")}-${String(pp.data_prova.getDate()).padStart(2, "0")}`,
      hora_inicio: pp.hora_inicio,
      hora_fim: pp.hora_fim,
      nome_disciplina: pp.disciplina.nome_disciplina,
      codigo_disciplina: pp.disciplina.codigo_disciplina,
      nome_professor: profPendente?.usuario?.orientador?.nome_completo || profPendente?.usuario?.nome_usuario || "—",
    }

    const existing = pendentesPorAno.get(ano) || []
    existing.push(item)
    pendentesPorAno.set(ano, existing)
  }

  const provasPendentes = Array.from(pendentesPorAno.entries())
    .sort(([a], [b]) => a - b)
    .map(([ano, provas]) => ({
      ano,
      provas,
    }))

  const filtroAnos = Array.from(new Set([anoCurricular, ...pendentesPorAno.keys()])).sort()

  return NextResponse.json({ provas, provasPendentes, filtroAnos })
}