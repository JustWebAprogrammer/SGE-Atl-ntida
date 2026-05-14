import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const servicos = await prisma.servico.findMany({
      where: { activo: true },
      orderBy: { ordem: "asc" },
    })

    return NextResponse.json(servicos)
  } catch (error) {
    console.error("Erro ao buscar serviços:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { nome_servico, descricao, valor } = body

    if (!nome_servico || !valor) {
      return NextResponse.json({ error: "Nome e valor são obrigatórios" }, { status: 400 })
    }

    // Contar serviços existentes para definir a ordem
    const count = await prisma.servico.count()

    const servico = await prisma.servico.create({
      data: {
        nome_servico,
        descricao: descricao || null,
        valor: Number(valor),
        ordem: count + 1,
        id_configuracao: 1,
      },
    })

    return NextResponse.json(servico)
  } catch (error) {
    console.error("Erro ao criar serviço:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id_servico, nome_servico, descricao, valor, ordem } = body

    if (!id_servico) {
      return NextResponse.json({ error: "ID do serviço é obrigatório" }, { status: 400 })
    }

    const servico = await prisma.servico.update({
      where: { id_servico },
      data: {
        ...(nome_servico && { nome_servico }),
        ...(descricao !== undefined && { descricao }),
        ...(valor && { valor: Number(valor) }),
        ...(ordem !== undefined && { ordem }),
      },
    })

    return NextResponse.json(servico)
  } catch (error) {
    console.error("Erro ao atualizar serviço:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id_servico = searchParams.get("id")

    if (!id_servico) {
      return NextResponse.json({ error: "ID do serviço é obrigatório" }, { status: 400 })
    }

    // Em vez de excluir, vamos marcar como inactivo
    await prisma.servico.update({
      where: { id_servico: Number(id_servico) },
      data: { activo: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao eliminar serviço:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}