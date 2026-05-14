import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPrecoEstudante } from "@/lib/precos"
import { getSystemDate, getActivePropinaMonths } from "@/lib/sistema"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "estudante") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const { meses } = body

  // Validar: 1, 2 ou 3 meses
  if (!meses || typeof meses !== "number" || meses < 1 || meses > 3) {
    return NextResponse.json(
      { error: "Número de meses inválido. Deve ser 1, 2 ou 3." },
      { status: 400 }
    )
  }

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: {
      id_estudante: true,
      nome_completo: true,
    }
  })

  if (!estudante) {
    return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
  }

  // Obter preço actual do estudante (curso + ano)
  const preco = await getPrecoEstudante(estudante.id_estudante)

  // Encontrar a última propina existente (ordenada por ano desc, mes desc)
  const ultimaPropina = await prisma.pagamentoPropina.findFirst({
    where: { id_estudante: estudante.id_estudante },
    orderBy: [{ ano: "desc" }, { mes: "desc" }],
  })

  let proximoMes: number
  let proximoAno: number

  if (ultimaPropina) {
    // Começar no mês seguinte à última propina
    proximoMes = ultimaPropina.mes + 1
    proximoAno = ultimaPropina.ano
    if (proximoMes > 12) {
      proximoMes = 1
      proximoAno += 1
    }
  } else {
    // Se não há nenhuma propina, começar no mês actual do sistema
    const hoje = await getSystemDate()
    proximoMes = hoje.getMonth() + 1
    proximoAno = hoje.getFullYear()
  }

  // Gerar lista de meses para criar
  const mesesParaCriar: { mes: number; ano: number }[] = []
  let mesAtual = proximoMes
  let anoAtual = proximoAno

  for (let i = 0; i < meses; i++) {
    mesesParaCriar.push({ mes: mesAtual, ano: anoAtual })
    mesAtual++
    if (mesAtual > 12) {
      mesAtual = 1
      anoAtual += 1
    }
  }

  // Verificar duplicados: qualquer mês que já exista (qualquer estado)
  const existentes = await prisma.pagamentoPropina.findMany({
    where: {
      id_estudante: estudante.id_estudante,
      OR: mesesParaCriar.map(m => ({ mes: m.mes, ano: m.ano })),
    },
    select: { mes: true, ano: true }
  })

  if (existentes.length > 0) {
    const nomesExistentes = existentes.map(e => `${e.mes}/${e.ano}`)
    return NextResponse.json(
      { error: `Já existem registos para: ${nomesExistentes.join(", ")}` },
      { status: 409 }
    )
  }

  // Validar: todos os meses pedidos devem pertencer ao ano lectivo activo
  const mesesActivos = await getActivePropinaMonths()
  const mesesInvalidos = mesesParaCriar.filter(
    m => !mesesActivos.some(a => a.mes === m.mes && a.ano === m.ano)
  )
  
  if (mesesInvalidos.length > 0) {
    return NextResponse.json(
      { 
        error: `Alguns meses não pertencem ao ano lectivo activo: ${mesesInvalidos.map(m => `${m.mes}/${m.ano}`).join(", ")}. Meses válidos: ${mesesActivos.map(m => `${m.mes}/${m.ano}`).join(", ")}` 
      },
      { status: 400 }
    )
  }

  // Criar as propinas avançadas
  const criados: Array<{
    id: number
    mes: number
    ano: number
    valor_total: number
    referencia: string
    codigo_confirmacao: string
  }> = []

  const nomePrefix = estudante.nome_completo
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3)

  for (const { mes, ano } of mesesParaCriar) {
    const referencia = `PROP-${ano}-${String(mes).padStart(2, "0")}-${nomePrefix}-${String(Math.floor(100 + Math.random() * 900))}`
    const codigo_confirmacao = String(Math.floor(100 + Math.random() * 900))
    // DESCONTO APLICADO UMA VEZ NA ORIGEM: valor_base guarda o valor original (sem desconto),
    // valor_total guarda o valor já com desconto de bolsa aplicado via getPrecoEstudante().
    // NÃO reaplicar o desconto no GET ou na confirmação — o valor_total é definitivo.
    const valor_base = preco.valor_propina   // valor original (sem desconto)
    const valor_multa = 0
    const valor_total = preco.valor_com_desconto  // valor já com desconto de bolsa

    const pagamento = await prisma.pagamentoPropina.create({
      data: {
        id_estudante: estudante.id_estudante,
        referencia,
        codigo_confirmacao,
        mes,
        ano,
        valor_base,
        valor_multa,
        valor_total,
        data_vencimento: new Date(ano, mes - 1, 10),
        estado: "Pendente",
        emitido_por: "estudante",
      }
    })

    criados.push({
      id: pagamento.id_pagamento,
      mes,
      ano,
      valor_total,
      referencia,
      codigo_confirmacao,
    })
  }

  return NextResponse.json({
    success: true,
    total_meses: criados.length,
    valor_total_grupo: criados.reduce((s, c) => s + c.valor_total, 0),
    pagamentos: criados,
  })
}