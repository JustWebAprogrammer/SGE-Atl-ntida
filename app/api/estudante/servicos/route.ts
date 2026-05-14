import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SERVICOS } from "@/lib/servicos-tipos"

// GET - Listar serviços disponíveis
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "estudante") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const estudante = await prisma.estudante.findUnique({
      where: { id_usuario: parseInt(session.user.id) },
      select: { id_estudante: true }
    })

    if (!estudante) {
      return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
    }

    // Buscar serviços ativos
    const servicos = await prisma.servico.findMany({
      where: { activo: true },
      orderBy: { ordem: "asc" },
      select: {
        id_servico: true,
        nome_servico: true,
        descricao: true,
        valor: true,
      }
    })

    // Para cada serviço, verificar se já foi pago (one-time) ou se tem pedido pendente
    const servicosComEstado = await Promise.all(
      servicos.map(async (s) => {
        let ja_pago = false
        let pendente = false

        if (s.nome_servico === SERVICOS.TAXA_MONOGRAFIA) {
          // One-time: verificar se já existe factura paga
          const facturaPaga = await prisma.factura.findFirst({
            where: {
              id_estudante: estudante.id_estudante,
              descricao_servico: SERVICOS.TAXA_MONOGRAFIA,
              estado: "Pago"
            }
          })
          ja_pago = !!facturaPaga
        }

        if (s.nome_servico === SERVICOS.CERTIFICADO_CONCLUSAO) {
          // Verificar se há pedido pendente (factura NÃO paga)
          const facturaPendente = await prisma.factura.findFirst({
            where: {
              id_estudante: estudante.id_estudante,
              descricao_servico: SERVICOS.CERTIFICADO_CONCLUSAO,
              estado: { not: "Pago" }
            }
          })
          pendente = !!facturaPendente
        }

        return {
          ...s,
          ja_pago,
          pendente,
          aceita_quantidade: s.nome_servico === SERVICOS.FOLHA_PROVA,
        }
      })
    )

    return NextResponse.json(servicosComEstado)
  } catch (error) {
    console.error("Erro ao buscar serviços:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}