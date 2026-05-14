import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isGestor = session.user.role === "orientador" && session.user.e_gestor === true
  const isAdmin = session.user.role === "admin"

  if (!isGestor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    // Get the gestor's department
    const gestor = await prisma.orientador.findUnique({
      where: { id_usuario: parseInt(session.user.id) },
      select: { id_departamento: true }
    })

    const where: any = {}
    // If the user is a gestor, only return orientadores in the same department
    if (isGestor && gestor?.id_departamento) {
      where.id_departamento = gestor.id_departamento
    }

    const orientadores = await prisma.orientador.findMany({
      where,
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome_usuario: true,
            email: true
          }
        }
      },
      orderBy: {
        nome_completo: 'asc'
      }
    })

    return NextResponse.json(orientadores)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao carregar orientadores" }, { status: 500 })
  }
}