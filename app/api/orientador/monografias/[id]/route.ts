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

  const resolvedParams = await params
  const idMonografia = parseInt(resolvedParams.id)

  if (isNaN(idMonografia)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true }
  })

  if (!orientador) return NextResponse.json({ error: "Orientador não encontrado" }, { status: 404 })

  // Verificar se a monografia pertence a um estudante orientado por este orientador
  const monografia = await prisma.monografia.findUnique({
    where: { id_monografia: idMonografia },
    include: {
      estudante: {
        include: {
          solicitacoes: {
            where: {
              id_orientador: orientador.id_orientador,
              estado: "Aceite"
            }
          }
        }
      }
    }
  })

  if (!monografia) {
    return NextResponse.json({ error: "Monografia não encontrada" }, { status: 404 })
  }

  if (monografia.estudante.solicitacoes.length === 0) {
    return NextResponse.json({ error: "Não autorizado a modificar esta monografia" }, { status: 403 })
  }

  const body = await request.json()
  const { estado, feedback } = body

  // Validar transições de estado permitidas
  const transicoesPermitidas: Record<string, string[]> = {
    Submetida: ["EmRevisao"],
    EmRevisao: ["Aprovada", "Rejeitada"],
  }

  if (estado && !transicoesPermitidas[monografia.estado]?.includes(estado)) {
    return NextResponse.json({ 
      error: `Transição de estado inválida: ${monografia.estado} → ${estado}` 
    }, { status: 400 })
  }

  const estadoAnterior = monografia.estado

  const dadosAtualizacao: Record<string, unknown> = {}
  if (estado) dadosAtualizacao.estado = estado
  if (feedback !== undefined) dadosAtualizacao.feedback = feedback

  const monografiaAtualizada = await prisma.monografia.update({
    where: { id_monografia: idMonografia },
    data: dadosAtualizacao,
    include: {
      estudante: {
        select: {
          nome_completo: true,
          numero_estudante: true,
        }
      }
    }
  })

  // Log audit
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: `AVALIAR_MONOGRAFIA_${estado}`,
      tabela: "Monografia",
      id_registro: idMonografia,
      valor_antes: { estado: estadoAnterior, feedback: monografia.feedback },
      valor_depois: { estado, feedback: feedback ?? null, titulo: monografia.titulo },
      ip_address: ip,
    })
  } catch (err) {
    console.error("Erro ao registrar audit log:", err)
  }

  return NextResponse.json({
    id_monografia: monografiaAtualizada.id_monografia,
    titulo: monografiaAtualizada.titulo,
    estado: monografiaAtualizada.estado,
    feedback: monografiaAtualizada.feedback,
    estudante: monografiaAtualizada.estudante,
  })
}