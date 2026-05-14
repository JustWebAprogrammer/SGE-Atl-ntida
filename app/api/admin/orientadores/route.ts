import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { formatPhone } from '@/lib/phone'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const id_departamento = searchParams.get('id_departamento')
    const id_curso = searchParams.get('id_curso')

    // Construir where clause
    const where: Prisma.OrientadorWhereInput = {}

    // Filtro por nome (pesquisa)
    if (search) {
      where.nome_completo = { contains: search, mode: 'insensitive' }
    }

    // Filtro por departamento
    if (id_departamento) {
      where.id_departamento = Number(id_departamento)
    }

    const orientadores = await prisma.orientador.findMany({
      where,
      include: {
        usuario: {
          select: { email: true, nome_usuario: true }
        },
        departamento: true
      },
      orderBy: {
        nome_completo: 'asc'
      }
    })

    // Se filtrar por curso, retorna todos (a relação com curso seria via disciplinas)
    // O filtro por curso pode ser implementado futuramente via disciplinas
    const resultado = orientadores

    return NextResponse.json(resultado)

  } catch (error) {
    console.error('Erro ao listar orientadores admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { nome, email, especialidade, id_departamento, numero_telemovel } = body

    // Hash da senha
    const senhaHash = await bcrypt.hash('orientador123', 10)

    // Criar utilizador primeiro
    const usuario = await prisma.usuario.create({
      data: {
        nome_usuario: nome,
        email,
        senha: senhaHash,
        tipo_usuario: 'orientador'
      }
    })

    // Criar orientador
    const orientador = await prisma.orientador.create({
      data: {
        id_usuario: usuario.id_usuario,
        nome_completo: nome,
        especialidade: especialidade || '',
        numero_telemovel: numero_telemovel ? formatPhone(numero_telemovel) : null,
        id_departamento: id_departamento ? Number(id_departamento) : null,
        e_gestor: false
      }
    })

    // Log audit
    await logAudit({
      id_usuario: Number(session.user.id),
      acao: 'Criar Orientador',
      tabela: 'Orientador',
      id_registro: orientador.id_orientador,
      valor_depois: orientador,
      ip_address: request.headers.get('x-forwarded-for') || 'localhost'
    })

    return NextResponse.json(orientador)

  } catch (error) {
    console.error('Erro ao criar orientador admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id_orientador, nome_completo, especialidade, numero_telemovel, id_departamento, e_gestor, substituir_gestor, tipo } = body

    // Handle password reset
    if (tipo === 'reset_password') {
      if (!id_orientador) {
        return NextResponse.json({ error: 'ID do orientador é obrigatório' }, { status: 400 })
      }
      
      // Find orientador to get their user ID
      const orientador = await prisma.orientador.findUnique({
        where: { id_orientador: Number(id_orientador) },
        select: { id_usuario: true }
      })
      
      if (!orientador) {
        return NextResponse.json({ error: 'Orientador não encontrado' }, { status: 404 })
      }
      
      // Hash new password
      const novaSenhaHash = await bcrypt.hash('orientador123', 10)
      
      // Update the user's password
      await prisma.usuario.update({
        where: { id_usuario: orientador.id_usuario },
        data: { senha: novaSenhaHash }
      })
      
      // Log audit
      await logAudit({
        id_usuario: Number(session.user.id),
        acao: 'Reset Password Orientador',
        tabela: 'Usuario',
        id_registro: orientador.id_usuario,
        ip_address: request.headers.get('x-forwarded-for') || 'localhost'
      })
      
      return NextResponse.json({ success: true, message: 'Password redefinido para: orientador123' })
    }

    if (!id_orientador) {
      return NextResponse.json({ error: 'ID do orientador é obrigatório' }, { status: 400 })
    }

    // Se está a marcar como gestor, verificar se já existe outro no mesmo departamento
    if (e_gestor === true && id_departamento) {
      const gestorExistente = await prisma.orientador.findFirst({
        where: {
          id_departamento: Number(id_departamento),
          e_gestor: true,
          NOT: { id_orientador: Number(id_orientador) }
        }
      })

      if (gestorExistente) {
        if (!substituir_gestor) {
          return NextResponse.json({ 
            error: 'Já existe um gestor neste departamento',
            gestor_existente: gestorExistente.nome_completo
          }, { status: 409 })
        }

        // Remover gestor anterior
        await prisma.orientador.update({
          where: { id_orientador: gestorExistente.id_orientador },
          data: { e_gestor: false }
        })
      }
    }

    // Atualizar orientador
    const orientador = await prisma.orientador.update({
      where: { id_orientador: Number(id_orientador) },
      data: {
        nome_completo,
        especialidade,
        numero_telemovel: numero_telemovel ? formatPhone(numero_telemovel) : null,
        id_departamento: id_departamento ? Number(id_departamento) : null,
        e_gestor: e_gestor !== undefined ? e_gestor : undefined
      }
    })

    // Log audit
    await logAudit({
      id_usuario: Number(session.user.id),
      acao: 'Editar Orientador',
      tabela: 'Orientador',
      id_registro: orientador.id_orientador,
      valor_depois: orientador,
      ip_address: request.headers.get('x-forwarded-for') || 'localhost'
    })

    return NextResponse.json(orientador)

  } catch (error) {
    console.error('Erro ao editar orientador admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
