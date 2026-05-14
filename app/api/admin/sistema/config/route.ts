import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { getSystemDate, getAnoLectivo } from "@/lib/sistema"

export async function GET() {
  try {
    // Try to get existing config
    const config = await prisma.sistemaConfig.findUnique({
      where: { id_config: 1 },
    })

    // If no config exists, return safe defaults
    if (!config) {
      const systemDate = await getSystemDate()
      const currentYear = systemDate.getFullYear()
      const currentMonth = systemDate.getMonth() + 1
      
      // Default: academic year from September to July
      const defaultStart = new Date(currentYear, 8, 1) // September 1st
      const defaultEnd = new Date(currentYear + 1, 6, 31) // July 31st
      
      // Adjust based on current date
      let academicStart = defaultStart
      let academicEnd = defaultEnd
      if (currentMonth < 9) {
        // Before September: use previous academic year
        academicStart = new Date(currentYear - 1, 8, 1)
        academicEnd = new Date(currentYear, 6, 31)
      }

      const defaultConfig = {
        id_config: 1,
        ano_lectivo_inicio: academicStart,
        ano_lectivo_fim: academicEnd,
        ano_lectivo_label: null,
        matricula_data_inicio: new Date(currentYear, 7, 1), // August 1st
        matricula_data_fim: new Date(currentYear, 8, 30), // September 30th
        propina_dia_geracao: 5,
        data_simulada: null,
        simulador_ativo: false,
        semestre_atual: "S1",
        atualizado_por: null,
        atualizado_em: systemDate,
        usuario: null,
      }
      const isEnrollmentOpen = systemDate >= defaultConfig.matricula_data_inicio && 
                               systemDate <= defaultConfig.matricula_data_fim
      const isWithinAcademicYear = systemDate >= defaultConfig.ano_lectivo_inicio && 
                                   systemDate <= defaultConfig.ano_lectivo_fim
      const diasRestantes = Math.ceil(
        (defaultConfig.ano_lectivo_fim.getTime() - systemDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      const anoLectivoAtual = await getAnoLectivo()

      return NextResponse.json({
        ...defaultConfig,
        is_enrollment_open: isEnrollmentOpen,
        is_within_academic_year: isWithinAcademicYear,
        dias_restantes_ano: diasRestantes,
        system_date: systemDate.toISOString(),
        ano_lectivo_atual: anoLectivoAtual,
      })
    }

    // Calculate derived fields
    const systemDate = await getSystemDate()
    const isEnrollmentOpen = systemDate >= config.matricula_data_inicio && 
                             systemDate <= config.matricula_data_fim
    const isWithinAcademicYear = systemDate >= config.ano_lectivo_inicio && 
                                 systemDate <= config.ano_lectivo_fim
    const diasRestantes = Math.ceil(
      (config.ano_lectivo_fim.getTime() - systemDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    const anoLectivoAtual = await getAnoLectivo()

    return NextResponse.json({
      ...config,
      is_enrollment_open: isEnrollmentOpen,
      is_within_academic_year: isWithinAcademicYear,
      dias_restantes_ano: diasRestantes,
      system_date: systemDate.toISOString(),
      ano_lectivo_atual: anoLectivoAtual,
    })
  } catch (error) {
    console.error("Error fetching sistema config:", error)
    return NextResponse.json(
      { error: "Error interno do servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const {
      ano_lectivo_inicio,
      ano_lectivo_fim,
      matricula_data_inicio,
      matricula_data_fim,
      propina_dia_geracao,
      ano_lectivo_label,
    } = body

    // Calculate ano_lectivo_label if not provided
    let label = ano_lectivo_label
    if (!label && ano_lectivo_inicio && ano_lectivo_fim) {
      const startYear = new Date(ano_lectivo_inicio).getFullYear()
      const endYear = new Date(ano_lectivo_fim).getFullYear()
      label = startYear === endYear ? `${startYear}` : `${startYear}/${endYear}`
    }

    // Upsert the config
    const config = await prisma.sistemaConfig.upsert({
      where: { id_config: 1 },
      create: {
        ano_lectivo_inicio: new Date(ano_lectivo_inicio),
        ano_lectivo_fim: new Date(ano_lectivo_fim),
        ano_lectivo_label: label,
        matricula_data_inicio: new Date(matricula_data_inicio),
        matricula_data_fim: new Date(matricula_data_fim),
        propina_dia_geracao: propina_dia_geracao || 5,
        atualizado_por: parseInt(session.user.id),
      },
      update: {
        ano_lectivo_inicio: new Date(ano_lectivo_inicio),
        ano_lectivo_fim: new Date(ano_lectivo_fim),
        ano_lectivo_label: label,
        matricula_data_inicio: new Date(matricula_data_inicio),
        matricula_data_fim: new Date(matricula_data_fim),
        propina_dia_geracao: propina_dia_geracao || 5,
        atualizado_por: parseInt(session.user.id),
      },
    })

    // Log to audit
    await logAudit({
      id_usuario: parseInt(session.user.id),
      acao: "Atualizar Configuração do Ano Lectivo",
      tabela: "SistemaConfig",
      id_registro: config.id_config,
      valor_depois: config,
      ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error("Error updating sistema config:", error)
    return NextResponse.json(
      { error: "Error interno do servidor" },
      { status: 500 }
    )
  }
}