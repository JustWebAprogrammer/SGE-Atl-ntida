import { prisma } from "./prisma"
import { getSystemDate } from "./sistema"

/**
 * Aplica multa de atraso (500 Kz) a propinas Pendente cujo vencimento (dia 10)
 * já passou no mês de referência.
 *
 * RN-PAG02: Se o dia actual > dia 10 e a propina estiver Pendente,
 * é adicionada uma multa de 500 Kz automaticamente.
 *
 * A multa só é aplicada uma vez — se valor_multa já > 0, não mexe.
 * Usa getSystemDate() para respeitar o simulador de data.
 */
export async function aplicarMultaAtraso() {
  const hoje = await getSystemDate()
  const diaAtual = hoje.getDate()

  // Só corre se já passou do dia 10
  if (diaAtual <= 10) return { atualizadas: 0 }

  const mesAtual = hoje.getMonth() + 1
  const anoAtual = hoje.getFullYear()

  // Buscar propinas Pendente ou Atrasado do mês actual sem multa
  // Alunos com bolsa (Cinquenta, Cem) não pagam multa
  const propinasParaMultar = await prisma.pagamentoPropina.findMany({
    where: {
      estado: { in: ["Pendente", "Atrasado"] },
      mes: mesAtual,
      ano: anoAtual,
      valor_multa: 0,
      estudante: {
        tipo_bolsa: { notIn: ["Cinquenta", "Cem"] },
      },
    },
    select: {
      id_pagamento: true,
      valor_base: true,
      valor_total: true,
    },
  })

  if (propinasParaMultar.length === 0) return { atualizadas: 0 }

  // Aplicar multa de 500 Kz
  const VALOR_MULTA = 500

  for (const p of propinasParaMultar) {
    await prisma.pagamentoPropina.update({
      where: { id_pagamento: p.id_pagamento },
      data: {
        estado: "Atrasado",
        valor_multa: VALOR_MULTA,
        valor_total: Number(p.valor_total) + VALOR_MULTA,
      },
    })
  }

  return { atualizadas: propinasParaMultar.length }
}