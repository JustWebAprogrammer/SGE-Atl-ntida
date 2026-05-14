import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { getAnoLectivo } from "@/lib/sistema"

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

  const periodoRaw = await prisma.periodoProva.findUnique({
    where: {
      id_curso_ano_curricular_semestre_ano_lectivo: {
        id_curso: parseInt(cursoId),
        ano_curricular: parseInt(ano),
        semestre,
        ano_lectivo: anoLectivo,
      }
    }
  })

  // Force dates to local yyyy-mm-dd to prevent UTC timezone shift
  const periodo = periodoRaw
    ? {
        ...periodoRaw,
        data_inicio: `${periodoRaw.data_inicio.getFullYear()}-${String(periodoRaw.data_inicio.getMonth() + 1).padStart(2, "0")}-${String(periodoRaw.data_inicio.getDate()).padStart(2, "0")}`,
        data_fim: `${periodoRaw.data_fim.getFullYear()}-${String(periodoRaw.data_fim.getMonth() + 1).padStart(2, "0")}-${String(periodoRaw.data_fim.getDate()).padStart(2, "0")}`,
      }
    : null

  return NextResponse.json({ periodo })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const { id_curso, ano_curricular, semestre, ano_lectivo, data_inicio, data_fim } = body

  if (!id_curso || !ano_curricular || !semestre || !ano_lectivo || !data_inicio || !data_fim) {
    return NextResponse.json({ error: "Campos obrigatórios em falta" }, { status: 400 })
  }

  // Use noon to avoid UTC timezone shifting the date by -1 day
  const inicio = new Date(data_inicio + "T12:00:00")
  const fim = new Date(data_fim + "T12:00:00")

  if (inicio > fim) {
    return NextResponse.json({ error: "Data de início não pode ser posterior à data de fim" }, { status: 400 })
  }

  try {
    // Snapshot before upsert for audit
    const periodoAntes = await prisma.periodoProva.findUnique({
      where: {
        id_curso_ano_curricular_semestre_ano_lectivo: {
          id_curso: parseInt(id_curso),
          ano_curricular: parseInt(ano_curricular),
          semestre,
          ano_lectivo,
        }
      }
    })

    const periodo = await prisma.periodoProva.upsert({
      where: {
        id_curso_ano_curricular_semestre_ano_lectivo: {
          id_curso: parseInt(id_curso),
          ano_curricular: parseInt(ano_curricular),
          semestre,
          ano_lectivo,
        }
      },
      create: {
        id_curso: parseInt(id_curso),
        ano_curricular: parseInt(ano_curricular),
        semestre,
        ano_lectivo,
        data_inicio: inicio,
        data_fim: fim,
      },
      update: {
        data_inicio: inicio,
        data_fim: fim,
      }
    })

    // Audit log — include human-readable course name
    const cursoInfo = await prisma.curso.findUnique({
      where: { id_curso: parseInt(id_curso) },
      select: { nome_curso: true }
    })
    const ip_address = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const dadosDepois = {
      nome_curso: cursoInfo?.nome_curso ?? `ID:${id_curso}`,
      ano_curricular: parseInt(ano_curricular),
      semestre,
      ano_lectivo,
      data_inicio,
      data_fim
    }
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: periodoAntes ? "ALTERAR PERIODO PROVAS" : "CRIAR PERIODO PROVAS",
      tabela: "PeriodoProva",
      id_registro: periodo.id_periodo,
      valor_antes: periodoAntes ? {
        nome_curso: cursoInfo?.nome_curso ?? `ID:${periodoAntes.id_curso}`,
        ano_curricular: periodoAntes.ano_curricular,
        semestre: periodoAntes.semestre,
        ano_lectivo: periodoAntes.ano_lectivo,
        data_inicio: periodoAntes.data_inicio.toISOString().split("T")[0],
        data_fim: periodoAntes.data_fim.toISOString().split("T")[0]
      } : null,
      valor_depois: dadosDepois,
      ip_address
    })

    return NextResponse.json({ periodo })
  } catch {
    return NextResponse.json({ error: "Erro ao guardar período" }, { status: 400 })
  }
}