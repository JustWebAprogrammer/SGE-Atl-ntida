import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "estudante") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: {
      id_estudante: true,
      ano_current: true,
      pagamento: true,
      estado: true,
      nome_completo: true,
      numero_estudante: true,
      ano_electivo: true,
      curso: {
        select: {
          nome_curso: true,
          duracao_anos: true,
        }
      }
    }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  // Buscar certificados emitidos
  const certificados = await prisma.certificado.findMany({
    where: { id_estudante: estudante.id_estudante },
    include: {
      disciplinas: {
        include: {
          disciplina: {
            select: {
              nome_disciplina: true,
              codigo_disciplina: true,
              creditos: true,
              ano_curricular: true,
            }
          }
        }
      }
    },
    orderBy: { data_emissao: "desc" }
  })

  // Buscar declarações emitidas
  const declaracoes = await prisma.declaracao.findMany({
    where: { id_estudante: estudante.id_estudante },
    orderBy: { data_emissao: "desc" }
  })

  // Buscar notas de TODOS os anos até ao ano actual inclusive
  // Motivo: A monografia substitui as disciplinas do último ano (4º ano),
  // mas o ano conta como concluído.
  const notasAnosTerminados = await prisma.nota.findMany({
    where: {
      id_estudante: estudante.id_estudante,
      nota_final: { not: null },
      disciplina: {
        ano_curricular: { lte: estudante.ano_current || 1 }
      }
    },
    include: {
      disciplina: {
        select: {
          nome_disciplina: true,
          codigo_disciplina: true,
          creditos: true,
          ano_curricular: true,
        }
      }
    },
    orderBy: [
      { disciplina: { ano_curricular: "asc" } },
      { disciplina: { nome_disciplina: "asc" } }
    ]
  })

  // Buscar a monografia para verificar se o estudante tem monografia concluída
  const monografia = await prisma.monografia.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      estado: "Defendida"
    }
  })

  // Agrupar notas por ano
  const notasPorAno: Record<number, typeof notasAnosTerminados> = {}
  for (const nota of notasAnosTerminados) {
    const ano = nota.disciplina.ano_curricular
    if (!notasPorAno[ano]) notasPorAno[ano] = []
    notasPorAno[ano].push(nota)
  }

  // Se o estudante está no último ano (ou finalizado) e tem monografia,
  // adicionar o último ano ao mapa de anos concluídos (mesmo sem notas)
  const ultimoAno = estudante.curso?.duracao_anos ?? (estudante.ano_current ?? 1)
  const isFinalistaOuFinalizado = estudante.estado === "Finalizado" || estudante.ano_current === ultimoAno
  if (isFinalistaOuFinalizado && monografia && !notasPorAno[ultimoAno]) {
    notasPorAno[ultimoAno] = []
  }

  // Unificar: certificados + declarações como documentos
  const documentos = [
    ...certificados.map(c => ({
      id: c.id_certificado,
      tipo: c.tipo_certificado === "Conclusao" ? "CertificadoConclusao" : "CertificadoDisciplinas",
      data_emissao: c.data_emissao,
      descricao: c.descricao || (c.tipo_certificado === "Conclusao" ? "Certificado de Conclusão" : "Certificado de Disciplinas"),
      anoLectivo: estudante.ano_electivo || "",
      documentoRef: "certificado" as const,
      disciplinas: c.disciplinas.map(d => ({
        nome: d.disciplina.nome_disciplina,
        codigo: d.disciplina.codigo_disciplina,
        creditos: d.disciplina.creditos,
        ano: d.disciplina.ano_curricular,
      })),
    })),
    ...declaracoes.map(d => ({
      id: d.id_declaracao,
      tipo: "DeclaracaoAcademica" as const,
      data_emissao: d.data_emissao,
      descricao: `Declaração Académica - ${d.ano_lectivo}`,
      anoLectivo: d.ano_lectivo,
      documentoRef: "declaracao" as const,
      numero_documento: d.numero_documento,
      disciplinas: [] as any[],
    })),
  ]

  // Ordenar por data_emissao descendente
  documentos.sort((a, b) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime())

  return NextResponse.json({
    estudante: {
      nome_completo: estudante.nome_completo,
      numero_estudante: estudante.numero_estudante,
      curso: estudante.curso,
      ano_current: estudante.ano_current,
      pagamento: estudante.pagamento,
      estado: estudante.estado,
      ano_electivo: estudante.ano_electivo || "",
    },
    documentos,
    certificados: certificados.map(c => ({
      id: c.id_certificado,
      tipo: c.tipo_certificado,
      data_emissao: c.data_emissao,
      descricao: c.descricao,
      disciplinas: c.disciplinas.map(d => ({
        nome: d.disciplina.nome_disciplina,
        codigo: d.disciplina.codigo_disciplina,
        creditos: d.disciplina.creditos,
        ano: d.disciplina.ano_curricular,
      })),
    })),
    notasPorAno,
  })
}