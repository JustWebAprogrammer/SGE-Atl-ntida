import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const pagamentos = await prisma.pagamentoPropina.findMany({
      include: {
        estudante: {
          select: {
            nome_completo: true,
            numero_estudante: true
          }
        }
      },
      orderBy: {
        data_vencimento: 'desc'
      },
      take: 200
    })

    return NextResponse.json(pagamentos)

  } catch (error) {
    console.error('Erro ao listar pagamentos admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}