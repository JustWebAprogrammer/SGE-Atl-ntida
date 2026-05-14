import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET - Buscar disciplinas do curso
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const resolvedParams = await params
    const id_curso = Number(resolvedParams.id)

    if (!id_curso || isNaN(id_curso)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Buscar disciplinas do curso
    const cursoDisciplinas = await prisma.cursoDisciplina.findMany({
      where: { id_curso },
      include: {
        disciplina: {
          include: {
            departamento: {
              select: {
                id_departamento: true,
                nome_departamento: true
              }
            }
          }
        }
      }
    })

    // Buscar todas as disciplinas disponíveis (para mostrar no selector)
    const todasDisciplinas = await prisma.disciplina.findMany({
      include: {
        departamento: {
          select: {
            id_departamento: true,
            nome_departamento: true
          }
        }
      },
      orderBy: [
        { ano_curricular: 'asc' },
        { nome_disciplina: 'asc' }
      ]
    })

    return NextResponse.json({
      disciplinasDoCurso: cursoDisciplinas.map(cd => ({
        id_disciplina: cd.disciplina.id_disciplina,
        nome_disciplina: cd.disciplina.nome_disciplina,
        codigo_disciplina: cd.disciplina.codigo_disciplina,
        ano_curricular: cd.disciplina.ano_curricular,
        creditos: cd.disciplina.creditos,
        departamento: cd.disciplina.departamento
      })),
      todasDisciplinas: todasDisciplinas.map(d => ({
        id_disciplina: d.id_disciplina,
        nome_disciplina: d.nome_disciplina,
        codigo_disciplina: d.codigo_disciplina,
        ano_curricular: d.ano_curricular,
        creditos: d.creditos,
        id_departamento: d.id_departamento,
        nome_departamento: d.departamento.nome_departamento
      }))
    })

  } catch (error) {
    console.error('Erro ao buscar disciplinas do curso:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT - Salvar disciplinas do curso (associar/desassociar)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const resolvedParams = await params
    const id_curso = Number(resolvedParams.id)

    if (!id_curso || isNaN(id_curso)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const { disciplinasIds } = body

    if (!Array.isArray(disciplinasIds)) {
      return NextResponse.json({ error: 'IDs de disciplinas inválidos' }, { status: 400 })
    }

    // Remover todas as disciplinas atuais do curso
    await prisma.cursoDisciplina.deleteMany({
      where: { id_curso }
    })

    // Se há disciplinas para associar, criar as relações
    if (disciplinasIds.length > 0) {
      await prisma.cursoDisciplina.createMany({
        data: disciplinasIds.map(id_disciplina => ({
          id_curso,
          id_disciplina
        }))
      })
    }

    // Buscar curso atualizado para retornar
    const cursoAtualizado = await prisma.curso.findUnique({
      where: { id_curso },
      include: {
        disciplinas: {
          include: {
            disciplina: {
              include: {
                departamento: {
                  select: {
                    nome_departamento: true
                  }
                }
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Disciplinas atualizadas com sucesso',
      disciplinas: cursoAtualizado?.disciplinas.map(d => ({
        id_disciplina: d.disciplina.id_disciplina,
        nome_disciplina: d.disciplina.nome_disciplina,
        codigo_disciplina: d.disciplina.codigo_disciplina,
        ano_curricular: d.disciplina.ano_curricular,
        departamento: d.disciplina.departamento.nome_departamento
      })) || []
    })

  } catch (error) {
    console.error('Erro ao salvar disciplinas do curso:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}