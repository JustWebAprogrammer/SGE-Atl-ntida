import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { readFileSync } from "fs"
import { join } from "path"
import { getSystemDate } from "@/lib/sistema"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id_declaracao: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !["admin", "recepcionista"].includes(session.user.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id_declaracao } = await params
    const declaracaoId = parseInt(id_declaracao)

    const declaracao = await prisma.declaracao.findUnique({
      where: { id_declaracao: declaracaoId },
      include: { estudante: { include: { curso: true } } }
    })

    if (!declaracao) {
      return NextResponse.json({ error: "Declaração não encontrada" }, { status: 404 })
    }

    const student = declaracao.estudante
    const anoLectivo = declaracao.ano_lectivo
    const currentYear = student.ano_current || 3

    const presidentSignature = await prisma.assinaturaPresidente.findFirst({ where: { data_fim: null } })
    let signatureBase64 = presidentSignature?.imagem_base64 || ""
    if (!signatureBase64 && presidentSignature) {
      try {
        signatureBase64 = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", presidentSignature.caminho_arquivo)).toString("base64")}`
      } catch { }
    }

    let logoBase64 = ""
    try {
      logoBase64 = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "documentos", "logo.png")).toString("base64")}`
    } catch { }

    const systemDate = await getSystemDate()

    return NextResponse.json({
      studentName: student.nome_completo,
      studentNumber: student.numero_estudante || "",
      courseName: student.curso.nome_curso,
      currentYear,
      anoLectivo,
      presidentSignature: signatureBase64,
      presidentName: presidentSignature?.nome_presidente || "",
      documentNumber: declaracao.numero_documento,
      logoUrl: logoBase64,
      systemDate: systemDate.toISOString(),
    })

  } catch (error) {
    console.error("Error fetching declaration data:", error)
    return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 })
  }
}