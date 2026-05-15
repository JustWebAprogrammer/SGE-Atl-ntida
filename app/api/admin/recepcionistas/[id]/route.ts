import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { formatPhone, validatePhone } from '@/lib/phone'

// GET - Buscar rececionista específico
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
    const id_recepcionista = Number(id)

    if (isNaN(id_recepcionista)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const recepcionista = await prisma.recepcionista.findUnique({
      where: { id_recepcionista },
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

    if (!recepcionista) {
      return NextResponse.json({ error: 'Recepcionista não encontrado' }, { status: 404 })
    }

    return NextResponse.json(recepcionista)
  } catch (error) {
    console.error('Erro buscar rececionista:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}

// PUT - Atualizar rececionista
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
    const id_recepcionista = Number(id)

    if (isNaN(id_recepcionista)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const dados = await request.json()

    // Buscar rececionista atual
    const recepcionistaAtual = await prisma.recepcionista.findUnique({
      where: { id_recepcionista },
      include: { usuario: true }
    })

    if (!recepcionistaAtual) {
      return NextResponse.json({ error: 'Recepcionista não encontrado' }, { status: 404 })
    }

    // Validar email único (se alterado)
    if (dados.email && dados.email !== recepcionistaAtual.usuario.email) {
      const emailExistente = await prisma.usuario.findFirst({
        where: {
          email: dados.email,
          NOT: { id_usuario: recepcionistaAtual.id_usuario }
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
      const telefoneExistente = await prisma.recepcionista.findFirst({
        where: {
          numero_telemovel: telefoneFormatado,
          NOT: { id_recepcionista }
        }
      })
      if (telefoneExistente) {
        return NextResponse.json(
          { error: 'Este número de telefone já está em uso' },
          { status: 409 }
        )
      }
    }

    // Atualizar numa transação
    const rececionistaAtualizado = await prisma.$transaction(async (tx) => {
      // Atualizar usuário
      await tx.usuario.update({
        where: { id_usuario: recepcionistaAtual.id_usuario },
        data: {
          email: dados.email || recepcionistaAtual.usuario.email
        }
      })

      // Atualizar rececionista
      return await tx.recepcionista.update({
        where: { id_recepcionista },
        data: {
          nome_completo: dados.nome_completo || recepcionistaAtual.nome_completo,
          numero_telemovel: telefoneFormatado || recepcionistaAtual.numero_telemovel,
          turno: dados.turno || recepcionistaAtual.turno
        }
      })
    })

    // Buscar dados completos
    const recepcionistaCompleto = await prisma.recepcionista.findUnique({
      where: { id_recepcionista: rececionistaAtualizado.id_recepcionista },
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

    return NextResponse.json(recepcionistaCompleto)
  } catch (error) {
    console.error('Erro atualizar rececionista:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}

// PATCH - Reset password do rececionista
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const id_recepcionista = Number(id)

    if (isNaN(id_recepcionista)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const { tipo } = body

    if (tipo === 'reset_password') {
      const recepcionista = await prisma.recepcionista.findUnique({
        where: { id_recepcionista },
        select: { id_usuario: true, nome_completo: true }
      })

      if (!recepcionista) {
        return NextResponse.json({ error: 'Recepcionista não encontrado' }, { status: 404 })
      }

      const SENHA_PADRAO = 'recepcionista123'
      const novaSenhaHash = await bcrypt.hash(SENHA_PADRAO, 10)

      await prisma.usuario.update({
        where: { id_usuario: recepcionista.id_usuario },
        data: { senha: novaSenhaHash }
      })

      return NextResponse.json({ success: true, message: `Password redefinido para: ${SENHA_PADRAO}` })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (error) {
    console.error('Erro reset password recepcionista:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}

// DELETE - Remover rececionista
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
    const id_recepcionista = Number(id)

    if (isNaN(id_recepcionista)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Buscar rececionista
    const recepcionista = await prisma.recepcionista.findUnique({
      where: { id_recepcionista }
    })

    if (!recepcionista) {
      return NextResponse.json({ error: 'Recepcionista não encontrado' }, { status: 404 })
    }

    // Remover numa transação
    await prisma.$transaction(async (tx) => {
      // Remover rececionista
      await tx.recepcionista.delete({
        where: { id_recepcionista }
      })

      // Remover usuário
      await tx.usuario.delete({
        where: { id_usuario: recepcionista.id_usuario }
      })
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Erro remover rececionista:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}