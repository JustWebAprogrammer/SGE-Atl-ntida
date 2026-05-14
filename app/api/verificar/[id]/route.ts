import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/verificar/[id] - Verify any digital document (Declaração, Certificado Disciplinas, Certificado Conclusão)
// Todos os documentos usam o formato /verificar/{id} (ID numérico) para simplificar.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const numericId = Number(id)

    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      )
    }

    // 1. Try as Declaração
    const declaracao = await prisma.declaracao.findUnique({
      where: { id_declaracao: numericId },
      include: {
        estudante: {
          include: { curso: true }
        }
      }
    })

    if (declaracao) {
      return NextResponse.json({
        tipo: "declaracao",
        id: declaracao.id_declaracao,
        numero_documento: declaracao.numero_documento,
        data_emissao: declaracao.data_emissao,
        ano_lectivo: declaracao.ano_lectivo,
        estudante: {
          nome_completo: declaracao.estudante.nome_completo,
          numero_estudante: declaracao.estudante.numero_estudante,
          curso: {
            nome_curso: declaracao.estudante.curso.nome_curso,
          }
        }
      })
    }

    // 2. Try as Certificado
    const certificado = await prisma.certificado.findUnique({
      where: { id_certificado: numericId },
      include: {
        estudante: {
          include: { curso: true }
        }
      }
    })

    if (certificado) {
      const isConclusao = certificado.tipo_certificado === "Conclusao"
      return NextResponse.json({
        tipo: isConclusao ? "cert" : "cert-disc",
        id: certificado.id_certificado,
        numero_documento: certificado.descricao || certificado.tipo_certificado,
        data_emissao: certificado.data_emissao,
        ano_lectivo: "",
        descricao: certificado.descricao,
        estudante: {
          nome_completo: certificado.estudante.nome_completo,
          numero_estudante: certificado.estudante.numero_estudante,
          curso: {
            nome_curso: certificado.estudante.curso.nome_curso,
          }
        }
      })
    }

    // Not found
    return NextResponse.json(
      { error: "Documento não encontrado ou inválido" },
      { status: 404 }
    )

  } catch (error) {
    console.error("Error verifying document:", error)
    return NextResponse.json(
      { error: "Erro ao verificar documento" },
      { status: 500 }
    )
  }
}