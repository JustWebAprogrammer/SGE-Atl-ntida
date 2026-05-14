import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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
  if (!session || session.user.role !== "estudante") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_estudante: true, ano_electivo: true, ano_current: true, id_curso: true },
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  // Check if student has overdue propinas (shared helper uses getSystemDate)
  if (await hasOverduePropinas(estudante.id_estudante)) {
    return NextResponse.json(
      { error: "Pagamentos em atraso. Regularize as propinas para aceder às notas." },
      { status: 403 }
    )
  }

  // Buscar as disciplinas do currículo para o ano actual do estudante
  // (usa CursoDisciplina.ano_curricular, não Disciplina.ano_curricular)
  const disciplinasDoCurso = await prisma.cursoDisciplina.findMany({
    where: {
      id_curso: estudante.id_curso,
      ano_curricular: estudante.ano_current ?? 1,
    },
    select: { id_disciplina: true },
  })
  const disciplinasIds = disciplinasDoCurso.map(cd => cd.id_disciplina)

  if (disciplinasIds.length === 0) {
    return NextResponse.json({ notas: [], ano_lectivo: estudante.ano_electivo || "" })
  }

  const anoLectivo = estudante.ano_electivo || ""

  const notas = await prisma.nota.findMany({
    where: {
      id_estudante: estudante.id_estudante,
      ano_lectivo: anoLectivo,
      id_disciplina: { in: disciplinasIds },
    },
    include: {
      disciplina: {
        select: {
          id_disciplina: true,
          nome_disciplina: true,
          codigo_disciplina: true,
          semestre: true,
          tem_dispensa: true,
          nota_dispensa: true,
        },
      },
    },
    orderBy: [
      { semestre: "asc" as const },
      { disciplina: { nome_disciplina: "asc" as const } },
    ],
  })

  const resumo = notas.map((n) => {
    const notaFinal = n.nota_final != null ? Number(n.nota_final) : null
    let situacao: string
    if (n.dispensada) situacao = "Dispensado"
    else if (n.exame_especial != null) situacao = Number(n.exame_especial) >= 10 ? "Aprovado EX" : "Reprovado"
    else if (n.recurso != null) situacao = Number(n.recurso) >= 10 ? "Aprovado EX" : "Reprovado"
    else if (notaFinal != null) situacao = notaFinal >= 10 ? "Aprovado" : "Exame"
    else situacao = "Em Curso"

    return {
      id_nota: n.id_nota,
      nome_disciplina: n.disciplina.nome_disciplina,
      codigo_disciplina: n.disciplina.codigo_disciplina,
      semestre: n.semestre, // ← usar semestre guardado na Nota (correcto), não da Disciplina
      nota_final: notaFinal,
      aprovado: notaFinal != null ? notaFinal >= 10 : null,
      tem_dispensa: n.disciplina.tem_dispensa,
      nota_dispensa: n.disciplina.nota_dispensa,
      dispensavel: n.disciplina.tem_dispensa,
      estado: calcularEstado(n),
      is_provisional: n.exame === null && !n.dispensada,
      situacao,
    }
  })

  return NextResponse.json({ notas: resumo, ano_lectivo: anoLectivo })
}