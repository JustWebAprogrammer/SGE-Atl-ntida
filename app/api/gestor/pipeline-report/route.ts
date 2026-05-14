import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const gestor = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true, id_departamento: true }
  })

  if (!gestor) return NextResponse.json({ error: "Gestor não encontrado" }, { status: 404 })

  const whereDepartamento = gestor.id_departamento
    ? { curso: { id_departamento: gestor.id_departamento } }
    : {}

  const now = new Date()
  const nowISO = now.toISOString()

  // Buscar TODOS os estudantes do departamento que são finalistas (último ano do curso)
  const estudantes = await prisma.estudante.findMany({
    where: {
      ...whereDepartamento,
      // Apenas estudantes que estão no último ano OU têm algum envolvimento com o pipeline
      ano_current: {
        gte: 3 // Pelo menos 3º ano para considerar pipeline
      }
    },
    select: {
      id_estudante: true,
      nome_completo: true,
      numero_estudante: true,
      ano_current: true,
      curso: {
        select: { nome_curso: true, duracao_anos: true }
      },
      solicitacoes: {
        orderBy: { data_solicitacao: "desc" },
        take: 1,
        select: {
          estado: true,
          data_solicitacao: true,
          orientador: {
            select: { nome_completo: true }
          }
        }
      },
      premonografias: {
        orderBy: { data_proposta: "desc" },
        take: 1,
        select: {
          estado: true,
          data_proposta: true,
          tema: true,
          feedback: true,
        }
      },
      monografias: {
        orderBy: { data_submissao: "desc" },
        take: 1,
        select: {
          estado: true,
          titulo: true,
          data_submissao: true,
          data_defesa: true,
          nota_final: true,
          nota_gestor: true,
          feedback: true,
          feedback_gestor: true,
          data_correcao_gestor: true,
          data_envio_gestor: true,
          orientador: {
            select: { nome_completo: true }
          }
        }
      }
    }
  })

  const report = estudantes.map(est => {
    const orientacao = est.solicitacoes[0] || null
    const premonografia = est.premonografias[0] || null
    const monografia = est.monografias[0] || null

    // Determinar em que etapa do pipeline o estudante está
    let etapa = "NENHUMA"
    let etapaOrdem = 0

    if (monografia?.estado === "Defendida") {
      etapa = "DEFENDIDA"
      etapaOrdem = 6
    } else if (monografia?.estado === "ParaDefender") {
      etapa = "PARA_DEFENDER"
      etapaOrdem = 5
    } else if (monografia?.estado === "Aprovada") {
      etapa = "APROVADA"
      etapaOrdem = 4
    } else if (monografia?.estado === "EmRevisao" || monografia?.estado === "Submetida") {
      etapa = "MONOGRAFIA_SUBMETIDA"
      etapaOrdem = 4
    } else if (premonografia?.estado === "Aprovado") {
      etapa = "PRE_APROVADO"
      etapaOrdem = 3
    } else if (premonografia?.estado === "Proposto") {
      etapa = "PRE_SUBMETIDO"
      etapaOrdem = 2
    } else if (orientacao?.estado === "Aceite") {
      etapa = "ORIENTACAO_ACEITE"
      etapaOrdem = 1
    } else if (orientacao?.estado === "Pendente") {
      etapa = "ORIENTACAO_PENDENTE"
      etapaOrdem = 0.5
    }

    // Calcular dias no estado actual
    let dataReferencia = now
    if (monografia?.data_submissao) dataReferencia = new Date(monografia.data_submissao)
    else if (premonografia?.data_proposta) dataReferencia = new Date(premonografia.data_proposta)
    else if (orientacao?.data_solicitacao) dataReferencia = new Date(orientacao.data_solicitacao)

    const diasNoEstado = Math.floor((now.getTime() - dataReferencia.getTime()) / (1000 * 60 * 60 * 24))

    // Verificar se está bloqueado
    const isFinalista = est.ano_current === est.curso.duracao_anos

    return {
      estudante: est.nome_completo,
      numero_estudante: est.numero_estudante,
      curso: est.curso.nome_curso,
      ano: est.ano_current,
      duracao_curso: est.curso.duracao_anos,
      is_finalista: isFinalista,
      orientador: orientacao?.orientador?.nome_completo || null,
      solicitacao: orientacao ? {
        estado: orientacao.estado,
        data: orientacao.data_solicitacao,
      } : null,
      premonografia: premonografia ? {
        estado: premonografia.estado,
        tema: premonografia.tema,
        data: premonografia.data_proposta,
        feedback: premonografia.feedback,
      } : null,
      monografia: monografia ? {
        estado: monografia.estado,
        titulo: monografia.titulo,
        data_submissao: monografia.data_submissao,
        data_defesa: monografia.data_defesa,
        nota_final: monografia.nota_final != null ? Number(monografia.nota_final) : null,
        feedback_orientador: monografia.feedback,
        feedback_gestor: monografia.feedback_gestor,
      } : null,
      etapa_atual: etapa,
      ordem_etapa: etapaOrdem,
      dias_em_estado_atual: diasNoEstado,
      data_verificacao: nowISO,
    }
  })

  // Ordenar por ordem da etapa (mais avançados primeiro) e depois por nome
  report.sort((a, b) => {
    if (b.ordem_etapa !== a.ordem_etapa) return b.ordem_etapa - a.ordem_etapa
    return a.estudante.localeCompare(b.estudante)
  })

  // Estatísticas agregadas
  const stats = {
    total_estudantes: report.length,
    por_etapa: {
      nenhuma: report.filter(r => r.etapa_atual === "NENHUMA").length,
      orientacao_pendente: report.filter(r => r.etapa_atual === "ORIENTACAO_PENDENTE").length,
      orientacao_aceite: report.filter(r => r.etapa_atual === "ORIENTACAO_ACEITE").length,
      pre_submetido: report.filter(r => r.etapa_atual === "PRE_SUBMETIDO").length,
      pre_aprovado: report.filter(r => r.etapa_atual === "PRE_APROVADO").length,
      monografia_submetida: report.filter(r => r.etapa_atual === "MONOGRAFIA_SUBMETIDA").length,
      aprovada: report.filter(r => r.etapa_atual === "APROVADA").length,
      para_defender: report.filter(r => r.etapa_atual === "PARA_DEFENDER").length,
      defendida: report.filter(r => r.etapa_atual === "DEFENDIDA").length,
    },
    total_monografias_defendidas: report.filter(r => r.etapa_atual === "DEFENDIDA").length,
    total_com_nota: report.filter(r => r.monografia?.nota_final != null).length,
    media_notas: (() => {
      const comNota = report.filter(r => r.monografia?.nota_final != null)
      if (comNota.length === 0) return null
      const soma = comNota.reduce((acc, r) => acc + (r.monografia?.nota_final ?? 0), 0)
      return Math.round((soma / comNota.length) * 100) / 100
    })(),
  }

  return NextResponse.json({
    stats,
    report,
  })
}