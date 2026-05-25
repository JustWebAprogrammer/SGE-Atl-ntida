import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { processarRematricula, suspenderEstudantesSemRematricula } from "@/lib/reenrollment"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const config = await prisma.sistemaConfig.findUnique({ where: { id_config: 1 } })
    if (!config) {
      return NextResponse.json({ error: "Configuração do sistema não encontrada" }, { status: 400 })
    }

    // ── 1. Calcular novo ano lectivo ──
    // Pega na data simulada (ou actual) e avança 1 ano, no dia 1 de Setembro
    const dataAtual = config.data_simulada || new Date()
    const anoAtual = new Date(dataAtual).getFullYear()
    const novoAno = anoAtual + 1

    // Novo ano começa em Setembro do novo ano
    const novoInicio = new Date(novoAno, 8, 1) // 1 de Setembro
    const novoFim = new Date(novoAno + 1, 7, 31) // 31 de Agosto do ano seguinte
    const novaDataSimulada = new Date(novoAno, 8, 1) // 1 de Setembro

    // Período de matrícula: 1 de Setembro a 30 de Setembro
    const matriculaInicio = new Date(novoAno, 8, 1)
    const matriculaFim = new Date(novoAno, 8, 30)

    // ── 2. Actualizar config do sistema ──
    const novoAnoLabel = `${novoAno}/${novoAno + 1}`
    await prisma.sistemaConfig.update({
      where: { id_config: 1 },
      data: {
        data_simulada: novaDataSimulada,
        simulador_ativo: true,
        ano_lectivo_inicio: novoInicio,
        ano_lectivo_fim: novoFim,
        ano_lectivo_label: novoAnoLabel,
        matricula_data_inicio: matriculaInicio,
        matricula_data_fim: matriculaFim,
        semestre_atual: "S1", // Resetar para S1 no novo ano
      },
    })

    // ── 3. Buscar todos os estudantes EmCurso para processar rematrícula ──
    const estudantes = await prisma.estudante.findMany({
      where: { estado: "EmCurso" },
      select: { id_estudante: true, nome_completo: true, ano_current: true },
    })

    const resultados = {
      total: estudantes.length,
      avancaram: 0,
      repetiram: 0,
      finalistas_pendentes: 0,
      erros: 0,
      suspensos: 0,
      detalhes: [] as string[],
    }

    // ── 4. Processar rematrícula de cada estudante ──
    for (const estudante of estudantes) {
      try {
        const result = await processarRematricula(estudante.id_estudante, parseInt(session.user.id))
        if (result.success) {
          if (result.tipo === "avancou") {
            resultados.avancaram++
            resultados.detalhes.push(`✅ ${estudante.nome_completo}: ${result.message}`)
          } else if (result.tipo === "finalista_pendente") {
            resultados.finalistas_pendentes++
            resultados.detalhes.push(`⏳ ${estudante.nome_completo}: ${result.message}`)
          } else {
            resultados.repetiram++
            resultados.detalhes.push(`🔄 ${estudante.nome_completo}: ${result.message}`)
          }
        } else {
          resultados.erros++
          resultados.detalhes.push(`❌ ${estudante.nome_completo}: ${result.message}`)
        }
      } catch (err) {
        resultados.erros++
        resultados.detalhes.push(`❌ ${estudante.nome_completo}: Erro inesperado - ${err}`)
      }
    }

    // ── 5. Suspender estudantes que não foram processados (não rematricularam) ──
    try {
      resultados.suspensos = await suspenderEstudantesSemRematricula(parseInt(session.user.id))
    } catch {
      // Non-critical, just log
    }

    // ── 6. Audit log ──
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "AVANCAR ANO LECTIVO",
      tabela: "SistemaConfig",
      id_registro: config.id_config,
      valor_antes: {
        ano_lectivo: config.ano_lectivo_label || `${anoAtual}/${anoAtual}`,
      },
      valor_depois: {
        novo_ano_lectivo: novoAnoLabel,
        estudantes_processados: resultados.total,
        avancaram: resultados.avancaram,
        repetiram: resultados.repetiram,
        finalistas_pendentes: resultados.finalistas_pendentes,
        suspensos: resultados.suspensos,
        erros: resultados.erros,
      },
      ip_address: "sistema",
    })

    return NextResponse.json({
      success: true,
      message: `Ano lectivo avançado para ${novoAnoLabel}. ${resultados.avancaram} avançaram, ${resultados.repetiram} repetiram, ${resultados.finalistas_pendentes} finalistas pendentes, ${resultados.suspensos} suspensos.`,
      novo_ano_lectivo: novoAnoLabel,
      resultados,
    })
  } catch (error) {
    console.error("Error advancing academic year:", error)
    return NextResponse.json({ error: "Erro interno ao avançar ano lectivo" }, { status: 500 })
  }
}