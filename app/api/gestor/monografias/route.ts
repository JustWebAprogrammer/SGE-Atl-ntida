import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Buscar o ID do orientador baseado no ID do usuário
  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) }
  })

  const monografias = await prisma.monografia.findMany({
    include: {
      estudante: {
        select: {
          id_estudante: true,
          nome_completo: true,
          numero_estudante: true,
          curso: {
            select: {
              nome_curso: true
            }
          }
        }
      }
    },
    orderBy: { data_submissao: "desc" }
  })

  // Buscar pré-projetos de TODOS os estudantes do departamento do gestor
  const whereDepartamento = orientador?.id_departamento
    ? { estudante: { curso: { id_departamento: orientador.id_departamento } } }
    : {}

  const preProjetos = await prisma.premonografia.findMany({
    where: whereDepartamento,
    include: {
      estudante: {
        select: {
          id_estudante: true,
          nome_completo: true,
          numero_estudante: true,
          curso: {
            select: {
              nome_curso: true
            }
          }
        }
      }
    },
    orderBy: { data_proposta: "desc" }
  })

  const monografiasFormatadas = monografias.map(m => ({
    id_monografia: m.id_monografia,
    titulo: m.titulo,
    estado: m.estado,
    nota_final: m.nota_final != null ? Number(m.nota_final) : null,
    nota_gestor: m.nota_gestor != null ? Number(m.nota_gestor) : null,
    feedback_gestor: m.feedback_gestor,
    data_submissao: m.data_submissao,
    data_defesa: m.data_defesa,
    hora_defesa: m.hora_defesa,
    sala_defesa: m.sala_defesa,
    nome_co_orientador: m.nome_co_orientador,
    nome_co_autor: m.nome_co_autor,
    caminho_arquivo: m.caminho_arquivo,
    nome_arquivo: m.nome_arquivo,
    id_orientador: m.id_orientador,
    estudante: {
      id_estudante: m.estudante.id_estudante,
      nome: m.estudante.nome_completo,
      numero_estudante: m.estudante.numero_estudante,
      curso: m.estudante.curso.nome_curso
    }
  }))

  const preProjetosFormatados = preProjetos.map(p => ({
    id_premonografia: p.id_premonografia,
    titulo: p.tema,
    estado: p.estado,
    feedback: p.feedback,
    data_submissao: p.data_proposta,
    caminho_arquivo: p.caminho_arquivo,
    nome_arquivo: p.nome_arquivo,
    estudante: {
      id_estudante: p.estudante.id_estudante,
      nome: p.estudante.nome_completo,
      numero_estudante: p.estudante.numero_estudante,
      curso: p.estudante.curso.nome_curso
    }
  }))

  return NextResponse.json({
    monografias: monografiasFormatadas,
    meusPreProjetos: preProjetosFormatados,
    minhasMonografias: orientador 
      ? monografiasFormatadas.filter(m => m.id_orientador === orientador.id_orientador)
      : []
  })
}