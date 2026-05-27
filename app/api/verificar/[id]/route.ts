import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const numberToExtenso = (n: number): string => {
  const unidades = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
    "onze", "doze", "treze", "catorze", "quinze", "dezasseis", "dezassete", "dezoito", "dezanove", "vinte"]
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"]
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"]

  if (n <= 20) return unidades[n]
  const intPart = Math.floor(n)
  const decPart = Math.round((n - intPart) * 100)

  let extenso = ""
  if (intPart >= 100) {
    const c = Math.floor(intPart / 100)
    extenso += (c === 1 && intPart % 100 === 0 ? "cem" : centenas[c])
    if (intPart % 100 !== 0) extenso += " e "
  }
  const resto = intPart % 100
  if (resto > 0) {
    if (resto <= 20) extenso += unidades[resto]
    else {
      const d = Math.floor(resto / 10)
      const u = resto % 10
      extenso += dezenas[d]
      if (u > 0) extenso += " e " + unidades[u]
    }
  }
  if (decPart > 0) {
    extenso += " vírgula "
    if (decPart <= 20) extenso += unidades[decPart]
    else {
      const d = Math.floor(decPart / 10)
      const u = decPart % 10
      extenso += dezenas[d]
      if (u > 0) extenso += " e " + unidades[u]
    }
  }
  extenso += " valores"
  return extenso
}

// GET /api/verificar/[id] - Verify any digital document (Declaração, Certificado Disciplinas, Certificado Conclusão)
// Todos os documentos usam o formato /verificar/{id} (ID numérico) para simplificar.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const numericId = Number(id)

    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      )
    }

    // 1. Try as Declaração
    const declaracao = await prisma.declaracao.findUnique({
      where: { id_declaracao: numericId },
      include: {
        estudante: {
          include: { curso: true }
        }
      }
    })

    if (declaracao) {
      return NextResponse.json({
        tipo: "declaracao",
        id: declaracao.id_declaracao,
        numero_documento: declaracao.numero_documento,
        data_emissao: declaracao.data_emissao,
        ano_lectivo: declaracao.ano_lectivo,
        estudante: {
          nome_completo: declaracao.estudante.nome_completo,
          numero_estudante: declaracao.estudante.numero_estudante,
          ano_current: declaracao.estudante.ano_current,
          estado: declaracao.estudante.estado,
          curso: {
            nome_curso: declaracao.estudante.curso.nome_curso,
          }
        }
      })
    }

    // 2. Try as Certificado
    const certificado = await prisma.certificado.findUnique({
      where: { id_certificado: numericId },
      include: {
        estudante: {
          include: { curso: true }
        },
        disciplinas: {
          include: {
            disciplina: true
          }
        }
      }
    })

    if (certificado) {
      const isConclusao = certificado.tipo_certificado === "Conclusao"

      if (isConclusao) {
        // Certificado de Conclusão — buscar a nota final calculada
        // Usar CursoDisciplina para saber a que ano cada disciplina pertence (igual ao PDF)
        const student = certificado.estudante
        const duracaoAnos = student.curso.duracao_anos || 3
        const anosComDisciplinas = duracaoAnos - 1

        const notas = await prisma.nota.findMany({
          where: {
            id_estudante: student.id_estudante,
            OR: [
              { nota_final: { not: null } },
              { dispensada: true }
            ]
          },
          include: {
            disciplina: {
              include: {
                cursos: {
                  where: { id_curso: student.id_curso }
                }
              }
            }
          }
        })

        // Agrupar notas por ano curricular usando CursoDisciplina (com fallback para Disciplina.ano_curricular)
        const notasPorAno: Record<number, typeof notas> = {}
        for (const nota of notas) {
          const curriculo = nota.disciplina.cursos[0]
          const notaFinal = nota.nota_final != null ? Number(nota.nota_final) : null
          const ano = curriculo?.ano_curricular ?? nota.disciplina.ano_curricular
          if (ano >= 1 && ano <= anosComDisciplinas && notaFinal != null) {
            if (!notasPorAno[ano]) notasPorAno[ano] = []
            notasPorAno[ano].push(nota)
          }
        }

        const allYears = Array.from({ length: anosComDisciplinas }, (_, i) => i + 1)
        const gradesByYear = allYears.map(year => {
          const yearNotas = notasPorAno[year] || []
          const validGrades = yearNotas.filter(n => n.nota_final !== null && !n.dispensada)
          const average = validGrades.length > 0
            ? (validGrades.reduce((sum, n) => sum + Number(n.nota_final || 0), 0) / validGrades.length)
            : 0
          return { year, average }
        })

        const monografia = await prisma.monografia.findFirst({
          where: {
            id_estudante: student.id_estudante,
            estado: "Defendida"
          }
        })

        const monografiaGrade = monografia?.nota_final ? Number(monografia.nota_final) : 0
        const yearAverages = gradesByYear.map(y => y.average)
        const allGrades = [...yearAverages, monografiaGrade]
        const finalGradeRaw = allGrades.reduce((sum, g) => sum + g, 0) / allGrades.length

        // Arredondar: mesma lógica do lib/notas (arredondarNota) — arredonda para o número inteiro mais próximo (>= 0.5 sobe)
        const floor = Math.floor(finalGradeRaw)
        const decimal = finalGradeRaw - floor
        const epsilon = 1e-10
        const finalGrade = (decimal - 0.5) >= -epsilon ? floor + 1 : floor
        const notaFinal = finalGrade.toFixed(2)
        const notaExtenso = numberToExtenso(Math.round(finalGrade))

        return NextResponse.json({
          tipo: "cert",
          id: certificado.id_certificado,
          numero_documento: certificado.descricao || certificado.tipo_certificado,
          data_emissao: certificado.data_emissao,
          nota_final: notaFinal,
          nota_extenso: notaExtenso,
          estudante: {
            nome_completo: certificado.estudante.nome_completo,
            numero_estudante: certificado.estudante.numero_estudante,
            estado: certificado.estudante.estado,
            curso: {
              nome_curso: certificado.estudante.curso.nome_curso,
            }
          }
        })
      }

      // Certificado de Disciplinas — buscar notas reais do estudante
      const student = certificado.estudante
      const notas = await prisma.nota.findMany({
        where: {
          id_estudante: student.id_estudante,
          OR: [
            { nota_final: { not: null } },
            { dispensada: true }
          ]
        },
        include: {
          disciplina: {
            include: {
              cursos: {
                where: { id_curso: student.id_curso }
              }
            }
          }
        }
      })

      const disciplinas = notas.map(nota => {
        const curriculo = nota.disciplina.cursos[0]
        const ano_curricular = curriculo?.ano_curricular ?? nota.disciplina.ano_curricular
        const semestre = curriculo?.semestre ?? nota.disciplina.semestre
        return {
          nome_disciplina: nota.disciplina.nome_disciplina,
          codigo_disciplina: nota.disciplina.codigo_disciplina,
          semestre: semestre === "S1" ? "1º Semestre" : "2º Semestre",
          ano_curricular,
          nota_final: nota.nota_final?.toString() || "-",
          situacao: nota.dispensada ? "Dispensada" : (nota.nota_final && Number(nota.nota_final) >= 10 ? "Aprovado" : "Reprovado")
        }
      })

      // Sort igual ao PDF
      const ordemSemestre: Record<string, number> = { "1º Semestre": 1, "2º Semestre": 2 }
      disciplinas.sort((a, b) => {
        if (a.ano_curricular !== b.ano_curricular) return a.ano_curricular - b.ano_curricular
        const semA = ordemSemestre[a.semestre] ?? 0
        const semB = ordemSemestre[b.semestre] ?? 0
        if (semA !== semB) return semA - semB
        return a.nome_disciplina.localeCompare(b.nome_disciplina)
      })

      return NextResponse.json({
        tipo: "cert-disc",
        id: certificado.id_certificado,
        numero_documento: certificado.descricao || certificado.tipo_certificado,
        data_emissao: certificado.data_emissao,
        descricao: certificado.descricao,
        disciplinas,
        estudante: {
          nome_completo: certificado.estudante.nome_completo,
          numero_estudante: certificado.estudante.numero_estudante,
          estado: certificado.estudante.estado,
          curso: {
            nome_curso: certificado.estudante.curso.nome_curso,
          }
        }
      })
    }

    // Not found
    return NextResponse.json(
      { error: "Documento não encontrado ou inválido" },
      { status: 404 }
    )

  } catch (error) {
    console.error("Error verifying document:", error)
    return NextResponse.json(
      { error: "Erro ao verificar documento" },
      { status: 500 }
    )
  }
}