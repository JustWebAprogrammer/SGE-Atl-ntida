import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/sistema/registos
// Returns paginated list of snapshots with student info
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const cursoId = searchParams.get("cursoId")
    const turno = searchParams.get("turno")
    const anoLectivo = searchParams.get("anoLectivo")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    // Build where clause for snapshots
    const where: any = {}

    if (anoLectivo) {
      where.ano_lectivo = anoLectivo
    }

    if (search || cursoId || turno) {
      where.estudante = {
        ...(search
          ? {
              OR: [
                { nome_completo: { contains: search, mode: "insensitive" } },
                { numero_estudante: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(cursoId ? { id_curso: parseInt(cursoId) } : {}),
        ...(turno ? { turno } : {}),
      }
    }

    // Get total count for pagination
    const total = await prisma.snapshotSemestre.count({ where })

    // Get snapshots with student info
    const snapshots = await prisma.snapshotSemestre.findMany({
      where,
      include: {
        estudante: {
          select: {
            id_estudante: true,
            nome_completo: true,
            numero_estudante: true,
            ano_current: true,
            turno: true,
            curso: { select: { id_curso: true, nome_curso: true } },
          },
        },
        usuario: { select: { nome_usuario: true } },
      },
      orderBy: { data_snapshot: "desc" },
      skip,
      take: limit,
    })

    // Parse notas_snapshot JSON for each record
    const registos = snapshots.map((s) => ({
      ...s,
      notas_snapshot: s.notas_snapshot ? JSON.parse(s.notas_snapshot as string) : null,
    }))

    // Get distinct ano_lectivo values from snapshots for filter dropdown
    const anosLectivos = await prisma.snapshotSemestre.findMany({
      select: { ano_lectivo: true },
      distinct: ["ano_lectivo"],
      orderBy: { ano_lectivo: "desc" },
    })

    // Get all courses for filter dropdown
    const cursos = await prisma.curso.findMany({
      select: { id_curso: true, nome_curso: true },
      orderBy: { nome_curso: "asc" },
    })

    return NextResponse.json({
      registos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filtros: {
        anosLectivos: anosLectivos.map((a) => a.ano_lectivo),
        cursos,
      },
    })
  } catch (error) {
    console.error("Erro ao listar registos:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}