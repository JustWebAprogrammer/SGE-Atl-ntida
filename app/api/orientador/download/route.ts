// app/api/orientador/download/route.ts
// Usage: GET /api/orientador/download?path=5/123456_file.pdf&nome=file.pdf&tipo=monografia
// tipo: "monografia" (default) or "premonografia"
// path pode ser caminho relativo (antigo) ou URL do Blob (novo)
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "orientador") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const filePath = searchParams.get("path")
  const fileName = searchParams.get("nome") ?? "ficheiro"

  if (!filePath) return NextResponse.json({ error: "Caminho em falta" }, { status: 400 })

  // Se for URL do Vercel Blob, redirecionar diretamente
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return NextResponse.redirect(filePath)
  }

  // Fallback: caminho relativo antigo (local filesystem) — já não funciona em produção
  // mas mantém compatibilidade com desenvolvimento local
  try {
    const fs = await import("fs")
    const path = await import("path")

    const tipo = searchParams.get("tipo") ?? "monografia"
    const dirName = tipo === "premonografia" ? "premonografias" : "monografias"
    const uploadsDir = path.resolve(process.cwd(), "uploads", dirName)
    const absolutePath = path.resolve(uploadsDir, filePath)

    if (!absolutePath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ error: "Ficheiro não encontrado" }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(absolutePath)
    const ext = path.extname(fileName).toLowerCase()

    const contentType =
      ext === ".pdf" ? "application/pdf" :
      ext === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
      ext === ".doc" ? "application/msword" :
      "application/octet-stream"

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      }
    })
  } catch {
    return NextResponse.json({ error: "Erro ao ler o ficheiro" }, { status: 500 })
  }
}