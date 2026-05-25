import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "estudante") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_estudante: true }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  const monografia = await prisma.monografia.findFirst({
    where: { id_estudante: estudante.id_estudante },
    orderBy: { data_submissao: "desc" }
  })

  if (!monografia || !monografia.caminho_arquivo) {
    return NextResponse.json({ error: "Nenhuma monografia encontrada" }, { status: 404 })
  }

  // Redirecionar para a URL do Vercel Blob
  return NextResponse.redirect(monografia.caminho_arquivo)
}