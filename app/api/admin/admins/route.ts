import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { formatPhone, validatePhone } from '@/lib/phone'

const MAX_ADMINS = 2

// GET - Listar todos os administradores
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return new NextResponse('Não autorizado', { status: 401 })
    }

    // Extrair parâmetros de pesquisa da URL
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // Construir filtro de pesquisa
    const where = search ? {
      OR: [
        { nome_completo: { contains: search, mode: 'insensitive' as const } },
        { usuario: { email: { contains: search, mode: 'insensitive' as const } } },
        { usuario: { nome_usuario: { contains: search, mode: 'insensitive' as const } } }
      ]
    } : {}

    const admins = await prisma.admin.findMany({
      where,
      include: {
        usuario: {
          select: {
            nome_usuario: true,
            email: true,
            data_cadastro: true
          }
        }
      },
      orderBy: {
        id_admin: 'asc'
      }
    })

    return NextResponse.json(admins)
  } catch (error) {
    console.error('Erro listar admins:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}

// POST - Criar novo administrador
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return new NextResponse('Não autorizado', { status: 401 })
    }

    // Verificar limite de admins
    const totalAdmins = await prisma.admin.count()
    if (totalAdmins >= MAX_ADMINS) {
      return NextResponse.json(
        { error: `Limite máximo de ${MAX_ADMINS} administradores atingido` },
        { status: 400 }
      )
    }

    const dados = await request.json()

    // Validar campos obrigatórios (sem nome_usuario - é gerado automaticamente)
    if (!dados.email || !dados.nome_completo) {
      return NextResponse.json(
        { error: 'Preencha todos os campos obrigatórios' },
        { status: 400 }
      )
    }

    // Gerar nome_usuario automaticamente: primeiro nome + sobrenome (em minúsculas)
    const partesNome = dados.nome_completo.trim().split(/\s+/)
    const primeiroNome = partesNome[0] || ''
    const sobrenome = partesNome.length > 1 ? partesNome[partesNome.length - 1] : ''
    const nome_usuario = `${primeiroNome}${sobrenome}`.toLowerCase().replace(/[^a-z]/g, '')

    if (!nome_usuario) {
      return NextResponse.json(
        { error: 'Nome completo inválido' },
        { status: 400 }
      )
    }

    // Se nome_usuario já existe, adicionar número
    let nomeUsuarioFinal = nome_usuario
    let contador = 1
    while (await prisma.usuario.findUnique({ where: { nome_usuario: nomeUsuarioFinal } })) {
      nomeUsuarioFinal = `${nome_usuario}${contador}`
      contador++
    }

    // Validar email único
    const emailExistente = await prisma.usuario.findUnique({
      where: { email: dados.email }
    })
    if (emailExistente) {
      return NextResponse.json(
        { error: 'Este email já está em uso' },
        { status: 409 }
      )
    }

    // Validar telefone (se fornecido)
    if (dados.telemovel && dados.telemovel.trim() !== '') {
      if (!validatePhone(dados.telemovel)) {
        return NextResponse.json(
          { error: 'O número de telefone deve ter 8 dígitos' },
          { status: 400 }
        )
      }

      // Formatar para padrão angolano usando utility unificada
      dados.telemovel = formatPhone(dados.telemovel)

      // Verificar telefone único
      const telefoneExistente = await prisma.admin.findFirst({
        where: { numero_telemovel: dados.telemovel }
      })
      if (telefoneExistente) {
        return NextResponse.json(
          { error: 'Este número de telefone já está em uso' },
          { status: 409 }
        )
      }
    }

    // Criar usuário e admin numa transação
    const novoAdmin = await prisma.$transaction(async (tx) => {
      // Criar usuário com senha padrão
      const novoUsuario = await tx.usuario.create({
        data: {
          nome_usuario: nomeUsuarioFinal,
          email: dados.email,
          senha: await bcrypt.hash('admin123', 10),
          tipo_usuario: 'admin'
        }
      })

      // Criar admin
      const novoAdmin = await tx.admin.create({
        data: {
          nome_completo: dados.nome_completo,
          numero_telemovel: dados.telemovel || null,
          id_usuario: novoUsuario.id_usuario
        }
      })

      return novoAdmin
    })

    // Buscar dados completos para retornar
    const adminCompleto = await prisma.admin.findUnique({
      where: { id_admin: novoAdmin.id_admin },
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

    return NextResponse.json(adminCompleto, { status: 201 })
  } catch (error) {
    console.error('Erro criar admin:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}

// PATCH - Reset password de admin
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id_admin, tipo } = body

    if (tipo === 'reset_password') {
      if (!id_admin) {
        return NextResponse.json({ error: 'ID do admin é obrigatório' }, { status: 400 })
      }
      
      // Find admin to get their user ID
      const admin = await prisma.admin.findUnique({
        where: { id_admin: Number(id_admin) },
        select: { id_usuario: true, nome_completo: true }
      })
      
      if (!admin) {
        return NextResponse.json({ error: 'Admin não encontrado' }, { status: 404 })
      }
      
      // Hash new password
      const novaSenhaHash = await bcrypt.hash('admin123', 10)
      
      // Update the user's password
      await prisma.usuario.update({
        where: { id_usuario: admin.id_usuario },
        data: { senha: novaSenhaHash }
      })
      
      return NextResponse.json({ success: true, message: 'Password redefinido para: admin123' })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (error) {
    console.error('Erro reset password admin:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}
