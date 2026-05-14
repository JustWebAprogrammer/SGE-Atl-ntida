// DESIGN DECISION: Recepcionista role is read/delivery only. Payment processing is out of scope by requirement.
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "recepcionista") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query")?.trim() ?? ""
  const ano = searchParams.get("ano")
  const curso = searchParams.get("curso")

  // Construir filtros dinamicamente
  const where: any = {}

  // Filtro por nome/número (se preenchido e com pelo menos 2 chars)
  if (query.length >= 2) {
    where.OR = [
      { nome_completo: { contains: query, mode: "insensitive" } },
      { numero_estudante: { contains: query, mode: "insensitive" } },
    ]
  }

  // Filtro por ano
  if (ano && ano !== "todos") {
    where.ano_current = parseInt(ano)
  }

  // Filtro por curso
  if (curso && curso !== "todos") {
    where.id_curso = parseInt(curso)
  }

  // Se não houver nenhum filtro, retornar vazio
  if (!where.OR && !where.ano_current && !where.id_curso) {
    return NextResponse.json({ estudantes: [] })
  }

  const estudantes = await prisma.estudante.findMany({
    where,
    select: {
      id_estudante: true,
      nome_completo: true,
      numero_estudante: true,
      ano_current: true,
      estado: true,
      pagamento: true,
      curso: {
        select: { nome_curso: true, id_curso: true },
      },
    },
    orderBy: { nome_completo: "asc" },
    take: 50,
  })

  return NextResponse.json({ estudantes })
}
