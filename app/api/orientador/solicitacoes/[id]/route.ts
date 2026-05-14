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
  const idSolicitacao = parseInt(resolvedParams.id)

  if (isNaN(idSolicitacao)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true }
  })

  if (!orientador) return NextResponse.json({ error: "Orientador não encontrado" }, { status: 404 })

  // Verificar se a solicitação pertence a este orientador
  const solicitacao = await prisma.solicitacaoOrientacao.findUnique({
    where: { id_solicitacao: idSolicitacao }
  })

  if (!solicitacao) {
    return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 })
  }

  if (solicitacao.id_orientador !== orientador.id_orientador) {
    return NextResponse.json({ error: "Não autorizado a modificar esta solicitação" }, { status: 403 })
  }

  // Allow bidirectional state changes (Pendente/Aceite/Recusado can be changed)
  if (solicitacao.estado === "Cancelado") {
    return NextResponse.json({ error: "Solicitação cancelada não pode ser alterada" }, { status: 400 })
  }

  const body = await request.json()
  const { estado } = body

  if (!estado || !["Aceite", "Recusado"].includes(estado)) {
    return NextResponse.json({ error: "Estado inválido. Use 'Aceite' ou 'Recusado'" }, { status: 400 })
  }

  if (estado === solicitacao.estado) {
    return NextResponse.json({ error: "Solicitação já está neste estado" }, { status: 400 })
  }

  const estadoAnterior = solicitacao.estado

  // Use a transaction to ensure consistency
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update the solicitation status
    const solicitacaoAtualizada = await tx.solicitacaoOrientacao.update({
      where: { id_solicitacao: idSolicitacao },
      data: { estado },
      include: {
        estudante: {
          select: {
            id_estudante: true,
            nome_completo: true,
            numero_estudante: true,
            curso: { select: { nome_curso: true } }
          }
        }
      }
    })

    if (estado === "Aceite") {
      // 2a. On Accept: Link orientador to student's monografia
      const monografia = await tx.monografia.findFirst({
        where: { id_estudante: solicitacaoAtualizada.estudante.id_estudante }
      })
      if (monografia) {
        await tx.monografia.update({
          where: { id_monografia: monografia.id_monografia },
          data: { id_orientador: orientador.id_orientador }
        })
      }

      // 2b. On Accept: Deny all other pending requests from same student
      await tx.solicitacaoOrientacao.updateMany({
        where: {
          id_estudante: solicitacaoAtualizada.estudante.id_estudante,
          estado: "Pendente",
          NOT: { id_solicitacao: idSolicitacao }
        },
        data: { estado: "Recusado" }
      })
    } else if (estado === "Recusado" && estadoAnterior === "Aceite") {
      // 3a. On Deny (from Accept): Remove orientador from monografia
      const monografia = await tx.monografia.findFirst({
        where: { id_estudante: solicitacaoAtualizada.estudante.id_estudante }
      })
      if (monografia && monografia.id_orientador === orientador.id_orientador) {
        await tx.monografia.update({
          where: { id_monografia: monografia.id_monografia },
          data: { id_orientador: null }
        })
      }
      // Note: Student can now send new requests since no "Aceite" solicitation exists
    }

    return solicitacaoAtualizada
  })

  // 4. Log to audit system
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: estado === "Aceite" ? "ACEITAR_SOLICITACAO" : "RECUSAR_SOLICITACAO",
      tabela: "SolicitacaoOrientacao",
      id_registro: idSolicitacao,
      valor_antes: { estado: estadoAnterior },
      valor_depois: { estado, id_estudante: result.estudante.id_estudante, nome_estudante: result.estudante.nome_completo },
      ip_address: ip,
    })
  } catch (err) {
    console.error("Erro ao registrar audit log:", err)
  }

  return NextResponse.json({
    id_solicitacao: result.id_solicitacao,
    estado: result.estado,
    estudante: {
      id_estudante: result.estudante.id_estudante,
      nome: result.estudante.nome_completo,
      numero_estudante: result.estudante.numero_estudante,
      curso: result.estudante.curso.nome_curso
    },
  })
}
