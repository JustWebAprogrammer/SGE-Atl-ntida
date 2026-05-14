import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET - Buscar cursos do departamento do gestor e suas disciplinas
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'orientador' || !session.user.e_gestor) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar o departamento do gestor
    const orientador = await prisma.orientador.findUnique({
      where: { id_usuario: parseInt(session.user.id) }
    })

    if (!orientador || !orientador.id_departamento) {
      return NextResponse.json({ error: 'Gestor sem departamento atribuído' }, { status: 400 })
    }

    // Buscar cursos do departamento
    const cursos = await prisma.curso.findMany({
      where: { id_departamento: orientador.id_departamento },
      include: {
        disciplinas: {
          include: {
            disciplina: {
              select: {
                id_disciplina: true,
                nome_disciplina: true,
                codigo_disciplina: true,
                creditos: true
              }
            }
          }
        }
      }
    })

    // Buscar disciplinas disponíveis no departamento (para adicionar)
    const disciplinasDisponiveis = await prisma.disciplina.findMany({
      where: { id_departamento: orientador.id_departamento },
      select: {
        id_disciplina: true,
        nome_disciplina: true,
        codigo_disciplina: true,
        creditos: true
      },
      orderBy: { nome_disciplina: 'asc' }
    })

    // Buscar IDs das disciplinas já associadas a cada curso
    const disciplinasAssociadasMap: Record<number, number[]> = {}
    cursos.forEach(curso => {
      disciplinasAssociadasMap[curso.id_curso] = curso.disciplinas.map(d => d.id_disciplina)
    })

    return NextResponse.json({
      departamento: {
        id_departamento: orientador.id_departamento,
        nome_departamento: (await prisma.departamento.findUnique({ 
          where: { id_departamento: orientador.id_departamento } 
        }))?.nome_departamento
      },
      cursos: cursos.map(curso => ({
        id_curso: curso.id_curso,
        nome_curso: curso.nome_curso,
        duracao_anos: curso.duracao_anos,
        disciplinas: curso.disciplinas.map(d => ({
          id_disciplina: d.id_disciplina,
          nome_disciplina: d.disciplina.nome_disciplina,
          codigo_disciplina: d.disciplina.codigo_disciplina,
          creditos: d.disciplina.creditos,
          ano_curricular: d.ano_curricular,
          semestre: d.semestre
        }))
      })),
      disciplinasDisponiveis,
      disciplinasAssociadasMap
    })

  } catch (error) {
    console.error('Erro ao buscar cursos do gestor:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Adicionar disciplina a um curso
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'orientador' || !session.user.e_gestor) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar o departamento do gestor
    const orientador = await prisma.orientador.findUnique({
      where: { id_usuario: parseInt(session.user.id) }
    })

    if (!orientador || !orientador.id_departamento) {
      return NextResponse.json({ error: 'Gestor sem departamento atribuído' }, { status: 400 })
    }

    const body = await request.json()
    const { id_curso, id_disciplina, ano_curricular, semestre } = body

    if (!id_curso || !id_disciplina || !ano_curricular || !semestre) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // Verificar se o curso pertence ao departamento do gestor
    const curso = await prisma.curso.findFirst({
      where: { 
        id_curso, 
        id_departamento: orientador.id_departamento 
      }
    })

    if (!curso) {
      return NextResponse.json({ error: 'Curso não pertence ao seu departamento' }, { status: 403 })
    }

    // Verificar se a disciplina já está associada
    const existente = await prisma.cursoDisciplina.findUnique({
      where: {
        id_curso_id_disciplina: {
          id_curso,
          id_disciplina
        }
      }
    })

    if (existente) {
      // Atualizar ano e semestre se já existir
      await prisma.cursoDisciplina.update({
        where: { id_curso_id_disciplina: { id_curso, id_disciplina } },
        data: { ano_curricular, semestre }
      })
      return NextResponse.json({ message: 'Disciplina atualizada com sucesso' })
    }

    // Criar nova associação
    await prisma.cursoDisciplina.create({
      data: {
        id_curso,
        id_disciplina,
        ano_curricular,
        semestre
      }
    })

    return NextResponse.json({ message: 'Disciplina adicionada com sucesso' })

  } catch (error) {
    console.error('Erro ao adicionar disciplina ao curso:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Remover disciplina de um curso
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'orientador' || !session.user.e_gestor) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar o departamento do gestor
    const orientador = await prisma.orientador.findUnique({
      where: { id_usuario: parseInt(session.user.id) }
    })

    if (!orientador || !orientador.id_departamento) {
      return NextResponse.json({ error: 'Gestor sem departamento atribuído' }, { status: 400 })
    }

    const body = await request.json()
    const { id_curso, id_disciplina } = body

    if (!id_curso || !id_disciplina) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // Verificar se o curso pertence ao departamento do gestor
    const curso = await prisma.curso.findFirst({
      where: { 
        id_curso, 
        id_departamento: orientador.id_departamento 
      }
    })

    if (!curso) {
      return NextResponse.json({ error: 'Curso não pertence ao seu departamento' }, { status: 403 })
    }

    // Remover a associação
    await prisma.cursoDisciplina.delete({
      where: {
        id_curso_id_disciplina: {
          id_curso,
          id_disciplina
        }
      }
    })

    return NextResponse.json({ message: 'Disciplina removida com sucesso' })

  } catch (error) {
    console.error('Erro ao remover disciplina do curso:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}