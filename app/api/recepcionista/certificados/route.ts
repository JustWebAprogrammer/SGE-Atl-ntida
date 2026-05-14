// DESIGN DECISION: Recepcionista role is read/delivery only. Payment processing is out of scope by requirement.
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const certificados = await prisma.certificado.findMany({
      include: {
        estudante: {
          include: {
            curso: true
          }
        }
      },
      orderBy: {
        data_emissao: "desc"
      }
    })

    return NextResponse.json(certificados)
  } catch (error) {
    console.error("Error fetching certificados:", error)
    return NextResponse.json(
      { error: "Erro ao carregar certificados" },
      { status: 500 }
    )
  }
}