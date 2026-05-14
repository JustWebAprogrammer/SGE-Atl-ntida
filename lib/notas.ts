interface NotaInput {
  ac1: unknown
  ac2: unknown
  ac3: unknown
  ttp: unknown
  pp1: unknown
  pp2: unknown
  exame: unknown
  recurso: unknown
  exame_especial: unknown
}

interface DisciplinaInput {
  tem_dispensa: boolean
  nota_dispensa: number
}

interface ResultadoCalculo {
  nota_final: number | null
  dispensada: boolean
  tipo: "Normal" | "Recurso" | "Especial"
  is_provisional: boolean
}

// Função auxiliar para converter Decimal/unknown para number
function toNumber(val: unknown): number | null {
  return val != null ? Number(val) : null
}

// Função auxiliar para arredondar notas (padrão matemático: ≥ 0.5 arredonda para cima)
export function arredondarNota(value: number | null): number | null {
  if (value === null) return null
  const floor = Math.floor(value)
  const decimal = value - floor
  // Use a small epsilon to handle floating-point precision issues
  const epsilon = 1e-10
  return (decimal - 0.5) >= -epsilon ? floor + 1 : floor
}

export function calcularNotaFinal(
  nota: NotaInput,
  disciplina: DisciplinaInput
): ResultadoCalculo {
  const { ac1, ac2, ac3, ttp, pp1, pp2, exame, recurso, exame_especial } = nota

  const ac1Num = toNumber(ac1)
  const ac2Num = toNumber(ac2)
  const ac3Num = toNumber(ac3)
  const ttpNum = toNumber(ttp)
  const pp1Num = toNumber(pp1)
  const pp2Num = toNumber(pp2)
  const exameNum = toNumber(exame)
  const recursoNum = toNumber(recurso)
  const exameEspecialNum = toNumber(exame_especial)

  // Exame especial substitui tudo
  if (exameEspecialNum != null) {
    return { 
      nota_final: arredondarNota(exameEspecialNum), 
      dispensada: false, 
      tipo: "Especial",
      is_provisional: false
    }
  }

  // Recurso substitui tudo
  if (recursoNum != null) {
    return { 
      nota_final: arredondarNota(recursoNum), 
      dispensada: false, 
      tipo: "Recurso",
      is_provisional: false
    }
  }

  // Calcular nota AC progressivamente (usando apenas valores não-null)
  const acValues = [ac1Num, ac2Num, ac3Num].filter((v): v is number => v !== null)
  const ppValues = [pp1Num, pp2Num].filter((v): v is number => v !== null)

  // Se AC está vazio (todos null) e PP está vazio, retorna null
  if (acValues.length === 0 && ppValues.length === 0 && ttpNum === null) {
    return { 
      nota_final: null, 
      dispensada: false, 
      tipo: "Normal",
      is_provisional: true
    }
  }

  // Calcular nota AC (média dos valores disponíveis)
  const acAvg = acValues.length > 0 
    ? acValues.reduce((sum, v) => sum + v, 0) / acValues.length 
    : 0
  
  const ttpVal = ttpNum ?? 0
  
  // MAC = ((média AC) + TTP) / 2
  const mac = (acAvg + ttpVal) / 2
  
  // Média = round((MAC + PP1 + PP2) / 3)
  // Se PP1 ou PP2 for null, são excluídos da média
  const ppSum = ppValues.reduce((sum, v) => sum + v, 0)
  const ppCount = ppValues.length
  const totalComponents = 1 + ppCount // MAC counts as 1 component
  
  const media = arredondarNota((mac + ppSum) / totalComponents)

  // Dispensa: if Média >= nota_dispensa
  if (disciplina.tem_dispensa && media !== null && media >= disciplina.nota_dispensa) {
    return { 
      nota_final: media, 
      dispensada: true, 
      tipo: "Normal",
      is_provisional: false
    }
  }

  // Com exame: Nota Final = round((Média + Exame) / 2)
  if (exameNum != null && media !== null) {
    const nota_final = arredondarNota((media + exameNum) / 2)
    return { 
      nota_final, 
      dispensada: false, 
      tipo: "Normal",
      is_provisional: false
    }
  }

  // AC completo mas sem exame ainda (provisional)
  return { 
    nota_final: media, 
    dispensada: false, 
    tipo: "Normal",
    is_provisional: true
  }
}

// Função auxiliar para validar nota (0-20)
export function validarNota(nota: number | null): boolean {
  if (nota == null) return true // null é válido (campo opcional)
  return nota >= 0 && nota <= 20
}

// Função auxiliar para validar nota seca (recurso/especial - máx 12)
export function validarNotaSeca(nota: number | null): boolean {
  if (nota == null) return true
  return nota >= 0 && nota <= 12
}