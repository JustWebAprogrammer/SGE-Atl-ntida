import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { arredondarNota } from "@/lib/notas"
import { hasOverduePropinas } from "@/lib/propinas"

type NotaRecord = {
  exame_especial: unknown
  recurso: unknown
  dispensada: boolean
  exame: unknown
  nota_final: unknown
  disciplina: {
    tem_dispensa: boolean
    nota_dispensa: number
  }
}

function calcularEstado(nota: NotaRecord): string {
  const notaFinal = nota.nota_final != null ? Number(nota.nota_final) : null

  // If final grade is >= 10, the student passed regardless of individual components
  if (notaFinal !== null && notaFinal >= 10) {
    return "Aprovado"
  }

  // Special exam graded but failed
  if (nota.exame_especial !== null) {
    return "Reprovado"
  }
  // Recurso graded but failed → eligible for special exam
  if (nota.recurso !== null) {
    return "Exame Especial"
  }
  // Auto-dispensa via MAC
  if (nota.dispensada) return "Dispensa"
  // Normal exam graded but failed
  if (nota.exame !== null) {
    return "Recurso"
  }
  // MAC calculated — check dispensa eligibility
  if (notaFinal !== null) {
    if (nota.disciplina.tem_dispensa && notaFinal >= nota.disciplina.nota_dispensa) {
      return "Dispensa"
    }
    return "Exame"
  }
  // In progress
  return "Em Curso"
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "estudante") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: {
      id_estudante: true,
      ano_current: true,
      id_curso: true,
    }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  // Check if student has overdue propinas (shared helper uses getSystemDate)
  const propinaPendente = await hasOverduePropinas(estudante.id_estudante)

  // Buscar o mapeamento correcto de disciplina → ano curricular e semestre via CursoDisciplina
  // (não usar Disciplina.ano_curricular nem Disciplina.semestre que podem estar desactualizados)
  const curriculoMapping = await prisma.cursoDisciplina.findMany({
    where: { id_curso: estudante.id_curso },
    select: { id_disciplina: true, ano_curricular: true, semestre: true },
  })
  const disciplinaAnoMap = new Map(curriculoMapping.map(cd => [cd.id_disciplina, cd.ano_curricular]))
  const disciplinaSemestreMap = new Map(curriculoMapping.map(cd => [cd.id_disciplina, cd.semestre]))

  const notas = await prisma.nota.findMany({
    where: { id_estudante: estudante.id_estudante },
    include: {
      disciplina: {
        select: {
          nome_disciplina: true,
          codigo_disciplina: true,
          creditos: true,
          ano_curricular: true,
          semestre: true,
          tem_dispensa: true,
          nota_dispensa: true,
        }
      }
    },
    orderBy: [
      { disciplina: { ano_curricular: "asc" } },
      { disciplina: { semestre: "asc" } },
      { disciplina: { nome_disciplina: "asc" } },
    ]
  })

  type NotaItem = {
    id: number
    nome: string
    codigo: string
    creditos: number
    ano: number
    semestre: string
    ac1: number | null
    ac2: number | null
    ac3: number | null
    ttp: number | null
    pp1: number | null
    pp2: number | null
    exame: number | null
    recurso: number | null
    exame_especial: number | null
    nota_final: number | null
    dispensada: boolean
    tipo_avaliacao: string
    avaliacao_atual: "ac" | "exame" | "recurso" | "especial" | "em_curso"
    aprovado: boolean | null
    tem_dispensa: boolean
    nota_dispensa: number
    dispensavel: boolean
    estado: string
    is_provisional: boolean
  }

  const flat: NotaItem[] = notas
    .filter(n => {
      // Usar o ano curricular do CursoDisciplina (o correcto), ou fallback para o da disciplina
      const anoCurricular = disciplinaAnoMap.get(n.id_disciplina) ?? n.disciplina.ano_curricular
      // Se propina pendente, esconde notas do ano corrente
      if (propinaPendente && anoCurricular === estudante.ano_current) {
        return false
      }
      return true
    })
    .map(n => {
      const notaFinal = n.nota_final != null ? Number(n.nota_final) : null

      let avaliacao_atual: "ac" | "exame" | "recurso" | "especial" | "em_curso"
      if (n.exame_especial != null) avaliacao_atual = "especial"
      else if (n.recurso != null) avaliacao_atual = "recurso"
      else if (n.exame != null) avaliacao_atual = "exame"
      else if (n.dispensada) avaliacao_atual = "ac"
      else avaliacao_atual = "em_curso"

      // Usar ano e semestre do CursoDisciplina (os correctos), ou fallback para os da disciplina
      const anoCurricular = disciplinaAnoMap.get(n.id_disciplina) ?? n.disciplina.ano_curricular
      const semestreCorrecto = disciplinaSemestreMap.get(n.id_disciplina) ?? n.disciplina.semestre

      return {
        id: n.id_nota,
        nome: n.disciplina.nome_disciplina,
        codigo: n.disciplina.codigo_disciplina,
        creditos: n.disciplina.creditos,
        ano: anoCurricular,
        semestre: semestreCorrecto,
        ac1: n.ac1 != null ? Number(n.ac1) : null,
        ac2: n.ac2 != null ? Number(n.ac2) : null,
        ac3: n.ac3 != null ? Number(n.ac3) : null,
        ttp: n.ttp != null ? Number(n.ttp) : null,
        pp1: n.pp1 != null ? Number(n.pp1) : null,
        pp2: n.pp2 != null ? Number(n.pp2) : null,
        exame: n.exame != null ? Number(n.exame) : null,
        recurso: n.recurso != null ? Number(n.recurso) : null,
        exame_especial: n.exame_especial != null ? Number(n.exame_especial) : null,
        nota_final: notaFinal,
        dispensada: n.dispensada,
        tipo_avaliacao: n.tipo_avaliacao,
        avaliacao_atual,
        aprovado: notaFinal !== null ? notaFinal >= 10 : null,
        tem_dispensa: n.disciplina.tem_dispensa,
        nota_dispensa: n.disciplina.nota_dispensa,
        dispensavel: n.disciplina.tem_dispensa,
        estado: calcularEstado(n),
        is_provisional: n.exame === null && !n.dispensada,
      }
    })

  // Re-ordenar com os valores corrigidos de ano e semestre (do CursoDisciplina)
  flat.sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano
    if (a.semestre !== b.semestre) return a.semestre.localeCompare(b.semestre)
    return a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" })
  })

  const agrupado: Record<number, Record<string, NotaItem[]>> = {}
  for (const n of flat) {
    if (!agrupado[n.ano]) agrupado[n.ano] = {}
    if (!agrupado[n.ano][n.semestre]) agrupado[n.ano][n.semestre] = []
    agrupado[n.ano][n.semestre].push(n)
  }

  function calcNotaParcial(d: NotaItem): number | null {
    // Calculate MAC = (média(AC1,AC2,AC3) + TTP) / 2
    const acValues = [d.ac1, d.ac2, d.ac3].filter((v): v is number => v !== null)
    const acAvg = acValues.length > 0 
      ? acValues.reduce((sum, v) => sum + v, 0) / acValues.length 
      : 0
    const ttpVal = d.ttp ?? 0
    const mac = (acAvg + ttpVal) / 2
    
    // Calculate Média = round((MAC + PP1 + PP2) / 3)
    // If PP1 or PP2 is null, exclude from average
    const ppValues = [d.pp1, d.pp2].filter((v): v is number => v !== null)
    const ppSum = ppValues.reduce((sum, v) => sum + v, 0)
    const ppCount = ppValues.length
    const totalComponents = 1 + ppCount // MAC counts as 1 component
    
    if (acValues.length === 0 && ppValues.length === 0 && d.ttp === null) {
      return null
    }
    
    return arredondarNota((mac + ppSum) / totalComponents)
  }

  const medias: Record<number, number | null> = {}
  for (const ano of Object.keys(agrupado)) {
    const todasDoAno = Object.values(agrupado[Number(ano)]).flat()
    const notasParaMedia = todasDoAno
      .map(d => d.nota_final !== null ? d.nota_final : calcNotaParcial(d))
      .filter((v): v is number => v !== null)
    medias[Number(ano)] = notasParaMedia.length > 0
      ? arredondarNota(notasParaMedia.reduce((acc, v) => acc + v, 0) / notasParaMedia.length)
      : null
  }

  const mediasValidas = Object.values(medias).filter((m): m is number => m !== null)
  const mediaGeral = mediasValidas.length > 0
    ? arredondarNota(mediasValidas.reduce((acc, m) => acc + m, 0) / mediasValidas.length)
    : null

  return NextResponse.json({
    notas: agrupado,
    medias,
    mediaGeral,
    propina_bloqueada: propinaPendente, // ← campo novo
  })
}