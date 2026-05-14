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

  // Buscar o gestor para saber o departamento
  const gestor = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true, id_departamento: true }
  })

  if (!gestor) return NextResponse.json({ error: "Gestor não encontrado" }, { status: 404 })

  // Filtro por departamento (se o gestor tem departamento)
  const whereDepartamento = gestor.id_departamento
    ? { curso: { id_departamento: gestor.id_departamento } }
    : {}

  const now = new Date()
  const problemas: Record<string, unknown>[] = []

  // ====== 1. ESTUDANTES COM ORIENTAÇÃO ACEITE MAS SEM PRÉ-PROJECTO ======
  const comOrientacaoSemPre = await prisma.estudante.findMany({
    where: {
      ...whereDepartamento,
      solicitacoes: {
        some: { estado: "Aceite" }
      },
      premonografias: {
        none: {}
      }
    },
    select: {
      id_estudante: true,
      nome_completo: true,
      numero_estudante: true,
      ano_current: true,
      curso: { select: { nome_curso: true } },
      solicitacoes: {
        where: { estado: "Aceite" },
        select: {
          data_solicitacao: true,
          orientador: { select: { nome_completo: true } }
        }
      }
    }
  })

  for (const est of comOrientacaoSemPre) {
    const orientacao = est.solicitacoes[0]
    const diasDesdeOrientacao = Math.floor(
      (now.getTime() - new Date(orientacao.data_solicitacao).getTime()) / (1000 * 60 * 60 * 24)
    )
    problemas.push({
      tipo: "ORIENTACAO_SEM_PRE_PROJECTO",
      gravidade: diasDesdeOrientacao > 30 ? "ALTA" : "MEDIA",
      estudante: est.nome_completo,
      numero_estudante: est.numero_estudante,
      curso: est.curso.nome_curso,
      ano: est.ano_current,
      orientador: orientacao.orientador.nome_completo,
      dias_desde_orientacao: diasDesdeOrientacao,
      descricao: `Estudante tem orientação aceite há ${diasDesdeOrientacao} dias mas ainda não submeteu pré-projecto.`,
    })
  }

  // ====== 2. PRÉ-PROJECTOS APROVADOS HÁ >30 DIAS SEM MONOGRAFIA ======
  const preAprovadosSemMonografia = await prisma.premonografia.findMany({
    where: {
      estado: "Aprovado",
      ...whereDepartamento,
      estudante: {
        monografias: {
          none: {}
        }
      }
    },
    select: {
      id_premonografia: true,
      tema: true,
      data_proposta: true,
      estudante: {
        select: {
          id_estudante: true,
          nome_completo: true,
          numero_estudante: true,
          curso: { select: { nome_curso: true } }
        }
      }
    }
  })

  for (const pre of preAprovadosSemMonografia) {
    const diasDesdeAprovacao = Math.floor(
      (now.getTime() - new Date(pre.data_proposta).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diasDesdeAprovacao > 30) {
      problemas.push({
        tipo: "PRE_APROVADO_SEM_MONOGRAFIA",
        gravidade: "ALTA",
        estudante: pre.estudante.nome_completo,
        numero_estudante: pre.estudante.numero_estudante,
        curso: pre.estudante.curso.nome_curso,
        tema: pre.tema,
        dias_desde_aprovacao: diasDesdeAprovacao,
        descricao: `Pré-projecto aprovado há ${diasDesdeAprovacao} dias mas monografia ainda não foi submetida.`,
      })
    }
  }

  // ====== 3. MONOGRAFIAS EM "SUBMETIDA" HÁ >15 DIAS ======
  const monografiasSubmetidas = await prisma.monografia.findMany({
    where: {
      estado: "Submetida",
      estudante: whereDepartamento
    },
    select: {
      id_monografia: true,
      titulo: true,
      data_submissao: true,
      estudante: {
        select: {
          nome_completo: true,
          numero_estudante: true,
          curso: { select: { nome_curso: true } }
        }
      },
      orientador: {
        select: { nome_completo: true }
      }
    }
  })

  for (const m of monografiasSubmetidas) {
    const diasDesdeSubmissao = Math.floor(
      (now.getTime() - new Date(m.data_submissao).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diasDesdeSubmissao > 15) {
      problemas.push({
        tipo: "MONOGRAFIA_SUBMETIDA_SEM_REVISAO",
        gravidade: "MEDIA",
        estudante: m.estudante.nome_completo,
        numero_estudante: m.estudante.numero_estudante,
        curso: m.estudante.curso.nome_curso,
        titulo: m.titulo,
        orientador: m.orientador?.nome_completo || "N/A",
        dias_desde_submissao: diasDesdeSubmissao,
        descricao: `Monografia submetida há ${diasDesdeSubmissao} dias e ainda não foi revista pelo orientador.`,
      })
    }
  }

  // ====== 4. MONOGRAFIAS EM "APROVADA" HÁ >15 DIAS SEM DEFESA ======
  const monografiasAprovadas = await prisma.monografia.findMany({
    where: {
      estado: "Aprovada",
      estudante: whereDepartamento
    },
    select: {
      id_monografia: true,
      titulo: true,
      data_submissao: true,
      estudante: {
        select: {
          nome_completo: true,
          numero_estudante: true,
          curso: { select: { nome_curso: true } }
        }
      }
    }
  })

  for (const m of monografiasAprovadas) {
    const diasDesdeAprovacao = Math.floor(
      (now.getTime() - new Date(m.data_submissao).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diasDesdeAprovacao > 15) {
      problemas.push({
        tipo: "MONOGRAFIA_APROVADA_SEM_DEFESA",
        gravidade: "MEDIA",
        estudante: m.estudante.nome_completo,
        numero_estudante: m.estudante.numero_estudante,
        curso: m.estudante.curso.nome_curso,
        titulo: m.titulo,
        dias_desde_aprovacao: diasDesdeAprovacao,
        descricao: `Monografia aprovada há ${diasDesdeAprovacao} dias mas defesa ainda não foi agendada.`,
      })
    }
  }

  // ====== 5. DEFESAS AGENDADAS HÁ >30 DIAS SEM NOTA ======
  const monografiasParaDefender = await prisma.monografia.findMany({
    where: {
      estado: "ParaDefender",
      estudante: whereDepartamento
    },
    select: {
      id_monografia: true,
      titulo: true,
      data_defesa: true,
      estudante: {
        select: {
          nome_completo: true,
          numero_estudante: true,
          curso: { select: { nome_curso: true } }
        }
      }
    }
  })

  for (const m of monografiasParaDefender) {
    if (m.data_defesa) {
      const diasParaDefesa = Math.floor(
        (now.getTime() - new Date(m.data_defesa).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diasParaDefesa > 30) {
        problemas.push({
          tipo: "DEFESA_AGENDADA_SEM_NOTA",
          gravidade: "ALTA",
          estudante: m.estudante.nome_completo,
          numero_estudante: m.estudante.numero_estudante,
          curso: m.estudante.curso.nome_curso,
          titulo: m.titulo,
          data_defesa: m.data_defesa,
          dias_desde_defesa: diasParaDefesa,
          descricao: `Defesa foi agendada há ${diasParaDefesa} dias mas nota final ainda não foi atribuída.`,
        })
      }
    }
  }

  // ====== 6. MONOGRAFIAS "DEFENDIDAS" SEM NOTA FINAL ======
  const defendidasSemNota = await prisma.monografia.findMany({
    where: {
      estado: "Defendida",
      nota_final: null,
      estudante: whereDepartamento
    },
    select: {
      id_monografia: true,
      titulo: true,
      data_defesa: true,
      estudante: {
        select: {
          nome_completo: true,
          numero_estudante: true,
          curso: { select: { nome_curso: true } }
        }
      }
    }
  })

  for (const m of defendidasSemNota) {
    problemas.push({
      tipo: "DEFENDIDA_SEM_NOTA",
      gravidade: "ALTA",
      estudante: m.estudante.nome_completo,
      numero_estudante: m.estudante.numero_estudante,
      curso: m.estudante.curso.nome_curso,
      titulo: m.titulo,
      data_defesa: m.data_defesa,
      descricao: `Monografia foi defendida mas nota final não foi atribuída.`,
    })
  }

  // ====== 7. ESTATÍSTICAS GLOBAIS ======
  const totalEstudantesDepartamento = await prisma.estudante.count({
    where: whereDepartamento
  })

  return NextResponse.json({
    total_problemas: problemas.length,
    problemas,
    estatisticas: {
      total_estudantes_departamento: totalEstudantesDepartamento,
      com_orientacao_sem_pre: comOrientacaoSemPre.length,
      pre_aprovado_sem_monografia: preAprovadosSemMonografia.filter(p => {
        const dias = Math.floor((now.getTime() - new Date(p.data_proposta).getTime()) / (1000 * 60 * 60 * 24))
        return dias > 30
      }).length,
      monografias_submetidas_sem_revisao: monografiasSubmetidas.filter(m => {
        const dias = Math.floor((now.getTime() - new Date(m.data_submissao).getTime()) / (1000 * 60 * 60 * 24))
        return dias > 15
      }).length,
      monografias_aprovadas_sem_defesa: monografiasAprovadas.filter(m => {
        const dias = Math.floor((now.getTime() - new Date(m.data_submissao).getTime()) / (1000 * 60 * 60 * 24))
        return dias > 15
      }).length,
      defesas_sem_nota: monografiasParaDefender.length + defendidasSemNota.length,
    }
  })
}