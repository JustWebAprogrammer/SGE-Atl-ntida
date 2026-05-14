import * as dotenv from "dotenv"
dotenv.config()

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("========================================")
  console.log("🧹 RESET COMPLETO DA BASE DE DADOS")
  console.log("========================================\n")

  // ── DELETE usando TRUNCATE CASCADE (ignora tabelas que não existem) ──────
  console.log("🗑️  A limpar dados existentes...\n")

  const tabelas = [
    'SnapshotSemestre', 'Declaracao', 'CertificadoDisciplinas', 'Certificado',
    'SolicitacaoOrientacao', 'Premonografia', 'MonografiasParaCorrecao', 'Monografia',
    'Nota', 'PagamentoPropina', 'NotaCobranca', 'Factura', 'CurriculoAcademico',
    'ProfessorDisciplina', 'HorarioAula', 'PlanoProva', 'PeriodoProva',
    'Estudante', 'AuditLog', 'PrecoCurso', 'Servico', 'ConfiguracaoTaxas',
    'Orientador', 'Recepcionista', 'Admin', 'Usuario',
    'CursoDisciplina', 'Disciplina', 'Curso', 'Departamento',
    'SistemaConfig', 'FaseAvaliacao', 'AssinaturaGestor', 'AssinaturaPresidente',
    'AssinaturaDiretor', 'LayoutDocumento'
  ]

  for (const tabela of tabelas) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tabela}" CASCADE`)
    } catch {
      // tabela não existe, ignorar
    }
  }

  console.log("✅ Dados limpos com sucesso!\n")

  // ── Departmentos ──────────────────────────────────────────────────────────
  console.log("📦 A criar departamentos...")

  const deptos = await Promise.all([
    prisma.departamento.create({
      data: {
        nome_departamento: "Engenharia Informática",
        descricao: "Departamento de Engenharia Informática"
      }
    }),
    prisma.departamento.create({
      data: {
        nome_departamento: "Engenharia Civil",
        descricao: "Departamento de Engenharia Civil"
      }
    }),
    prisma.departamento.create({
      data: {
        nome_departamento: "Gestão Empresarial",
        descricao: "Departamento de Gestão Empresarial"
      }
    }),
  ])

  const [deptoEI, deptoEC, deptoGE] = deptos
  console.log(`   ✅ ${deptos.length} departamentos criados\n`)

  // ── Cursos ────────────────────────────────────────────────────────────────
  console.log("📚 A criar cursos...")

  const cursos = await Promise.all([
    prisma.curso.create({
      data: {
        nome_curso: "Engenharia Informática",
        duracao_anos: 4,
        turnos: "Matinal,Vespertino",
        id_departamento: deptoEI.id_departamento
      }
    }),
    prisma.curso.create({
      data: {
        nome_curso: "Engenharia Civil",
        duracao_anos: 4,
        turnos: "Matinal,Vespertino",
        id_departamento: deptoEC.id_departamento
      }
    }),
    prisma.curso.create({
      data: {
        nome_curso: "Gestão Empresarial",
        duracao_anos: 3,
        turnos: "Matinal,Noturno",
        id_departamento: deptoGE.id_departamento
      }
    }),
  ])

  const [cursoEI, cursoEC, cursoGE] = cursos
  console.log(`   ✅ ${cursos.length} cursos criados\n`)

  // ── Disciplinas ───────────────────────────────────────────────────────────
  console.log("📖 A criar disciplinas...")

  type DiscSeed = {
    nome: string; codigo: string; creditos: number; ano: number; sem: "S1" | "S2"; dispensa: boolean
  }

  const disciplinasEI: DiscSeed[] = [
    // 1º Ano
    { nome: "Matemática I",        codigo: "EI-MAT1", creditos: 6, ano: 1, sem: "S1", dispensa: false },
    { nome: "Programação I",       codigo: "EI-PRG1", creditos: 6, ano: 1, sem: "S1", dispensa: true  },
    { nome: "Sistemas Digitais",   codigo: "EI-SD1",  creditos: 5, ano: 1, sem: "S1", dispensa: true  },
    { nome: "Matemática II",       codigo: "EI-MAT2", creditos: 6, ano: 1, sem: "S2", dispensa: false },
    { nome: "Programação II",      codigo: "EI-PRG2", creditos: 6, ano: 1, sem: "S2", dispensa: true  },
    { nome: "Matemática Discreta", codigo: "EI-MD1",  creditos: 5, ano: 1, sem: "S2", dispensa: false },
    // 2º Ano
    { nome: "Base de Dados I",         codigo: "EI-BD1", creditos: 5, ano: 2, sem: "S1", dispensa: true  },
    { nome: "Redes de Computadores",   codigo: "EI-RC1", creditos: 5, ano: 2, sem: "S1", dispensa: true  },
    { nome: "Sistemas Operativos",     codigo: "EI-SO1", creditos: 5, ano: 2, sem: "S1", dispensa: true  },
    { nome: "Base de Dados II",        codigo: "EI-BD2", creditos: 5, ano: 2, sem: "S2", dispensa: true  },
    { nome: "Engenharia de Software",  codigo: "EI-ES1", creditos: 6, ano: 2, sem: "S2", dispensa: true  },
    // 3º Ano
    { nome: "Inteligência Artificial", codigo: "EI-IA1", creditos: 6, ano: 3, sem: "S1", dispensa: true  },
    { nome: "Programação Avançada",    codigo: "EI-PA1", creditos: 6, ano: 3, sem: "S1", dispensa: true  },
    // 4º Ano
    { nome: "Projecto Final",         codigo: "EI-PF1",  creditos: 10, ano: 4, sem: "S1", dispensa: false },
    { nome: "Monografia",             codigo: "EI-MON1", creditos: 10, ano: 4, sem: "S2", dispensa: false },
  ]

  const disciplinasEC: DiscSeed[] = [
    { nome: "Matemática Aplicada",    codigo: "EC-MAT1", creditos: 6, ano: 1, sem: "S1", dispensa: false },
    { nome: "Desenho Técnico",        codigo: "EC-DT1",  creditos: 5, ano: 1, sem: "S1", dispensa: true  },
    { nome: "Mecânica dos Solos I",   codigo: "EC-MS1",  creditos: 6, ano: 2, sem: "S1", dispensa: false },
    { nome: "Resistência Materiais",  codigo: "EC-RM1",  creditos: 6, ano: 2, sem: "S2", dispensa: false },
    { nome: "Hidráulica",             codigo: "EC-HI1",  creditos: 6, ano: 3, sem: "S1", dispensa: true  },
    { nome: "Estruturas Metálicas",   codigo: "EC-EM1",  creditos: 6, ano: 3, sem: "S2", dispensa: true  },
    { nome: "Projecto de Pontes",     codigo: "EC-PP1",  creditos: 8, ano: 4, sem: "S1", dispensa: false },
    { nome: "Monografia",             codigo: "EC-MON1", creditos: 10, ano: 4, sem: "S2", dispensa: false },
  ]

  const disciplinasGE: DiscSeed[] = [
    { nome: "Contabilidade Geral",    codigo: "GE-CG1",  creditos: 5, ano: 1, sem: "S1", dispensa: true  },
    { nome: "Matemática Financeira",  codigo: "GE-MF1",  creditos: 5, ano: 1, sem: "S1", dispensa: false },
    { nome: "Gestão de Recursos Humanos", codigo: "GE-GRH1", creditos: 5, ano: 1, sem: "S2", dispensa: true },
    { nome: "Marketing",              codigo: "GE-MK1",  creditos: 5, ano: 2, sem: "S1", dispensa: true  },
    { nome: "Economia",               codigo: "GE-EC1",  creditos: 5, ano: 2, sem: "S2", dispensa: false },
    { nome: "Gestão Estratégica",     codigo: "GE-GE1",  creditos: 6, ano: 3, sem: "S1", dispensa: true  },
    { nome: "Ética Empresarial",      codigo: "GE-EE1",  creditos: 4, ano: 3, sem: "S2", dispensa: true  },
    { nome: "Monografia",             codigo: "GE-MON1", creditos: 8, ano: 3, sem: "S2", dispensa: false },
  ]

  const allDisciplinas: { nome: string; codigo: string; creditos: number; ano: number; sem: "S1" | "S2"; dispensa: boolean; deptoId: number }[] = [
    ...disciplinasEI.map(d => ({ ...d, deptoId: deptoEI.id_departamento })),
    ...disciplinasEC.map(d => ({ ...d, deptoId: deptoEC.id_departamento })),
    ...disciplinasGE.map(d => ({ ...d, deptoId: deptoGE.id_departamento })),
  ]

  for (const d of allDisciplinas) {
    await prisma.disciplina.create({
      data: {
        nome_disciplina: d.nome,
        codigo_disciplina: d.codigo,
        creditos: d.creditos,
        ano_curricular: d.ano,
        semestre: d.sem,
        tem_dispensa: d.dispensa,
        nota_dispensa: 14,
        id_departamento: d.deptoId
      }
    })
  }
  console.log(`   ✅ ${allDisciplinas.length} disciplinas criadas\n`)

  // ── CursoDisciplina (ligações) ──────────────────────────────────────────
  console.log("🔗 A ligar disciplinas aos cursos...")

  const allDiscs = await prisma.disciplina.findMany()

  for (const disc of allDiscs) {
    // Determine which course this belongs to by department
    let cursoId: number
    if (disc.id_departamento === deptoEI.id_departamento) cursoId = cursoEI.id_curso
    else if (disc.id_departamento === deptoEC.id_departamento) cursoId = cursoEC.id_curso
    else cursoId = cursoGE.id_curso

    await prisma.cursoDisciplina.create({
      data: {
        id_curso: cursoId,
        id_disciplina: disc.id_disciplina,
        ano_curricular: disc.ano_curricular,
        semestre: disc.semestre
      }
    })
  }
  console.log(`   ✅ ${allDiscs.length} ligações curso-disciplina criadas\n`)

  // ── Config de Taxas ─────────────────────────────────────────────────────
  console.log("💰 A criar configuração de taxas...")

  await prisma.configuracaoTaxas.create({
    data: {
      Propina_ano1: 15000,
      Propina_ano2: 20000,
      Propina_ano3: 25000,
      Propina_ano4: 30000,
      Propina_ano5: 35000,
      Propina_ano6: 40000,
      valor_multa_atraso: 500,
      taxa_reenrollment: 5000,
      duracao_aula_minutos: 90,
      intervalo_aula_minutos: 10,
    }
  })
  console.log("   ✅ Configuração de taxas criada\n")

  // ── Preços por curso ───────────────────────────────────────────────────
  console.log("💵 A criar preços por curso...")

  const precosPorCurso = [
    { cursoId: cursoEI.id_curso, anos: 4 },
    { cursoId: cursoEC.id_curso, anos: 4 },
    { cursoId: cursoGE.id_curso, anos: 3 },
  ]

  for (const pc of precosPorCurso) {
    for (let ano = 1; ano <= pc.anos; ano++) {
      const valorBase = ano === 1 ? 15000 : ano === 2 ? 20000 : ano === 3 ? 25000 : 30000
      await prisma.precoCurso.create({
        data: {
          id_curso: pc.cursoId,
          ano_curricular: ano,
          valor_propina: valorBase,
          valor_multa: 500
        }
      })
    }
  }
  console.log(`   ✅ Preços criados para ${precosPorCurso.length} cursos\n`)

  // ── Serviços ────────────────────────────────────────────────────────────
  console.log("📄 A criar serviços acadêmicos...")

  const servicosSeed = [
    { nome_servico: "Certificado de Conclusão", descricao: "Certificado oficial de conclusão de curso", valor: 1500, ordem: 1 },
    { nome_servico: "Declaração Académica", descricao: "Declaração com histórico de notas", valor: 500, ordem: 2 },
    { nome_servico: "Folha de Prova", descricao: "Cópia de prova de exame", valor: 300, ordem: 3 },
    { nome_servico: "Certificado de Disciplina", descricao: "Certificado de disciplina específica", valor: 800, ordem: 4 },
    { nome_servico: "Taxa de Monografia", descricao: "Taxa de submissão e avaliação de monografia", valor: 5000, ordem: 5 },
    { nome_servico: "Declaração de Matrícula", descricao: "Declaração que o estudante está matriculado", valor: 400, ordem: 6 },
  ]

  for (const s of servicosSeed) {
    await prisma.servico.create({
      data: { ...s, id_configuracao: 1, activo: true }
    })
  }
  console.log(`   ✅ ${servicosSeed.length} serviços criados\n`)

  // ── Admin ────────────────────────────────────────────────────────────────
  console.log("👤 A criar administrador...")

  const senhaAdmin = await bcrypt.hash("admin123", 10)
  const adminUser = await prisma.usuario.create({
    data: {
      nome_usuario: "Administrador",
      email: "admin@ispatlantida.ao",
      senha: senhaAdmin,
      tipo_usuario: "admin"
    }
  })
  await prisma.admin.create({
    data: {
      nome_completo: "Administrador",
      numero_telemovel: "923000001",
      id_usuario: adminUser.id_usuario
    }
  })
  console.log("   ✅ Admin criado: admin@ispatlantida.ao / admin123\n")

  // ── Orientadores ─────────────────────────────────────────────────────────
  console.log("👨‍🏫 A criar orientadores...")

  const senhaOri = await bcrypt.hash("orientador123", 10)

  // Orientador 1 — Eng. Informática, e_gestor=true
  const ori1User = await prisma.usuario.create({
    data: {
      nome_usuario: "Prof. Walter Neto",
      email: "orientador@ispatlantida.ao",
      senha: senhaOri,
      tipo_usuario: "orientador"
    }
  })
  const ori1 = await prisma.orientador.create({
    data: {
      nome_completo: "Prof. Walter Neto",
      especialidade: "Engenharia Informática",
      numero_telemovel: "923000010",
      e_gestor: true,
      id_usuario: ori1User.id_usuario,
      id_departamento: deptoEI.id_departamento
    }
  })

  // Orientador 2 — Eng. Civil, e_gestor=true
  const ori2User = await prisma.usuario.create({
    data: {
      nome_usuario: "Prof. Maria Sousa",
      email: "orientador2@ispatlantida.ao",
      senha: senhaOri,
      tipo_usuario: "orientador"
    }
  })
  const ori2 = await prisma.orientador.create({
    data: {
      nome_completo: "Prof. Maria Sousa",
      especialidade: "Engenharia Civil",
      numero_telemovel: "923000011",
      e_gestor: true,
      id_usuario: ori2User.id_usuario,
      id_departamento: deptoEC.id_departamento
    }
  })

  // Orientador 3 — Gestão, e_gestor=false
  const ori3User = await prisma.usuario.create({
    data: {
      nome_usuario: "Prof. João Mendes",
      email: "orientador3@ispatlantida.ao",
      senha: senhaOri,
      tipo_usuario: "orientador"
    }
  })
  const ori3 = await prisma.orientador.create({
    data: {
      nome_completo: "Prof. João Mendes",
      especialidade: "Gestão Empresarial",
      numero_telemovel: "923000012",
      e_gestor: false,
      id_usuario: ori3User.id_usuario,
      id_departamento: deptoGE.id_departamento
    }
  })

  // Orientador 4 — Eng. Informática, e_gestor=false (apenas orientador)
  const ori4User = await prisma.usuario.create({
    data: {
      nome_usuario: "Prof. Ana Ferreira",
      email: "orientador4@ispatlantida.ao",
      senha: senhaOri,
      tipo_usuario: "orientador"
    }
  })
  const ori4 = await prisma.orientador.create({
    data: {
      nome_completo: "Prof. Ana Ferreira",
      especialidade: "Engenharia Informática",
      numero_telemovel: "923000013",
      e_gestor: false,
      id_usuario: ori4User.id_usuario,
      id_departamento: deptoEI.id_departamento
    }
  })

  console.log("   ✅ 4 orientadores criados")
  console.log("      orientador@ispatlantida.ao / orientador123 (e_gestor=true, EI)")
  console.log("      orientador2@ispatlantida.ao / orientador123 (e_gestor=true, EC)")
  console.log("      orientador3@ispatlantida.ao / orientador123 (e_gestor=false, GE)")
  console.log("      orientador4@ispatlantida.ao / orientador123 (e_gestor=false, EI)\n")

  // ── Recepcionistas ─────────────────────────────────────────────────────
  console.log("👩‍💼 A criar recepcionistas...")

  const senhaRec = await bcrypt.hash("recepcao123", 10)

  const rec1User = await prisma.usuario.create({
    data: {
      nome_usuario: "Joana Costa",
      email: "recepcao@ispatlantida.ao",
      senha: senhaRec,
      tipo_usuario: "recepcionista"
    }
  })
  await prisma.recepcionista.create({
    data: {
      nome_completo: "Joana Costa",
      numero_telemovel: "923000020",
      turno: "Manha",
      id_usuario: rec1User.id_usuario
    }
  })

  const rec2User = await prisma.usuario.create({
    data: {
      nome_usuario: "Pedro Ramos",
      email: "recepcao2@ispatlantida.ao",
      senha: senhaRec,
      tipo_usuario: "recepcionista"
    }
  })
  await prisma.recepcionista.create({
    data: {
      nome_completo: "Pedro Ramos",
      numero_telemovel: "923000021",
      turno: "Tarde",
      id_usuario: rec2User.id_usuario
    }
  })

  console.log("   ✅ 2 recepcionistas criados\n")

  // ── Sistema Config (apenas valores base, matrícula FECHADA) ──────────────
  console.log("⚙️  A criar configuração do sistema (matrícula FECHADA)...")

  await prisma.sistemaConfig.create({
    data: {
      ano_lectivo_inicio: new Date("2025-09-01"),
      ano_lectivo_fim: new Date("2026-07-31"),
      ano_lectivo_label: "2025/2026",
      matricula_data_inicio: new Date("2026-01-15"),
      matricula_data_fim: new Date("2026-03-31"),
      propina_dia_geracao: 5,
      data_simulada: null,
      simulador_ativo: false
    }
  })
  console.log("   ✅ Configuração do sistema criada (matrícula FECHADA)\n")

  // ── Resumo Final ────────────────────────────────────────────────────────
  console.log("========================================")
  console.log("✅ SEED BASE CONCLUÍDO COM SUCESSO!")
  console.log("========================================")
  console.log("\n📋 Credenciais:")
  console.log("   Admin:         admin@ispatlantida.ao / admin123")
  console.log("   Orientadores:  orientador@ispatlantida.ao / orientador123 (e_gestor=true)")
  console.log("                   orientador2@ispatlantida.ao / orientador123 (e_gestor=true)")
  console.log("                   orientador3@ispatlantida.ao / orientador123")
  console.log("                   orientador4@ispatlantida.ao / orientador123")
  console.log("   Recepção:      recepcao@ispatlantida.ao / recepcao123")
  console.log("\n⚠️  Matrícula está FECHADA!")
  console.log("   Para criar estudantes:")
  console.log("   1. Inicie o servidor: npm run dev")
  console.log("   2. Vá ao Admin > Ano Lectivo")
  console.log("   3. Active o simulador com data entre 15/01/2026 e 31/03/2026")
  console.log("   4. Execute: npm run seed-estudantes\n")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())