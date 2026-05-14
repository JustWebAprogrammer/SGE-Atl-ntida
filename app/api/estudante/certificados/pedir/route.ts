import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
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
      curso: {
        select: {
          duracao_anos: true,
        }
      }
    }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  // Validar: propina deve estar paga (excepto para finalistas que já não pagam propinas mensais)
  if (estudante.pagamento !== "Pago" && estudante.estado !== "Finalizado") {
    return NextResponse.json({ error: "Precisa de estar com a propina em dia para pedir certificado" }, { status: 400 })
  }

  const body = await req.json()
  const { tipo, descricao } = body

  if (!tipo || !["Disciplina", "Conclusao"].includes(tipo)) {
    return NextResponse.json({ error: "Tipo de certificado inválido" }, { status: 400 })
  }

  // Se for certificado de conclusão, verificar se está no último ano (usando duração dinâmica do curso)
  const ultimoAno = estudante.curso?.duracao_anos ?? 4
  if (tipo === "Conclusao" && estudante.ano_current !== ultimoAno) {
    return NextResponse.json({ error: `Só pode pedir certificado de conclusão no ${ultimoAno}º ano` }, { status: 400 })
  }

  const certificado = await prisma.certificado.create({
    data: {
      id_estudante: estudante.id_estudante,
      data_emissao: new Date(),
      tipo_certificado: tipo,
      descricao: descricao?.trim() || null,
    }
  })

  return NextResponse.json({
    id: certificado.id_certificado,
    tipo: certificado.tipo_certificado,
    data_emissao: certificado.data_emissao,
    descricao: certificado.descricao,
  })
}