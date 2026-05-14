import { prisma } from "@/lib/prisma"

/**
 * Verifica se o professor de uma disciplina já tem aula marcada
 * no mesmo dia e horário (para Horário de Aulas).
 *
 * Retorna null se não houver conflito, ou uma mensagem de erro se houver.
 */
export async function verificarConflitoProfessorHorario(params: {
  id_disciplina: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  turno: string
  ano_lectivo: string
  id_curso: number
  ano_curricular: number
  semestre: string
}): Promise<string | null> {
  const { id_disciplina, dia_semana, hora_inicio, hora_fim, turno, ano_lectivo, id_curso, ano_curricular, semestre } = params

  // 1. Descobrir quem é o professor desta disciplina
  const profDestaDisciplina = await prisma.professorDisciplina.findMany({
    where: { id_disciplina, ano_lectivo },
    select: { id_usuario: true },
  })

  if (profDestaDisciplina.length === 0) return null

  const idsUsuarios = profDestaDisciplina.map(p => p.id_usuario)

  // 2. Descobrir TODAS as disciplinas que estes professores lecionam (incluindo a mesma disciplina)
  const todasDisciplinas = await prisma.professorDisciplina.findMany({
    where: {
      id_usuario: { in: idsUsuarios },
      ano_lectivo,
    },
    select: { id_disciplina: true },
  })

  if (todasDisciplinas.length === 0) return null

  const idsTodasDisciplinas = Array.from(new Set(todasDisciplinas.map(d => d.id_disciplina))) as number[]

  // 3. Procurar aulas dessas disciplinas no mesmo dia + turno + horário sobreposto
  //    Excluir APENAS o mesmo curso+ano+semestre (o duplicado no mesmo slot já é verificado à parte)
  //    Mas incluir a MESMA disciplina noutros cursos (professor não pode dar aulas em 2 cursos ao mesmo tempo)
  const aulasConflitantes = await prisma.horarioAula.findMany({
    where: {
      id_disciplina: { in: idsTodasDisciplinas },
      dia_semana,
      turno,
      ano_lectivo,
      hora_inicio: { lt: hora_fim },
      hora_fim: { gt: hora_inicio },
      // Excluir APENAS a MESMA disciplina no MESMO curso/ano/semestre (duplicado já verificado à parte)
      // Assim, se o professor leciona Matemática e Física no mesmo curso/horário, é apanhado
      NOT: {
        id_disciplina: id_disciplina,
        id_curso: id_curso,
        ano_curricular: ano_curricular,
        semestre: semestre,
      },
    },
    include: {
      disciplina: { select: { nome_disciplina: true, codigo_disciplina: true } },
      curso: { select: { nome_curso: true } },
    },
  })

  if (aulasConflitantes.length === 0) return null

  // 4. Descobrir o nome do professor para a mensagem
  const usuarioConflito = await prisma.usuario.findUnique({
    where: { id_usuario: idsUsuarios[0] },
    include: {
      orientador: { select: { nome_completo: true } },
    },
  })
  const nomeProfessor = usuarioConflito?.orientador?.nome_completo || usuarioConflito?.nome_usuario || "Professor desconhecido"

  const conflito = aulasConflitantes[0]
  const nomeCursoConflito = conflito.curso?.nome_curso || "outro curso"
  return `Professor ${nomeProfessor} já tem aula de ${conflito.disciplina.nome_disciplina} (${conflito.disciplina.codigo_disciplina}) em ${nomeCursoConflito} no ${dia_semana} das ${conflito.hora_inicio}–${conflito.hora_fim} no turno ${turno}. Escolha outro horário.`
}

/**
 * Verifica se o professor de uma disciplina já tem prova PP1/PP2 marcada
 * no mesmo dia e horário (para Plano de Provas).
 *
 * Ignora Exame, Recurso e Exame_Especial (esses são vigiados por outros professores).
 *
 * Retorna null se não houver conflito, ou uma mensagem de erro se houver.
 */
export async function verificarConflitoProfessorProva(params: {
  id_disciplina: number
  data_prova: string // YYYY-MM-DD
  hora_inicio: string
  hora_fim: string
  turno: string
  tipo_prova: string
  ano_lectivo: string
  id_curso: number
  ano_curricular: number
  semestre: string
}): Promise<string | null> {
  const { id_disciplina, data_prova, hora_inicio, hora_fim, turno, tipo_prova, ano_lectivo, id_curso, ano_curricular, semestre } = params

  // Só verificar para PP1 e PP2 — Exame, Recurso e Exame_Especial são vigiados por outros
  if (tipo_prova !== "PP1" && tipo_prova !== "PP2") return null

  // 1. Descobrir quem é o professor desta disciplina
  const profDestaDisciplina = await prisma.professorDisciplina.findMany({
    where: { id_disciplina, ano_lectivo },
    select: { id_usuario: true },
  })

  if (profDestaDisciplina.length === 0) return null

  const idsUsuarios = profDestaDisciplina.map(p => p.id_usuario)

  // 2. Descobrir TODAS as disciplinas que estes professores lecionam (incluindo a mesma)
  const todasDisciplinas = await prisma.professorDisciplina.findMany({
    where: {
      id_usuario: { in: idsUsuarios },
      ano_lectivo,
    },
    select: { id_disciplina: true },
  })

  if (todasDisciplinas.length === 0) return null

  const idsTodasDisciplinas = Array.from(new Set(todasDisciplinas.map(d => d.id_disciplina))) as number[]

  // 3. Procurar provas PP1/PP2 dessas disciplinas na mesma data + turno + horário sobreposto
  //    Excluir APENAS o mesmo curso+ano+semestre (o duplicado já é verificado à parte)
  const provasConflitantes = await prisma.planoProva.findMany({
    where: {
      id_disciplina: { in: idsTodasDisciplinas },
      tipo_prova: { in: ["PP1", "PP2"] },
      data_prova: new Date(data_prova + "T12:00:00"),
      turno,
      hora_inicio: { lt: hora_fim },
      hora_fim: { gt: hora_inicio },
      NOT: {
        id_disciplina: id_disciplina,
        id_curso: id_curso,
        ano_curricular: ano_curricular,
        semestre: semestre,
      },
    },
    include: {
      disciplina: { select: { nome_disciplina: true, codigo_disciplina: true } },
      curso: { select: { nome_curso: true } },
    },
  })

  if (provasConflitantes.length === 0) return null

  // 4. Nome do professor
  const usuarioConflito = await prisma.usuario.findUnique({
    where: { id_usuario: idsUsuarios[0] },
    include: {
      orientador: { select: { nome_completo: true } },
    },
  })
  const nomeProfessor = usuarioConflito?.orientador?.nome_completo || usuarioConflito?.nome_usuario || "Professor desconhecido"

  const conflito = provasConflitantes[0]
  const nomeCursoConflito = conflito.curso?.nome_curso || "outro curso"
  const dataFormatada = new Date(data_prova + "T12:00:00").toLocaleDateString("pt-BR")
  return `Professor ${nomeProfessor} já tem ${conflito.tipo_prova} de ${conflito.disciplina.nome_disciplina} (${conflito.disciplina.codigo_disciplina}) em ${nomeCursoConflito} em ${dataFormatada} das ${conflito.hora_inicio}–${conflito.hora_fim} no turno ${turno}. Escolha outro horário ou data.`
}
