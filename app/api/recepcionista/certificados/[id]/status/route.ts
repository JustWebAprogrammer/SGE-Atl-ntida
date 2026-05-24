// DESIGN DECISION: Recepcionista role is read/delivery only. Payment processing is out of scope by requirement.
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { criarNotificacao } from "@/lib/notificacoes"
import { headers } from "next/headers"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "recepcionista") {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }
    const { status } = await request.json()

    // Validate status
    const validStatuses = ["Solicitado", "EmPreparacao", "ProntoParaLevantamento", "Entregue"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Status inválido" },
        { status: 400 }
      )
    }

    // Get current certificate
    const currentCertificado = await prisma.certificado.findUnique({
      where: { id_certificado: id },
      include: { estudante: true }
    })

    if (!currentCertificado) {
      return NextResponse.json(
        { error: "Certificado não encontrado" },
        { status: 404 }
      )
    }

    // Update certificate
    const certificado = await prisma.certificado.update({
      where: { id_certificado: id },
      data: { status }
    })

    // Notificar estudante quando certificado estiver pronto
    if (status === "ProntoParaLevantamento" && currentCertificado.estudante) {
      const certTipo = currentCertificado.tipo_certificado === "Conclusao" ? "Certificado de Conclusão" : "Certificado de Disciplinas"
      await criarNotificacao({
        id_usuario: currentCertificado.estudante.id_usuario,
        tipo: "certificado",
        titulo: `${certTipo} disponível`,
        mensagem: `O seu ${certTipo} está disponível para levantar na secretaria.`,
        link_url: "/estudante/servicos"
      })
    }

    // Audit log
    const headersList = await headers()
    const ipAddress = headersList.get("x-forwarded-for") || "unknown"

    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "Atualizar Status do Certificado",
      tabela: "Certificado",
      id_registro: id,
      valor_antes: { status: currentCertificado.status },
      valor_depois: { status },
      ip_address: ipAddress
    })

    return NextResponse.json(certificado)
  } catch (error) {
    console.error("Error updating certificate status:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar status" },
      { status: 500 }
    )
  }
}