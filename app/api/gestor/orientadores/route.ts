import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  
  // Verificar se é gestor
  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { e_gestor: true }
  })

  if (!orientador || !orientador.e_gestor) {
    return NextResponse.json({ error: "Apenas gestores podem aceder" }, { status: 403 })
  }

  // Listar todos os orientadores/professores activos
  const orientadores = await prisma.orientador.findMany({
    select: {
      id_orientador: true,
      nome_completo: true,
      especialidade: true,
      id_usuario: true
    },
    orderBy: { nome_completo: "asc" }
  })

  return NextResponse.json({ orientadores })
}