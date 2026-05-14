import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { getSystemDate, getSemestreAtual } from '@/lib/sistema'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const now = await getSystemDate()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const semestreAtual = await getSemestreAtual()

    // Total estudantes activos
    const totalEstudantes = await prisma.estudante.count({
      where: { estado: 'EmCurso' }
    })

    // Total monografias activas (não finalizadas)
    const totalMonografiasAtivas = await prisma.monografia.count({
      where: {
        estado: {
          in: ['Submetida', 'EmRevisao', 'Aprovada', 'ParaDefender']
        }
      }
    })

    // Pagamentos pendentes do mês corrente
    const pagamentosPendentes = await prisma.pagamentoPropina.count({
      where: {
        mes: currentMonth,
        ano: currentYear,
        estado: 'Pendente'
      }
    })

    // Total arrecadado no mês corrente
    const pagamentosPagos = await prisma.pagamentoPropina.findMany({
      where: {
        mes: currentMonth,
        ano: currentYear,
        estado: 'Pago'
      },
      select: { valor_total: true }
    })

    const totalArrecadadoMes = pagamentosPagos.reduce((sum, p) => sum + Number(p.valor_total), 0)

    // Total orientadores
    const totalOrientadores = await prisma.orientador.count()

    return NextResponse.json({
      totalEstudantes,
      totalMonografiasAtivas,
      pagamentosPendentes,
      totalArrecadadoMes,
      totalOrientadores,
      semestreAtual
    })

  } catch (error) {
    console.error('Erro ao carregar estatísticas admin:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}