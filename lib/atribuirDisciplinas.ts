import { prisma } from "./prisma"
import { getSystemDate } from "./sistema"
import type { PrismaClient } from "@prisma/client"

/**
 * Atribui automaticamente as disciplinas de TODOS os anos curriculares
 * desde o 1º ano até ao ano actual do estudante, criando registos de
 * Nota em branco (null) para cada disciplina.
 *
 * Deve ser chamado quando:
 *  - Um estudante é criado (POST admin/estudantes)
 *  - Um estudante muda de ano (ano_current alterado)
 *
 * É idempotente — execuções repetidas produzem o mesmo resultado.
 *
 * @param id_estudante   ID do estudante
 * @param id_curso       ID do curso do estudante
 * @param ano_curricular Ano curricular actual do estudante (ex: 3 para 3º ano)
 * @param ano_lectivo    Ano lectivo actual (ex: "2025/2026")
 * @param prismaClient   (Opcional) PrismaClient para usar em vez do default.
 *                       Útil para scripts seed que usam adapter próprio.
 */
export async function atribuirDisciplinasAoEstudante(
  id_estudante: number,
  id_curso: number,
  ano_curricular: number,
  ano_lectivo: string,
  prismaClient?: PrismaClient
) {
  const db = prismaClient || prisma

  if (ano_curricular < 1) {
    return 0
  }

  // Validate that the passed ano_lectivo matches the system-configured year
  try {
    const { getAnoLectivo } = await import("./sistema")
    const systemAnoLectivo = await getAnoLectivo()
    if (ano_lectivo !== systemAnoLectivo) {
      console.warn(
        `⚠ [atribuirDisciplinas] ano_lectivo "${ano_lectivo}" não corresponde ao ano do sistema "${systemAnoLectivo}". ` +
        `Estudante #${id_estudante}, Curso #${id_curso}, Ano ${ano_curricular}º`
      )
    }
  } catch {
    // silent fail — don't block the operation
  }

  let totalDisciplinas = 0

  // Percorrer todos os anos desde o 1º até ao ano actual
  for (let ano = 1; ano <= ano_curricular; ano++) {
    const criadas = await atribuirDisciplinasParaAno(
      db,
      id_estudante,
      id_curso,
      ano,
      ano_lectivo
    )
    totalDisciplinas += criadas
  }

  return totalDisciplinas
}

/**
 * Atribui disciplinas para UM ano curricular específico.
 * Cria registos de Nota para disciplinas que ainda não existem.
 * 
 * Exportada para ser usada na rematrícula — atribui apenas disciplinas
 * de UM ano específico (evita duplicar disciplinas de anos anteriores).
 */
export async function atribuirDisciplinasParaAno(
  db: PrismaClient,
  id_estudante: number,
  id_curso: number,
  ano_curricular: number,
  ano_lectivo: string
): Promise<number> {
  // 1. Buscar as disciplinas do curso para este ano (via CursoDisciplina)
  const disciplinasDoAno = await db.cursoDisciplina.findMany({
    where: {
      id_curso,
      ano_curricular,
    },
    include: {
      disciplina: {
        select: {
          id_disciplina: true,
          ano_curricular: true,
          semestre: true,
        },
      },
    },
  })

  if (disciplinasDoAno.length === 0) return 0

  // 2. Obter as Notas já existentes para este estudante no ano lectivo
  const notasExistentes = await db.nota.findMany({
    where: {
      id_estudante,
      ano_lectivo,
    },
    select: { id_disciplina: true },
  })
  const existingIds = new Set(notasExistentes.map((n) => n.id_disciplina))

  // 3. Para cada disciplina, criar Nota se não existir
  let criadas = 0
  for (const cd of disciplinasDoAno) {
    if (!existingIds.has(cd.disciplina.id_disciplina)) {
      await db.nota.create({
        data: {
          id_estudante,
          id_disciplina: cd.id_disciplina,
          ano_lectivo,
          semestre: cd.semestre, // ← usar semestre do CursoDisciplina (correcto), não da Disciplina
          // Todos os campos de nota começam como null
          ac1: null,
          ac2: null,
          ac3: null,
          ttp: null,
          pp1: null,
          pp2: null,
          exame: null,
          recurso: null,
          exame_especial: null,
          nota_final: null,
          dispensada: false,
          tipo_avaliacao: "Normal",
        },
      })
      criadas++
    }
  }

  // 4. Criar/actualizar registo no CurriculoAcademico para este ano
  const curriculoExistente = await db.curriculoAcademico.findFirst({
    where: {
      id_estudante,
      descricao: `${ano_curricular}º Ano`,
    },
  })

  if (!curriculoExistente) {
    await db.curriculoAcademico.create({
      data: {
        id_estudante,
        ano_lectivo,
        descricao: `${ano_curricular}º Ano`,
      },
    })
  } else {
    await db.curriculoAcademico.update({
      where: { id_curriculo: curriculoExistente.id_curriculo },
      data: { ano_lectivo },
    })
  }

  return criadas
}

// ── Fix 3: Helpers para propinas de transferência ─────────────────────

/**
 * Gera um código de confirmação de 3 dígitos.
 */
function generateCodigoConfirmacao(): string {
  return String(Math.floor(100 + Math.random() * 900))
}

/**
 * Gera uma referência de propina.
 * Formato: PROP-{YEAR}-{MONTH}-{INITIALS}-{3_DIGIT_CODE}
 */
function generateReferencia(ano: number, mes: number, nomeCompleto: string): string {
  const initials = nomeCompleto
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 4)
  const code = generateCodigoConfirmacao()
  return `PROP-${ano}-${String(mes).padStart(2, "0")}-${initials}-${code}`
}

/**
 * Obtém o preço da propina para um curso e ano curricular específicos.
 * Primeiro procura em PrecoCurso (preço customizado por curso),
 * senão usa o valor global padrão da ConfiguracaoTaxas.
 */
async function getPrecoEstudanteAno(id_curso: number, ano_curricular: number): Promise<number> {
  // Procurar preço específico para este curso e ano
  const precoCurso = await prisma.precoCurso.findUnique({
    where: {
      id_curso_ano_curricular: {
        id_curso,
        ano_curricular,
      },
    },
  })

  if (precoCurso) {
    return Number(precoCurso.valor_propina)
  }

  // Fallback para valor global
  const config = await prisma.configuracaoTaxas.findUnique({
    where: { id_configuracao: 1 },
  })

  if (!config) {
    throw new Error("Configuração de taxas não encontrada (id=1)")
  }

  const campoPropina = `Propina_ano${ano_curricular}` as keyof typeof config
  return Number(config[campoPropina])
}

/**
 * Cria registos de PagamentoPropina com estado "Pago" para meses de anos
 * anteriores ao ano actual do estudante (estudantes transferidos).
 *
 * Para um estudante que entrou no ano X, cria propinas "Pago" para os
 * (X-1) * 12 meses anteriores à data actual.
 *
 * @param id_estudante ID do estudante
 * @param ano_current  Ano curricular actual do estudante
 * @param nomeCompleto Nome completo do estudante (para gerar referências)
 * @param id_curso     ID do curso do estudante
 */
export async function criarPropinasAnosAnteriores(
  id_estudante: number,
  ano_current: number,
  nomeCompleto: string,
  id_curso: number
): Promise<number> {
  // Só aplica a anos anteriores ao actual
  if (ano_current <= 1) return 0

  const now = await getSystemDate()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12

  // Calcular quantos meses de anos anteriores existem
  const mesesAnteriores = (ano_current - 1) * 12

  // Obter meses que já têm registo de propina
  const propinasExistentes = await prisma.pagamentoPropina.findMany({
    where: { id_estudante },
    select: { mes: true, ano: true },
  })
  const existingSet = new Set(propinasExistentes.map((p) => `${p.ano}-${p.mes}`))

  let criadas = 0

  // Gerar meses de trás para a frente
  for (let i = 1; i <= mesesAnteriores; i++) {
    // Mês alvo: retroceder i meses a partir do mês actual
    let mes = currentMonth - i
    let ano = currentYear
    while (mes < 1) {
      mes += 12
      ano--
    }

    const key = `${ano}-${mes}`
    if (existingSet.has(key)) continue

    // Determinar a que ano curricular este mês pertence
    // (agrupando em blocos de 12 meses, do mais recente para o mais antigo)
    const anoCurricularDestino = Math.max(1, ano_current - Math.floor((i - 1) / 12))

    // Obter preço para este ano curricular específico
    let valorBase = 0
    try {
      valorBase = await getPrecoEstudanteAno(id_curso, anoCurricularDestino)
    } catch (err) {
      console.warn(
        `  ⚠ Estudante ${id_estudante}: não foi possível obter preço para ano ${anoCurricularDestino} — usando zero`
      )
    }

    // Data de vencimento: último dia do mês
    const dataVencimento = new Date(ano, mes, 0) // dia 0 do mês seguinte = último dia
    dataVencimento.setHours(0, 0, 0, 0)

    const referencia = generateReferencia(ano, mes, nomeCompleto)
    const codigoConfirmacao = generateCodigoConfirmacao()

    await prisma.pagamentoPropina.create({
      data: {
        id_estudante,
        referencia,
        codigo_confirmacao: codigoConfirmacao,
        mes,
        ano,
        valor_base: valorBase,
        valor_multa: 0,
        valor_total: valorBase,
        data_vencimento: dataVencimento,
        estado: "Pago",
      },
    })

    criadas++
  }

  return criadas
}