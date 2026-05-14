import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return new Response("Não autorizado", { status: 401 })
    }

    const userId = Number(session.user.id)
    const role = session.user.role

    // Recarregar dados do utilizador do banco de dados
    let name = ""
    let nome_usuario = ""

    switch (role) {
      case "estudante":
        const estudante = await prisma.estudante.findUnique({
          where: { id_usuario: userId },
          select: { nome_completo: true }
        })
        const usuarioEstudante = await prisma.usuario.findUnique({
          where: { id_usuario: userId },
          select: { nome_usuario: true }
        })
        // Usar nome_completo para display principal
        name = estudante?.nome_completo || usuarioEstudante?.nome_usuario || ""
        // Usar nome_usuario como nome de usuário
        nome_usuario = usuarioEstudante?.nome_usuario || ""
        break

      case "orientador":
        const orientador = await prisma.orientador.findUnique({
          where: { id_usuario: userId },
          select: { nome_completo: true, especialidade: true }
        })
        const usuarioOrientador = await prisma.usuario.findUnique({
          where: { id_usuario: userId },
          select: { nome_usuario: true }
        })
        name = orientador?.nome_completo || usuarioOrientador?.nome_usuario || ""
        nome_usuario = usuarioOrientador?.nome_usuario || ""
        break

      case "recepcionista":
        const recepcionista = await prisma.recepcionista.findUnique({
          where: { id_usuario: userId },
          select: { nome_completo: true }
        })
        const usuarioRecepcionista = await prisma.usuario.findUnique({
          where: { id_usuario: userId },
          select: { nome_usuario: true }
        })
        name = recepcionista?.nome_completo || usuarioRecepcionista?.nome_usuario || ""
        nome_usuario = usuarioRecepcionista?.nome_usuario || ""
        break

      case "admin":
        const admin = await prisma.admin.findUnique({
          where: { id_usuario: userId },
          select: { nome_completo: true, numero_telemovel: true }
        })
        const usuarioAdmin = await prisma.usuario.findUnique({
          where: { id_usuario: userId },
          select: { nome_usuario: true }
        })
        name = admin?.nome_completo || usuarioAdmin?.nome_usuario || ""
        nome_usuario = usuarioAdmin?.nome_usuario || ""
        break

      default:
        return new Response("Tipo de utilizador não suportado", { status: 400 })
    }

    // Retornar os dados atualizados
    // Nota: O JWT em si não pode ser "atualizado" diretamente porque é stateless
    // O cliente deve atualizar seu estado local e usar update() do NextAuth
    // O que vai forçar uma nova chamada à API que vai buscar os dados atuais
    return NextResponse.json({
      name,
      nome_usuario,
      role,
      id: session.user.id,
      email: session.user.email
    })

  } catch (error) {
    console.error("Erro ao renovar JWT:", error)
    return new Response("Erro interno do servidor", { status: 500 })
  }
}