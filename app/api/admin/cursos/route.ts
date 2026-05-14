import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const cursos = await prisma.curso.findMany({
      include: {
        departamento: {
          select: { nome_departamento: true }
        },
        precos: true,
        _count: {
          select: { estudantes: true }
        }
      },
      orderBy: {
        nome_curso: 'asc'
      }
    })

    return NextResponse.json(cursos)

  } catch (error) {
    console.error('Erro ao listar cursos admin:', error)
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
    const { nome_curso, duracao_anos, turnos, id_departamento = 1 } = body

    const curso = await prisma.curso.create({
      data: {
        nome_curso,
        duracao_anos,
        turnos: turnos || "Matinal",
        id_departamento
      }
    })

    await logAudit({
      id_usuario: Number(session.user.id),
      acao: 'Criar Curso',
      tabela: 'Curso',
      id_registro: curso.id_curso,
      valor_depois: curso,
      ip_address: request.headers.get('x-forwarded-for') || 'localhost'
    })

    return NextResponse.json(curso)

  } catch (error) {
    console.error('Erro ao criar curso admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}