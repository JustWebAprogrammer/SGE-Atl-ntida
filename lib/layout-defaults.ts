// Default layout configurations for all document types
// These are the fallback values when no database record exists

export type LayoutConfig = {
  titulo: string
  texto_corpo: string
  label_assinatura_diretor: string
  label_assinatura_presidente: string
  texto_verificacao?: string
  nome_universidade: string
  localidade: string
  tem_qr_code: boolean
}

export type DocumentoTipo = "DeclaracaoAcademica" | "CertificadoConclusao" | "CertificadoDisciplinas"

// Default configuration for Declaração Académica
// A declaração é um documento simples que apenas confirma a matrícula do estudante
const declaracaoDefaults: LayoutConfig = {
  titulo: "DECLARAÇÃO ACADÉMICA",
  texto_corpo: `O {NOME_UNIVERSIDADE} declara que {NOME_COMPLETO}, portador(a) do número de matrícula {NUMERO_ESTUDANTE}, é estudante regular do curso de {NOME_CURSO}, encontrando-se actualmente matriculado(a) no {ANO_CURRICULAR}º ano, no ano lectivo de {ANO_LECTIVO}.`,
  label_assinatura_diretor: "O(A) Director(a) Académico(a)",
  label_assinatura_presidente: "O(A) Presidente",
  texto_verificacao: "Verifique a autenticidade deste documento em linha",
  nome_universidade: "Instituto Superior Politécnico Atlântida",
  localidade: "Luanda",
  tem_qr_code: true,
}

// Default configuration for Certificado de Conclusão (Digital)
const certificadoConclusaoDefaults: LayoutConfig = {
  titulo: "CERTIFICADO DE LICENCIATURA",
  texto_corpo: `O {NOME_UNIVERSIDADE} certifica que {NOME_COMPLETO}, com o número de matrícula {NUMERO_ESTUDANTE}, concluiu com aproveitamento o curso de {NOME_CURSO}, com a duração de {DURACAO_ANOS} anos, obtendo a classificação final de {NOTA_FINAL} valores ({NOTA_POR_EXTENSO}), tendo sido atribuído o grau de Licenciado(a) em {NOME_CURSO}.`,
  label_assinatura_diretor: "O(A) Director(a) Académico(a)",
  label_assinatura_presidente: "O(A) Presidente",
  texto_verificacao: "Verifique a autenticidade deste documento em linha",
  nome_universidade: "Instituto Superior Politécnico Atlântida",
  localidade: "Luanda",
  tem_qr_code: true,
}

// Default configuration for Certificado de Disciplinas
const certificadoDisciplinasDefaults: LayoutConfig = {
  titulo: "CERTIFICADO DE DISCIPLINAS",
  texto_corpo: `O {NOME_UNIVERSIDADE} certifica que {NOME_COMPLETO}, com o número de matrícula {NUMERO_ESTUDANTE}, frequentou e foi aprovado(a) nas seguintes disciplinas do curso de {NOME_CURSO}:`,
  label_assinatura_diretor: "O(A) Director(a) Académico(a)",
  label_assinatura_presidente: "O(A) Presidente",
  nome_universidade: "Instituto Superior Politécnico Atlântida",
  localidade: "Luanda",
  tem_qr_code: false,
}

// Map of all defaults
const allDefaults: Record<DocumentoTipo, LayoutConfig> = {
  DeclaracaoAcademica: declaracaoDefaults,
  CertificadoConclusao: certificadoConclusaoDefaults,
  CertificadoDisciplinas: certificadoDisciplinasDefaults,
}

/**
 * Get default layout configuration for a document type
 */
export function getLayoutDefaults(tipo: DocumentoTipo): LayoutConfig {
  return { ...allDefaults[tipo] }
}

/**
 * Merge database layout config with defaults
 * Database values override defaults, missing fields use defaults
 */
export function mergeLayoutConfig(tipo: DocumentoTipo, dbConfig: any): LayoutConfig {
  const defaults = getLayoutDefaults(tipo)
  
  if (!dbConfig) return defaults
  
  return {
    titulo: dbConfig.titulo ?? defaults.titulo,
    texto_corpo: dbConfig.texto_corpo ?? defaults.texto_corpo,
    label_assinatura_diretor: dbConfig.label_assinatura_diretor ?? defaults.label_assinatura_diretor,
    label_assinatura_presidente: dbConfig.label_assinatura_presidente ?? defaults.label_assinatura_presidente,
    texto_verificacao: dbConfig.texto_verificacao ?? defaults.texto_verificacao,
    nome_universidade: dbConfig.nome_universidade ?? defaults.nome_universidade,
    localidade: dbConfig.localidade ?? defaults.localidade,
    tem_qr_code: dbConfig.tem_qr_code ?? defaults.tem_qr_code,
  }
}

/**
 * Replace placeholders in text with actual values
 */
export function replacePlaceholders(texto: string, dados: Record<string, string>): string {
  let resultado = texto
  
  const placeholders: Record<string, string> = {
    "{NOME_COMPLETO}": dados.nome_completo || "",
    "{NUMERO_ESTUDANTE}": dados.numero_estudante || "",
    "{NOME_CURSO}": dados.nome_curso || "",
    "{ANO_LECTIVO}": dados.ano_lectivo || "",
    "{ANO_CURRICULAR}": dados.ano_curricular || "",
    "{NOTA_FINAL}": dados.nota_final || "",
    "{NOTA_POR_EXTENSO}": dados.nota_por_extenso || "",
    "{DURACAO_ANOS}": dados.duracao_anos || "",
    "{NOME_UNIVERSIDADE}": dados.nome_universidade || "",
  }
  
  for (const [placeholder, valor] of Object.entries(placeholders)) {
    resultado = resultado.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), valor)
  }
  
  return resultado
}

/**
 * Get placeholder help text for admin UI
 */
export function getPlaceholderHelp(): { placeholder: string; descricao: string }[] {
  return [
    { placeholder: "{NOME_COMPLETO}", descricao: "Nome completo do estudante" },
    { placeholder: "{NUMERO_ESTUDANTE}", descricao: "Número de matrícula" },
    { placeholder: "{NOME_CURSO}", descricao: "Nome do curso" },
    { placeholder: "{ANO_LECTIVO}", descricao: "Ano lectivo (ex: 2025/2026)" },
    { placeholder: "{ANO_CURRICULAR}", descricao: "Ano curricular actual" },
    { placeholder: "{NOTA_FINAL}", descricao: "Nota final em números" },
    { placeholder: "{NOTA_POR_EXTENSO}", descricao: "Nota final por extenso (ex: quinze)" },
    { placeholder: "{DURACAO_ANOS}", descricao: "Duração do curso em anos" },
    { placeholder: "{NOME_UNIVERSIDADE}", descricao: "Nome da universidade" },
  ]
}