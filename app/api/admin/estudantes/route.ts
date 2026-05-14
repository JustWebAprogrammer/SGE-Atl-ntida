import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { Prisma, TipoBolsa } from '@prisma/client'
import bcrypt from "bcryptjs"
import { atribuirDisciplinasAoEstudante } from "@/lib/atribuirDisciplinas"
import { formatPhone } from "@/lib/phone"
import { getAnoLectivo, getSystemDate } from "@/lib/sistema"
import { recalcularPropinasEstudante } from "@/lib/propinas"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const id_curso = searchParams.get('id_curso')
    const ano_current = searchParams.get('ano_current')
    const tipo_bolsa = searchParams.get('tipo_bolsa')
    const turno = searchParams.get('turno')

    // Build where clause
    const where: Prisma.EstudanteWhereInput = {}
    
    if (search) {
      where.OR = [
        { nome_completo: { contains: search, mode: 'insensitive' } },
        { numero_estudante: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (id_curso) {
      where.id_curso = Number(id_curso)
    }
    
    if (ano_current) {
      where.ano_current = Number(ano_current)
    }
    
    if (tipo_bolsa) {
      where.tipo_bolsa = tipo_bolsa as TipoBolsa
    }
    
    if (turno) {
      where.turno = turno
    }

    const estudantes = await prisma.estudante.findMany({
      where,
      include: {
        usuario: {
          select: { email: true, nome_usuario: true }
        },
        curso: {
          select: { nome_curso: true }
        }
      },
      orderBy: {
        nome_completo: 'asc'
      }
    })

    return NextResponse.json(estudantes)

  } catch (error) {
    console.error('Erro ao listar estudantes admin:', error)
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
    const { id_estudante, numero_telemovel, ...resto } = body

    // Obter estudante actual para pegar id_usuario
    const estudanteActual = await prisma.estudante.findUnique({
      where: { id_estudante: Number(id_estudante) },
      select: { id_usuario: true }
    })

    if (!estudanteActual) {
      return NextResponse.json({ error: 'Estudante não encontrado' }, { status: 404 })
    }

    // Formatar telefone se fornecido
    const dadosAtualizados: Record<string, unknown> = { ...resto }
    if (numero_telemovel !== undefined) {
      dadosAtualizados.numero_telemovel = numero_telemovel && numero_telemovel.trim() !== ''
        ? formatPhone(numero_telemovel)
        : null
    }

    // Atualizar dados do estudante
    const estudante = await prisma.estudante.update({
      where: { id_estudante: Number(id_estudante) },
      data: dadosAtualizados
    })

    // Se tipo_bolsa foi alterado, recalcular propinas pendentes
    if (resto.tipo_bolsa) {
      try {
        await recalcularPropinasEstudante(Number(id_estudante))
      } catch (err) {
        console.error(`Erro ao recalcular propinas do estudante ${id_estudante}:`, err)
        // Não falha a operação principal — apenas loga o erro
      }
    }

    // Log audit
    await logAudit({
      id_usuario: Number(session.user.id),
      acao: 'Atualizar Estudante',
      tabela: 'Estudante',
      id_registro: estudante.id_estudante,
      valor_depois: estudante,
      ip_address: request.headers.get('x-forwarded-for') || 'localhost'
    })

    return NextResponse.json(estudante)

  } catch (error) {
    console.error('Erro ao atualizar estudante admin:', error)
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
    const { nome, email, telefone, id_curso, ano_actual, turno = 'Matinal', tipo_bolsa = 'Nenhuma' } = body

    // Verificar se email já existe
    const emailExistente = await prisma.usuario.findUnique({
      where: { email }
    })

    if (emailExistente) {
      return NextResponse.json(
        { error: 'Este email já está registado no sistema' },
        { status: 409 }
      )
    }

    // Formatar número de telefone angolano usando utility unificada
    const numero_telemovel = formatPhone(telefone)

    // Verificar se telefone já existe
    const telefoneExistente = await prisma.estudante.findUnique({
      where: { numero_telemovel }
    })

    if (telefoneExistente) {
      return NextResponse.json(
        { error: 'Este número de telefone já está registado' },
        { status: 409 }
      )
    }

    // Gerar número de estudante automaticamente
    // Formato: AAAA#### (ex: 20250001, 20250002...)
    // O contador reinicia a cada ano e é baseado nos estudantes desse ano
    const systemDate = await getSystemDate()
    const anoActual = systemDate.getFullYear()

    const estudantesDoAno = await prisma.estudante.count({
      where: {
        numero_estudante: {
          startsWith: String(anoActual)
        }
      }
    })

    const sufixo = (estudantesDoAno + 1).toString().padStart(4, '0')
    const numero_estudante = `${anoActual}${sufixo}`

    // Hash da senha
    const senhaHash = await bcrypt.hash('estudante12345', 10)

    // Criar utilizador primeiro
    const usuario = await prisma.usuario.create({
      data: {
        nome_usuario: nome,
        email,
        senha: senhaHash,
        tipo_usuario: 'estudante'
      }
    })

    // Ano lectivo actual
    const anoLectivoActual = await getAnoLectivo()

    // Criar estudante
    const estudante = await prisma.estudante.create({
      data: {
        id_usuario: usuario.id_usuario,
        nome_completo: nome,
        numero_estudante,
        numero_telemovel,
        id_curso,
        ano_current: ano_actual,
        turno,
        ano_electivo: anoLectivoActual,
        estado: 'EmCurso',
        tipo_bolsa
      }
    })

    // Atribuir disciplinas automaticamente para TODOS os anos (1 até ano_actual)
    if (ano_actual) {
      await atribuirDisciplinasAoEstudante(
        estudante.id_estudante,
        id_curso,
        ano_actual,
        anoLectivoActual
      )
    }

    // Log audit
    await logAudit({
      id_usuario: Number(session.user.id),
      acao: 'Criar Estudante',
      tabela: 'Estudante',
      id_registro: estudante.id_estudante,
      valor_depois: estudante,
      ip_address: request.headers.get('x-forwarded-for') || 'localhost'
    })

    return NextResponse.json(estudante)

  } catch (error) {
    console.error('Erro ao criar estudante admin:', error)
    
    if (
      typeof error === 'object' && 
      error !== null && 
      'code' in error && 
      error.code === 'P2002' && 
      'meta' in error && 
      typeof error.meta === 'object' && 
      error.meta !== null &&
      'target' in error.meta &&
      Array.isArray(error.meta.target) &&
      error.meta.target.includes('email')
    ) {
      return NextResponse.json(
        { error: 'Este email já está registado no sistema' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}