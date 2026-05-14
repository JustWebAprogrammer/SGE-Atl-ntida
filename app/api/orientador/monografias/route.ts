// app/api/orientador/monografias/route.ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "orientador") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true }
  })

  if (!orientador) return NextResponse.json({ error: "Orientador não encontrado" }, { status: 404 })

  const monografias = await prisma.monografia.findMany({
    where: {
      estudante: {
        solicitacoes: {
          some: {
            id_orientador: orientador.id_orientador,
            estado: "Aceite"
          }
        }
      }
    },
    include: {
      estudante: {
        select: {
          id_estudante: true,
          nome_completo: true,
          numero_estudante: true,
          curso: { select: { nome_curso: true } }
        }
      }
    },
    orderBy: { data_submissao: "desc" }
  })

  const premonografias = await prisma.premonografia.findMany({
    where: {
      estudante: {
        solicitacoes: {
          some: {
            id_orientador: orientador.id_orientador
          }
        }
      }
    },
    include: {
      estudante: {
        select: {
          id_estudante: true,
          nome_completo: true,
          numero_estudante: true,
          curso: { select: { nome_curso: true } }
        }
      }
    },
    orderBy: { data_proposta: "desc" }
  })

  return NextResponse.json({
    monografias: monografias.map(m => ({
      id_monografia: m.id_monografia,
      titulo: m.titulo,
      resumo: m.resumo,
      estado: m.estado,
      nota_final: m.nota_final != null ? Number(m.nota_final) : null,
      feedback: m.feedback,
      data_submissao: m.data_submissao,
      data_defesa: m.data_defesa,
      nome_co_orientador: m.nome_co_orientador,
      nome_co_autor: m.nome_co_autor,
      caminho_arquivo: m.caminho_arquivo,
      nome_arquivo: m.nome_arquivo,
      estudante: {
        id_estudante: m.estudante.id_estudante,
        nome: m.estudante.nome_completo,
        numero_estudante: m.estudante.numero_estudante,
        curso: m.estudante.curso.nome_curso
      }
    })),
    premonografias: premonografias.map(p => ({
      id_premonografia: p.id_premonografia,
      tema: p.tema,
      estado: p.estado,
      data_proposta: p.data_proposta,
      caminho_arquivo: p.caminho_arquivo,
      nome_arquivo: p.nome_arquivo,
      feedback: p.feedback,
      estudante: {
        id_estudante: p.estudante.id_estudante,
        nome: p.estudante.nome_completo,
        numero_estudante: p.estudante.numero_estudante,
        curso: p.estudante.curso.nome_curso
      }
    }))
  })
}