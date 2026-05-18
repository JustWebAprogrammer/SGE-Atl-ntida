/**
 * Constantes para os tipos de serviços disponíveis.
 * Usar em vez de strings hardcoded para evitar erros de digitação.
 */
export const SERVICOS = {
  FOLHA_PROVA: "Folha de Prova",
  CERTIFICADO_CONCLUSAO: "Certificado de Conclusão",
  CERTIFICADO_DISCIPLINAS: "Certificado de Disciplinas",
  DECLARACAO_ACADEMICA: "Declaração Académica",
  TAXA_MONOGRAFIA: "Taxa de Monografia",
  REMATRICULA: "Taxa de Rematrícula",
} as const

export type ServicoTipo = typeof SERVICOS[keyof typeof SERVICOS]

/**
 * Serviços cujo pagamento gera algo físico para o estudante levantar no recepcionista.
 * - Certificado de Conclusão e Declaração Académica → geram registo em Certificado com isFisico=true
 * - Folha de Prova → não gera certificado, mas aparece nas facturas para entrega
 */
export function isServicoFisico(descricao: string): boolean {
  const d = descricao.toLowerCase()
  return (
    d.includes("certificado") ||
    d.includes("declara") ||
    d.includes("folha de prova")
  )
}
