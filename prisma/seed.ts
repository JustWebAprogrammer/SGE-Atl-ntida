import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// Calcula nota_final_ac (bloco contínuo antes do exame)
function calcNotaAC(ac1: number, ac2: number, ac3: number, ttp: number, pp1: number, pp2: number) {
  const blocoAC = ((ac1 + ac2 + ac3) / 3 + ttp) / 2
  const blocoPP = (pp1 + pp2) / 2
  return (blocoAC + blocoPP) / 2
}

// Calcula nota_final com exame (40% AC + 60% Exame)
function calcComExame(notaAC: number, exame: number) {
  return notaAC * 0.4 + exame * 0.6
}

async function main() {

  // ── Department ──────────────────────────────────────────────────────────────
  const depto = await prisma.departamento.upsert({
    where: { id_departamento: 1 },
    update: {},
    create: {
      nome_departamento: "Engenharia Informática",
      descricao: "Departamento de Engenharia Informática e Civil"
    }
  })

  // ── Course ───────────────────────────────────────────────────────────────────
  const curso = await prisma.curso.upsert({
    where: { id_curso: 1 },
    update: {},
    create: {
      nome_curso: "Engenharia Informática",
      duracao_anos: 4,
      id_departamento: depto.id_departamento
    }
  })

  // ── Configuração Centralizada de Taxas ───────────────────────────────────────
  await prisma.configuracaoTaxas.upsert({
    where: { id_configuracao: 1 },
    update: {},
    create: {
      Propina_ano1: 15000,
      Propina_ano2: 20000,
      Propina_ano3: 25000,
      Propina_ano4: 30000,
      Propina_ano5: 35000,
      Propina_ano6: 40000,
      valor_multa_atraso: 500
    }
  })

  // ── Subjects ─────────────────────────────────────────────────────────────────
  // tem_dispensa: Matemática não dispensa (vai sempre a exame), resto dispensa com ≥14
  const disciplinas = [
    // 1º Ano S1
    { nome: "Matemática I",        codigo: "MAT1", creditos: 6, ano: 1, sem: "S1", dispensa: false },
    { nome: "Programação I",       codigo: "PRG1", creditos: 6, ano: 1, sem: "S1", dispensa: true  },
    { nome: "Sistemas Digitais",   codigo: "SD1",  creditos: 5, ano: 1, sem: "S1", dispensa: true  },
    // 1º Ano S2
    { nome: "Matemática II",       codigo: "MAT2", creditos: 6, ano: 1, sem: "S2", dispensa: false },
    { nome: "Programação II",      codigo: "PRG2", creditos: 6, ano: 1, sem: "S2", dispensa: true  },
    { nome: "Matemática Discreta", codigo: "MD1",  creditos: 5, ano: 1, sem: "S2", dispensa: false },
    // 2º Ano S1
    { nome: "Base de Dados I",         codigo: "BD1", creditos: 5, ano: 2, sem: "S1", dispensa: true  },
    { nome: "Redes de Computadores",   codigo: "RC1", creditos: 5, ano: 2, sem: "S1", dispensa: true  },
    { nome: "Sistemas Operativos",     codigo: "SO1", creditos: 5, ano: 2, sem: "S1", dispensa: true  },
    // 2º Ano S2
    { nome: "Base de Dados II",        codigo: "BD2", creditos: 5, ano: 2, sem: "S2", dispensa: true  },
    { nome: "Engenharia de Software",  codigo: "ES1", creditos: 6, ano: 2, sem: "S2", dispensa: true  },
    // 3º Ano S1
    { nome: "Inteligência Artificial", codigo: "IA1", creditos: 6, ano: 3, sem: "S1", dispensa: true  },
    { nome: "Programação Avançada",    codigo: "PA1", creditos: 6, ano: 3, sem: "S1", dispensa: true  },
    // 4º Ano S1
    { nome: "Projecto Final",  codigo: "PF1",  creditos: 10, ano: 4, sem: "S1", dispensa: false },
    // 4º Ano S2
    { nome: "Monografia",      codigo: "MON1", creditos: 10, ano: 4, sem: "S2", dispensa: false },
  ]

  for (const d of disciplinas) {
    await prisma.disciplina.upsert({
      where: { codigo_disciplina: d.codigo },
      update: {
        ano_curricular: d.ano,
        semestre: d.sem as "S1" | "S2",
        tem_dispensa: d.dispensa,
        nota_dispensa: 14,
      },
      create: {
        nome_disciplina: d.nome,
        codigo_disciplina: d.codigo,
        creditos: d.creditos,
        ano_curricular: d.ano,
        semestre: d.sem as "S1" | "S2",
        tem_dispensa: d.dispensa,
        nota_dispensa: 14,
        id_departamento: depto.id_departamento
      }
    })
  }

  // ── Admin ────────────────────────────────────────────────────────────────────
  const senhaAdmin = await bcrypt.hash("admin123", 10)
  const adminUsuario = await prisma.usuario.upsert({
    where: { email: "admin@ispatlantida.ao" },
    update: {},
    create: {
      nome_usuario: "Administrador",
      email: "admin@ispatlantida.ao",
      senha: senhaAdmin,
      tipo_usuario: "admin"
    }
  })
  
  // Create the Admin record (required for profile to work)
  await prisma.admin.upsert({
    where: { id_usuario: adminUsuario.id_usuario },
    update: {},
    create: {
      nome_completo: "Administrador",
      id_usuario: adminUsuario.id_usuario
    }
  })

  // ── Student: Ben Minogashita ──────────────────────────────────────────────────
  const senhaEst = await bcrypt.hash("student123", 10)
  const usuarioEst = await prisma.usuario.upsert({
    where: { email: "estudante@ispatlantida.ao" },
    update: {},
    create: {
      nome_usuario: "Ben Minogashita",
      email: "estudante@ispatlantida.ao",
      senha: senhaEst,
      tipo_usuario: "estudante"
    }
  })

  const estudante = await prisma.estudante.upsert({
    where: { id_usuario: usuarioEst.id_usuario },
    update: {
      tipo_bolsa: "Cinquenta"
    },
    create: {
      nome_completo: "Ben Minogashita",
      numero_estudante: "20240001",
      id_curso: curso.id_curso,
      id_usuario: usuarioEst.id_usuario,
      ano_current: 2,
      ano_electivo: "2025/2026",
      turno: "Matinal",
      estado: "EmCurso",
      pagamento: "Pendente",
      tipo_bolsa: "Cinquenta",
      ano_bolsa: "2025/2026"
    }
  })

  // Curriculo Academico do Ben — 1º Ano (2024/2025)
  await prisma.curriculoAcademico.upsert({
    where: { id_curriculo: 1 },
    update: {},
    create: {
      id_estudante: estudante.id_estudante,
      ano_lectivo: "2024/2025",
      descricao: "1º Ano"
    }
  })

  // Curriculo Academico do Ben — 2º Ano (2025/2026) se não existir outro
  const curriculo2Ben = await prisma.curriculoAcademico.findFirst({
    where: { id_estudante: estudante.id_estudante, descricao: "2º Ano" }
  })
  if (!curriculo2Ben) {
    await prisma.curriculoAcademico.create({
      data: {
        id_estudante: estudante.id_estudante,
        ano_lectivo: "2025/2026",
        descricao: "2º Ano"
      }
    })
  }

  // ── Grades: 1º Ano (completo) ─────────────────────────────────────────────────
  // Cada disciplina tem notas reais com os componentes

  type NotaSeed = {
    codigo: string
    ano_lectivo: string
    semestre: "S1" | "S2"
    ac1: number; ac2: number; ac3: number; ttp: number; pp1: number; pp2: number
    exame?: number
    recurso?: number
  }

  const notasSeed: NotaSeed[] = [
    // MAT1 — não dispensa, foi a exame
    { codigo: "MAT1", ano_lectivo: "2024/2025", semestre: "S1",
      ac1: 10, ac2: 11, ac3: 12, ttp: 11, pp1: 12, pp2: 10, exame: 13 },
    // PRG1 — dispensou com 15
    { codigo: "PRG1", ano_lectivo: "2024/2025", semestre: "S1",
      ac1: 15, ac2: 16, ac3: 14, ttp: 15, pp1: 16, pp2: 15 },
    // SD1 — dispensou com 14
    { codigo: "SD1", ano_lectivo: "2024/2025", semestre: "S1",
      ac1: 14, ac2: 14, ac3: 15, ttp: 13, pp1: 14, pp2: 15 },
    // MAT2 — não dispensa, foi a exame
    { codigo: "MAT2", ano_lectivo: "2024/2025", semestre: "S2",
      ac1: 9, ac2: 10, ac3: 11, ttp: 10, pp1: 9, pp2: 11, exame: 12 },
    // PRG2 — dispensou com 16
    { codigo: "PRG2", ano_lectivo: "2024/2025", semestre: "S2",
      ac1: 16, ac2: 17, ac3: 15, ttp: 16, pp1: 17, pp2: 16 },
    // MD1 — não dispensa, foi a recurso (nota seca 11)
    { codigo: "MD1", ano_lectivo: "2024/2025", semestre: "S2",
      ac1: 7, ac2: 8, ac3: 9, ttp: 8, pp1: 7, pp2: 9, exame: 0, recurso: 11 },
    // 2º Ano S1 — em curso, só AC parcial lançada
    { codigo: "BD1", ano_lectivo: "2025/2026", semestre: "S1",
      ac1: 13, ac2: 14, ac3: 0, ttp: 0, pp1: 0, pp2: 0 },
    { codigo: "RC1", ano_lectivo: "2025/2026", semestre: "S1",
      ac1: 12, ac2: 11, ac3: 0, ttp: 0, pp1: 0, pp2: 0 },
    { codigo: "SO1", ano_lectivo: "2025/2026", semestre: "S1",
      ac1: 10, ac2: 13, ac3: 0, ttp: 0, pp1: 0, pp2: 0 },
  ]

  // Busca disciplinas do seed para ter os IDs
  const todasDisciplinas = await prisma.disciplina.findMany({
    where: { id_departamento: depto.id_departamento }
  })
  const discMap = new Map(todasDisciplinas.map(d => [d.codigo_disciplina, d]))

  for (const n of notasSeed) {
    const disc = discMap.get(n.codigo)
    if (!disc) continue

    const temTodosComponentes =
      n.ac1 > 0 && n.ac2 > 0 && n.ac3 > 0 &&
      n.ttp > 0 && n.pp1 > 0 && n.pp2 > 0

    let nota_final: number | null = null
    let dispensada = false
    let tipo_avaliacao: "Normal" | "Recurso" | "Especial" = "Normal"

    if (temTodosComponentes) {
      const notaAC = calcNotaAC(n.ac1, n.ac2, n.ac3, n.ttp, n.pp1, n.pp2)

      if (n.recurso !== undefined) {
        // Foi a recurso — nota seca
        nota_final = n.recurso
        tipo_avaliacao = "Recurso"
      } else if (disc.tem_dispensa && notaAC >= disc.nota_dispensa) {
        // Dispensado
        nota_final = Math.round(notaAC * 100) / 100
        dispensada = true
      } else if (n.exame !== undefined) {
        // Foi a exame
        nota_final = Math.round(calcComExame(notaAC, n.exame) * 100) / 100
      } else {
        // AC calculada mas sem exame ainda (em curso)
        nota_final = null
      }
    }

    // Usa updateMany para evitar unique constraint em upsert sem campo único
    const existing = await prisma.nota.findFirst({
      where: {
        id_estudante: estudante.id_estudante,
        id_disciplina: disc.id_disciplina,
        ano_lectivo: n.ano_lectivo,
      }
    })

    const data = {
      ac1: n.ac1, ac2: n.ac2, ac3: n.ac3,
      ttp: n.ttp, pp1: n.pp1, pp2: n.pp2,
      exame: n.exame ?? null,
      recurso: n.recurso ?? null,
      nota_final: nota_final,
      dispensada,
      tipo_avaliacao,
      semestre: n.semestre,
      ano_lectivo: n.ano_lectivo,
    }

    if (existing) {
      await prisma.nota.update({ where: { id_nota: existing.id_nota }, data })
    } else {
      await prisma.nota.create({
        data: {
          id_estudante: estudante.id_estudante,
          id_disciplina: disc.id_disciplina,
          ...data
        }
      })
    }
  }

  // ── Payment ───────────────────────────────────────────────────────────────────
  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  // Verificar se já existe pagamento para este mês/ano antes de criar
  const pagamentoExistenteBen = await prisma.pagamentoPropina.findFirst({
    where: {
      id_estudante: estudante.id_estudante,
      mes,
      ano
    }
  })

  if (!pagamentoExistenteBen) {
    const isLate = now.getDate() > 10
    const valorBase = 28000
    const valorMulta = isLate ? 500 : 0
    const codigo = String(Math.floor(100 + Math.random() * 900))
    const referencia = `PROP-${ano}-${String(mes).padStart(2, "0")}-BEN-${codigo}`

    await prisma.pagamentoPropina.create({
      data: {
        id_estudante: estudante.id_estudante,
        referencia,
        codigo_confirmacao: codigo,
        mes, ano,
        valor_base: valorBase,
        valor_multa: valorMulta,
        valor_total: valorBase + valorMulta,
        data_vencimento: new Date(ano, mes - 1, 10),
        estado: "Pendente",
        emitido_por: "sistema",
      }
    })
    console.log(`📋 Referência de pagamento: ${referencia}`)
    console.log(`🔑 Código de confirmação: ${codigo}`)
  } else {
    console.log(`📋 Pagamento já existe para Ben (${mes}/${ano})`)
  }

  // ── Student: Ana Silva (4º ano para testar monografia) ─────────────────────────
  const senhaEst2 = await bcrypt.hash("student4ano123", 10)
  const usuarioEst2 = await prisma.usuario.upsert({
    where: { email: "ana@ispatlantida.ao" },
    update: {},
    create: {
      nome_usuario: "Ana Silva",
      email: "ana@ispatlantida.ao",
      senha: senhaEst2,
      tipo_usuario: "estudante"
    }
  })

  const estudante2 = await prisma.estudante.upsert({
    where: { id_usuario: usuarioEst2.id_usuario },
    update: {},
    create: {
      nome_completo: "Ana Silva",
      numero_estudante: "20220001",
      id_curso: curso.id_curso,
      id_usuario: usuarioEst2.id_usuario,
      ano_current: 4,
      ano_electivo: "2025/2026",
      turno: "Vespertino",
      estado: "EmCurso",
      pagamento: "Pago"
    }
  })

  // Curriculo Academico da Ana — 1º ao 4º Ano
  const anosAna = [
    { ano: 1, lectivo: "2021/2022" },
    { ano: 2, lectivo: "2022/2023" },
    { ano: 3, lectivo: "2023/2024" },
    { ano: 4, lectivo: "2024/2025" },
  ]
  for (const a of anosAna) {
    const existente = await prisma.curriculoAcademico.findFirst({
      where: { id_estudante: estudante2.id_estudante, descricao: `${a.ano}º Ano` }
    })
    if (!existente) {
      await prisma.curriculoAcademico.create({
        data: {
          id_estudante: estudante2.id_estudante,
          ano_lectivo: a.lectivo,
          descricao: `${a.ano}º Ano`
        }
      })
    }
  }

  // Pagamento da Ana (pago)
  const pagamentoExistenteAna = await prisma.pagamentoPropina.findFirst({
    where: {
      id_estudante: estudante2.id_estudante,
      mes,
      ano
    }
  })

  if (!pagamentoExistenteAna) {
    const referenciaAna = `PROP-${ano}-${String(mes).padStart(2, "0")}-ANA-${String(Math.floor(100 + Math.random() * 900))}`
    await prisma.pagamentoPropina.create({
      data: {
        id_estudante: estudante2.id_estudante,
        referencia: referenciaAna,
        codigo_confirmacao: "999",
        mes, ano,
        valor_base: 41000,
        valor_multa: 0,
        valor_total: 41000,
        data_vencimento: new Date(ano, mes - 1, 10),
        data_pagamento: new Date(),
        estado: "Pago",
        emitido_por: "sistema",
      }
    })
    console.log(`📋 Pagamento criado para Ana (${mes}/${ano})`)
  } else {
    console.log(`📋 Pagamento já existe para Ana (${mes}/${ano})`)
  }

  // ── Orientador ────────────────────────────────────────────────────────────────
  const senhaOri = await bcrypt.hash("orientador123", 10)
  const usuarioOri = await prisma.usuario.upsert({
    where: { email: "orientador@ispatlantida.ao" },
    update: {},
    create: {
      nome_usuario: "Prof. Walter Neto",
      email: "orientador@ispatlantida.ao",
      senha: senhaOri,
      tipo_usuario: "orientador"
    }
  })
  await prisma.orientador.upsert({
    where: { id_usuario: usuarioOri.id_usuario },
    update: {},
    create: {
      nome_completo: "Prof. Walter Neto",
      especialidade: "Engenharia Informática",
      id_usuario: usuarioOri.id_usuario
    }
  })

  // ── Orientador com funções de Gestor (e_gestor = true) ─────────────────────────
  // O orientador já foi criado acima, agora adicionamos e_gestor = true
  const orientadorGestor = await prisma.orientador.findUnique({
    where: { id_usuario: usuarioOri.id_usuario }
  })
  if (orientadorGestor) {
    await prisma.orientador.update({
      where: { id_orientador: orientadorGestor.id_orientador },
      data: { e_gestor: true }
    })
    console.log(`👔 Orientador com funções de gestor: orientador@ispatlantida.ao / orientador123 (e_gestor=true)`)
  }

  // ── Recepcionista ─────────────────────────────────────────────────────────────
  const senhaRec = await bcrypt.hash("recepcao123", 10)
  const usuarioRec = await prisma.usuario.upsert({
    where: { email: "recepcao@ispatlantida.ao" },
    update: {},
    create: {
      nome_usuario: "Recepcionista",
      email: "recepcao@ispatlantida.ao",
      senha: senhaRec,
      tipo_usuario: "recepcionista"
    }
  })
  await prisma.recepcionista.upsert({
    where: { id_usuario: usuarioRec.id_usuario },
    update: {},
    create: {
      nome_completo: "Recepcionista",
      turno: "Manha",
      id_usuario: usuarioRec.id_usuario
    }
  })

  // ── Solicitação de Orientação (Ana Silva → Prof. Walter Neto) ─────────────────
  const orientador = await prisma.orientador.findUnique({
    where: { id_usuario: usuarioOri.id_usuario }
  })

  if (orientador) {
    await prisma.solicitacaoOrientacao.upsert({
      where: {
        id_solicitacao: 1
      },
      update: {},
      create: {
        id_estudante: estudante2.id_estudante,
        id_orientador: orientador.id_orientador,
        data_solicitacao: new Date("2025-01-15"),
        estado: "Aceite",
        observacoes: "Pedido de orientação para monografia sobre Inteligência Artificial aplicada à Educação"
      }
    })
    console.log(`👨‍🏫 Orientação aceite: Ana Silva → Prof. Walter Neto`)

    // ── Monografia da Ana Silva ──────────────────────────────────────────────
    const monografiaExistente = await prisma.monografia.findFirst({
      where: { id_estudante: estudante2.id_estudante }
    })

    if (!monografiaExistente) {
      await prisma.monografia.create({
        data: {
          id_estudante: estudante2.id_estudante,
          titulo: "Inteligência Artificial aplicada à Educação: Um estudo sobre personalização do aprendizado",
          resumo: "Este trabalho investiga como técnicas de inteligência artificial podem ser aplicadas para personalizar o processo de aprendizagem, adaptando conteúdos e metodologias às necessidades individuais dos estudantes. A pesquisa inclui uma revisão bibliográfica sobre IA na educação, análise de casos de uso e desenvolvimento de um protótipo de sistema adaptativo.",
          descricao: "A monografia aborda temas como machine learning, processamento de linguagem natural e sistemas de recomendação aplicados ao contexto educacional.",
          data_submissao: new Date("2025-03-01"),
          estado: "Submetida",
          id_orientador: orientador.id_orientador,
          nome_co_orientador: "Prof. Maria Santos (Universidade de Lisboa)",
          nome_co_autor: "João Pedro (Estudante de Mestrado)"
        }
      })
      console.log(`📄 Monografia criada para Ana Silva com co-autores`)
    }

    // ── Atribuir disciplinas do 2º ano ao orientador ──────────────────────────
    const disciplinas2AnoCodigos = ["BD1", "RC1", "SO1"]
    const disciplinas2Ano = await prisma.disciplina.findMany({
      where: {
        codigo_disciplina: { in: disciplinas2AnoCodigos }
      }
    })

    for (const disciplina of disciplinas2Ano) {
      await prisma.professorDisciplina.upsert({
        where: {
          id_usuario_id_disciplina_ano_lectivo_semestre: {
            id_usuario: orientador.id_usuario,
            id_disciplina: disciplina.id_disciplina,
            ano_lectivo: "2025/2026",
            semestre: "S1"
          }
        },
        update: {},
        create: {
          id_usuario: orientador.id_usuario,
          id_disciplina: disciplina.id_disciplina,
          ano_lectivo: "2025/2026",
          semestre: "S1"
        }
      })
    }
    console.log(`📚 Disciplinas atribuídas ao orientador: ${disciplinas2AnoCodigos.join(", ")}`)
  }

  // ── Orientador 2 (NOT gestor - for testing monografia workflow) ─────────────────
  const senhaOri2 = await bcrypt.hash("orientador123", 10)
  const usuarioOri2 = await prisma.usuario.upsert({
    where: { email: "orientador2@ispatlantida.ao" },
    update: {},
    create: {
      nome_usuario: "Prof. João Mendes",
      email: "orientador2@ispatlantida.ao",
      senha: senhaOri2,
      tipo_usuario: "orientador"
    }
  })
  const orientador2 = await prisma.orientador.upsert({
    where: { id_usuario: usuarioOri2.id_usuario },
    update: {},
    create: {
      nome_completo: "Prof. João Mendes",
      especialidade: "Engenharia de Software",
      id_usuario: usuarioOri2.id_usuario,
      e_gestor: false  // NOT gestor!
    }
  })
  console.log(`👨‍🏫 Orientador 2 (NOT gestor): orientador2@ispatlantida.ao / orientador123`)

  // ── Student: Carlos Manuel (4º ano, assigned to Orientador 2) ─────────────────
  const senhaEst3 = await bcrypt.hash("student4ano123", 10)
  const usuarioEst3 = await prisma.usuario.upsert({
    where: { email: "carlos@ispatlantida.ao" },
    update: {},
    create: {
      nome_usuario: "Carlos Manuel",
      email: "carlos@ispatlantida.ao",
      senha: senhaEst3,
      tipo_usuario: "estudante"
    }
  })

  const estudante3 = await prisma.estudante.upsert({
    where: { id_usuario: usuarioEst3.id_usuario },
    update: {},
    create: {
      nome_completo: "Carlos Manuel",
      numero_estudante: "20220002",
      id_curso: curso.id_curso,
      id_usuario: usuarioEst3.id_usuario,
      ano_current: 4,
      ano_electivo: "2025/2026",
      estado: "EmCurso",
      pagamento: "Pago"
    }
  })

  // Pagamento do Carlos (pago)
  const pagamentoExistenteCarlos = await prisma.pagamentoPropina.findFirst({
    where: {
      id_estudante: estudante3.id_estudante,
      mes,
      ano
    }
  })

  if (!pagamentoExistenteCarlos) {
    const referenciaCarlos = `PROP-${ano}-${String(mes).padStart(2, "0")}-CAR-${String(Math.floor(100 + Math.random() * 900))}`
    await prisma.pagamentoPropina.create({
      data: {
        id_estudante: estudante3.id_estudante,
        referencia: referenciaCarlos,
        codigo_confirmacao: "888",
        mes, ano,
        valor_base: 41000,
        valor_multa: 0,
        valor_total: 41000,
        data_vencimento: new Date(ano, mes - 1, 10),
        data_pagamento: new Date(),
        estado: "Pago",
        emitido_por: "sistema",
      }
    })
    console.log(`📋 Pagamento criado para Carlos (${mes}/${ano})`)
  } else {
    console.log(`📋 Pagamento já existe para Carlos (${mes}/${ano})`)
  }

  // ── Solicitação de Orientação (Carlos → Prof. João Mendes) ─────────────────
  await prisma.solicitacaoOrientacao.upsert({
    where: {
      id_solicitacao: 2
    },
    update: {},
    create: {
      id_estudante: estudante3.id_estudante,
      id_orientador: orientador2.id_orientador,
      data_solicitacao: new Date("2025-01-20"),
      estado: "Aceite",
      observacoes: "Pedido de orientação para monografia sobre Desenvolvimento Web com React e Node.js"
    }
  })
  console.log(`👨‍🏫 Orientação aceite: Carlos Manuel → Prof. João Mendes`)

  // ── Student: Maria Santos (4º ano, pending orientation request) ─────────────────
  const senhaEst4 = await bcrypt.hash("student4ano123", 10)
  const usuarioEst4 = await prisma.usuario.upsert({
    where: { email: "maria@ispatlantida.ao" },
    update: {},
    create: {
      nome_usuario: "Maria Santos",
      email: "maria@ispatlantida.ao",
      senha: senhaEst4,
      tipo_usuario: "estudante"
    }
  })

  const estudante4 = await prisma.estudante.upsert({
    where: { id_usuario: usuarioEst4.id_usuario },
    update: {},
    create: {
      nome_completo: "Maria Santos",
      numero_estudante: "20220003",
      id_curso: curso.id_curso,
      id_usuario: usuarioEst4.id_usuario,
      ano_current: 4,
      ano_electivo: "2025/2026",
      estado: "EmCurso",
      pagamento: "Pago"
    }
  })

  // Pagamento da Maria (pago)
  const pagamentoExistenteMaria = await prisma.pagamentoPropina.findFirst({
    where: {
      id_estudante: estudante4.id_estudante,
      mes,
      ano
    }
  })

  if (!pagamentoExistenteMaria) {
    const referenciaMaria = `PROP-${ano}-${String(mes).padStart(2, "0")}-MAR-${String(Math.floor(100 + Math.random() * 900))}`
    await prisma.pagamentoPropina.create({
      data: {
        id_estudante: estudante4.id_estudante,
        referencia: referenciaMaria,
        codigo_confirmacao: "777",
        mes, ano,
        valor_base: 41000,
        valor_multa: 0,
        valor_total: 41000,
        data_vencimento: new Date(ano, mes - 1, 10),
        data_pagamento: new Date(),
        estado: "Pago",
        emitido_por: "sistema",
      }
    })
    console.log(`📋 Pagamento criado para Maria (${mes}/${ano})`)
  } else {
    console.log(`📋 Pagamento já existe para Maria (${mes}/${ano})`)
  }

  // ── Solicitação de Orientação PENDENTE (Maria → Prof. Walter Neto) ─────────────────
  if (orientador) {
    await prisma.solicitacaoOrientacao.upsert({
      where: {
        id_solicitacao: 3
      },
      update: {},
      create: {
        id_estudante: estudante4.id_estudante,
        id_orientador: orientador.id_orientador,
      data_solicitacao: new Date("2025-02-01"),
      estado: "Pendente",
      observacoes: "Pedido de orientação para monografia sobre Cibersegurança e Proteção de Dados"
      }
    })
    console.log(`👨‍🏫 Orientação PENDENTE: Maria Santos → Prof. Walter Neto`)
  }

  // ── Student: Pedro Costa (4º ano, NO orientation request - for full flow testing) ─────────────────
  const senhaEst5 = await bcrypt.hash("student4ano123", 10)
  const usuarioEst5 = await prisma.usuario.upsert({
    where: { email: "pedro@ispatlantida.ao" },
    update: {},
    create: {
      nome_usuario: "Pedro Costa",
      email: "pedro@ispatlantida.ao",
      senha: senhaEst5,
      tipo_usuario: "estudante"
    }
  })

  const estudante5 = await prisma.estudante.upsert({
    where: { id_usuario: usuarioEst5.id_usuario },
    update: {},
    create: {
      nome_completo: "Pedro Costa",
      numero_estudante: "20220004",
      id_curso: curso.id_curso,
      id_usuario: usuarioEst5.id_usuario,
      ano_current: 4,
      ano_electivo: "2025/2026",
      estado: "EmCurso",
      pagamento: "Pago"
    }
  })

  // Pagamento do Pedro (pago)
  const pagamentoExistentePedro = await prisma.pagamentoPropina.findFirst({
    where: {
      id_estudante: estudante5.id_estudante,
      mes,
      ano
    }
  })

  if (!pagamentoExistentePedro) {
    const referenciaPedro = `PROP-${ano}-${String(mes).padStart(2, "0")}-PED-${String(Math.floor(100 + Math.random() * 900))}`
    await prisma.pagamentoPropina.create({
      data: {
        id_estudante: estudante5.id_estudante,
        referencia: referenciaPedro,
        codigo_confirmacao: "666",
        mes, ano,
        valor_base: 41000,
        valor_multa: 0,
        valor_total: 41000,
        data_vencimento: new Date(ano, mes - 1, 10),
        data_pagamento: new Date(),
        estado: "Pago",
        emitido_por: "sistema",
      }
    })
    console.log(`📋 Pagamento criado para Pedro (${mes}/${ano})`)
  } else {
    console.log(`📋 Pagamento já existe para Pedro (${mes}/${ano})`)
  }

  // NO orientation request for Pedro - he can test the full flow from scratch!
  console.log(`🆕 Pedro Costa (4º ano) - SEM orientação - pode testar o fluxo completo!`)

  console.log("✅ Seed concluído com sucesso.")
  console.log(`🎓 Número de estudante: 20240001`)
  // ── Serviços Acadêmicos ──────────────────────────────────────────────────────
  const servicosSeed = [
    { nome_servico: "Certificado de Conclusão", descricao: "Certificado oficial de conclusão de curso", valor: 1500, ordem: 1 },
    { nome_servico: "Declaração Académica", descricao: "Declaração com histórico de notas", valor: 500, ordem: 2 },
    { nome_servico: "Folha de Prova", descricao: "Cópia de prova de exame", valor: 300, ordem: 3 },
    { nome_servico: "Certificado de Disciplina", descricao: "Certificado de disciplina específica", valor: 800, ordem: 4 },
    { nome_servico: "Taxa de Monografia", descricao: "Taxa de submissão e avaliação de monografia", valor: 5000, ordem: 5 },
    { nome_servico: "Declaração de Matrícula", descricao: "Declaração que o estudante está matriculado", valor: 400, ordem: 6 },
  ]

  // Check if services already exist before creating
  const existingServicos = await prisma.servico.count()
  if (existingServicos === 0) {
    for (const servico of servicosSeed) {
      await prisma.servico.create({
        data: {
          ...servico,
          id_configuracao: 1,
          activo: true
        }
      })
    }
  }

  console.log(`📄 Serviços criados: ${servicosSeed.length}`)

  console.log(`\n👤 Contas de teste:`)
  console.log(`   Ben (2º ano): estudante@ispatlantida.ao / student123`)
  console.log(`   Ana (4º ano): ana@ispatlantida.ao / student4ano123`)
  console.log(`   Carlos (4º ano): carlos@ispatlantida.ao / student4ano123`)
  console.log(`   Maria (4º ano, orientação pendente): maria@ispatlantida.ao / student4ano123`)
  console.log(`   Pedro (4º ano, SEM orientação): pedro@ispatlantida.ao / student4ano123`)
  console.log(`   Orientador 2 (NOT gestor): orientador2@ispatlantida.ao / orientador123`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())