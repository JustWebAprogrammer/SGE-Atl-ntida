import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { formatPhone, validatePhone } from '@/lib/phone'

// GET - Buscar admin específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return new NextResponse('Não autorizado', { status: 401 })
    }

    const { id } = await params
    const id_admin = Number(id)

    if (isNaN(id_admin)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const admin = await prisma.admin.findUnique({
      where: { id_admin },
      include: {
        usuario: {
          select: {
            nome_usuario: true,
            email: true,
            data_cadastro: true
          }
        }
      }
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin não encontrado' }, { status: 404 })
    }

    return NextResponse.json(admin)
  } catch (error) {
    console.error('Erro buscar admin:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}

// PUT - Atualizar admin
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return new NextResponse('Não autorizado', { status: 401 })
    }

    const { id } = await params
    const id_admin = Number(id)

    if (isNaN(id_admin)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const dados = await request.json()

    // Buscar admin atual
    const adminAtual = await prisma.admin.findUnique({
      where: { id_admin },
      include: { usuario: true }
    })

    if (!adminAtual) {
      return NextResponse.json({ error: 'Admin não encontrado' }, { status: 404 })
    }

    // Validar email único (se alterado)
    if (dados.email && dados.email !== adminAtual.usuario.email) {
      const emailExistente = await prisma.usuario.findFirst({
        where: {
          email: dados.email,
          NOT: { id_usuario: adminAtual.id_usuario }
        }
      })
      if (emailExistente) {
        return NextResponse.json(
          { error: 'Este email já está em uso' },
          { status: 409 }
        )
      }
    }

    // Validar telefone (se fornecido)
    let telefoneFormatado = dados.telemovel
    if (dados.telemovel && dados.telemovel.trim() !== '') {
      if (!validatePhone(dados.telemovel)) {
        return NextResponse.json(
          { error: 'O número de telefone deve ter 8 dígitos' },
          { status: 400 }
        )
      }

      telefoneFormatado = formatPhone(dados.telemovel)

      // Verificar telefone único (excluindo o próprio)
      const telefoneExistente = await prisma.admin.findFirst({
        where: {
          numero_telemovel: telefoneFormatado,
          NOT: { id_admin }
        }
      })
      if (telefoneExistente) {
        return NextResponse.json(
          { error: 'Este número de telefone já está em uso' },
          { status: 409 }
        )
      }
    }

    // Atualizar numa transação (sem editar nome_usuario)
    const adminAtualizado = await prisma.$transaction(async (tx) => {
      // Atualizar usuário (apenas email)
      await tx.usuario.update({
        where: { id_usuario: adminAtual.id_usuario },
        data: {
          email: dados.email || adminAtual.usuario.email
        }
      })

      // Atualizar admin
      return await tx.admin.update({
        where: { id_admin },
        data: {
          nome_completo: dados.nome_completo || adminAtual.nome_completo,
          numero_telemovel: telefoneFormatado || adminAtual.numero_telemovel
        }
      })
    })

    // Buscar dados completos
    const adminCompleto = await prisma.admin.findUnique({
      where: { id_admin: adminAtualizado.id_admin },
      include: {
        usuario: {
          select: {
            nome_usuario: true,
            email: true,
            data_cadastro: true
          }
        }
      }
    })

    return NextResponse.json(adminCompleto)
  } catch (error) {
    console.error('Erro atualizar admin:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}

// DELETE - Remover admin
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return new NextResponse('Não autorizado', { status: 401 })
    }

    const { id } = await params
    const id_admin = Number(id)

    if (isNaN(id_admin)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Verificar se é o último admin
    const totalAdmins = await prisma.admin.count()
    if (totalAdmins <= 1) {
      return NextResponse.json(
        { error: 'Não é possível remover o último administrador' },
        { status: 400 }
      )
    }

    // Buscar admin
    const admin = await prisma.admin.findUnique({
      where: { id_admin }
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin não encontrado' }, { status: 404 })
    }

    // Não permitir que o admin atual se remova
    const userId = Number(session.user.id)
    if (userId === admin.id_usuario) {
      return NextResponse.json(
        { error: 'Não pode remover a sua própria conta' },
        { status: 400 }
      )
    }

    // Remover numa transação
    await prisma.$transaction(async (tx) => {
      // Remover admin
      await tx.admin.delete({
        where: { id_admin }
      })

      // Remover usuário
      await tx.usuario.delete({
        where: { id_usuario: admin.id_usuario }
      })
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Erro remover admin:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}