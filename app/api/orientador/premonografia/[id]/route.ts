// app/api/orientador/premonografias/[id]/route.ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "orientador") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const idPremonografia = parseInt(id)
  if (isNaN(idPremonografia)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true }
  })

  if (!orientador) return NextResponse.json({ error: "Orientador não encontrado" }, { status: 404 })

  // Verify this premonografia belongs to a student oriented by this orientador
  const premonografia = await prisma.premonografia.findUnique({
    where: { id_premonografia: idPremonografia },
    include: {
      estudante: {
        include: {
          solicitacoes: {
            where: { id_orientador: orientador.id_orientador }
          }
        }
      }
    }
  })

  if (!premonografia) return NextResponse.json({ error: "Pré-projecto não encontrado" }, { status: 404 })
  if (premonografia.estudante.solicitacoes.length === 0) {
    return NextResponse.json({ error: "Não autorizado a modificar este pré-projecto" }, { status: 403 })
  }


  const body = await request.json()
  const { estado, feedback } = body

  if (!estado || !["Aprovado", "Reprovado"].includes(estado)) {
    return NextResponse.json({ error: "Estado inválido. Use 'Aprovado' ou 'Reprovado'" }, { status: 400 })
  }

  const estadoAnterior = premonografia.estado

  const atualizado = await prisma.premonografia.update({
    where: { id_premonografia: idPremonografia },
    data: {
      estado,
      feedback: feedback ?? null
    }
  })

  // Log audit
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: estado === "Aprovado" ? "APROVAR_PRE_PROJECTO" : "REPROVAR_PRE_PROJECTO",
      tabela: "Premonografia",
      id_registro: idPremonografia,
      valor_antes: { estado: estadoAnterior },
      valor_depois: { estado, feedback: feedback ?? null },
      ip_address: ip,
    })
  } catch (err) {
    console.error("Erro ao registrar audit log:", err)
  }

  return NextResponse.json({
    id_premonografia: atualizado.id_premonografia,
    estado: atualizado.estado,
    feedback: atualizado.feedback
  })
}