import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { calcularNotaFinal, validarNota, validarNotaSeca } from "@/lib/notas"
import { logAudit } from "@/lib/audit"
import { getAnoLectivo } from "@/lib/sistema"
import { criarNotificacao } from "@/lib/notificacoes"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  // Orientador pode lançar notas das suas disciplinas
  // Gestor (orientador com e_gestor=true) pode lançar notas de qualquer disciplina do departamento
  // Admin também pode lançar notas
  const isOrientador = session.user.role === "orientador"
  const isGestor = isOrientador && session.user.e_gestor === true
  const isAdmin = session.user.role === "admin"
  
  if (!isOrientador && !isAdmin) {
    return NextResponse.json({ error: "Forbidden: Apenas orientadores e gestores podem lançar notas" }, { status: 403 })
  }

  const body = await request.json()
  const {
    id_estudante,
    id_disciplina,
    ac1, ac2, ac3, ttp, pp1, pp2,
    exame, recurso, exame_especial
  } = body

  // Validações básicas
  if (!id_estudante || !id_disciplina) {
    return NextResponse.json({ error: "id_estudante e id_disciplina são obrigatórios" }, { status: 400 })
  }

  // Validar notas (0-20)
  const notasParaValidar = [ac1, ac2, ac3, ttp, pp1, pp2, exame]
  for (const nota of notasParaValidar) {
    if (!validarNota(nota)) {
      return NextResponse.json({ error: "Notas devem estar entre 0 e 20" }, { status: 400 })
    }
  }

  // Validar notas secas (recurso/especial - máx 12)
  if (!validarNotaSeca(recurso)) {
    return NextResponse.json({ error: "Nota de recurso deve estar entre 0 e 12" }, { status: 400 })
  }
  if (!validarNotaSeca(exame_especial)) {
    return NextResponse.json({ error: "Nota de exame especial deve estar entre 0 e 12" }, { status: 400 })
  }

  const anoLectivoAtual = await getAnoLectivo()

  // Verificar permissões de disciplina
  // Gestor (com e_gestor=true) pode editar qualquer disciplina do departamento
  // Orientador normal só pode editar disciplinas atribuídas a si
  if (isOrientador && !isGestor) {
    const professorDisciplina = await prisma.professorDisciplina.findFirst({
      where: {
        id_usuario: parseInt(session.user.id),
        id_disciplina: id_disciplina,
        ano_lectivo: anoLectivoAtual
      }
    })

    if (!professorDisciplina) {
      return NextResponse.json({ error: "Disciplina não atribuída a este orientador" }, { status: 403 })
    }
  }
  // Gestor e Admin podem editar qualquer disciplina sem verificação adicional

  // Validar que o estudante está no ano correcto para esta disciplina
  const estudante = await prisma.estudante.findUnique({
    where: { id_estudante },
    select: { id_estudante: true, ano_current: true, id_curso: true, id_usuario: true }
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  // Verificar se o ano actual do estudante corresponde ao ano curricular da disciplina
  const curriculoDisciplina = await prisma.cursoDisciplina.findFirst({
    where: {
      id_disciplina,
      id_curso: estudante.id_curso
    },
    select: { ano_curricular: true }
  })

  if (curriculoDisciplina && estudante.ano_current) {
    if (curriculoDisciplina.ano_curricular > estudante.ano_current) {
      return NextResponse.json({
        error: `Esta disciplina é do ${curriculoDisciplina.ano_curricular}º Ano, mas o estudante está no ${estudante.ano_current}º Ano. Não é possível lançar notas para disciplinas de anos futuros.`
      }, { status: 400 })
    }
  }

  // Buscar disciplina para verificar dispensa
  const disciplina = await prisma.disciplina.findUnique({
    where: { id_disciplina: id_disciplina },
    select: { tem_dispensa: true, nota_dispensa: true }
  })

  if (!disciplina) {
    return NextResponse.json({ error: "Disciplina não encontrada" }, { status: 404 })
  }

  // Validar: recurso só lançável se exame já existir
  if (recurso != null && exame == null) {
    return NextResponse.json({ error: "Recurso só pode ser lançado se exame existir" }, { status: 400 })
  }

  // Buscar nota existente
  const notaExistente = await prisma.nota.findFirst({
    where: {
      id_estudante: id_estudante,
      id_disciplina: id_disciplina,
      ano_lectivo: anoLectivoAtual
    }
  })

  // Calcular nota final
  const resultado = calcularNotaFinal(
    { ac1, ac2, ac3, ttp, pp1, pp2, exame, recurso, exame_especial },
    disciplina
  )

  // Preparar dados para salvar
  const data = {
    ac1: ac1 ?? null,
    ac2: ac2 ?? null,
    ac3: ac3 ?? null,
    ttp: ttp ?? null,
    pp1: pp1 ?? null,
    pp2: pp2 ?? null,
    exame: exame ?? null,
    recurso: recurso ?? null,
    exame_especial: exame_especial ?? null,
    nota_final: resultado.nota_final,
    dispensada: resultado.dispensada,
    tipo_avaliacao: resultado.tipo,
    semestre: notaExistente?.semestre ?? "S1"
  }

  // Obter IP do request
  const ip_address = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown"

  let notaSalva

  if (notaExistente) {
    // Atualizar nota existente
    const valorAntes = {
      ac1: notaExistente.ac1, ac2: notaExistente.ac2, ac3: notaExistente.ac3,
      ttp: notaExistente.ttp, pp1: notaExistente.pp1, pp2: notaExistente.pp2,
      exame: notaExistente.exame, recurso: notaExistente.recurso,
      exame_especial: notaExistente.exame_especial, nota_final: notaExistente.nota_final
    }

    notaSalva = await prisma.nota.update({
      where: { id_nota: notaExistente.id_nota },
      data
    })

    // Audit log
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "UPDATE",
      tabela: "Nota",
      id_registro: notaSalva.id_nota,
      valor_antes: valorAntes,
      valor_depois: data,
      ip_address
    })
  } else {
    // Criar nova nota
    notaSalva = await prisma.nota.create({
      data: {
        id_estudante,
        id_disciplina,
        ano_lectivo: anoLectivoAtual,
        ...data
      }
    })

    // Audit log
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "CREATE",
      tabela: "Nota",
      id_registro: notaSalva.id_nota,
      valor_antes: null,
      valor_depois: data,
      ip_address
    })
  }

  // Notificar estudante — apenas os campos que foram enviados
  const nomeDisciplina = await prisma.disciplina.findUnique({
    where: { id_disciplina },
    select: { nome_disciplina: true }
  })

  const camposNota: { key: string; label: string; valor: any }[] = [
    { key: 'ac1', label: 'AC1', valor: ac1 },
    { key: 'ac2', label: 'AC2', valor: ac2 },
    { key: 'ac3', label: 'AC3', valor: ac3 },
    { key: 'ttp', label: 'TTP', valor: ttp },
    { key: 'pp1', label: 'PP1', valor: pp1 },
    { key: 'pp2', label: 'PP2', valor: pp2 },
    { key: 'exame', label: 'Exame', valor: exame },
    { key: 'recurso', label: 'Recurso', valor: recurso },
    { key: 'exame_especial', label: 'Exame Especial', valor: exame_especial },
  ]

  const preenchidos = camposNota.filter(c => c.valor != null)
  const partesMsg = preenchidos.map(c => `${c.label}: ${c.valor}`)

  await criarNotificacao({
    id_usuario: estudante.id_usuario,
    tipo: "nota",
    titulo: `${nomeDisciplina?.nome_disciplina || "Disciplina"} — ${partesMsg.join(" | ")}`,
    mensagem: partesMsg.join(" | "),
    link_url: "/estudante/notas"
  })

  return NextResponse.json({
    success: true,
    nota: {
      id_nota: notaSalva.id_nota,
      nota_final: notaSalva.nota_final != null ? Number(notaSalva.nota_final) : null,
      dispensada: notaSalva.dispensada,
      tipo_avaliacao: notaSalva.tipo_avaliacao
    }
  })
}