import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { logAudit } from "@/lib/audit"

// Pasta onde os arquivos serão guardados
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "monografias")

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
      id_curso: true,
      curso: {
        select: { duracao_anos: true },
      },
    }
  })

  if (!estudante) return NextResponse.json({ error: "Estudante não encontrado" }, { status: 404 })

  // Validar: deve estar no último ano do curso
  const duracaoCurso = estudante.curso?.duracao_anos ?? 4
  if (estudante.ano_current !== duracaoCurso) {
    return NextResponse.json({ error: `Só estudantes do ${duracaoCurso}º ano podem submeter monografia` }, { status: 400 })
  }

  // Validar: deve ter orientação aceite
  const orientacaoAceite = await prisma.solicitacaoOrientacao.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      estado: "Aceite"
    }
  })

  if (!orientacaoAceite) {
    return NextResponse.json({ error: "Precisa de ter uma orientação aceite antes de submeter a monografia" }, { status: 400 })
  }

  // Validar: propina deve estar paga (mas finalistas podem não ter propina mensal)
  // Nota: finalistas não pagam propinas mensais, só a taxa de monografia
  if (estudante.ano_current !== duracaoCurso && estudante.pagamento !== "Pago") {
    return NextResponse.json({ error: "Precisa de estar com a propina em dia para submeter a monografia" }, { status: 400 })
  }

  // Validar: taxa de monografia deve estar paga
  const taxaMonografiaPaga = await prisma.factura.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      descricao_servico: { contains: "Monografia" },
      estado: "Pago"
    }
  })

  if (!taxaMonografiaPaga) {
    return NextResponse.json({ error: "Precisa de pagar a Taxa de Monografia antes de submeter. Vá a Pagamentos > Serviços" }, { status: 400 })
  }

  // Validar: todas as disciplinas devem estar aprovadas (em TODOS os anos)
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
      error: `Não pode submeter a monografia. Tem disciplinas sem nota de aprovação: ${nomesDisciplinas}`,
    }, { status: 400 })
  }

  // Validar: todas as propinas de anos anteriores devem estar pagas
  const propinasAnterioresNaoPagas = await prisma.pagamentoPropina.findMany({
    where: {
      id_estudante: estudante.id_estudante,
      ano: { lt: estudante.ano_current ?? duracaoCurso },
      estado: { not: "Pago" },
    },
    select: {
      mes: true,
      ano: true,
      estado: true,
    },
  })

  if (propinasAnterioresNaoPagas.length > 0) {
    const porAno: Record<number, number> = {}
    for (const p of propinasAnterioresNaoPagas) {
      porAno[p.ano] = (porAno[p.ano] || 0) + 1
    }
    const detalhes = Object.entries(porAno)
      .map(([ano, count]) => `${count} propina(s) do ${ano}º ano`)
      .join(", ")
    return NextResponse.json({
      error: `Não pode submeter a monografia. Tem propinas em falta de anos anteriores: ${detalhes}`,
    }, { status: 400 })
  }

  // Validar: pré-monografia deve estar aprovada
  const premonografiaAprovada = await prisma.premonografia.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      estado: "Aprovado"
    }
  })

  if (!premonografiaAprovada) {
    return NextResponse.json({ error: "O pré-projecto precisa de estar aprovado antes de submeter a monografia" }, { status: 400 })
  }

  // Verificar se já tem monografia submetida
  const monografiaExistente = await prisma.monografia.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      estado: { in: ["Submetida", "EmRevisao", "Aprovada", "ParaDefender"] }
    }
  })

  if (monografiaExistente) {
    return NextResponse.json({ error: "Já tem uma monografia submetida em processo" }, { status: 400 })
  }

  const formData = await req.formData()
  const titulo = formData.get("titulo") as string
  const resumo = formData.get("resumo") as string
  const descricao = formData.get("descricao") as string
  const id_co_orientador = formData.get("id_co_orientador") as string | null
  const nome_co_orientador = formData.get("nome_co_orientador") as string | null
  const nome_co_autor = formData.get("nome_co_autor") as string | null
  const arquivo = formData.get("arquivo") as File | null

  if (!titulo || titulo.trim().length < 10) {
    return NextResponse.json({ error: "O título deve ter pelo menos 10 caracteres" }, { status: 400 })
  }

  if (!resumo || resumo.trim().length < 50) {
    return NextResponse.json({ error: "O resumo deve ter pelo menos 50 caracteres" }, { status: 400 })
  }

  // Validar: arquivo é obrigatório
  if (!arquivo) {
    return NextResponse.json({ error: "O arquivo da monografia é obrigatório" }, { status: 400 })
  }

  let caminho_arquivo = null
  let nome_arquivo = null

  // Processar upload do arquivo
  {
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

  const monografia = await prisma.monografia.create({
    data: {
      id_estudante: estudante.id_estudante,
      titulo: titulo.trim(),
      resumo: resumo.trim(),
      descricao: descricao?.trim() || null,
      caminho_arquivo,
      nome_arquivo: arquivo?.name || null,
      data_submissao: new Date(),
      estado: "Submetida",
      id_orientador: orientacaoAceite.id_orientador,
      id_co_orientador: id_co_orientador ? parseInt(id_co_orientador) : null,
      nome_co_orientador: nome_co_orientador?.trim() || null,
      nome_co_autor: nome_co_autor?.trim() || null,
    }
  })

  // Log audit
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "SUBMETER_MONOGRAFIA",
      tabela: "Monografia",
      id_registro: monografia.id_monografia,
      valor_antes: null,
      valor_depois: {
        titulo: monografia.titulo,
        estado: "Submetida",
        id_orientador: orientacaoAceite.id_orientador,
        nome_co_orientador: monografia.nome_co_orientador,
        nome_co_autor: monografia.nome_co_autor,
      },
      ip_address: ip,
    })
  } catch (err) {
    console.error("Erro ao registrar audit log:", err)
  }

  return NextResponse.json({
    id: monografia.id_monografia,
    titulo: monografia.titulo,
    resumo: monografia.resumo,
    descricao: monografia.descricao,
    nome_arquivo: monografia.nome_arquivo,
    data_submissao: monografia.data_submissao,
    estado: monografia.estado,
    id_orientador: monografia.id_orientador,
    id_co_orientador: monografia.id_co_orientador,
    nome_co_orientador: monografia.nome_co_orientador,
    nome_co_autor: monografia.nome_co_autor,
  })
}