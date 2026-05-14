// DESIGN DECISION: Recepcionista role is read/delivery only. Payment processing is out of scope by requirement.
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { getSystemDate } from "@/lib/sistema"

type TipoEmissao = "levantamento_certificado"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "recepcionista") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const id_usuario = parseInt(session.user.id)

  let body: { tipo: TipoEmissao; id_estudante: number; id_certificado?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { tipo, id_estudante, id_certificado } = body

  if (!tipo || !id_estudante) {
    return NextResponse.json({ error: "Campos obrigatórios em falta: tipo, id_estudante" }, { status: 400 })
  }

  // Verificar que o estudante existe
  const estudante = await prisma.estudante.findUnique({
    where: { id_estudante },
    select: { id_estudante: true, nome_completo: true, numero_estudante: true },
  })
  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  // Buscar recepcionista para id_recepcionista nas facturas
  const recepcionista = await prisma.recepcionista.findUnique({
    where: { id_usuario },
    select: { id_recepcionista: true },
  })

  // Get system date for the emitted documents
  const systemDate = await getSystemDate()
  const hoje = systemDate

  // ─── LEVANTAMENTO FÍSICO DE CERTIFICADO ─────────────────────────────────────
  if (tipo === "levantamento_certificado") {
    if (!id_certificado) {
      return NextResponse.json({ error: "id_certificado obrigatório para levantamento" }, { status: 400 })
    }

    const certificado = await prisma.certificado.findUnique({
      where: { id_certificado },
      select: { id_certificado: true, id_estudante: true, tipo_certificado: true },
    })

    if (!certificado) {
      return NextResponse.json({ error: "Certificado não encontrado" }, { status: 404 })
    }
    if (certificado.id_estudante !== id_estudante) {
      return NextResponse.json({ error: "Certificado não pertence a este estudante" }, { status: 403 })
    }

    // Criar factura de registo do levantamento (valor 0 — é apenas confirmação física)
    const factura = await prisma.factura.create({
      data: {
        id_estudante,
        descricao_servico: `Levantamento de certificado (${certificado.tipo_certificado})`,
        valor_total: 0,
        data_emissao: hoje,
        data_vencimento: hoje,
        estado: "Pago",
        metodo_pagamento: "Presencial",
        data_pagamento: hoje,
        id_recepcionista: recepcionista?.id_recepcionista ?? null,
      },
    })

    await logAudit({
      id_usuario,
      acao: "LEVANTAMENTO_CERTIFICADO",
      tabela: "Certificado",
      id_registro: id_certificado,
      valor_depois: {
        id_certificado,
        id_estudante,
        tipo: certificado.tipo_certificado,
        confirmado_em: hoje.toISOString(),
      },
      ip_address: ip,
    })

    return NextResponse.json({
      success: true,
      mensagem: "Levantamento de certificado confirmado",
      id_factura: factura.id_factura,
    })
  }

  return NextResponse.json({ error: "Tipo de emissão inválido" }, { status: 400 })
}
