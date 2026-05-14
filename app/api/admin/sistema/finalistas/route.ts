import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  // Buscar todos os snapshots de finalização, com dados do estudante
  const snapshots = await prisma.snapshotSemestre.findMany({
    where: { tipo: "finalizacao" },
    orderBy: { data_snapshot: "desc" },
    include: {
      estudante: {
        select: {
          id_estudante: true,
          nome_completo: true,
          numero_estudante: true,
          curso: {
            select: {
              id_curso: true,
              nome_curso: true,
            },
          },
        },
      },
    },
  })

  // Buscar cursos únicos para filtro
  const cursos = await prisma.curso.findMany({
    select: { id_curso: true, nome_curso: true },
    orderBy: { nome_curso: "asc" },
  })

  // Formatar resposta
  const finalistas = snapshots.map((s) => ({
    id_snapshot: s.id_snapshot,
    id_estudante: s.id_estudante,
    data_snapshot: s.data_snapshot,
    ano_lectivo: s.ano_lectivo,
    estudante: {
      nome_completo: s.estudante.nome_completo,
      numero_estudante: s.estudante.numero_estudante,
      curso: s.estudante.curso.nome_curso,
    },
    dados_pessoais: s.dados_pessoais,
    monografia_snapshot: s.monografia_snapshot,
    notas_snapshot: s.notas_snapshot,
  }))

  return NextResponse.json({ finalistas, cursos })
}