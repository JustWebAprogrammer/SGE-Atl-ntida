import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { formatPhone, validatePhone } from '@/lib/phone'

// GET - Listar todos os rececionistas
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return new NextResponse('Não autorizado', { status: 401 })
    }

    const recepcionistas = await prisma.recepcionista.findMany({
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
        id_recepcionista: 'asc'
      }
    })

    return NextResponse.json(recepcionistas)
  } catch (error) {
    console.error('Erro listar rececionistas:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}

// POST - Criar novo rececionista
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return new NextResponse('Não autorizado', { status: 401 })
    }

    const dados = await request.json()

    // Validar campos obrigatórios
    if (!dados.email || !dados.nome_completo) {
      return NextResponse.json(
        { error: 'Preencha todos os campos obrigatórios' },
        { status: 400 }
      )
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

    // Gerar nome_usuario automaticamente a partir do nome_completo
    const nomeBase = dados.nome_completo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, '')
    
    let nome_usuario = nomeBase
    let sufixo = 1
    
    // Verificar se o nome_usuario já existe e adicionar sufixo se necessário
    while (await prisma.usuario.findUnique({ where: { nome_usuario } })) {
      nome_usuario = `${nomeBase}${sufixo}`
      sufixo++
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
      const telefoneExistente = await prisma.recepcionista.findFirst({
        where: { numero_telemovel: dados.telemovel }
      })
      if (telefoneExistente) {
        return NextResponse.json(
          { error: 'Este número de telefone já está em uso' },
          { status: 409 }
        )
      }
    }

    // Senha padrão para novos recepcionistas
    const SENHA_PADRAO = 'recepcionista123'

    // Criar usuário e rececionista numa transação
    const novoRecepcionista = await prisma.$transaction(async (tx) => {
      // Criar usuário com nome_usuario gerado automaticamente
      const novoUsuario = await tx.usuario.create({
        data: {
          nome_usuario: nome_usuario,
          email: dados.email,
          senha: await bcrypt.hash(SENHA_PADRAO, 10),
          tipo_usuario: 'recepcionista'
        }
      })

      // Criar rececionista
      const novoRecepcionista = await tx.recepcionista.create({
        data: {
          nome_completo: dados.nome_completo,
          numero_telemovel: dados.telemovel || null,
          turno: dados.turno || 'Manha',
          id_usuario: novoUsuario.id_usuario
        }
      })

      return novoRecepcionista
    })

    // Buscar dados completos para retornar
    const recepcionistaCompleto = await prisma.recepcionista.findUnique({
      where: { id_recepcionista: novoRecepcionista.id_recepcionista },
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

    return NextResponse.json(recepcionistaCompleto, { status: 201 })
  } catch (error) {
    console.error('Erro criar rececionista:', error)
    return new NextResponse('Erro interno', { status: 500 })
  }
}