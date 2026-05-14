import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const TABELAS_COM_ID_ESTUDANTE = new Set([
  "Nota",
  "PagamentoPropina",
  "Factura",
  "NotaCobranca",
])

// Tables that reference id_disciplina for context enrichment
const TABELAS_COM_DISCIPLINA = new Set([
  "Nota",
  "HorarioAula",
  "PlanoProva",
  "ProfessorDisciplina",
])

// Tables that reference id_curso for context enrichment
const TABELAS_COM_CURSO = new Set([
  "HorarioAula",
  "PlanoProva",
  "PeriodoProva",
])

const MESES_PT = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const TIPOS_ACAO = {
  CRIAR: ["CRIAR", "CREATE", "INSERT", "REGISTAR", "REGIST"],
  ALTERAR: ["ALTERAR", "UPDATE", "EDITAR", "EDIT"],
  ELIMINAR: ["ELIMINAR", "DELETE", "DELET", "REMOV"],
  LOGIN: ["LOGIN", "ACESSO", "LOGOUT"],
}

function matchesAcao(acao: string, tipo: string): boolean {
  const upper = acao.toUpperCase()
  const patterns = TIPOS_ACAO[tipo as keyof typeof TIPOS_ACAO]
  if (!patterns) return false
  return patterns.some(p => upper.includes(p))
}

const TODOS_OS_ROLES = ["admin", "orientador", "recepcionista", "estudante"]

/** Parse a value that may have been serialised as number or string. */
function parseIntField(v: unknown): number {
  if (typeof v === "number") return v
  if (typeof v === "string" && v !== "") return parseInt(v, 10)
  return NaN
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const userRole = session.user.role
    const isAdmin = userRole === "admin"
    const isGestor = userRole === "orientador" && session.user.e_gestor === true

    if (!isAdmin && !isGestor) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id_usuario = searchParams.get("id_usuario")
    const role = searchParams.get("role")
    const acao = searchParams.get("acao")
    const search = searchParams.get("search")
    const id_registro = searchParams.get("id_registro")
    const tabela = searchParams.get("tabela")
    const data_inicio = searchParams.get("data_inicio")
    const data_fim = searchParams.get("data_fim")
    const id_curso = searchParams.get("id_curso")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: Prisma.AuditLogWhereInput = {}
    const userWhere: Prisma.UsuarioWhereInput = {}

    // Filter by user ID
    if (id_usuario) where.id_usuario = parseInt(id_usuario)
    // Filter by role (cascading: if role is set, filter users by that role)
    if (role) userWhere.tipo_usuario = role as Prisma.EnumTipoUsuarioFilter["equals"]
    // Filter by table
    if (tabela) where.tabela = tabela
    // Filter by record ID
    if (id_registro) where.id_registro = parseInt(id_registro)
    // Filter by date range
    if (data_inicio || data_fim) {
      where.data_hora = {}
      if (data_inicio) where.data_hora.gte = new Date(data_inicio)
      if (data_fim) where.data_hora.lte = new Date(data_fim + "T23:59:59")
    }

    // Build user IDs set for cascading filter
    const filteredUserIds = new Set<number>()
    if (role || id_usuario || id_curso) {
      // Start with role filter if present
      let userFilterWhere: Prisma.UsuarioWhereInput = { ...userWhere }
      
      // Add id_curso filter for estudantes
      if (id_curso && role === 'estudante') {
        userFilterWhere = {
          ...userFilterWhere,
          estudante: {
            id_curso: parseInt(id_curso),
          },
        }
      }
      
      // Add id_curso filter for orientadores (via ProfessorDisciplina -> Disciplina -> CursoDisciplina)
      if (id_curso && role === 'orientador') {
        userFilterWhere = {
          ...userFilterWhere,
          disciplinas: {
            some: {
              disciplina: {
                cursos: {
                  some: {
                    id_curso: parseInt(id_curso),
                  },
                },
              },
            },
          },
        }
      }
      
      const filteredUsers = await prisma.usuario.findMany({
        where: userFilterWhere,
        select: { id_usuario: true },
      })
      filteredUsers.forEach(u => filteredUserIds.add(u.id_usuario))
      
      // Apply to where clause
      if (id_usuario) {
        where.id_usuario = parseInt(id_usuario)
      } else if (filteredUserIds.size > 0) {
        where.id_usuario = { in: [...filteredUserIds] }
      } else if (id_curso) {
        // Curso was selected but no users matched — force empty result
        where.id_usuario = { in: [] }
      }
    }

    // Text search filter
    if (search) {
      where.OR = [
        { acao: { contains: search, mode: "insensitive" } },
        { tabela: { contains: search, mode: "insensitive" } },
        { usuario: { nome_usuario: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Build user filter for the users query
    let usersFilter: Prisma.UsuarioWhereInput = {}
    if (role) usersFilter.tipo_usuario = role as Prisma.EnumTipoUsuarioFilter["equals"]
    if (id_curso && role === 'estudante') {
      usersFilter = {
        ...usersFilter,
        estudante: { id_curso: parseInt(id_curso) },
      }
    }
    if (id_curso && role === 'orientador') {
      usersFilter = {
        ...usersFilter,
        disciplinas: {
          some: {
            disciplina: {
              cursos: {
                some: {
                  id_curso: parseInt(id_curso),
                },
              },
            },
          },
        },
      }
    }

    // Queries principais em paralelo
    const [logs, total, tabelasRaw, allUsers, cursos] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          usuario: { select: { nome_usuario: true, email: true } },
        },
        orderBy: { data_hora: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ select: { tabela: true }, distinct: ["tabela"] }),
      prisma.usuario.findMany({
        where: usersFilter,
        select: { id_usuario: true, nome_usuario: true, email: true, tipo_usuario: true },
        orderBy: { nome_usuario: "asc" },
      }),
      prisma.curso.findMany({
        select: { id_curso: true, nome_curso: true },
        orderBy: { nome_curso: "asc" },
      }),
    ])

    // Apply action type filter in-memory if specified
    let filteredLogs = logs
    if (acao) {
      filteredLogs = logs.filter(log => matchesAcao(log.acao, acao))
    }

    // Enriquecimento: estudante + disciplina (two-pass)
    //
    // Why two passes?
    //
    // The admin grade endpoint stores a full record snapshot in valor_antes /
    // valor_depois, so id_estudante and id_disciplina are readable from the JSON.
    //
    // The orientador grade endpoint may use delta-logging (only changed fields)
    // or a different serialisation — the JSON may contain AC3, TTP etc. but NOT
    // id_estudante. In that case Pass 1 produces nothing, and Pass 2 falls back
    // to querying the Nota table directly via id_registro (the nota PK, which is
    // always present in every audit row regardless of how the log was written).

    const estudanteIdSet = new Set<number>()
    const disciplinaIdSet = new Set<number>()

    // Nota log ids where Pass 1 could not resolve a student from the JSON
    const notasSemEstudante = new Set<number>() // values are id_registro (= id_nota)

    // Pass 1: extract ids from the JSON snapshot
    for (const log of logs) {
      if (!TABELAS_COM_ID_ESTUDANTE.has(log.tabela)) continue
      try {
        const obj = JSON.parse(log.valor_antes ?? log.valor_depois ?? "{}")

        const idEst = parseIntField(obj.id_estudante)
        if (!isNaN(idEst)) {
          estudanteIdSet.add(idEst)
        } else if (log.tabela === "Nota") {
          // Could not get student from JSON — queue for DB fallback
          notasSemEstudante.add(log.id_registro)
        }

        if (log.tabela === "Nota") {
          const idDisc = parseIntField(obj.id_disciplina)
          if (!isNaN(idDisc)) disciplinaIdSet.add(idDisc)
        }
      } catch { /* JSON invalido */ }
    }

    // Pass 2: DB fallback for Nota logs missing id_estudante in JSON
    // Maps id_nota -> { id_estudante, id_disciplina } — used later in logsFormatados
    const notaIdMap = new Map<number, { id_estudante: number; id_disciplina: number }>()

    if (notasSemEstudante.size > 0) {
      const notasDB = await prisma.nota.findMany({
        where: { id_nota: { in: [...notasSemEstudante] } },
        select: { id_nota: true, id_estudante: true, id_disciplina: true },
      })
      for (const n of notasDB) {
        estudanteIdSet.add(n.id_estudante)
        disciplinaIdSet.add(n.id_disciplina)
        notaIdMap.set(n.id_nota, {
          id_estudante: n.id_estudante,
          id_disciplina: n.id_disciplina,
        })
      }
    }

    // Fetch all resolved students and disciplines in one round-trip
    const [estudantes, disciplinas] = await Promise.all([
      estudanteIdSet.size > 0
        ? prisma.estudante.findMany({
            where: { id_estudante: { in: [...estudanteIdSet] } },
            select: {
              id_estudante: true,
              nome_completo: true,
              numero_estudante: true,
              curso: { select: { nome_curso: true } },
            },
          })
        : Promise.resolve([]),
      disciplinaIdSet.size > 0
        ? prisma.disciplina.findMany({
            where: { id_disciplina: { in: [...disciplinaIdSet] } },
            select: {
              id_disciplina: true,
              nome_disciplina: true,
              ano_curricular: true,
            },
          })
        : Promise.resolve([]),
    ])

    const estudanteMap = new Map(estudantes.map((e) => [e.id_estudante, e]))
    const disciplinaMap = new Map(disciplinas.map((d) => [d.id_disciplina, d]))

    // Also resolve disciplines and courses for the new table types
    const cursoIdSet = new Set<number>()

    for (const log of logs) {
      try {
        const obj = JSON.parse(log.valor_antes ?? log.valor_depois ?? "{}")

        // For new tables, extract id_disciplina and id_curso from JSON
        if (TABELAS_COM_DISCIPLINA.has(log.tabela) && log.tabela !== "Nota") {
          const idDisc = parseIntField(obj.id_disciplina)
          if (!isNaN(idDisc)) disciplinaIdSet.add(idDisc)
        }

        if (TABELAS_COM_CURSO.has(log.tabela)) {
          const idCurso = parseIntField(obj.id_curso)
          if (!isNaN(idCurso)) cursoIdSet.add(idCurso)
        }

        // For ProfessorDisciplina, extract id_usuario to resolve professor name
        if (log.tabela === "ProfessorDisciplina") {
          const idProf = parseIntField(obj.id_usuario)
          if (!isNaN(idProf)) estudanteIdSet.add(idProf) // reuse set for user lookup
        }
      } catch { /* JSON invalido */ }
    }

    // Fetch courses for context
    const [cursosDB] = await Promise.all([
      cursoIdSet.size > 0
        ? prisma.curso.findMany({
            where: { id_curso: { in: [...cursoIdSet] } },
            select: { id_curso: true, nome_curso: true },
          })
        : Promise.resolve([]),
    ])

    const cursoMap = new Map(cursosDB.map((c) => [c.id_curso, c]))

    // Fetch professors' names for ProfessorDisciplina logs
    const professorIdSet = new Set<number>()
    for (const log of logs) {
      if (log.tabela !== "ProfessorDisciplina") continue
      try {
        const obj = JSON.parse(log.valor_antes ?? log.valor_depois ?? "{}")
        const idProf = parseIntField(obj.id_usuario)
        if (!isNaN(idProf)) professorIdSet.add(idProf)
      } catch { /* JSON invalido */ }
    }

    const professorUsuarios = professorIdSet.size > 0
      ? await prisma.usuario.findMany({
          where: { id_usuario: { in: [...professorIdSet] } },
          select: {
            id_usuario: true,
            nome_usuario: true,
            orientador: { select: { nome_completo: true } },
          },
        })
      : []
    const professorMap = new Map(professorUsuarios.map(u => [u.id_usuario, u]))

    // Formatar resposta
    const logsFormatados = logs.map((log) => {
      const base = {
        ...log,
        id_audit: log.id,
        nome_usuario: log.usuario?.nome_usuario ?? "Desconhecido",
        email_usuario: log.usuario?.email ?? "",
      }

      // Handle new table types with context
      try {
        const obj = JSON.parse(log.valor_antes ?? log.valor_depois ?? "{}")

        // HorarioAula context
        if (log.tabela === "HorarioAula") {
          const idDisc = parseIntField(obj.id_disciplina)
          const disciplina = !isNaN(idDisc) ? disciplinaMap.get(idDisc) : undefined
          const idCurso = parseIntField(obj.id_curso)
          const curso = !isNaN(idCurso) ? cursoMap.get(idCurso) : undefined
          return {
            ...base,
            contexto_horario: {
              disciplina: disciplina?.nome_disciplina ?? null,
              curso: curso?.nome_curso ?? null,
              dia_semana: obj.dia_semana ?? null,
              hora_inicio: obj.hora_inicio ?? null,
              hora_fim: obj.hora_fim ?? null,
              turno: obj.turno ?? null,
              sala: obj.sala ?? null,
            }
          }
        }

        // PlanoProva context
        if (log.tabela === "PlanoProva") {
          const idDisc = parseIntField(obj.id_disciplina)
          const disciplina = !isNaN(idDisc) ? disciplinaMap.get(idDisc) : undefined
          const idCurso = parseIntField(obj.id_curso)
          const curso = !isNaN(idCurso) ? cursoMap.get(idCurso) : undefined
          return {
            ...base,
            contexto_prova: {
              disciplina: disciplina?.nome_disciplina ?? null,
              curso: curso?.nome_curso ?? null,
              tipo_prova: obj.tipo_prova ?? null,
              data_prova: obj.data_prova ?? null,
              turno: obj.turno ?? null,
              hora_inicio: obj.hora_inicio ?? null,
              hora_fim: obj.hora_fim ?? null,
            }
          }
        }

        // PeriodoProva context
        if (log.tabela === "PeriodoProva") {
          const idCurso = parseIntField(obj.id_curso)
          const curso = !isNaN(idCurso) ? cursoMap.get(idCurso) : undefined
          return {
            ...base,
            contexto_periodo: {
              curso: curso?.nome_curso ?? null,
              ano_curricular: obj.ano_curricular ?? null,
              semestre: obj.semestre ?? null,
              data_inicio: obj.data_inicio ?? null,
              data_fim: obj.data_fim ?? null,
            }
          }
        }

        // ProfessorDisciplina context
        if (log.tabela === "ProfessorDisciplina") {
          const idDisc = parseIntField(obj.id_disciplina)
          const disciplina = !isNaN(idDisc) ? disciplinaMap.get(idDisc) : undefined
          const idProf = parseIntField(obj.id_usuario)
          const professor = !isNaN(idProf) ? professorMap.get(idProf) : undefined
          return {
            ...base,
            contexto_professor: {
              nome_professor: professor?.orientador?.nome_completo ?? professor?.nome_usuario ?? obj.nome_usuario ?? null,
              disciplina: disciplina?.nome_disciplina ?? null,
            }
          }
        }
      } catch { /* JSON invalido */ }

      if (!TABELAS_COM_ID_ESTUDANTE.has(log.tabela)) return base

      try {
        const obj = JSON.parse(log.valor_antes ?? log.valor_depois ?? "{}")

        // Resolve student + discipline
        // Primary: ids from the JSON (Pass 1 — admin path)
        // Fallback: ids looked up via id_registro (Pass 2 — orientador path)
        let idEstudante = parseIntField(obj.id_estudante)
        let idDisciplina = parseIntField(obj.id_disciplina)

        if (isNaN(idEstudante) && log.tabela === "Nota") {
          const fallback = notaIdMap.get(log.id_registro)
          if (fallback) {
            idEstudante = fallback.id_estudante
            idDisciplina = fallback.id_disciplina
          }
        }

        const estudante = estudanteMap.get(idEstudante)
        const disciplina = log.tabela === "Nota" ? disciplinaMap.get(idDisciplina) : undefined

        const contexto_estudante = estudante
          ? {
              nome: estudante.nome_completo,
              numero_estudante: estudante.numero_estudante ?? undefined,
              ano_curricular: disciplina?.ano_curricular ?? undefined,
              curso: estudante.curso.nome_curso,
              disciplina: disciplina?.nome_disciplina ?? undefined,
            }
          : undefined

        // Payment identity (PagamentoPropina)
        let contexto_pagamento: Record<string, unknown> | undefined
        if (log.tabela === "PagamentoPropina") {
          const mesNum = typeof obj.mes === "number" ? obj.mes : null
          contexto_pagamento = {
            mes: mesNum,
            mes_nome: mesNum !== null ? (MESES_PT[mesNum] ?? String(mesNum)) : null,
            ano: obj.ano ?? null,
            referencia: obj.referencia ?? null,
            valor_base: obj.valor_base != null ? Number(obj.valor_base) : null,
            valor_multa: obj.valor_multa != null ? Number(obj.valor_multa) : null,
            valor_total: obj.valor_total != null ? Number(obj.valor_total) : null,
            forma_pagamento: obj.forma_pagamento ?? null,
          }
        }

        // Invoice identity (Factura)
        let contexto_factura: Record<string, unknown> | undefined
        if (log.tabela === "Factura") {
          contexto_factura = {
            numero_factura: obj.numero_factura ?? null,
            descricao_servico: obj.descricao_servico ?? null,
            valor_total: obj.valor_total != null ? Number(obj.valor_total) : null,
            periodo: obj.periodo ?? null,
            ano_lectivo: obj.ano_lectivo ?? null,
          }
        }

        // Debt note identity (NotaCobranca)
        let contexto_cobranca: Record<string, unknown> | undefined
        if (log.tabela === "NotaCobranca") {
          contexto_cobranca = {
            descricao: obj.descricao ?? null,
            valor: obj.valor != null ? Number(obj.valor) : null,
          }
        }

        return {
          ...base,
          ...(contexto_estudante ? { contexto_estudante } : {}),
          ...(contexto_pagamento ? { contexto_pagamento } : {}),
          ...(contexto_factura ? { contexto_factura } : {}),
          ...(contexto_cobranca ? { contexto_cobranca } : {}),
        }
      } catch {
        return base
      }
    })

    return NextResponse.json({
      logs: logsFormatados,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      tabelas: tabelasRaw.map((t) => t.tabela),
      roles: TODOS_OS_ROLES,
      usuarios: allUsers,
      cursos,
    })
  } catch (error) {
    console.error("Erro ao buscar audit logs:", error)
    return NextResponse.json(
      { error: "Erro ao buscar logs de auditoria" },
      { status: 500 }
    )
  }
}