import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { calcularNotaFinal } from "@/lib/notas"
import { logAudit } from "@/lib/audit"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; id_nota: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "admin" || (session.user.role === "orientador" && session.user.e_gestor)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id, id_nota } = await params
  const id_estudante = parseInt(id)
  const idNota = parseInt(id_nota)

  if (isNaN(id_estudante) || isNaN(idNota)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { ac1, ac2, ac3, ttp, pp1, pp2, exame, recurso, exame_especial } = body

    // Validar que a nota pertence ao estudante
    const notaExistente = await prisma.nota.findFirst({
      where: {
        id_nota: idNota,
        id_estudante,
      },
      include: {
        disciplina: {
          select: {
            tem_dispensa: true,
            nota_dispensa: true,
          },
        },
      },
    })

    if (!notaExistente) {
      return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 })
    }

    // Preparar dados para atualização
    const dadosAtualizar: Record<string, any> = {}

    // Atualizar campos que foram enviados (incluindo null para limpar)
    // O frontend envia null quando o utilizador apaga o valor do campo
    if (ac1 !== undefined) dadosAtualizar.ac1 = ac1
    if (ac2 !== undefined) dadosAtualizar.ac2 = ac2
    if (ac3 !== undefined) dadosAtualizar.ac3 = ac3
    if (ttp !== undefined) dadosAtualizar.ttp = ttp
    if (pp1 !== undefined) dadosAtualizar.pp1 = pp1
    if (pp2 !== undefined) dadosAtualizar.pp2 = pp2
    if (exame !== undefined) dadosAtualizar.exame = exame
    if (recurso !== undefined) dadosAtualizar.recurso = recurso
    if (exame_especial !== undefined) dadosAtualizar.exame_especial = exame_especial

    // Calcular nota final com a lógica do sistema
    const resultado = calcularNotaFinal(
      {
        ac1: dadosAtualizar.ac1 ?? notaExistente.ac1,
        ac2: dadosAtualizar.ac2 ?? notaExistente.ac2,
        ac3: dadosAtualizar.ac3 ?? notaExistente.ac3,
        ttp: dadosAtualizar.ttp ?? notaExistente.ttp,
        pp1: dadosAtualizar.pp1 ?? notaExistente.pp1,
        pp2: dadosAtualizar.pp2 ?? notaExistente.pp2,
        exame: dadosAtualizar.exame ?? notaExistente.exame,
        recurso: dadosAtualizar.recurso ?? notaExistente.recurso,
        exame_especial: dadosAtualizar.exame_especial ?? notaExistente.exame_especial,
      },
      {
        tem_dispensa: notaExistente.disciplina.tem_dispensa,
        nota_dispensa: notaExistente.disciplina.nota_dispensa,
      }
    )

    dadosAtualizar.nota_final = resultado.nota_final
    dadosAtualizar.dispensada = resultado.dispensada
    dadosAtualizar.tipo_avaliacao = resultado.tipo

    // Atualizar nota
    const notaActualizada = await prisma.nota.update({
      where: { id_nota: idNota },
      data: dadosAtualizar,
      include: {
        disciplina: {
          select: {
            id_disciplina: true,
            nome_disciplina: true,
            codigo_disciplina: true,
            semestre: true,
          },
        },
      },
    })

    // Audit log
    const ip_address = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "ALTERAR NOTA",
      tabela: "Nota",
      id_registro: notaActualizada.id_nota,
      valor_antes: {
        ac1: notaExistente.ac1, ac2: notaExistente.ac2, ac3: notaExistente.ac3,
        ttp: notaExistente.ttp, pp1: notaExistente.pp1, pp2: notaExistente.pp2,
        exame: notaExistente.exame, recurso: notaExistente.recurso,
        exame_especial: notaExistente.exame_especial, nota_final: notaExistente.nota_final,
        id_estudante, id_disciplina: notaExistente.id_disciplina
      },
      valor_depois: {
        ...dadosAtualizar,
        id_estudante, id_disciplina: notaExistente.id_disciplina
      },
      ip_address
    })

    return NextResponse.json({
      id_nota: notaActualizada.id_nota,
      id_disciplina: notaActualizada.id_disciplina,
      disciplina: notaActualizada.disciplina.nome_disciplina,
      codigo: notaActualizada.disciplina.codigo_disciplina,
      semestre: notaActualizada.disciplina.semestre,
      ac1: notaActualizada.ac1 != null ? Number(notaActualizada.ac1) : null,
      ac2: notaActualizada.ac2 != null ? Number(notaActualizada.ac2) : null,
      ac3: notaActualizada.ac3 != null ? Number(notaActualizada.ac3) : null,
      ttp: notaActualizada.ttp != null ? Number(notaActualizada.ttp) : null,
      pp1: notaActualizada.pp1 != null ? Number(notaActualizada.pp1) : null,
      pp2: notaActualizada.pp2 != null ? Number(notaActualizada.pp2) : null,
      exame: notaActualizada.exame != null ? Number(notaActualizada.exame) : null,
      recurso: notaActualizada.recurso != null ? Number(notaActualizada.recurso) : null,
      exame_especial: notaActualizada.exame_especial != null ? Number(notaActualizada.exame_especial) : null,
      nota_final: notaActualizada.nota_final != null ? Number(notaActualizada.nota_final) : null,
      dispensada: notaActualizada.dispensada,
      tipo_avaliacao: notaActualizada.tipo_avaliacao,
      aprovado: notaActualizada.nota_final != null ? Number(notaActualizada.nota_final) >= 10 : null,
      is_provisional: resultado.is_provisional,
    })
  } catch (error) {
    console.error("Erro ao atualizar nota:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}