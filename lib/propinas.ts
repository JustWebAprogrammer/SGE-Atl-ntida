import { prisma } from "./prisma"
import { getSystemDate, getActivePropinaMonths } from "./sistema"
import { getPrecoEstudante } from "./precos"

/**
 * Checks if a student has any overdue propinas (past due date and not paid).
 * Uses getSystemDate() to respect the time simulator.
 *
 * @param id_estudante - The student's id_estudante
 * @returns true if any propina has data_vencimento <= today and estado !== "Pago"
 */
export async function hasOverduePropinas(id_estudante: number): Promise<boolean> {
  const hoje = await getSystemDate()
  hoje.setHours(23, 59, 59, 999)

  const count = await prisma.pagamentoPropina.count({
    where: {
      id_estudante,
      data_vencimento: { lte: hoje },
      estado: { not: "Pago" },
    },
  })

  return count > 0
}

/**
 * Gera propinas para todos os meses do ano lectivo activo
 * cujo dia de geração (propina_dia_geracao) já passou em relação
 * à data actual do sistema (respeita o simulador).
 *
 * Ignora meses que já têm propinas geradas (idempotente).
 *
 * @returns Resumo com quantidade gerada e meses processados
 */
export async function gerarPropinasAteData(): Promise<{
  gerados: number
  meses: string[]
  mensagem: string
}> {
  const dataAtual = await getSystemDate()
  const mesesActivos = await getActivePropinaMonths()

  // Ler o dia de geração configurado
  const config = await prisma.sistemaConfig.findUnique({
    where: { id_config: 1 },
  })
  const diaGeracao = config?.propina_dia_geracao ?? 5

  // Obter todos os estudantes activos (excluindo finalistas)
  const estudantes = await prisma.estudante.findMany({
    where: { estado: "EmCurso" },
    select: {
      id_estudante: true,
      ano_current: true,
      data_cadastro: true,
      curso: {
        select: { duracao_anos: true },
      },
    },
  })

  let totalGerados = 0
  const mesesProcessados: string[] = []

  for (const mesAno of mesesActivos) {
    const { mes, ano } = mesAno

    // Data de referência para geração: diaGeracao/mes/ano
    const dataReferencia = new Date(ano, mes - 1, diaGeracao, 23, 59, 59, 999)

    // Só gerar se a data actual já passou do dia de geração
    if (dataAtual < dataReferencia) continue

    // Verificar se já existem propinas para este mês (qualquer estudante)
    const jaExistem = await prisma.pagamentoPropina.count({
      where: { mes, ano },
    })

    // Se já existe alguma propina para este mês, assumimos que já foi gerado
    if (jaExistem > 0) continue

    // Gerar propina para cada estudante
    let geradosMes = 0
    for (const estudante of estudantes) {
      // Transfer student safeguard: não gerar propinas para anos anteriores ao ingresso
      if (estudante.data_cadastro) {
        const anoIngresso = estudante.data_cadastro.getFullYear()
        if (ano < anoIngresso) continue
      }

      // Finalist safeguard: não gerar propinas para estudantes no último ano
      const duracaoAnos = estudante.curso?.duracao_anos ?? 4
      if ((estudante.ano_current ?? 1) >= duracaoAnos) continue

      // Obter preço com desconto da bolsa
      const { valor_propina, valor_com_desconto } = await getPrecoEstudante(estudante.id_estudante)

      const codigo = String(Math.floor(100 + Math.random() * 900))
      const referencia = `PROP-${ano}-${String(mes).padStart(2, "0")}-${estudante.id_estudante}-${codigo}`
      const dataVencimento = new Date(ano, mes - 1, 10)

      await prisma.pagamentoPropina.create({
        data: {
          id_estudante: estudante.id_estudante,
          referencia,
          codigo_confirmacao: codigo,
          mes,
          ano,
          valor_base: valor_propina,
          valor_multa: 0,
          valor_total: valor_com_desconto,
          data_vencimento: dataVencimento,
          estado: "Pendente",
          emitido_por: "sistema",
        },
      })
      geradosMes++
    }

    if (geradosMes > 0) {
      totalGerados += geradosMes
      mesesProcessados.push(`${mes}/${ano}`)
    }
  }

  const mensagem = totalGerados > 0
    ? `💰 ${totalGerados} propinas geradas para ${mesesProcessados.join(", ")}`
    : "✅ Nenhuma propina pendente para gerar"

  return { gerados: totalGerados, meses: mesesProcessados, mensagem }
}

/**
 * Recalcula as propinas pendentes de um estudante quando o tipo de bolsa muda.
 *
 * Regras:
 * - Bolsa "Cem" (100%): marca propinas Pendente/Atrasado como "Pago", valor_total = 0
 * - Bolsa "Cinquenta" (50%): remove multa, valor_total = valor_base * 0.5
 * - Bolsa "Nenhuma": remove multa, valor_total = valor_base
 *
 * @param id_estudante - ID do estudante
 * @returns Número de propinas atualizadas
 */
export async function recalcularPropinasEstudante(id_estudante: number): Promise<number> {
  // Obter estudante com tipo_bolsa actual
  const estudante = await prisma.estudante.findUnique({
    where: { id_estudante },
    select: { id_estudante: true, tipo_bolsa: true },
  })

  if (!estudante) {
    throw new Error("Estudante não encontrado")
  }

  // Obter o preço com desconto actualizado
  const { valor_propina, valor_com_desconto } = await getPrecoEstudante(id_estudante)

  // Buscar propinas pendentes ou atrasadas do estudante
  const propinasPendentes = await prisma.pagamentoPropina.findMany({
    where: {
      id_estudante,
      estado: { in: ["Pendente", "Atrasado"] },
    },
    select: {
      id_pagamento: true,
      mes: true,
      ano: true,
      valor_base: true,
      valor_multa: true,
      valor_total: true,
      estado: true,
    },
  })

  let atualizadas = 0

  for (const propina of propinasPendentes) {
    if (estudante.tipo_bolsa === "Cem") {
      // Bolsa 100% → marcar como Pago, valor_total = 0
      await prisma.pagamentoPropina.update({
        where: { id_pagamento: propina.id_pagamento },
        data: {
          estado: "Pago",
          valor_multa: 0,
          valor_total: 0,
        },
      })
      atualizadas++
    } else if (estudante.tipo_bolsa === "Cinquenta") {
      // Bolsa 50% → remover multa, valor_total = valor_base * 0.5
      await prisma.pagamentoPropina.update({
        where: { id_pagamento: propina.id_pagamento },
        data: {
          estado: "Pendente",
          valor_multa: 0,
          valor_total: valor_com_desconto,
        },
      })
      atualizadas++
    } else {
      // Bolsa "Nenhuma" → remover multa, valor_total = valor_base
      await prisma.pagamentoPropina.update({
        where: { id_pagamento: propina.id_pagamento },
        data: {
          estado: "Pendente",
          valor_multa: 0,
          valor_total: Number(propina.valor_base),
        },
      })
      atualizadas++
    }
  }

  if (atualizadas > 0) {
    console.log(`🎯 Propinas recalculadas: ${atualizadas} propinas actualizadas para estudante ${id_estudante} (bolsa: ${estudante.tipo_bolsa})`)
  }

  return atualizadas
}