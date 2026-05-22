import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

// Ordem sequencial dos tipos de prova (waterfall)
const ORDEM_TIPOS = ["PP1", "PP2", "Exame", "Recurso", "Exame_Especial"]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const { cursoId, ano, semestre, ano_lectivo, tipo_prova_atual } = body

  if (!cursoId || !ano || !semestre || !ano_lectivo || !tipo_prova_atual) {
    return NextResponse.json({ error: "Campos obrigatórios em falta" }, { status: 400 })
  }

  // Encontrar o próximo tipo na ordem
  const idx = ORDEM_TIPOS.indexOf(tipo_prova_atual)
  if (idx === -1) {
    return NextResponse.json({ error: `Tipo de prova "${tipo_prova_atual}" inválido` }, { status: 400 })
  }
  if (idx >= ORDEM_TIPOS.length - 1) {
    return NextResponse.json({ error: `"${tipo_prova_atual}" é o último tipo. Não há próximo para avançar.` }, { status: 400 })
  }

  const proximoTipo = ORDEM_TIPOS[idx + 1]

  // Buscar provas do tipo actual para contar e auditar
  const provasParaApagar = await prisma.planoProva.findMany({
    where: {
      id_curso: parseInt(cursoId),
      ano_curricular: parseInt(ano),
      semestre,
      ano_lectivo,
      tipo_prova: tipo_prova_atual,
    },
    include: {
      disciplina: { select: { nome_disciplina: true, codigo_disciplina: true } },
      curso: { select: { nome_curso: true } }
    }
  })

  if (provasParaApagar.length === 0) {
    return NextResponse.json({
      success: true,
      total_apagadas: 0,
      tipo_apagado: tipo_prova_atual,
      proximo_tipo: proximoTipo,
      message: `Nenhuma prova do tipo ${tipo_prova_atual} encontrada. Podes avançar para ${proximoTipo}.`
    })
  }

  try {
    // Apagar todas as provas do tipo actual
    await prisma.planoProva.deleteMany({
      where: {
        id_curso: parseInt(cursoId),
        ano_curricular: parseInt(ano),
        semestre,
        ano_lectivo,
        tipo_prova: tipo_prova_atual,
      }
    })

    // Audit log
    const ip_address = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const cursoNome = provasParaApagar[0]?.curso?.nome_curso || `ID:${cursoId}`
    
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "AVANCAR TIPO PROVA",
      tabela: "PlanoProva",
      id_registro: 0,
      valor_antes: {
        acao: `Apagar ${provasParaApagar.length} provas do tipo ${tipo_prova_atual}`,
        curso: cursoNome,
        ano_curricular: parseInt(ano),
        semestre,
        ano_lectivo,
        provas: provasParaApagar.map(p => ({
          disciplina: p.disciplina.nome_disciplina,
          codigo: p.disciplina.codigo_disciplina,
          data: `${p.data_prova.getFullYear()}-${String(p.data_prova.getMonth() + 1).padStart(2, "0")}-${String(p.data_prova.getDate()).padStart(2, "0")}`,
          turno: p.turno,
          hora: `${p.hora_inicio}-${p.hora_fim}`,
        }))
      },
      valor_depois: {
        acao: `Avançar para ${proximoTipo}`,
        curso: cursoNome,
        ano_curricular: parseInt(ano),
        semestre,
        ano_lectivo,
      },
      ip_address
    })

    return NextResponse.json({
      success: true,
      total_apagadas: provasParaApagar.length,
      tipo_apagado: tipo_prova_atual,
      proximo_tipo: proximoTipo,
      message: `${provasParaApagar.length} prova(s) do tipo ${tipo_prova_atual} apagada(s). Agora podes criar provas do tipo ${proximoTipo}.`
    })
  } catch {
    return NextResponse.json({ error: "Erro ao avançar tipo de prova" }, { status: 500 })
  }
}