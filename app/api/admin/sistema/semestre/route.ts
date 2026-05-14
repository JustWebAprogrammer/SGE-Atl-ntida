import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { getAnoLectivo } from "@/lib/sistema"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { semestre } = body

    // Validate semestre value
    if (semestre !== "S1" && semestre !== "S2") {
      return NextResponse.json(
        { error: "O semestre deve ser S1 ou S2" },
        { status: 400 }
      )
    }

    // Get current config
    const config = await prisma.sistemaConfig.findUnique({
      where: { id_config: 1 },
    })

    if (!config) {
      return NextResponse.json(
        { error: "Configuração do sistema não encontrada" },
        { status: 400 }
      )
    }

    const semestreAnterior = config.semestre_atual

    // Block: S2 → S1 (não pode voltar)
    if (semestreAnterior === "S2" && semestre === "S1") {
      return NextResponse.json(
        { 
          error: "❌ Não podes voltar para Semestre 1 depois de teres avançado para o Semestre 2",
          semestre_atual: "S2"
        },
        { status: 400 }
      )
    }

    // If same semestre, nothing to do
    if (semestreAnterior === semestre) {
      return NextResponse.json({
        success: true,
        message: `Já estás no Semestre ${semestre}`,
        semestre_atual: semestre,
      })
    }

    // We're changing from S1 → S2
    const anoLectivoAtual = await getAnoLectivo()
    const adminId = parseInt(session.user.id)

    // ── 1. Guardar Snapshot dos Orientadores (ProfessorDisciplina) ─────
    const professorDisciplinas = await prisma.professorDisciplina.findMany({
      where: { ano_lectivo: anoLectivoAtual },
      include: {
        disciplina: { select: { id_disciplina: true, nome_disciplina: true, codigo_disciplina: true } },
        usuario: { select: { id_usuario: true, nome_usuario: true } },
      },
    })

    // ── 2. Guardar Snapshot dos Planos de Prova ───────────────────────
    const planosProva = await prisma.planoProva.findMany({
      where: {
        ano_lectivo: anoLectivoAtual,
        semestre: "S1",
      },
    })

    // ── 3. Guardar Snapshot dos Períodos de Prova ─────────────────────
    const periodosProva = await prisma.periodoProva.findMany({
      where: {
        ano_lectivo: anoLectivoAtual,
        semestre: "S1",
      },
    })

    // ── 4. Guardar Snapshot dos Horários ──────────────────────────────
    const horariosAula = await prisma.horarioAula.findMany({
      where: {
        ano_lectivo: anoLectivoAtual,
        semestre: "S1",
      },
    })

    // ── 5. Criar SnapshotSemestre global (tipo "completo") ────────────
    // Usamos id_estudante=1 como placeholder, o snapshot é global do sistema
    const primeiroEstudante = await prisma.estudante.findFirst({
      select: { id_estudante: true },
    })

    if (primeiroEstudante) {
      await prisma.snapshotSemestre.create({
        data: {
          id_estudante: primeiroEstudante.id_estudante,
          ano_lectivo: anoLectivoAtual,
          semestre: "S1",
          tipo: "completo",
          orientador_snapshot: professorDisciplinas,
          provas_snapshot: {
            planos_prova: planosProva,
            periodos_prova: periodosProva,
          },
          horarios_snapshot: horariosAula,
          criado_por: adminId,
        },
      })
    }

    // ── 6. Apagar dados do S1 (para limp e re-atribuição) ────────────
    // ProfessorDisciplina — para orientadores poderem ser re-atribuídos
    await prisma.professorDisciplina.deleteMany({
      where: { ano_lectivo: anoLectivoAtual },
    })

    // Planos de Prova do S1
    await prisma.planoProva.deleteMany({
      where: {
        ano_lectivo: anoLectivoAtual,
        semestre: "S1",
      },
    })

    // Períodos de Prova do S1
    await prisma.periodoProva.deleteMany({
      where: {
        ano_lectivo: anoLectivoAtual,
        semestre: "S1",
      },
    })

    // Horários do S1
    await prisma.horarioAula.deleteMany({
      where: {
        ano_lectivo: anoLectivoAtual,
        semestre: "S1",
      },
    })

    // ── 7. Actualizar semestre_atual para S2 ──────────────────────────
    const configAtualizada = await prisma.sistemaConfig.update({
      where: { id_config: 1 },
      data: {
        semestre_atual: "S2",
        atualizado_por: adminId,
      },
    })

    // ── 8. Log no audit ───────────────────────────────────────────────
    await logAudit({
      id_usuario: adminId,
      acao: `Mudar Semestre: ${semestreAnterior} → ${semestre}`,
      tabela: "SistemaConfig",
      id_registro: configAtualizada.id_config,
      valor_antes: JSON.stringify({ semestre_atual: semestreAnterior }) as any,
      valor_depois: JSON.stringify({ semestre_atual: "S2" }) as any,
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
    })

    return NextResponse.json({
      success: true,
      message: "✅ Semestre alterado para S2 com sucesso",
      semestre_anterior: semestreAnterior,
      semestre_atual: "S2",
      stats: {
        professor_disciplinas_snapshot: professorDisciplinas.length,
        planos_prova_snapshot: planosProva.length,
        periodos_prova_snapshot: periodosProva.length,
        horarios_snapshot: horariosAula.length,
      },
    })
  } catch (error) {
    console.error("Error updating semester:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const config = await prisma.sistemaConfig.findUnique({
      where: { id_config: 1 },
      select: { semestre_atual: true },
    })

    return NextResponse.json({
      semestre_atual: config?.semestre_atual || "S1",
    })
  } catch (error) {
    console.error("Error fetching semester:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}