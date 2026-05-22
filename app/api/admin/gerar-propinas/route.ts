import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getPrecoEstudante } from "@/lib/precos"
import { logAudit } from "@/lib/audit"
import { getSystemDate, getActivePropinaMonths } from "@/lib/sistema"
import { criarNotificacao } from "@/lib/notificacoes"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { mes, ano } = await request.json()

    // Validar: o mês/ano deve pertencer ao ano lectivo activo
    const mesesActivos = await getActivePropinaMonths()
    const mesExiste = mesesActivos.some(m => m.mes === mes && m.ano === ano)
    
    if (!mesExiste) {
      return NextResponse.json(
        { error: `Este mês não pertence ao ano lectivo activo. Meses válidos: ${mesesActivos.map(m => `${m.mes}/${m.ano}`).join(", ")}` },
        { status: 400 }
      )
    }

    // Obter todos os estudantes activos com dados de entrada (excluindo finalistas)
    const estudantes = await prisma.estudante.findMany({
      where: { estado: "EmCurso" },
      select: {
        id_estudante: true,
        ano_current: true,
        data_cadastro: true,
        id_usuario: true,
        curso: {
          select: { duracao_anos: true },
        },
      }
    })

    let gerados = 0
    let jaExistiam = 0
    let ignoradosTransfer = 0

    for (const estudante of estudantes) {
      // Transfer student safeguard:
      // Derivar o ano de ingresso a partir de data_cadastro.
      // Se o estudante entrou a meio do curso (ex: 3º ano), não gerar propinas
      // para anos lectivos anteriores ao seu ingresso.
      if (estudante.data_cadastro) {
        const anoIngresso = estudante.data_cadastro.getFullYear()
        if (ano < anoIngresso) {
          ignoradosTransfer++
          continue
        }
      }

      // Finalist safeguard: não gerar propinas para estudantes no último ano
      const duracaoAnos = estudante.curso?.duracao_anos ?? 4
      if ((estudante.ano_current ?? 1) >= duracaoAnos) {
        ignoradosTransfer++
        continue
      }

      // Verificar se já existe pagamento para este mês e ano
      const existe = await prisma.pagamentoPropina.findFirst({
        where: {
          id_estudante: estudante.id_estudante,
          mes,
          ano
        }
      })

      if (existe) {
        jaExistiam++
        continue
      }

      // Obter preço correcto para este estudante (já com desconto da bolsa)
      const { valor_propina, valor_com_desconto, valor_multa, tipo_bolsa } = await getPrecoEstudante(estudante.id_estudante)

      const codigo = String(Math.floor(100 + Math.random() * 900))
      const referencia = `PROP-${ano}-${String(mes).padStart(2, "0")}-${estudante.id_estudante}-${codigo}`

      // Obter a data actual do sistema (pode ser simulada)
      const dataAtual = await getSystemDate()
      const dataVencimento = new Date(ano, mes - 1, 10)
      
      // Se o mês/ano já passou em relação à data actual, ajustar para o próximo ano
      if (dataVencimento < dataAtual) {
        dataVencimento.setFullYear(dataAtual.getFullYear() + 1)
      }

      await prisma.pagamentoPropina.create({
        data: {
          id_estudante: estudante.id_estudante,
          referencia,
          codigo_confirmacao: codigo,
          mes,
          ano,
          valor_base: valor_propina,
          valor_multa: 0,
          valor_total: valor_com_desconto,
          data_vencimento: dataVencimento,
          estado: "Pendente",
          emitido_por: "sistema",
        }
      })

      // Notificar estudante
      const nomeMes = new Date(ano, mes - 1).toLocaleDateString('pt-PT', { month: 'long' })
      await criarNotificacao({
        id_usuario: estudante.id_usuario,
        tipo: "propina",
        titulo: `Propina de ${nomeMes} gerada`,
        mensagem: `A propina referente a ${nomeMes}/${ano} no valor de ${valor_com_desconto} Kz foi gerada. Vencimento: ${dataVencimento.toLocaleDateString('pt-PT')}`,
        link_url: "/estudante/pagamentos"
      })

      gerados++
    }

  await logAudit({
    id_usuario: parseInt(session.user.id),
    acao: "GERAR_PROPINAS_MES",
    tabela: "PagamentoPropina",
    id_registro: 0,
    valor_antes: null,
    valor_depois: { mes, ano, gerados, jaExistiam, ignoradosTransfer },
    ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
  })

  return NextResponse.json({
    success: true,
    gerados,
    jaExistiam,
    ignoradosTransfer,
    total: estudantes.length
  })
}