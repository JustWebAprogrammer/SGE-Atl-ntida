import { prisma } from "./prisma"

interface LogAuditParams {
  id_usuario: number
  acao: string
  tabela: string
  id_registro: number
  valor_antes?: object | null
  valor_depois?: object | null
  ip_address: string
}

export async function logAudit({
  id_usuario,
  acao,
  tabela,
  id_registro,
  valor_antes,
  valor_depois,
  ip_address
}: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        id_usuario,
        acao,
        tabela,
        id_registro,
        valor_antes: valor_antes ? JSON.stringify(valor_antes) : null,
        valor_depois: valor_depois ? JSON.stringify(valor_depois) : null,
        ip_address
      }
    })
  } catch (error) {
    console.error("Erro ao criar audit log:", error)
    // Não lançar erro para não quebrar o fluxo principal
  }
}