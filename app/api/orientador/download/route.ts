// app/api/orientador/download/route.ts
// Usage: GET /api/orientador/download?path=5/123456_file.pdf&nome=file.pdf&tipo=monografia
// tipo: "monografia" (default) or "premonografia"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "orientador") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const filePath = searchParams.get("path")
  const fileName = searchParams.get("nome") ?? "ficheiro"
  const tipo = searchParams.get("tipo") ?? "monografia" // "monografia" or "premonografia"

  if (!filePath) return NextResponse.json({ error: "Caminho em falta" }, { status: 400 })

  // Validate tipo parameter
  if (tipo !== "monografia" && tipo !== "premonografia") {
    return NextResponse.json({ error: "Tipo inválido. Use 'monografia' ou 'premonografia'" }, { status: 400 })
  }

  // Map tipo to actual directory name (both are plural)
  const dirName = tipo === "premonografia" ? "premonografias" : "monografias"

  // Security: resolve to absolute and make sure it stays within the uploads dir
  const uploadsDir = path.resolve(process.cwd(), "uploads", dirName)
  const absolutePath = path.resolve(uploadsDir, filePath)

  // Debug logging
  console.log("Debug download:", { uploadsDir, filePath, absolutePath, exists: fs.existsSync(absolutePath) })

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
}