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

  let body: { id_factura: number; tipo: "fatura" | "documento" }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { id_factura, tipo } = body
  if (!id_factura || !tipo) {
    return NextResponse.json({ error: "id_factura e tipo são obrigatórios" }, { status: 400 })
  }

  // Buscar factura para obter detalhes
  const factura = await prisma.factura.findUnique({
    where: { id_factura },
    select: {
      id_factura: true,
      descricao_servico: true,
      id_estudante: true,
      estudante: { select: { nome_completo: true } },
    },
  })

  if (!factura) {
    return NextResponse.json({ error: "Factura não encontrada" }, { status: 404 })
  }

  const acao = tipo === "documento" ? "IMPRESSAO_DOCUMENTO" : "IMPRESSAO_FATURA"

  // Bloquear impressão de documento se já atingiu o limite de 2 vezes
  if (tipo === "documento") {
    const count = await prisma.auditLog.count({
      where: {
        acao: "IMPRESSAO_DOCUMENTO",
        tabela: "Factura",
        id_registro: id_factura,
      },
    })

    if (count >= 2) {
      return NextResponse.json(
        { error: "Limite de impressões do documento atingido (máx. 2)" },
        { status: 403 }
      )
    }
  }

  await logAudit({
    id_usuario,
    acao,
    tabela: "Factura",
    id_registro: id_factura,
    valor_depois: {
      descricao_servico: factura.descricao_servico,
      id_estudante: factura.id_estudante,
      nome_estudante: factura.estudante.nome_completo,
      tipo_impressao: tipo,
    },
    ip_address: ip,
  })

  return NextResponse.json({
    success: true,
    mensagem: `${tipo === "documento" ? "Documento" : "Fatura"} registado no audit`,
  })
}
