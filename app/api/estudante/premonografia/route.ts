import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { logAudit } from "@/lib/audit"
import { criarNotificacao } from "@/lib/notificacoes"

// Pasta onde os arquivos serão guardados
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "premonografias")

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "estudante") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const estudante = await prisma.estudante.findUnique({
    where: { id_usuario: parseInt(session.user.id) },
    select: {
      id_estudante: true,
      nome_completo: true,
      ano_current: true,
      pagamento: true,
      curso: {
        select: { duracao_anos: true, id_departamento: true }
      }
    }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  // Validar: deve estar no último ano do curso
  const ultimoAno = estudante.curso?.duracao_anos ?? 4
  if (estudante.ano_current !== ultimoAno) {
    return NextResponse.json({ error: `Só estudantes do ${ultimoAno}º ano podem submeter pré-projecto` }, { status: 400 })
  }

  // Validar: propina deve estar paga (mas finalistas podem não ter propina mensal)
  // Nota: finalistas não pagam propinas mensais, só a taxa de monografia
  if (estudante.ano_current !== ultimoAno && estudante.pagamento !== "Pago") {
    return NextResponse.json({ error: "Precisa de estar com a propina em dia para submeter o pré-projecto" }, { status: 400 })
  }

  // Validar: todas as disciplinas devem estar aprovadas
  const notasReprovadas = await prisma.nota.findMany({
    where: {
      id_estudante: estudante.id_estudante,
      dispensada: false,
      nota_final: { lt: 10 },
    },
    select: {
      nota_final: true,
      disciplina: {
        select: {
          nome_disciplina: true,
          codigo_disciplina: true,
        },
      },
    },
  })

  if (notasReprovadas.length > 0) {
    const nomesDisciplinas = notasReprovadas
      .map((n) => `${n.disciplina.nome_disciplina} (${n.disciplina.codigo_disciplina})`)
      .join(", ")
    return NextResponse.json({
      error: `Não pode submeter o pré-projecto. Tem disciplinas sem nota de aprovação: ${nomesDisciplinas}. Precisa de aprovar todas as disciplinas antes de prosseguir.`,
    }, { status: 400 })
  }

  const formData = await req.formData()
  const tema = formData.get("tema") as string
  const arquivo = formData.get("arquivo") as File | null

  if (!tema || tema.trim().length < 10) {
    return NextResponse.json({ error: "O tema deve ter pelo menos 10 caracteres" }, { status: 400 })
  }

  // Validar: arquivo é obrigatório
  if (!arquivo) {
    return NextResponse.json({ error: "O arquivo do pré-projecto é obrigatório" }, { status: 400 })
  }

// Bloquear completamente se já tem pré-monografia aprovada
  const premonografiaAprovada = await prisma.premonografia.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      estado: "Aprovado"
    }
  })

  if (premonografiaAprovada) {
    return NextResponse.json({ error: "O pré-projecto já foi aprovado. Não é possível submeter novos pré-projectos." }, { status: 400 })
  }

  // Verificar se já tem pré-monografia pendente (não permitir múltiplos pendentes)
  const premonografiaPendente = await prisma.premonografia.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      estado: "Proposto"
    }
  })

  if (premonografiaPendente) {
    return NextResponse.json({ error: "Já tem um pré-projecto pendente" }, { status: 400 })
  }

  let caminho_arquivo = null
  let nome_arquivo = null

  // Processar upload do arquivo
  if (arquivo) {
    // Validar tipo de ficheiro (PDF ou Word)
    const tiposPermitidos = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    
    if (!tiposPermitidos.includes(arquivo.type)) {
      return NextResponse.json({ error: "O ficheiro deve ser PDF ou Word (.doc, .docx)" }, { status: 400 })
    }

    // Validar tamanho (10MB max)
    if (arquivo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "O ficheiro não pode exceder 10MB" }, { status: 400 })
    }

    // Criar pasta de uploads se não existir
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Criar pasta específica para este estudante
    const studentDir = path.join(UPLOAD_DIR, estudante.id_estudante.toString())
    if (!existsSync(studentDir)) {
      await mkdir(studentDir, { recursive: true })
    }

    // Gerar nome único para o ficheiro
    const timestamp = Date.now()
    const nomeOriginal = arquivo.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const nomeFinal = `${timestamp}_${nomeOriginal}`
    const filePath = path.join(studentDir, nomeFinal)

    // Ler bytes do arquivo e salvar no filesystem
    const bytes = await arquivo.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Guardar caminho relativo para o banco de dados
    caminho_arquivo = path.join(estudante.id_estudante.toString(), nomeFinal)
    nome_arquivo = arquivo.name
  }

  const premonografia = await prisma.premonografia.create({
    data: {
      id_estudante: estudante.id_estudante,
      tema: tema.trim(),
      data_proposta: new Date(),
      estado: "Proposto",
      caminho_arquivo,
      nome_arquivo,
    }
  })

  // Log audit
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "SUBMETER_PRE_PROJECTO",
      tabela: "Premonografia",
      id_registro: premonografia.id_premonografia,
      valor_antes: null,
      valor_depois: {
        tema: premonografia.tema,
        estado: "Proposto",
        nome_arquivo: premonografia.nome_arquivo,
      },
      ip_address: ip,
    })
  } catch (err) {
    console.error("Erro ao registrar audit log:", err)
  }

  // Notificar gestores do departamento
  try {
    const gestores = await prisma.orientador.findMany({
      where: { e_gestor: true, id_departamento: estudante.curso.id_departamento },
      select: { id_usuario: true }
    })
    for (const g of gestores) {
      await criarNotificacao({
        id_usuario: g.id_usuario,
        tipo: "premonografia",
        titulo: "Novo pré-projecto submetido",
        mensagem: `${estudante.nome_completo} submeteu o pré-projecto "${premonografia.tema}"`,
        link_url: "/gestor/premonografia"
      })
    }
  } catch (err) {
    console.error("Erro ao notificar gestores:", err)
  }

  return NextResponse.json({
    id: premonografia.id_premonografia,
    tema: premonografia.tema,
    data_proposta: premonografia.data_proposta,
    estado: premonografia.estado,
    nome_arquivo: premonografia.nome_arquivo,
  })
}