import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(session.user.role === "orientador" && session.user.e_gestor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const resolvedParams = await params
  const idPremonografia = parseInt(resolvedParams.id)
  if (isNaN(idPremonografia)) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  // Buscar gestor para saber o departamento
  const gestor = await prisma.orientador.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: { id_orientador: true, id_departamento: true }
  })
  if (!gestor) return NextResponse.json({ error: "Gestor não encontrado" }, { status: 404 })

  // Buscar pré-projecto e verificar se é do mesmo departamento
  const premonografia = await prisma.premonografia.findUnique({
    where: { id_premonografia: idPremonografia },
    include: {
      estudante: {
        select: {
          nome_completo: true,
          numero_estudante: true,
          curso: {
            select: { id_departamento: true, nome_curso: true }
          }
        }
      }
    }
  })

  if (!premonografia) return NextResponse.json({ error: "Pré-projecto não encontrado" }, { status: 404 })

  // Verificar se o pré-projecto é do mesmo departamento do gestor
  if (gestor.id_departamento && premonografia.estudante.curso.id_departamento !== gestor.id_departamento) {
    return NextResponse.json({ error: "Não autorizado a modificar pré-projectos de outro departamento" }, { status: 403 })
  }

  const body = await request.json()
  const { estado, feedback } = body

  if (!estado || !["Aprovado", "Reprovado"].includes(estado)) {
    return NextResponse.json({ error: "Estado inválido. Use 'Aprovado' ou 'Reprovado'" }, { status: 400 })
  }

  if (premonografia.estado !== "Proposto") {
    return NextResponse.json({ error: `Pré-projecto já está em "${premonografia.estado}". Não pode ser alterado.` }, { status: 400 })
  }

  const atualizado = await prisma.premonografia.update({
    where: { id_premonografia: idPremonografia },
    data: {
      estado,
      feedback: feedback ?? null
    }
  })

  // Log audit
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: estado === "Aprovado" ? "GESTOR_APROVAR_PRE_PROJECTO" : "GESTOR_REPROVAR_PRE_PROJECTO",
      tabela: "Premonografia",
      id_registro: idPremonografia,
      valor_antes: { estado: "Proposto" },
      valor_depois: {
        estado,
        feedback: feedback ?? null,
        tema: premonografia.tema,
        estudante: premonografia.estudante.nome_completo,
        curso: premonografia.estudante.curso.nome_curso
      },
      ip_address: ip,
    })
  } catch (err) {
    console.error("Erro ao registrar audit log:", err)
  }

  return NextResponse.json({
    id_premonografia: atualizado.id_premonografia,
    tema: atualizado.tema,
    estado: atualizado.estado,
    feedback: atualizado.feedback
  })
}