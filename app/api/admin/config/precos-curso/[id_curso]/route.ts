import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id_curso: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id_curso: idCurso } = await params
  const id_curso = parseInt(idCurso)
  const data = await request.json()

  const precoAnterior = await prisma.precoCurso.findUnique({
    where: {
      id_curso_ano_curricular: {
        id_curso,
        ano_curricular: data.ano_curricular
      }
    }
  })

  const precoNovo = await prisma.precoCurso.upsert({
    where: {
      id_curso_ano_curricular: {
        id_curso,
        ano_curricular: data.ano_curricular
      }
    },
    update: {
      valor_propina: data.valor_propina,
      valor_multa: data.valor_multa,
      atualizado_por: parseInt(session.user.id),
      atualizado_em: new Date()
    },
    create: {
      id_curso,
      ano_curricular: data.ano_curricular,
      valor_propina: data.valor_propina,
      valor_multa: data.valor_multa,
      atualizado_por: parseInt(session.user.id)
    }
  })

  // Registar alteração no AuditLog
  await logAudit({
    id_usuario: parseInt(session.user.id),
    acao: "ALTERAR_PRECO_CURSO",
    tabela: "PrecoCurso",
    id_registro: precoNovo.id_preco_curso,
    valor_antes: precoAnterior,
    valor_depois: precoNovo,
    ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id_curso: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id_curso: idCurso } = await params
  const id_curso = parseInt(idCurso)
  const { ano_curricular } = await request.json()

  await prisma.precoCurso.delete({
    where: {
      id_curso_ano_curricular: {
        id_curso,
        ano_curricular
      }
    }
  })

  return NextResponse.json({ success: true })
}