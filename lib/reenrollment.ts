/**
 * Re-enrollment processing and student suspension logic.
 *
 * processarRematricula() — handles re-enrollment when a student pays the fee.
 * suspenderEstudantesSemRematricula() — marks students as Suspendido when they
 * haven't re-enrolled for the new academic year.
 */
import { prisma } from "./prisma"
import { getAnoLectivo, getSystemDate, isEnrollmentOpen } from "./sistema"
import { atribuirDisciplinasParaAno } from "./atribuirDisciplinas"
import { logAudit } from "./audit"

/**
 * Process a student's re-enrollment after payment.
 *
 * Nova regra de progressão:
 * - Se tiver NO MÁXIMO 2 reprovações no mesmo ano curricular → AVANÇA (reseta só as reprovadas)
 * - Se tiver MAIS de 2 reprovações no mesmo ano curricular → REPETE o ano
 * - Se for finalista (ano_current >= duracao_anos) → apenas actualiza ano lectivo, sem snapshot
 *
 * @param id_estudante - Student ID
 * @param id_usuario_trigger - User ID who triggered the action (for audit)
 * @returns Result with success flag, type ("avancou" | "repetiu" | "finalista_pendente"), message, and failed disciplines list
 */
export async function processarRematricula(
  id_estudante: number,
  id_usuario_trigger: number
): Promise<{
  success: boolean
  tipo?: "avancou" | "repetiu" | "finalista_pendente"
  disciplinasFalhadas?: string[]
  message: string
}> {
  // ── 1. Fetch student with current year grades ──
  const estudante = await prisma.estudante.findUnique({
    where: { id_estudante: id_estudante },
    include: {
      curso: { select: { duracao_anos: true } },
    },
  })

  if (!estudante) {
    return { success: false, message: "Estudante não encontrado" }
  }

  const currentAnoLectivo = await getAnoLectivo()
  const systemDate = await getSystemDate()

  // ── 2. Idempotency check ──
  if (estudante.ano_electivo === currentAnoLectivo) {
    return {
      success: false,
      message: "Estudante já rematriculado para este ano lectivo",
    }
  }

  // ── 3. Enrollment period check ──
  const dentroDoPeriodo = await isEnrollmentOpen()
  if (!dentroDoPeriodo) {
    // Buscar as datas do período de matrículas para incluir na mensagem
    const config = await prisma.sistemaConfig.findUnique({ where: { id_config: 1 } })
    const dataInicio = config?.matricula_data_inicio
      ? new Date(config.matricula_data_inicio).toLocaleDateString("pt-PT")
      : "—"
    const dataFim = config?.matricula_data_fim
      ? new Date(config.matricula_data_fim).toLocaleDateString("pt-PT")
      : "—"

    return {
      success: false,
      message: `Fora do período de matrículas. As matrículas estão abertas de ${dataInicio} até ${dataFim}.`,
    }
  }

  // ── 4. Validate student has an academic year assigned ──
  if (!estudante.ano_electivo) {
    return {
      success: false,
      message: "Estudante sem ano lectivo definido. Contacte o administrador.",
    }
  }

  // ── 5. Handle final year students (pendentes de defesa) ──
  const oldAnoCurrent = estudante.ano_current ?? 1
  const duracaoAnos = estudante.curso?.duracao_anos ?? 4

  if (oldAnoCurrent >= duracaoAnos) {
    // Finalista pendente: apenas actualiza ano lectivo, sem snapshot, sem criar disciplinas
    await prisma.estudante.update({
      where: { id_estudante },
      data: { ano_electivo: currentAnoLectivo },
    })

    // Log to audit
    await logAudit({
      id_usuario: id_usuario_trigger,
      acao: "Rematrícula — Finalista Pendente",
      tabela: "Estudante",
      id_registro: id_estudante,
      valor_antes: {
        ano_lectivo: estudante.ano_electivo,
        ano_current: oldAnoCurrent,
      },
      valor_depois: {
        ano_lectivo: currentAnoLectivo,
        ano_current: oldAnoCurrent,
        acao: "Finalista pendente de defesa — ano lectivo actualizado sem snapshot",
      },
      ip_address: "sistema",
    })

    return {
      success: true,
      tipo: "finalista_pendente" as const,
      message: `Finalista pendente de defesa. Ano lectivo actualizado para ${currentAnoLectivo}.`,
    }
  }

  // We need grades from the STUDENT'S current ano_lectivo (the one they're closing),
  // not the new one. Re-fetch with the correct year.
  const oldAnoLectivo = estudante.ano_electivo
  const notas = await prisma.nota.findMany({
    where: {
      id_estudante,
      ano_lectivo: estudante.ano_electivo,
    },
    include: {
      disciplina: {
        select: {
          id_disciplina: true,
          codigo_disciplina: true,
          nome_disciplina: true,
          ano_curricular: true,
          tem_dispensa: true,
          nota_dispensa: true,
        },
      },
    },
  })

  // ── 5. Take snapshot BEFORE any changes ──
  const snapshotData = notas.map((n) => ({
    id_nota: n.id_nota,
    id_disciplina: n.id_disciplina,
    codigo_disciplina: n.disciplina.codigo_disciplina,
    nome_disciplina: n.disciplina.nome_disciplina,
    ano_curricular: n.disciplina.ano_curricular,
    semestre: n.semestre,
    ac1: n.ac1 ? Number(n.ac1) : null,
    ac2: n.ac2 ? Number(n.ac2) : null,
    ac3: n.ac3 ? Number(n.ac3) : null,
    ttp: n.ttp ? Number(n.ttp) : null,
    pp1: n.pp1 ? Number(n.pp1) : null,
    pp2: n.pp2 ? Number(n.pp2) : null,
    exame: n.exame ? Number(n.exame) : null,
    recurso: n.recurso ? Number(n.recurso) : null,
    exame_especial: n.exame_especial ? Number(n.exame_especial) : null,
    nota_final: n.nota_final ? Number(n.nota_final) : null,
    dispensada: n.dispensada,
    tem_dispensa: n.disciplina.tem_dispensa,
    nota_dispensa: n.disciplina.nota_dispensa,
  }))

  await prisma.snapshotSemestre.create({
    data: {
      id_estudante,
      ano_lectivo: oldAnoLectivo ?? currentAnoLectivo,
      semestre: "S2",
      data_snapshot: systemDate,
      notas_snapshot: JSON.stringify(snapshotData),
      criado_por: id_usuario_trigger,
    },
  })

  // ── 6. Determine which subjects the student failed ──
  const disciplinasFalhadas = notas.filter((n) => {
    // Failed = nota_final < 10 AND not dispensed
    if (n.dispensada) return false
    if (n.nota_final === null) return true // No grade at all = failed
    return Number(n.nota_final) < 10
  })

  // ── 6b. Limit: max 2 failed subjects from the SAME curricular year ──
  // Agrupar disciplinas falhadas por ano curricular e verificar
  // se alguma delas tem mais de 2 reprovações no mesmo ano
  const falhadasPorAno = new Map<number, number>()
  for (const n of disciplinasFalhadas) {
    const ano = n.disciplina.ano_curricular
    falhadasPorAno.set(ano, (falhadasPorAno.get(ano) || 0) + 1)
  }
  
  // Se algum ano curricular tiver > 2 disciplinas falhadas, estudante repete
  const anoComMaisDe2 = Array.from(falhadasPorAno.entries()).find((entry) => entry[1] > 2)
  const maxDuasPorAno = !anoComMaisDe2

  // NOVA REGRA: pode avançar se tiver no máximo 2 reprovações no mesmo ano
  // (mesmo que tenha 1 ou 2 reprovações, avança — reseta só as reprovadas)
  const podeAvancar = maxDuasPorAno

  // ── 7a. Path A — At most 2 failed from same year: advance ──
  if (podeAvancar) {
    const newAnoCurrent = Math.min(oldAnoCurrent + 1, duracaoAnos)

    await prisma.estudante.update({
      where: { id_estudante },
      data: {
        ano_current: newAnoCurrent,
        ano_electivo: currentAnoLectivo,
      },
    })

    // Reset ONLY failed subjects (mesmo tendo avançado, as reprovadas são resetadas)
    const resetDisciplinas: { nome: string; codigo: string }[] = []

    for (const nota of disciplinasFalhadas) {
      await prisma.nota.update({
        where: { id_nota: nota.id_nota },
        data: {
          ac1: null,
          ac2: null,
          ac3: null,
          ttp: null,
          pp1: null,
          pp2: null,
          exame: null,
          recurso: null,
          exame_especial: null,
          nota_final: null,
          dispensada: false,
          tipo_avaliacao: "Normal",
        },
      })

      resetDisciplinas.push({
        nome: nota.disciplina.nome_disciplina,
        codigo: nota.disciplina.codigo_disciplina,
      })
    }

    // Assign ONLY the disciplines for the NEW year (not from 1st year onwards)
    // This avoids duplicating disciplines from previous years
    if (newAnoCurrent < duracaoAnos) {
      await atribuirDisciplinasParaAno(
        prisma,
        id_estudante,
        estudante.id_curso,
        newAnoCurrent,
        currentAnoLectivo
      )
    }

    // Log to audit
    await logAudit({
      id_usuario: id_usuario_trigger,
      acao: "Rematrícula — Avançou de Ano",
      tabela: "Estudante",
      id_registro: id_estudante,
      valor_antes: {
        ano_lectivo: oldAnoLectivo,
        ano_current: oldAnoCurrent,
      },
      valor_depois: {
        ano_lectivo: currentAnoLectivo,
        ano_current: newAnoCurrent,
        acao: "Avançou",
        disciplinas_resetadas: resetDisciplinas.map((d) => d.nome),
      },
      ip_address: "sistema",
    })

    const mensagem = resetDisciplinas.length > 0
      ? `Avançou para o ${newAnoCurrent}º ano lectivo (${currentAnoLectivo}). ${resetDisciplinas.length} disciplina(s) reiniciada(s): ${resetDisciplinas.map((d) => d.nome).join(", ")}`
      : `Avançou para o ${newAnoCurrent}º ano lectivo (${currentAnoLectivo})`

    return {
      success: true,
      tipo: "avancou" as const,
      disciplinasFalhadas: resetDisciplinas.map((d) => d.nome),
      message: mensagem,
    }
  }

  // ── 7b. Path B — More than 2 failed in same year: repeat the year ──
  // Update ano_electivo only — ano_current stays the same
  await prisma.estudante.update({
    where: { id_estudante },
    data: { ano_electivo: currentAnoLectivo },
  })

  // Reset ONLY failed subjects
  const resetDisciplinas: { nome: string; codigo: string }[] = []

  for (const nota of disciplinasFalhadas) {
    await prisma.nota.update({
      where: { id_nota: nota.id_nota },
      data: {
        ac1: null,
        ac2: null,
        ac3: null,
        ttp: null,
        pp1: null,
        pp2: null,
        exame: null,
        recurso: null,
        exame_especial: null,
        nota_final: null,
        dispensada: false,
        tipo_avaliacao: "Normal",
      },
    })

    resetDisciplinas.push({
      nome: nota.disciplina.nome_disciplina,
      codigo: nota.disciplina.codigo_disciplina,
    })
  }

  // Log to audit
  await logAudit({
    id_usuario: id_usuario_trigger,
    acao: "Rematrícula — Repetiu Ano",
    tabela: "Estudante",
    id_registro: id_estudante,
    valor_antes: {
      ano_lectivo: oldAnoLectivo,
      ano_current: oldAnoCurrent,
    },
    valor_depois: {
      ano_lectivo: currentAnoLectivo,
      ano_current: oldAnoCurrent, // stays the same
      disciplinas_resetadas: resetDisciplinas.map((d) => d.nome),
    },
    ip_address: "sistema",
  })

  return {
    success: true,
    tipo: "repetiu" as const,
    disciplinasFalhadas: resetDisciplinas.map((d) => d.nome),
    message: `Repetiu o ${oldAnoCurrent}º ano. ${disciplinasFalhadas.length} disciplina(s) reiniciada(s): ${resetDisciplinas.map((d) => d.nome).join(", ")}`,
  }
}

/**
 * Suspend all EmCurso students who haven't re-enrolled for the new academic year.
 * Only callable from admin routes — never from student-facing endpoints.
 *
 * @param id_usuario_trigger - Admin user ID (for audit)
 * @returns Number of suspended students
 */
export async function suspenderEstudantesSemRematricula(
  id_usuario_trigger: number
): Promise<number> {
  const currentAnoLectivo = await getAnoLectivo()

  // Find all EmCurso students whose ano_electivo doesn't match the current year
  const estudantesParaSuspender = await prisma.estudante.findMany({
    where: {
      estado: "EmCurso",
      ano_electivo: { not: currentAnoLectivo },
    },
    select: {
      id_estudante: true,
      nome_completo: true,
      numero_estudante: true,
      ano_electivo: true,
    },
  })

  if (estudantesParaSuspender.length === 0) {
    return 0
  }

  // Update all to Suspendido
  const ids = estudantesParaSuspender.map((e) => e.id_estudante)

  await prisma.estudante.updateMany({
    where: { id_estudante: { in: ids } },
    data: { estado: "Suspendido" },
  })

  // Log each suspension to audit
  for (const estudante of estudantesParaSuspender) {
    await logAudit({
      id_usuario: id_usuario_trigger,
      acao: "Suspensão por Falta de Rematrícula",
      tabela: "Estudante",
      id_registro: estudante.id_estudante,
      valor_antes: {
        estado: "EmCurso",
        nome: estudante.nome_completo,
        numero: estudante.numero_estudante,
        ano_electivo: estudante.ano_electivo,
      },
      valor_depois: {
        estado: "Suspendido",
        motivo: "Não pagou taxa de rematrícula para o ano lectivo " + currentAnoLectivo,
      },
      ip_address: "sistema",
    })
  }

  return estudantesParaSuspender.length
}