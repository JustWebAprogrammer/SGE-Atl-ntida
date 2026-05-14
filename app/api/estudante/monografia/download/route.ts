import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

// Pasta onde os arquivos estão guardados
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "monografias")

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "estudante") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_estudante: true }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  const monografia = await prisma.monografia.findFirst({
    where: { id_estudante: estudante.id_estudante },
    orderBy: { data_submissao: "desc" }
  })

  if (!monografia || !monografia.caminho_arquivo) {
    return NextResponse.json({ error: "Nenhuma monografia encontrada" }, { status: 404 })
  }

  // Construir caminho completo do arquivo
  const filePath = path.join(UPLOAD_DIR, monografia.caminho_arquivo)

  // Verificar se o arquivo existe
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Arquivo não encontrado no servidor" }, { status: 404 })
  }

  try {
    // Ler o arquivo
    const fileBuffer = await readFile(filePath)

    // Retornar o arquivo como download
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${monografia.nome_arquivo || "monografia.pdf"}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Erro ao ler o arquivo" }, { status: 500 })
  }
}