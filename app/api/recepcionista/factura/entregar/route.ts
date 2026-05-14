// DESIGN DECISION: Recepcionista role is read/delivery only. Payment processing is out of scope by requirement.
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "recepcionista") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const id_usuario = parseInt(session.user.id)

  let body: { id_factura: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { id_factura } = body
  if (!id_factura) {
    return NextResponse.json({ error: "id_factura é obrigatório" }, { status: 400 })
  }

  // Buscar factura atual
  const factura = await prisma.factura.findUnique({
    where: { id_factura },
    select: {
      id_factura: true,
      entregue: true,
      descricao_servico: true,
      id_estudante: true,
    },
  })

  if (!factura) {
    return NextResponse.json({ error: "Factura não encontrada" }, { status: 404 })
  }

  // Marcar como entregue
  const novaFactura = await prisma.factura.update({
    where: { id_factura },
    data: { entregue: true },
  })

  await logAudit({
    id_usuario,
    acao: "MARCAR_ENTREGUE",
    tabela: "Factura",
    id_registro: id_factura,
    valor_antes: { entregue: factura.entregue, descricao_servico: factura.descricao_servico, id_estudante: factura.id_estudante },
    valor_depois: { entregue: true, descricao_servico: factura.descricao_servico, id_estudante: factura.id_estudante },
    ip_address: ip,
  })

  return NextResponse.json({
    success: true,
    mensagem: "Documento marcado como entregue",
    entregue: novaFactura.entregue,
  })
}
