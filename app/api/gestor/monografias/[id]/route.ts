import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { criarNotificacao } from "@/lib/notificacoes"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const resolvedParams = await params
  const idMonografia = parseInt(resolvedParams.id)

  if (isNaN(idMonografia)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  const body = await request.json()
  const { estado, data_defesa, hora_defesa, sala_defesa, nota_final, feedback_gestor } = body

  // Verificar se a monografia existe
  const monografia = await prisma.monografia.findUnique({
    where: { id_monografia: idMonografia }
  })

  if (!monografia) {
    return NextResponse.json({ error: "Monografia não encontrada" }, { status: 404 })
  }

   // Validar transições de estado permitidas para gestor
   const transicoesPermitidas: Record<string, string[]> = {
     Submetida: ["EmRevisao"],
     EmRevisao: ["Aprovada", "Rejeitada"],
     Aprovada: ["ParaDefender"],
     ParaDefender: ["Defendida"],
   }

  if (estado && !transicoesPermitidas[monografia.estado]?.includes(estado)) {
    return NextResponse.json({ 
      error: `Transição de estado inválida: ${monografia.estado} → ${estado}` 
    }, { status: 400 })
  }

  const estadoAnterior = monografia.estado
  const notaAnterior = monografia.nota_final

  const dadosAtualizacao: Record<string, unknown> = {}
  if (estado) dadosAtualizacao.estado = estado
  if (data_defesa) dadosAtualizacao.data_defesa = new Date(data_defesa)
  if (hora_defesa !== undefined) dadosAtualizacao.hora_defesa = hora_defesa || null
  if (sala_defesa !== undefined) dadosAtualizacao.sala_defesa = sala_defesa || null
  if (nota_final !== undefined) dadosAtualizacao.nota_final = nota_final
  if (feedback_gestor !== undefined) dadosAtualizacao.feedback_gestor = feedback_gestor

  // Usar transacção para garantir consistência
  const [monografiaAtualizada, estudanteFinalizado] = await prisma.$transaction(async (tx) => {
    const monografiaAtualizada = await tx.monografia.update({
      where: { id_monografia: idMonografia },
      data: dadosAtualizacao,
      include: {
        estudante: {
          select: {
            id_estudante: true,
            id_usuario: true,
            nome_completo: true,
            numero_estudante: true,
          }
        }
      }
    })

    // Se a monografia foi defendida com nota ≥ 10, finalizar o estudante
    const notaValor = nota_final !== undefined ? Number(nota_final) : (monografia.nota_final ? Number(monografia.nota_final) : null)
    const monografiaEstado = estado || monografia.estado
    let estudanteFinalizado = false

    if (monografiaEstado === "Defendida" && notaValor !== null && notaValor >= 10) {
      const estudante = await tx.estudante.findUnique({
        where: { id_estudante: monografia.id_estudante },
        include: {
          curso: { select: { nome_curso: true, duracao_anos: true } },
          notas: {
            include: { disciplina: { select: { nome_disciplina: true, codigo_disciplina: true, ano_curricular: true, semestre: true } } }
          },
          solicitacoes: {
            where: { estado: "Aceite" },
            include: { orientador: { select: { nome_completo: true, especialidade: true } } }
          }
        }
      })

      if (estudante && estudante.estado !== "Finalizado") {
        await tx.estudante.update({
          where: { id_estudante: monografia.id_estudante },
          data: { estado: "Finalizado" }
        })
        estudanteFinalizado = true

        // Buscar sistema config para ano lectivo e semestre actual
        const sistemaConfig = await tx.sistemaConfig.findUnique({ where: { id_config: 1 } })
        const anoLectivo = estudante.ano_electivo || sistemaConfig?.ano_lectivo_label || ""
        const semestre = sistemaConfig?.semestre_atual || "S2"

        // Buscar disciplinas do currículo do curso via CursoDisciplina
        // Inclui ano_curricular e semestre específicos do curso (não os genéricos da Disciplina)
        const curriculoDisciplinas = await tx.cursoDisciplina.findMany({
          where: { id_curso: estudante.id_curso },
          select: { id_disciplina: true, ano_curricular: true, semestre: true },
        })
        const disciplinasCurriculoMap = new Map(
          curriculoDisciplinas.map((cd) => [
            cd.id_disciplina,
            { ano_curricular: cd.ano_curricular, semestre: cd.semestre }
          ])
        )

        // Filtrar notas: só disciplinas do currículo
        const notasFiltradas = estudante.notas.filter((n) =>
          disciplinasCurriculoMap.has(n.id_disciplina)
        )

        // Agrupar por ano_curricular -> semestre -> disciplinas ordenadas por nome
        // Usando os valores do CursoDisciplina (não da Disciplina genérica)
        const porAno: Record<number, Record<string, typeof notasFiltradas>> = {}
        for (const n of notasFiltradas) {
          const curriculoInfo = disciplinasCurriculoMap.get(n.id_disciplina)
          const ano = curriculoInfo?.ano_curricular ?? n.disciplina.ano_curricular
          const sem = curriculoInfo?.semestre ?? n.disciplina.semestre
          if (!porAno[ano]) porAno[ano] = {}
          if (!porAno[ano][sem]) porAno[ano][sem] = []
          porAno[ano][sem].push(n)
        }

        const notasSnapshot = Object.entries(porAno)
          .sort(([a], [b]) => Number(a) - Number(b))
          .flatMap(([anoStr, sems]) =>
            Object.entries(sems)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([sem, lista]) => ({
                ano_curricular: Number(anoStr),
                semestre: sem,
                disciplinas: lista
                  .sort((a, b) => a.disciplina.nome_disciplina.localeCompare(b.disciplina.nome_disciplina))
                  .map((n) => ({
                    id_nota: n.id_nota,
                    nome_disciplina: n.disciplina.nome_disciplina,
                    codigo_disciplina: n.disciplina.codigo_disciplina,
                    ano_curricular: n.disciplina.ano_curricular,
                    semestre: n.disciplina.semestre,
                    nota_final: n.nota_final ? Number(n.nota_final) : null,
                    ano_lectivo: n.ano_lectivo,
                    dispensada: n.dispensada,
                  })),
              }))
          )

        // Criar snapshot de finalização
        await tx.snapshotSemestre.create({
          data: {
            id_estudante: monografia.id_estudante,
            ano_lectivo: anoLectivo,
            semestre: semestre,
            tipo: "finalizacao",
            dados_pessoais: {
              nome_completo: estudante.nome_completo,
              numero_estudante: estudante.numero_estudante,
              nome_curso: estudante.curso.nome_curso,
              duracao_anos: estudante.curso.duracao_anos,
              ano_current: estudante.ano_current,
              ano_electivo: estudante.ano_electivo,
              turno: estudante.turno,
              tipo_bolsa: estudante.tipo_bolsa,
            },
            notas_snapshot:
              notasSnapshot.length > 0
                ? notasSnapshot
                : estudante.notas.map((n) => ({
                    id_nota: n.id_nota,
                    nome_disciplina: n.disciplina.nome_disciplina,
                    codigo_disciplina: n.disciplina.codigo_disciplina,
                    ano_curricular: n.disciplina.ano_curricular,
                    semestre: n.disciplina.semestre,
                    nota_final: n.nota_final ? Number(n.nota_final) : null,
                    ano_lectivo: n.ano_lectivo,
                    dispensada: n.dispensada,
                  })),
            monografia_snapshot: {
              id_monografia: monografia.id_monografia,
              titulo: monografia.titulo,
              nota_final: notaValor,
              data_defesa: monografia.data_defesa,
              hora_defesa: monografia.hora_defesa,
              sala_defesa: monografia.sala_defesa,
              nome_co_orientador: monografia.nome_co_orientador,
              nome_co_autor: monografia.nome_co_autor,
              orientador: estudante.solicitacoes[0]?.orientador ? {
                nome_completo: estudante.solicitacoes[0].orientador.nome_completo,
                especialidade: estudante.solicitacoes[0].orientador.especialidade,
              } : null,
            },
            criado_por: parseInt(session.user.id),
          }
        })
      }
    }

    return [monografiaAtualizada, estudanteFinalizado]
  })

  // Notificar estudante
  try {
    let titulo = "Monografia atualizada"
    let mensagem = `A sua monografia foi atualizada para "${monografiaAtualizada.estado}"`
    if (monografiaAtualizada.estado === "Aprovada") {
      titulo = "Monografia aprovada"
      mensagem = "A sua monografia foi aprovada"
    } else if (monografiaAtualizada.estado === "Rejeitada") {
      titulo = "Monografia rejeitada"
      mensagem = `A sua monografia foi rejeitada${feedback_gestor ? `. Feedback: ${feedback_gestor}` : ""}`
    } else if (monografiaAtualizada.estado === "ParaDefender") {
      titulo = "Defesa agendada"
      mensagem = `A defesa foi agendada para ${data_defesa ? new Date(data_defesa).toLocaleDateString('pt-PT') : ""} às ${hora_defesa || ""} (${sala_defesa || "sala a definir"})`
    }
    await criarNotificacao({
      id_usuario: monografiaAtualizada.estudante.id_usuario,
      tipo: "monografia",
      titulo,
      mensagem,
      link_url: "/estudante/monografia"
    })
  } catch (err) {
    console.error("Erro ao criar notificação:", err)
  }

  // Notificar orientador quando defesa for agendada
  if (monografiaAtualizada.estado === "ParaDefender" && monografia.id_orientador) {
    try {
      const orientadorData = await prisma.orientador.findUnique({
        where: { id_orientador: monografia.id_orientador },
        select: { id_usuario: true, nome_completo: true }
      })
      if (orientadorData) {
        await criarNotificacao({
          id_usuario: orientadorData.id_usuario,
          tipo: "defesa",
          titulo: `Defesa agendada — ${monografiaAtualizada.estudante.nome_completo}`,
          mensagem: `A defesa do aluno ${monografiaAtualizada.estudante.nome_completo} foi agendada para ${data_defesa ? new Date(data_defesa).toLocaleDateString('pt-PT') : ""} às ${hora_defesa || ""} (${sala_defesa || "sala a definir"})`,
          link_url: "/orientador/monografias"
        })
      }
    } catch (err) {
      console.error("Erro ao notificar orientador:", err)
    }
  }

  // Log audit
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    
    let acao = "GESTOR_ACTUALIZAR_MONOGRAFIA"
    if (estado === "EmRevisao") acao = "GESTOR_MARCAR_REVISAO"
    else if (estado === "Aprovada") acao = "GESTOR_APROVAR_MONOGRAFIA"
    else if (estado === "Rejeitada") acao = "GESTOR_REJEITAR_MONOGRAFIA"
    else if (estado === "ParaDefender") acao = "GESTOR_AGENDAR_DEFESA"
    else if (estado === "Defendida" || (nota_final !== undefined && estado === "Defendida")) acao = "GESTOR_ATRIBUIR_NOTA"
    else if (nota_final !== undefined && estado === undefined) acao = "GESTOR_ATRIBUIR_NOTA"
    else if (data_defesa !== undefined) acao = "GESTOR_AGENDAR_DEFESA"
    
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao,
      tabela: "Monografia",
      id_registro: idMonografia,
      valor_antes: { 
        estado: estadoAnterior, 
        nota_final: notaAnterior ? Number(notaAnterior) : null,
        data_defesa: monografia.data_defesa,
        hora_defesa: monografia.hora_defesa,
        sala_defesa: monografia.sala_defesa,
      },
      valor_depois: {
        estado: monografiaAtualizada.estado,
        nota_final: monografiaAtualizada.nota_final != null ? Number(monografiaAtualizada.nota_final) : null,
        data_defesa: monografiaAtualizada.data_defesa,
        hora_defesa: monografiaAtualizada.hora_defesa,
        sala_defesa: monografiaAtualizada.sala_defesa,
        feedback_gestor: monografiaAtualizada.feedback_gestor,
      },
      ip_address: ip,
    })
  } catch (err) {
    console.error("Erro ao registrar audit log:", err)
  }

  return NextResponse.json({
    id_monografia: monografiaAtualizada.id_monografia,
    titulo: monografiaAtualizada.titulo,
    estado: monografiaAtualizada.estado,
    data_defesa: monografiaAtualizada.data_defesa,
    hora_defesa: monografiaAtualizada.hora_defesa,
    sala_defesa: monografiaAtualizada.sala_defesa,
    nota_final: monografiaAtualizada.nota_final != null ? Number(monografiaAtualizada.nota_final) : null,
    feedback_gestor: monografiaAtualizada.feedback_gestor,
    estudante: monografiaAtualizada.estudante,
  })
}