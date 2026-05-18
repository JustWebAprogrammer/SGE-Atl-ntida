import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { getSystemDate, getAnoLectivo } from "@/lib/sistema"
import { SERVICOS, isServicoFisico } from "@/lib/servicos-tipos"
import { processarRematricula } from "@/lib/reenrollment"

// POST - Confirmar pagamento de um serviço com código Multicaixa
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "estudante") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const estudante = await prisma.estudante.findUnique({
      where: { id_usuario: parseInt(session.user.id) },
      select: {
        id_estudante: true,
        numero_estudante: true,
        ano_electivo: true,
        curso: {
          select: { nome_curso: true }
        }
      }
    })

    if (!estudante) {
      return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const { factura_id, codigo } = body

    if (!factura_id || !codigo) {
      return NextResponse.json({ error: "Dados em falta (factura_id e codigo são obrigatórios)" }, { status: 400 })
    }

    // Buscar a factura
    const factura = await prisma.factura.findFirst({
      where: {
        id_factura: parseInt(factura_id),
        id_estudante: estudante.id_estudante,
      }
    })

    if (!factura) {
      return NextResponse.json({ error: "Factura não encontrada" }, { status: 404 })
    }

    // Anti-duplicado: se já está paga, rejeitar
    if (factura.estado === "Pago") {
      return NextResponse.json({ error: "Este pagamento já foi confirmado anteriormente" }, { status: 400 })
    }

    // Validar código de confirmação
    if (factura.codigo_confirmacao !== codigo.trim()) {
      return NextResponse.json({ error: "Código de confirmação incorrecto" }, { status: 400 })
    }

    const systemDate = await getSystemDate()

    // ── Step 3: Check if this is a REMATRICULA payment ──
    // Para rematrícula: validar ANTES de marcar como pago
    const isRematricula = factura.descricao_servico?.includes(SERVICOS.REMATRICULA)

    if (isRematricula) {
      // Executar a rematrícula primeiro, ANTES de marcar a factura como paga
      const resultado = await processarRematricula(estudante.id_estudante, parseInt(session.user.id))

      if (!resultado.success) {
        // Rematrícula falhou — nem marca a factura como paga
        return NextResponse.json({
          success: false,
          error: resultado.message,
        }, { status: 400 })
      }

      // Rematrícula bem-sucedida — agora sim, marcar factura como paga
      await prisma.factura.update({
        where: { id_factura: factura.id_factura },
        data: {
          estado: "Pago",
          data_pagamento: systemDate,
          metodo_pagamento: "Multicaixa",
        }
      })

      await logAudit({
        id_usuario: parseInt(session.user.id),
        acao: "CONFIRMAR_SERVICO",
        tabela: "Factura",
        id_registro: factura.id_factura,
        valor_antes: { estado: "Pendente", descricao: factura.descricao_servico },
        valor_depois: { estado: "Pago", data_pagamento: systemDate.toISOString() },
        ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
      })

      await logAudit({
        id_usuario: parseInt(session.user.id),
        acao: "Pagamento Taxa de Rematrícula",
        tabela: "Estudante",
        id_registro: estudante.id_estudante,
        valor_antes: null,
        valor_depois: {
          tipo: resultado.tipo,
          message: resultado.message,
          disciplinasFalhadas: resultado.disciplinasFalhadas,
        },
        ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
      })

      return NextResponse.json({
        success: true,
        mensagem: `${factura.descricao_servico} pago com sucesso`,
        id_factura: factura.id_factura,
        valor: Number(factura.valor_total),
        rematricula: {
          tipo: resultado.tipo,
          message: resultado.message,
          disciplinasFalhadas: resultado.disciplinasFalhadas,
        },
      })
    }

    // ── Para outros serviços: marcar como pago normalmente ──
    await prisma.factura.update({
      where: { id_factura: factura.id_factura },
      data: {
        estado: "Pago",
        data_pagamento: systemDate,
        metodo_pagamento: "Multicaixa",
      }
    })

    // ── Se for um serviço físico, gerar registo para o recepcionista ──
    if (factura.descricao_servico && isServicoFisico(factura.descricao_servico)) {
      const desc = factura.descricao_servico.toLowerCase()
      
      // Certificado de Conclusão → criar certificado físico
      if (desc.includes("certificado") && desc.includes("conclus")) {
        await prisma.certificado.create({
          data: {
            id_estudante: estudante.id_estudante,
            data_emissao: systemDate,
            tipo_certificado: "Conclusao",
            descricao: `Certificado de Conclusão (Físico) - ${factura.descricao_servico}`,
            isFisico: true,
            status: "Solicitado",
          }
        })
      }
      
      // Declaração Académica → criar registo na tabela Declaracao
      // para a recepcionista imprimir (físico, sem QR code)
      if (desc.includes("declara") && desc.includes("acad")) {
        const anoLectivo = await getAnoLectivo()
        const declarationCount = await prisma.declaracao.count({
          where: { id_estudante: estudante.id_estudante }
        })
        const sequence = (declarationCount + 1).toString().padStart(3, '0')
        const numero = estudante.numero_estudante || String(estudante.id_estudante)
        const numero_documento = `DECL-${anoLectivo}-${numero}-${sequence}`

        await prisma.declaracao.create({
          data: {
            id_estudante: estudante.id_estudante,
            numero_documento,
            ano_lectivo: anoLectivo,
          }
        })
      }

      // Certificado de Disciplina(s) → criar certificado físico (tipo Disciplina)
      if (desc.includes("certificado") && (desc.includes("disciplinas") || desc.includes("disciplina"))) {
        await prisma.certificado.create({
          data: {
            id_estudante: estudante.id_estudante,
            data_emissao: systemDate,
            tipo_certificado: "Disciplina",
            descricao: `Certificado de Disciplinas (Físico) - ${factura.descricao_servico}`,
            isFisico: true,
            status: "Solicitado",
          }
        })
      }
      
      // Folha de Prova → não gera certificado, a própria factura já aparece no recepcionista
    }

    // Registar no AuditLog
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "CONFIRMAR_SERVICO",
      tabela: "Factura",
      id_registro: factura.id_factura,
      valor_antes: { estado: "Pendente", descricao: factura.descricao_servico },
      valor_depois: { estado: "Pago", data_pagamento: systemDate.toISOString() },
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1"
    })

    return NextResponse.json({
      success: true,
      mensagem: `${factura.descricao_servico || "Serviço"} pago com sucesso`,
      id_factura: factura.id_factura,
      valor: Number(factura.valor_total),
    })
  } catch (error) {
    console.error("Erro ao confirmar serviço:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
