import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { readFileSync } from "fs"
import { join } from "path"
import { getAnoLectivo, getSystemDate } from "@/lib/sistema"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !["admin", "recepcionista"].includes(session.user.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const certificadoId = parseInt(id)

    const certificado = await prisma.certificado.findUnique({
      where: { id_certificado: certificadoId },
      include: { estudante: { include: { curso: true } } }
    })

    if (!certificado) {
      return NextResponse.json({ error: "Certificado não encontrado" }, { status: 404 })
    }

    const student = certificado.estudante
    const anoLectivo = student.ano_electivo || await getAnoLectivo()

    // Get president signature
    const presidentSignature = await prisma.assinaturaPresidente.findFirst({
      where: { data_fim: null }
    })

    let signatureBase64 = presidentSignature?.imagem_base64 || ""
    if (!signatureBase64 && presidentSignature) {
      try {
        const signaturePath = join(process.cwd(), "public", presidentSignature.caminho_arquivo)
        signatureBase64 = `data:image/png;base64,${readFileSync(signaturePath).toString("base64")}`
      } catch { }
    }

    // Load logo
    let logoBase64 = ""
    try {
      logoBase64 = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "documentos", "logo.png")).toString("base64")}`
    } catch { }

    const systemDate = await getSystemDate()

    if (certificado.tipo_certificado === "Conclusao") {
      const currentYear = student.ano_current || student.curso.duracao_anos || 3
      const allYears = Array.from({ length: currentYear }, (_, i) => i + 1)

      const gradesByYear = await Promise.all(
        allYears.map(async (year) => {
          const notas = await prisma.nota.findMany({
            where: { id_estudante: student.id_estudante, disciplina: { ano_curricular: year }, ano_lectivo: anoLectivo },
            include: { disciplina: true }
          })
          const validGrades = notas.filter(n => n.nota_final !== null && !n.dispensada)
          const average = validGrades.length > 0
            ? (validGrades.reduce((sum, n) => sum + Number(n.nota_final || 0), 0) / validGrades.length)
            : 0
          return { year, average: average.toFixed(2) }
        })
      )

      const monografia = await prisma.monografia.findFirst({
        where: { id_estudante: student.id_estudante, estado: "Defendida" }
      })
      const monografiaGrade = monografia?.nota_final ? Number(monografia.nota_final) : 0
      const yearAverages = gradesByYear.map(y => Number(y.average))
      const allGrades = [...yearAverages, monografiaGrade]
      const finalGrade = allGrades.reduce((sum, g) => sum + g, 0) / allGrades.length

      return NextResponse.json({
        tipo: "Conclusao",
        studentName: student.nome_completo,
        studentNumber: student.numero_estudante || "",
        courseName: student.curso.nome_curso,
        courseDuration: student.curso.duracao_anos || currentYear,
        anoLectivo,
        gradesByYear,
        monografiaGrade: monografiaGrade.toFixed(2),
        finalGrade: finalGrade.toFixed(2),
        finalGradeExtenso: finalGrade.toFixed(2).replace(".", ","),
        presidentSignature: signatureBase64,
        presidentName: presidentSignature?.nome_presidente || "",
        documentNumber: `CERT-${anoLectivo}-${student.numero_estudante}-${certificadoId}`,
        logoUrl: logoBase64,
        systemDate: systemDate.toISOString(),
      })
    }

    if (certificado.tipo_certificado === "Disciplina") {
      const notas = await prisma.nota.findMany({
        where: { id_estudante: student.id_estudante, OR: [{ nota_final: { gte: 10 } }, { dispensada: true }] },
        include: { disciplina: true }
      })

      return NextResponse.json({
        tipo: "Disciplina",
        studentName: student.nome_completo,
        studentNumber: student.numero_estudante || "",
        courseName: student.curso.nome_curso,
        anoLectivo,
        notas: notas.map(n => ({
          id_nota: n.id_nota,
          nota_final: n.nota_final ? Number(n.nota_final) : null,
          dispensada: n.dispensada,
          disciplina: n.disciplina
        })),
        presidentSignature: signatureBase64,
        presidentName: presidentSignature?.nome_presidente || "",
        documentNumber: `DISC-${anoLectivo}-${student.numero_estudante}-${certificadoId}`,
        logoUrl: logoBase64,
        systemDate: systemDate.toISOString(),
      })
    }

    return NextResponse.json({ error: "Tipo de certificado inválido" }, { status: 400 })

  } catch (error) {
    console.error("Error fetching certificate data:", error)
    return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 })
  }
}