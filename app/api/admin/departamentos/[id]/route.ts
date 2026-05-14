import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

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
    const id_departamento = Number(resolvedParams.id)

    if (!id_departamento || isNaN(id_departamento)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Buscar departamento com cursos
    const departamento = await prisma.departamento.findUnique({
      where: { id_departamento },
      include: {
        cursos: {
          include: {
            _count: {
              select: {
                estudantes: true
              }
            }
          },
          orderBy: { nome_curso: 'asc' }
        }
      }
    })

    if (!departamento) {
      return NextResponse.json({ error: 'Departamento não encontrado' }, { status: 404 })
    }

    // Buscar orientadores do departamento (relação direta)
    const orientadores = await prisma.orientador.findMany({
      where: {
        id_departamento: id_departamento
      },
      include: {
        usuario: {
          select: {
            nome_usuario: true,
            email: true
          }
        }
      }
    })

    // Calcular estatísticas de monografias
    const monografiasStats = await prisma.monografia.groupBy({
      by: ['estado'],
      where: {
        estudante: {
          curso: {
            id_departamento: id_departamento
          }
        }
      },
      _count: {
        estado: true
      }
    })

    // Contar total
    const totalMonografias = await prisma.monografia.count({
      where: {
        estudante: {
          curso: {
            id_departamento: id_departamento
          }
        }
      }
    })

    // Contar premonografias
    const premonografiasStats = await prisma.premonografia.groupBy({
      by: ['estado'],
      where: {
        estudante: {
          curso: {
            id_departamento: id_departamento
          }
        }
      },
      _count: {
        estado: true
      }
    })

    return NextResponse.json({
      ...departamento,
      orientadores: orientadores.map(o => ({
        id_orientador: o.id_orientador,
        nome: o.usuario.nome_usuario,
        email: o.usuario.email,
        especialidade: o.especialidade,
        e_gestor: o.e_gestor
      })),
      estatisticas: {
        monografias: monografiasStats.reduce((acc, curr) => {
          acc[curr.estado] = curr._count.estado
          return acc
        }, {} as Record<string, number>),
        totalMonografias,
        premonografias: premonografiasStats.reduce((acc, curr) => {
          acc[curr.estado] = curr._count.estado
          return acc
        }, {} as Record<string, number>)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar detalhes do departamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}