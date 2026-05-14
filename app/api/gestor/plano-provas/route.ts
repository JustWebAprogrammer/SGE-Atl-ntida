import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { verificarConflitoProfessorProva } from "@/lib/verificarConflitos"
import { logAudit } from "@/lib/audit"
import { getAnoLectivo, getSemestreAtual } from "@/lib/sistema"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const cursoId = searchParams.get("cursoId")
  const ano = searchParams.get("ano")
  const semestre = searchParams.get("semestre")
  const anoLectivo = searchParams.get("ano_lectivo") || await getAnoLectivo()

  if (!cursoId || !ano || !semestre) {
    return NextResponse.json({ error: "Parâmetros em falta" }, { status: 400 })
  }

  const provasRaw = await prisma.planoProva.findMany({
    where: {
      id_curso: parseInt(cursoId),
      ano_curricular: parseInt(ano),
      semestre,
      ano_lectivo: anoLectivo,
    },
    include: {
      disciplina: {
        select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true },
      },
    },
    orderBy: { data_prova: "asc" },
  })

  // Force data_prova to local yyyy-mm-dd string — Prisma/PostgreSQL serializes to UTC
  // which shifts the date by -1 in Africa/Luanda (UTC+1) when calling .split("T")[0]
  const provas = provasRaw.map((p) => ({
    ...p,
    data_prova: `${p.data_prova.getFullYear()}-${String(p.data_prova.getMonth() + 1).padStart(2, "0")}-${String(p.data_prova.getDate()).padStart(2, "0")}`,
  }))

  return NextResponse.json({ provas })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const {
    id_curso, id_disciplina, ano_curricular, semestre,
    tipo_prova, data_prova, hora_inicio, hora_fim, ano_lectivo,
  } = body

  // FIX: trim explícito para eliminar espaços vindos do frontend
  const turno: string = (body.turno ?? "").trim()

  if (!id_curso || !id_disciplina || !ano_curricular || !semestre ||
      !tipo_prova || !data_prova || !turno || !hora_inicio || !hora_fim) {
    return NextResponse.json({ error: "Campos obrigatórios em falta" }, { status: 400 })
  }

  // Bloquear se o semestre da requisição não for o semestre actual do sistema
  const semestreAtual = await getSemestreAtual()
  if (semestre !== semestreAtual) {
    return NextResponse.json({
      error: `⚠️ Não podes criar provas para ${semestre} porque o sistema está actualmente no ${semestreAtual}. Seleciona o semestre actual.`
    }, { status: 400 })
  }

  // Validar turno contra os turnos do curso
  const curso = await prisma.curso.findUnique({
    where: { id_curso: parseInt(id_curso) },
    select: { turnos: true },
  })
  if (!curso) {
    return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 })
  }

  // FIX: trim em cada turno do curso também, para garantir comparação limpa
  const turnosCurso = (curso.turnos || "")
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean)

  if (!turnosCurso.includes(turno)) {
    return NextResponse.json(
      { error: `Turno "${turno}" não está disponível para este curso. Turnos válidos: ${turnosCurso.join(", ")}` },
      { status: 400 }
    )
  }

  // Verificar conflito de professor para PP1/PP2 (professor já tem prova noutro curso neste horário?)
  const conflitoProfessor = await verificarConflitoProfessorProva({
    id_disciplina: parseInt(id_disciplina),
    data_prova,
    hora_inicio,
    hora_fim,
    turno,
    tipo_prova,
    ano_lectivo: ano_lectivo || await getAnoLectivo(),
    id_curso: parseInt(id_curso),
    ano_curricular: parseInt(ano_curricular),
    semestre,
  })
  if (conflitoProfessor) {
    return NextResponse.json({ error: conflitoProfessor }, { status: 409 })
  }

  // Verificar duplicado manualmente para dar mensagem clara
  const existe = await prisma.planoProva.findFirst({
    where: {
      id_curso: parseInt(id_curso),
      id_disciplina: parseInt(id_disciplina),
      ano_curricular: parseInt(ano_curricular),
      semestre,
      tipo_prova,
      turno,
      ano_lectivo: ano_lectivo || await getAnoLectivo(),
    },
    select: { id_prova: true, data_prova: true },
  })

  if (existe) {
    const dataExiste = new Date(existe.data_prova).toLocaleDateString("pt-BR")
    return NextResponse.json(
      {
        error: `Já existe ${tipo_prova} para esta disciplina no turno ${turno} (agendado para ${dataExiste}). ` +
               `Remova a prova existente primeiro, ou escolha outra disciplina/tipo/turno.`,
      },
      { status: 409 }
    )
  }

  try {
    const prova = await prisma.planoProva.create({
      data: {
        id_curso: parseInt(id_curso),
        id_disciplina: parseInt(id_disciplina),
        ano_curricular: parseInt(ano_curricular),
        semestre,
        tipo_prova,
        // Use noon to avoid UTC timezone shifting the date by -1 day
        data_prova: new Date(data_prova + "T12:00:00"),
        turno,
        hora_inicio,
        hora_fim,
        ano_lectivo: ano_lectivo || await getAnoLectivo(),
      },
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
      acao: "CRIAR PROVA",
      tabela: "PlanoProva",
      id_registro: prova.id_prova,
      valor_antes: null,
      valor_depois: {
        nome_disciplina: discInfo?.nome_disciplina ?? `ID:${id_disciplina}`,
        codigo_disciplina: discInfo?.codigo_disciplina ?? null,
        nome_curso: cursoInfo?.nome_curso ?? `ID:${id_curso}`,
        ano_curricular: parseInt(ano_curricular),
        semestre,
        tipo_prova,
        data_prova,
        turno,
        hora_inicio,
        hora_fim,
        ano_lectivo: ano_lectivo || await getAnoLectivo()
      },
      ip_address
    })

    return NextResponse.json({ prova })
  } catch (err: unknown) {
    // Apanhar unique constraint do Prisma (código P2002)
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: `Duplicado detectado pela base de dados para ${tipo_prova} / ${turno}.` },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Erro interno ao criar prova." }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "ID em falta" }, { status: 400 })
  }

  // Snapshot before delete for audit (with human-readable names)
  const provaAntes = await prisma.planoProva.findUnique({
    where: { id_prova: parseInt(id) },
    include: {
      disciplina: { select: { nome_disciplina: true, codigo_disciplina: true } },
      curso: { select: { nome_curso: true } }
    }
  })

  await prisma.planoProva.delete({ where: { id_prova: parseInt(id) } })

  // Audit log
  if (provaAntes) {
    const dataProvaStr = `${provaAntes.data_prova.getFullYear()}-${String(provaAntes.data_prova.getMonth() + 1).padStart(2, "0")}-${String(provaAntes.data_prova.getDate()).padStart(2, "0")}`
    const ip_address = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "ELIMINAR PROVA",
      tabela: "PlanoProva",
      id_registro: provaAntes.id_prova,
      valor_antes: {
        nome_disciplina: provaAntes.disciplina.nome_disciplina,
        codigo_disciplina: provaAntes.disciplina.codigo_disciplina,
        nome_curso: provaAntes.curso.nome_curso,
        ano_curricular: provaAntes.ano_curricular,
        semestre: provaAntes.semestre,
        tipo_prova: provaAntes.tipo_prova,
        data_prova: dataProvaStr,
        turno: provaAntes.turno,
        hora_inicio: provaAntes.hora_inicio,
        hora_fim: provaAntes.hora_fim,
        ano_lectivo: provaAntes.ano_lectivo
      },
      valor_depois: null,
      ip_address
    })
  }

  return NextResponse.json({ success: true })
}
