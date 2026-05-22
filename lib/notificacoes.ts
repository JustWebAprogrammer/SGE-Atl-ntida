import { prisma } from "./prisma"

interface CriarNotificacaoParams {
  id_usuario: number
  tipo: string
  titulo: string
  mensagem: string
  link_url?: string
}

export async function criarNotificacao({
  id_usuario,
  tipo,
  titulo,
  mensagem,
  link_url
}: CriarNotificacaoParams) {
  try {
    await prisma.notificacao.create({
      data: {
        id_usuario,
        tipo,
        titulo,
        mensagem,
        link_url
      }
    })
  } catch (error) {
    console.error("Erro ao criar notificação:", error)
  }
}