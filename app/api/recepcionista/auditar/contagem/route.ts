// DESIGN DECISION: Recepcionista role is read/delivery only. Payment processing is out of scope by requirement.
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "recepcionista") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id_factura = parseInt(searchParams.get("id_factura") ?? "")

  if (isNaN(id_factura)) {
    return NextResponse.json({ error: "id_factura é obrigatório" }, { status: 400 })
  }

  // Contar quantas vezes o documento desta factura já foi impresso
  const count = await prisma.auditLog.count({
    where: {
      acao: "IMPRESSAO_DOCUMENTO",
      tabela: "Factura",
      id_registro: id_factura,
    },
  })

  return NextResponse.json({ count, limite: 2, bloqueado: count >= 2 })
}
