import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getAnoLectivo } from "@/lib/sistema"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) 
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const id_estudante = parseInt(id)
  if (isNaN(id_estudante)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  // Buscar estudante com informações básicas
  const estudante = await prisma.estudante.findUnique({
    where: { id_estudante },
    include: {
      curso: {
        select: {
          id_curso: true,
          nome_curso: true,
          duracao_anos: true,
          turnos: true,
          id_departamento: true,
        },
      },
      curriculos: {
        orderBy: { ano_lectivo: "desc" },
      },
    },
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  // ── RESTRIÇÃO DE DEPARTAMENTO ──
  // Verificar se o estudante pertence ao mesmo departamento que o gestor
  const gestor = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_departamento: true }
  })

  if (gestor?.id_departamento && estudante.curso.id_departamento !== gestor.id_departamento) {
    return NextResponse.json({ error: "Acesso negado: estudante de outro departamento" }, { status: 403 })
  }

  // Construir histórico por ano curricular
  // Vamos do 1º ano até ao ano_current do estudante
  const anosCurriculares = []

  for (let ano = 1; ano <= (estudante.ano_current || 1); ano++) {
    // Procurar o CurriculoAcademico para este ano
    const curriculo = estudante.curriculos.find(c => c.descricao === `${ano}º Ano`)
    const anoLectivo = curriculo?.ano_lectivo || estudante.ano_electivo || await getAnoLectivo()

    // Buscar disciplinas definidas para este ano no curso (via CursoDisciplina)
    const disciplinasDoCurso = await prisma.cursoDisciplina.findMany({
      where: {
        id_curso: estudante.id_curso,
        ano_curricular: ano,
      },
      include: {
        disciplina: {
          select: {
            id_disciplina: true,
            nome_disciplina: true,
            codigo_disciplina: true,
            creditos: true,
            semestre: true,
          },
        },
      },
      orderBy: [
        { semestre: "asc" },
        { disciplina: { nome_disciplina: "asc" } },
      ],
    })

    // Buscar notas do estudante para este ano lectivo
    // Filtra pelas disciplinas do CursoDisciplina (que tem o ano_curricular correcto)
    // ao invés de usar Disciplina.ano_curricular (que pode ser diferente)
    const disciplinasIds = disciplinasDoCurso.map(cd => cd.id_disciplina)
    const notas = await prisma.nota.findMany({
      where: {
        id_estudante,
        ano_lectivo: anoLectivo,
        id_disciplina: { in: disciplinasIds },
      },
      include: {
        disciplina: {
          select: {
            id_disciplina: true,
            nome_disciplina: true,
            codigo_disciplina: true,
            ano_curricular: true,
            semestre: true,
          },
        },
      },
    })

    // Mapear notas para um dicionário por id_disciplina
    const notasMap = new Map(notas.map(n => [n.id_disciplina, n]))

    // Organizar por semestre
    const semestres: Record<string, any[]> = { S1: [], S2: [] }

    for (const cd of disciplinasDoCurso) {
      const nota = notasMap.get(cd.id_disciplina)

      semestres[cd.semestre].push({
        id_nota: nota?.id_nota ?? null,
        id_disciplina: cd.id_disciplina,
        disciplina: cd.disciplina.nome_disciplina,
        codigo: cd.disciplina.codigo_disciplina,
        creditos: cd.disciplina.creditos,
        semestre: cd.semestre,
        ac1: nota?.ac1 != null ? Number(nota.ac1) : null,
        ac2: nota?.ac2 != null ? Number(nota.ac2) : null,
        ac3: nota?.ac3 != null ? Number(nota.ac3) : null,
        ttp: nota?.ttp != null ? Number(nota.ttp) : null,
        pp1: nota?.pp1 != null ? Number(nota.pp1) : null,
        pp2: nota?.pp2 != null ? Number(nota.pp2) : null,
        exame: nota?.exame != null ? Number(nota.exame) : null,
        recurso: nota?.recurso != null ? Number(nota.recurso) : null,
        exame_especial: nota?.exame_especial != null ? Number(nota.exame_especial) : null,
        nota_final: nota?.nota_final != null ? Number(nota.nota_final) : null,
        dispensada: nota?.dispensada ?? false,
        tipo_avaliacao: nota?.tipo_avaliacao ?? "Normal",
        aprovado: nota?.nota_final != null ? Number(nota.nota_final) >= 10 : null,
      })
    }

    anosCurriculares.push({
      ano,
      ano_lectivo: anoLectivo,
      semestres,
    })
  }

  return NextResponse.json({
    id_estudante: estudante.id_estudante,
    nome: estudante.nome_completo,
    numero_estudante: estudante.numero_estudante,
    numero_telemovel: estudante.numero_telemovel,
    turno: estudante.turno,
    ano_current: estudante.ano_current,
    ano_electivo: estudante.ano_electivo,
    estado: estudante.estado,
    pagamento: estudante.pagamento,
    tipo_bolsa: estudante.tipo_bolsa,
    data_cadastro: estudante.data_cadastro,
    curso: {
      id: estudante.curso.id_curso,
      nome: estudante.curso.nome_curso,
      duracao_anos: estudante.curso.duracao_anos,
      turnos_disponiveis: estudante.curso.turnos?.split(",") ?? [],
    },
    anos_curriculares: anosCurriculares,
  })
}