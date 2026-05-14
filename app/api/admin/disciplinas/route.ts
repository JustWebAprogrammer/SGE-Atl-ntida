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

    const disciplinas = await prisma.disciplina.findMany({
      include: {
        departamento: {
          select: { id_departamento: true, nome_departamento: true }
        },
        _count: {
          select: { notas: true }
        }
      },
      orderBy: [
        { ano_curricular: 'asc' },
        { semestre: 'asc' },
        { nome_disciplina: 'asc' }
      ]
    })

    return NextResponse.json(disciplinas)

  } catch (error) {
    console.error('Erro ao listar disciplinas admin:', error)
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
    const { nome_disciplina, codigo_disciplina, creditos, id_departamento, tem_dispensa, nota_dispensa, ano_curricular, semestre } = body

    const disciplina = await prisma.disciplina.create({
      data: {
        nome_disciplina,
        codigo_disciplina,
        creditos,
        id_departamento: id_departamento || 1,
        tem_dispensa,
        nota_dispensa,
        ano_curricular: ano_curricular || 1,
        semestre: semestre || "S1",
      }
    })

    await logAudit({
      id_usuario: Number(session.user.id),
      acao: 'Criar Disciplina',
      tabela: 'Disciplina',
      id_registro: disciplina.id_disciplina,
      valor_depois: disciplina,
      ip_address: request.headers.get('x-forwarded-for') || 'localhost'
    })

    return NextResponse.json(disciplina)

  } catch (error) {
    console.error('Erro ao criar disciplina admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id_disciplina, nome_disciplina, codigo_disciplina, creditos, id_departamento, tem_dispensa, nota_dispensa, ano_curricular, semestre } = body

    const disciplina = await prisma.disciplina.update({
      where: { id_disciplina },
      data: {
        nome_disciplina,
        codigo_disciplina,
        creditos,
        id_departamento: id_departamento || 1,
        tem_dispensa,
        nota_dispensa,
        ano_curricular: ano_curricular || 1,
        semestre: semestre || "S1",
      }
    })

    await logAudit({
      id_usuario: Number(session.user.id),
      acao: 'Editar Disciplina',
      tabela: 'Disciplina',
      id_registro: disciplina.id_disciplina,
      valor_depois: disciplina,
      ip_address: request.headers.get('x-forwarded-for') || 'localhost'
    })

    return NextResponse.json(disciplina)

  } catch (error) {
    console.error('Erro ao editar disciplina admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
