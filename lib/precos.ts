import { prisma } from "./prisma"

/**
 * Obtem o valor da propina e multa para um estudante especifico
 * Primeiro procura preço customizado por curso, senão encontra usa o preço global padrão
 */
/**
 * Calcula o factor de desconto com base no tipo de bolsa
 */
function getDescontoBolsa(tipoBolsa: string | null): number {
  switch (tipoBolsa) {
    case "Cem": // Bolsa 100% - não paga
      return 0
    case "Cinquenta": // Bolsa 50% - paga metade
      return 0.5
    case "Nenhuma":
    default:
      return 1 // Paga 100%
  }
}

export async function getPrecoEstudante(id_estudante: number) {
  const estudante = await prisma.estudante.findUnique({
    where: { id_estudante },
    select: {
      id_curso: true,
      ano_current: true,
      tipo_bolsa: true
    }
  })

  if (!estudante) {
    throw new Error("Estudante não encontrado")
  }

  // Procurar preço especifico para este curso e ano
  const precoCurso = await prisma.precoCurso.findUnique({
    where: {
      id_curso_ano_curricular: {
        id_curso: estudante.id_curso,
        ano_curricular: estudante.ano_current || 1
      }
    }
  })

  let valor_propina: number
  let valor_multa: number

  if (precoCurso) {
    valor_propina = Number(precoCurso.valor_propina)
    valor_multa = Number(precoCurso.valor_multa)
  } else {
    // Se não encontrou usa valor global padrão
    const config = await prisma.configuracaoTaxas.findUnique({
      where: { id_configuracao: 1 }
    })

    if (!config) {
      throw new Error("Configuração de taxas não encontrada")
    }

    const campoPropina = `Propina_ano${estudante.ano_current || 1}` as keyof typeof config
    valor_propina = Number(config[campoPropina])
    valor_multa = Number(config.valor_multa_atraso)
  }

  // Aplicar desconto da bolsa
  const desconto = getDescontoBolsa(estudante.tipo_bolsa)
  const valor_com_desconto = valor_propina * desconto

  return {
    valor_propina: valor_propina, // valor original (sem desconto)
    valor_com_desconto, // valor com desconto aplicado
    valor_multa,
    tipo_bolsa: estudante.tipo_bolsa || "Nenhuma",
    desconto: `${Math.round(desconto * 100)}%`,
    origem: precoCurso ? "curso" : "global"
  }
}

/**
 * Obtem todos os preços globais
 */
export async function getPrecosGlobais() {
  const config = await prisma.configuracaoTaxas.findUnique({
    where: { id_configuracao: 1 }
  })

  if (!config) {
    throw new Error("Configuração de taxas não encontrada")
  }

  return {
    propina_ano1: Number(config.Propina_ano1),
    propina_ano2: Number(config.Propina_ano2),
    propina_ano3: Number(config.Propina_ano3),
    propina_ano4: Number(config.Propina_ano4),
    propina_ano5: Number(config.Propina_ano5),
    propina_ano6: Number(config.Propina_ano6),
    valor_multa_atraso: Number(config.valor_multa_atraso),
    atualizado_em: config.atualizado_em
  }
}
