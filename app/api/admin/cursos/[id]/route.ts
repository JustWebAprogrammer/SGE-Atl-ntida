import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// PUT - Atualizar curso
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const id_curso = parseInt(id)
    
    const body = await request.json()
    const { nome_curso, duracao_anos, turnos, id_departamento } = body

    // Buscar dados antigos para audit
    const cursoAnterior = await prisma.curso.findUnique({
      where: { id_curso }
    })

    if (!cursoAnterior) {
      return NextResponse.json({ error: 'Curso não encontrado' }, { status: 404 })
    }

    const curso = await prisma.curso.update({
      where: { id_curso },
      data: {
        nome_curso,
        duracao_anos,
        turnos: turnos || undefined,
        id_departamento
      }
    })

    await logAudit({
      id_usuario: Number(session.user.id),
      acao: 'ALTERAR_CURSO',
      tabela: 'Curso',
      id_registro: curso.id_curso,
      valor_antes: cursoAnterior,
      valor_depois: curso,
      ip_address: request.headers.get('x-forwarded-for') || 'localhost'
    })

    return NextResponse.json(curso)

  } catch (error) {
    console.error('Erro ao atualizar curso:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Remover curso
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const id_curso = parseInt(id)

    await prisma.curso.delete({
      where: { id_curso }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao删除 curso:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}