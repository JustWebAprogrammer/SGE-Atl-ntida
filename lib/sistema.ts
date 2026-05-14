import { prisma } from "./prisma"

/**
 * Get the current system date (real or simulated)
 * @returns Promise<Date> - The current system date
 */
export async function getSystemDate(): Promise<Date> {
  try {
    const config = await prisma.sistemaConfig.findUnique({ 
      where: { id_config: 1 } 
    })
    
    if (config?.simulador_ativo && config?.data_simulada) {
      return new Date(config.data_simulada)
    }
  } catch {
    // safe fallback
  }
  
  return new Date()
}

/**
 * Get the current academic year label
 * Priority: 1. Manual override (ano_lectivo_label), 2. Derived from dates, 3. September rule fallback
 * @returns Promise<string> - The academic year label (e.g., "2025/2026")
 */
export async function getAnoLectivo(): Promise<string> {
  try {
    const config = await prisma.sistemaConfig.findUnique({ 
      where: { id_config: 1 } 
    })

    // Priority 1: manual override
    if (config?.ano_lectivo_label) {
      return config.ano_lectivo_label
    }

    // Priority 2: derive from configured dates
    if (config?.ano_lectivo_inicio && config?.ano_lectivo_fim) {
      const startYear = new Date(config.ano_lectivo_inicio).getFullYear()
      const endYear = new Date(config.ano_lectivo_fim).getFullYear()
      return startYear === endYear ? `${startYear}` : `${startYear}/${endYear}`
    }
  } catch {
    // safe fallback
  }

  // Priority 3: September rule fallback (USA DATA DO SISTEMA SIMULADA)
  const now = await getSystemDate()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`
}

/**
 * Get all months that are within the active academic year
 * Propinas are only generated for these months
 * @returns Promise<Array<{ mes: number, ano: number }>> - List of billable months
 */
/**
 * Get the current simulated semester from SistemaConfig
 * @returns Promise<"S1" | "S2"> - The current semester (defaults to S1)
 */
export async function getSemestreAtual(): Promise<"S1" | "S2"> {
  try {
    const config = await prisma.sistemaConfig.findUnique({ 
      where: { id_config: 1 } 
    })
    return config?.semestre_atual || "S1"
  } catch {
    return "S1"
  }
}

export async function getActivePropinaMonths(): Promise<{ mes: number, ano: number }[]> {
  try {
    const config = await prisma.sistemaConfig.findUnique({ 
      where: { id_config: 1 } 
    })
    
    if (!config?.ano_lectivo_inicio || !config?.ano_lectivo_fim) {
      return []
    }

    const start = new Date(config.ano_lectivo_inicio)
    const end = new Date(config.ano_lectivo_fim)
    const months: { mes: number, ano: number }[] = []

    const current = new Date(start.getFullYear(), start.getMonth(), 1)
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)

    while (current <= endMonth) {
      months.push({ mes: current.getMonth() + 1, ano: current.getFullYear() })
      current.setMonth(current.getMonth() + 1)
    }

    return months
  } catch {
    return []
  }
}