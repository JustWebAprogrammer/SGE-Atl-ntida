/**
 * Constantes para os tipos de serviços disponíveis.
 * Usar em vez de strings hardcoded para evitar erros de digitação.
 */
export const SERVICOS = {
  FOLHA_PROVA: "Folha de Prova",
  CERTIFICADO_CONCLUSAO: "Certificado de Conclusão",
  DECLARACAO_ACADEMICA: "Declaração Académica",
  TAXA_MONOGRAFIA: "Taxa de Monografia",
  REMATRICULA: "Taxa de Rematrícula",
} as const

export type ServicoTipo = typeof SERVICOS[keyof typeof SERVICOS]