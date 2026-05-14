import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const departamentos = await prisma.departamento.findMany({
      include: {
        _count: {
          select: {
            cursos: true
          }
        }
      },
      orderBy: { nome_departamento: 'asc' }
    })

    // Calcular total de estudantes por departamento
    const departamentosComContagem = await Promise.all(departamentos.map(async dep => {
      const totalEstudantes = await prisma.estudante.count({
        where: {
          curso: {
            id_departamento: dep.id_departamento
          }
        }
      })

      return {
        ...dep,
        _count: {
          cursos: dep._count.cursos,
          estudantes: totalEstudantes
        }
      }
    }))

    return NextResponse.json(departamentosComContagem)

  } catch (error) {
    console.error('Erro ao listar departamentos:', error)
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
    const { nome_departamento, descricao } = body

    const departamento = await prisma.departamento.create({
      data: {
        nome_departamento,
        descricao
      }
    })

    await logAudit({
      id_usuario: Number(session.user.id),
      acao: 'Criar Departamento',
      tabela: 'Departamento',
      id_registro: departamento.id_departamento,
      valor_depois: departamento,
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
    })

    return NextResponse.json(departamento)

  } catch (error) {
    console.error('Erro ao criar departamento:', error)
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
    const { id_departamento, nome_departamento, descricao, id_gestor } = body

    // Buscar departamento atual
    const existente = await prisma.departamento.findUnique({
      where: { id_departamento }
    })

    if (!existente) {
      return NextResponse.json({ error: 'Departamento não encontrado' }, { status: 404 })
    }

    const departamento = await prisma.departamento.update({
      where: { id_departamento },
      data: {
        nome_departamento,
        descricao
      }
    })

    // Se id_gestor foi fornecido, atualizar o gestor do departamento
    if (id_gestor !== undefined) {
      // Primeiro, remover o gestor atual (se houver)
      await prisma.orientador.updateMany({
        where: { id_departamento, e_gestor: true },
        data: { e_gestor: false }
      })

      // Se id_gestor não for vazio, definir o novo gestor
      if (id_gestor) {
        const novoGestor = await prisma.orientador.findUnique({
          where: { id_orientador: Number(id_gestor) }
        })

        if (novoGestor && novoGestor.id_departamento === Number(id_departamento)) {
          await prisma.orientador.update({
            where: { id_orientador: Number(id_gestor) },
            data: { e_gestor: true }
          })

          await logAudit({
            id_usuario: Number(session.user.id),
            acao: 'Definir Gestor Departamento',
            tabela: 'Orientador',
            id_registro: Number(id_gestor),
            valor_depois: { ...novoGestor, e_gestor: true },
            ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
          })
        }
      }
    }

    await logAudit({
      id_usuario: Number(session.user.id),
      acao: 'Editar Departamento',
      tabela: 'Departamento',
      id_registro: departamento.id_departamento,
      valor_antes: existente,
      valor_depois: departamento,
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
    })

    return NextResponse.json(departamento)

  } catch (error) {
    console.error('Erro ao editar departamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id_departamento = Number(searchParams.get('id'))

    if (!id_departamento) {
      return NextResponse.json({ error: 'ID do departamento é obrigatório' }, { status: 400 })
    }

    // Verificar se tem cursos associados
    const cursosCount = await prisma.curso.count({
      where: { id_departamento }
    })

    if (cursosCount > 0) {
      return NextResponse.json({ 
        error: `Não é possível eliminar. Este departamento tem ${cursosCount} curso(s) associado(s). Remova os cursos primeiro.` 
      }, { status: 400 })
    }

    // Buscar dados para audit
    const departamento = await prisma.departamento.findUnique({
      where: { id_departamento }
    })

    if (!departamento) {
      return NextResponse.json({ error: 'Departamento não encontrado' }, { status: 404 })
    }

    await prisma.departamento.delete({
      where: { id_departamento }
    })

    await logAudit({
      id_usuario: Number(session.user.id),
      acao: 'Eliminar Departamento',
      tabela: 'Departamento',
      id_registro: id_departamento,
      valor_antes: departamento,
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao eliminar departamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
