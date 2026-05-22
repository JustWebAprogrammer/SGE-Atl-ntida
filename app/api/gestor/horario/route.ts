import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { verificarConflitoProfessorHorario } from "@/lib/verificarConflitos"
import { logAudit } from "@/lib/audit"
import { criarNotificacao } from "@/lib/notificacoes"

import { getAnoLectivo, getSemestreAtual } from "@/lib/sistema"


export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "orientador") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const cursoId = searchParams.get("cursoId")
  const ano = searchParams.get("ano")
  const semestre = searchParams.get("semestre")
  const anoLectivo = searchParams.get("ano_lectivo") || await getAnoLectivo()
  const turno = searchParams.get("turno") || ""

  if (!cursoId || !ano || !semestre) {
    return NextResponse.json({ error: "Parâmetros em falta" }, { status: 400 })
  }

  const whereTurno = turno ? { turno } : {}

  const [horarios, curso, config] = await Promise.all([
    prisma.horarioAula.findMany({
      where: {
        id_curso: parseInt(cursoId),
        ano_curricular: parseInt(ano),
        semestre,
        ano_lectivo: anoLectivo,
        ...whereTurno,
      },
      include: { disciplina: { select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true } } },
      orderBy: [{ dia_semana: "asc" }, { hora_inicio: "asc" }]
    }),
    prisma.curso.findUnique({ where: { id_curso: parseInt(cursoId) } }),
    prisma.configuracaoTaxas.findUnique({ where: { id_configuracao: 1 } })
  ])

  const duracao = config?.duracao_aula_minutos || 90
  const intervalo = config?.intervalo_aula_minutos || 10

  // Buscar professores das disciplinas deste curso/ano/semestre
  const disciplinasCurriculo = await prisma.cursoDisciplina.findMany({
    where: {
      id_curso: parseInt(cursoId),
      ano_curricular: parseInt(ano),
      semestre: semestre as any,
    },
    select: { id_disciplina: true }
  })
  const idsDisciplinas = disciplinasCurriculo.map(d => d.id_disciplina)

  // Buscar professores das disciplinas deste curso/ano/semestre
  const professores = await prisma.professorDisciplina.findMany({
    where: {
      id_disciplina: { in: idsDisciplinas },
      ano_lectivo: anoLectivo,
      semestre: semestre as any,
    },
    include: {
      disciplina: { select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true } },
      usuario: {
        include: {
          orientador: { select: { nome_completo: true } }
        }
      }
    }
  })

  // Map de professor por disciplina (para lookup rápido)
  const profPorDisciplina = new Map<number, { nome_professor: string; nome_disciplina: string; codigo_disciplina: string }>()
  for (const p of professores) {
    if (!profPorDisciplina.has(p.disciplina.id_disciplina)) {
      profPorDisciplina.set(p.disciplina.id_disciplina, {
        nome_professor: p.usuario?.orientador?.nome_completo || p.usuario?.nome_usuario || "—",
        nome_disciplina: p.disciplina.nome_disciplina,
        codigo_disciplina: p.disciplina.codigo_disciplina,
      })
    }
  }

  // Buscar detalhes de TODAS as disciplinas do currículo (mesmo sem professor)
  const disciplinasDetalhes = await prisma.disciplina.findMany({
    where: { id_disciplina: { in: idsDisciplinas } },
    select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true },
  })

  const professoresFormatados = disciplinasDetalhes.map(d => {
    const prof = profPorDisciplina.get(d.id_disciplina)
    return {
      id_disciplina: d.id_disciplina,
      nome_disciplina: d.nome_disciplina,
      codigo_disciplina: d.codigo_disciplina,
      nome_professor: prof?.nome_professor || "",
    }
  })

  return NextResponse.json({
    horarios,
    turnos: curso?.turnos?.split(",").map((t: string) => t.trim()).filter(Boolean) || ["Matinal"],
    duracao,
    intervalo,
    professores: professoresFormatados,
  })
}

const TURNOS_HORARIOS: Record<string, { inicio: string; fim: string }> = {
  Matinal: { inicio: "08:00", fim: "13:00" },
  Vespertino: { inicio: "13:00", fim: "18:00" },
  Noturno: { inicio: "18:00", fim: "23:00" },
}

function calcularHorario(posicao: number, turno: string, duracao: number, intervalo: number) {
  const t = TURNOS_HORARIOS[turno]
  if (!t) return null
  const [h, m] = t.inicio.split(":").map(Number)
  const inicioMin = h * 60 + m
  const bloco = duracao + intervalo
  const inicioAula = inicioMin + (posicao - 1) * bloco
  const fimAula = inicioAula + duracao
  const [hFim, mFim] = t.fim.split(":").map(Number)
  if (fimAula > hFim * 60 + mFim) return null
  const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`
  return { hora_inicio: fmt(inicioAula), hora_fim: fmt(fimAula) }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "orientador") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const { id_curso, id_disciplina, ano_curricular, semestre, dia_semana, turno, posicao, sala, ano_lectivo } = body

  if (!id_curso || !id_disciplina || !ano_curricular || !semestre || !dia_semana || !turno || !posicao) {
    return NextResponse.json({ error: "Campos obrigatórios em falta" }, { status: 400 })
  }

  // Bloquear se o semestre da requisição não for o semestre actual do sistema
  const semestreAtual = await getSemestreAtual()
  if (semestre !== semestreAtual) {
    return NextResponse.json({
      error: `⚠️ Não podes criar horário para ${semestre} porque o sistema está actualmente no ${semestreAtual}. Seleciona o semestre actual.`
    }, { status: 400 })
  }

  const config = await prisma.configuracaoTaxas.findUnique({ where: { id_configuracao: 1 } })
  const duracao = config?.duracao_aula_minutos || 90
  const intervalo = config?.intervalo_aula_minutos || 10

  const horario = calcularHorario(parseInt(posicao), turno, duracao, intervalo)
  if (!horario) {
    return NextResponse.json({ error: `A posição ${posicao} não cabe no turno ${turno}` }, { status: 400 })
  }

  // Verificar conflito de professor (o professor já tem aula noutro curso neste horário?)
  const conflitoProfessor = await verificarConflitoProfessorHorario({
    id_disciplina: parseInt(id_disciplina),
    dia_semana,
    hora_inicio: horario.hora_inicio,
    hora_fim: horario.hora_fim,
    turno,
    ano_lectivo: ano_lectivo || await getAnoLectivo(),
    id_curso: parseInt(id_curso),
    ano_curricular: parseInt(ano_curricular),
    semestre,
  })
  if (conflitoProfessor) {
    return NextResponse.json({ error: conflitoProfessor }, { status: 409 })
  }

  // Verificar se já existe aula na mesma posição (dia + turno + posição)
  const existente = await prisma.horarioAula.findFirst({
    where: {
      id_curso: parseInt(id_curso),
      ano_curricular: parseInt(ano_curricular),
      semestre,
      turno,
      dia_semana,
      hora_inicio: horario.hora_inicio,
      ano_lectivo: ano_lectivo || await getAnoLectivo()
    }
  })
  if (existente) {
    return NextResponse.json({ error: `Já existe uma aula às ${horario.hora_inicio} neste dia e turno` }, { status: 400 })
  }

  try {
    const aula = await prisma.horarioAula.create({
      data: {
        id_curso: parseInt(id_curso),
        id_disciplina: parseInt(id_disciplina),
        ano_curricular: parseInt(ano_curricular),
        semestre,
        turno,
        dia_semana,
        hora_inicio: horario.hora_inicio,
        hora_fim: horario.hora_fim,
        sala: sala || null,
        ano_lectivo: ano_lectivo || await getAnoLectivo()
      }
    })

    // Audit log — include human-readable names
    const discInfo = await prisma.disciplina.findUnique({
      where: { id_disciplina: parseInt(id_disciplina) },
      select: { nome_disciplina: true, codigo_disciplina: true }
    })
    const cursoInfo = await prisma.curso.findUnique({
      where: { id_curso: parseInt(id_curso) },
      select: { nome_curso: true }
    })
    const ip_address = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "CRIAR HORARIO",
      tabela: "HorarioAula",
      id_registro: aula.id_aula,
      valor_antes: null,
      valor_depois: {
        nome_disciplina: discInfo?.nome_disciplina ?? `ID:${id_disciplina}`,
        codigo_disciplina: discInfo?.codigo_disciplina ?? null,
        nome_curso: cursoInfo?.nome_curso ?? `ID:${id_curso}`,
        ano_curricular: parseInt(ano_curricular),
        semestre,
        turno,
        dia_semana,
        hora_inicio: horario.hora_inicio,
        hora_fim: horario.hora_fim,
        sala: sala || null,
        ano_lectivo: ano_lectivo || await getAnoLectivo()
      },
      ip_address
    })

    // Notificar estudantes do curso/ano
    const estudantes = await prisma.estudante.findMany({
      where: { id_curso: parseInt(id_curso), ano_current: parseInt(ano_curricular), estado: "EmCurso" },
      select: { id_usuario: true }
    })
    for (const est of estudantes) {
      await criarNotificacao({
        id_usuario: est.id_usuario,
        tipo: "horario",
        titulo: `Horário atualizado — ${cursoInfo?.nome_curso || ""}`,
        mensagem: `Nova aula de ${discInfo?.nome_disciplina || ""} adicionada: ${dia_semana} às ${horario.hora_inicio} (${turno})`,
        link_url: "/estudante/horario"
      })
    }
    // Notificar professor da disciplina
    const professorDisciplina = await prisma.professorDisciplina.findFirst({
      where: { id_disciplina: parseInt(id_disciplina), ano_lectivo: ano_lectivo || await getAnoLectivo(), semestre },
      select: { id_usuario: true }
    })
    if (professorDisciplina) {
      await criarNotificacao({
        id_usuario: professorDisciplina.id_usuario,
        tipo: "horario",
        titulo: `Aula atribuída — ${discInfo?.nome_disciplina || ""}`,
        mensagem: `Foi-lhe atribuída uma aula de ${discInfo?.nome_disciplina || ""} à ${dia_semana} às ${horario.hora_inicio} (${turno})`,
        link_url: "/orientador/plano-aula"
      })
    }

    return NextResponse.json({ aula })
  } catch {
    return NextResponse.json({ error: "Erro ao criar aula." }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "orientador") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "ID em falta" }, { status: 400 })
  }

  // Snapshot before delete for audit (with human-readable names)
  const aulaAntes = await prisma.horarioAula.findUnique({
    where: { id_aula: parseInt(id) },
    include: {
      disciplina: { select: { nome_disciplina: true, codigo_disciplina: true } },
      curso: { select: { nome_curso: true } }
    }
  })

  await prisma.horarioAula.delete({ where: { id_aula: parseInt(id) } })

  // Audit log
  if (aulaAntes) {
    const ip_address = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "ELIMINAR HORARIO",
      tabela: "HorarioAula",
      id_registro: aulaAntes.id_aula,
      valor_antes: {
        nome_disciplina: aulaAntes.disciplina.nome_disciplina,
        codigo_disciplina: aulaAntes.disciplina.codigo_disciplina,
        nome_curso: aulaAntes.curso.nome_curso,
        ano_curricular: aulaAntes.ano_curricular,
        semestre: aulaAntes.semestre,
        turno: aulaAntes.turno,
        dia_semana: aulaAntes.dia_semana,
        hora_inicio: aulaAntes.hora_inicio,
        hora_fim: aulaAntes.hora_fim,
        sala: aulaAntes.sala,
        ano_lectivo: aulaAntes.ano_lectivo
      },
      valor_depois: null,
      ip_address
    })
  }

  return NextResponse.json({ success: true })
}
