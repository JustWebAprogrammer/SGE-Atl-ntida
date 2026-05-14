import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { calcularNotaFinal } from '@/lib/notas'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') // 'notas' ou 'pagamentos'
    const ano = searchParams.get('ano') // ano lectivo

    const id_estudante = Number(id)

    if (tipo === 'notas') {
      // Buscar o curso do estudante para obter o mapeamento correcto CursoDisciplina
      const estudante = await prisma.estudante.findUnique({
        where: { id_estudante },
        select: { id_curso: true }
      })

      if (!estudante) {
        return NextResponse.json({ error: 'Estudante não encontrado' }, { status: 404 })
      }

      // Buscar mapeamento CursoDisciplina para saber ano_curricular e semestre correctos
      const curriculoMapping = await prisma.cursoDisciplina.findMany({
        where: { id_curso: estudante.id_curso },
        select: { id_disciplina: true, ano_curricular: true, semestre: true },
      })
      const disciplinaAnoMap = new Map(curriculoMapping.map(cd => [cd.id_disciplina, cd.ano_curricular]))
      const disciplinaSemestreMap = new Map(curriculoMapping.map(cd => [cd.id_disciplina, cd.semestre]))

      // Se ano foi fornecido, filtrar por disciplinas que nesse curso estão nesse ano curricular
      const idsDisciplinasDoAno = ano
        ? curriculoMapping.filter(cd => cd.ano_curricular === Number(ano)).map(cd => cd.id_disciplina)
        : undefined

      const notas = await prisma.nota.findMany({
        where: {
          id_estudante,
          ...(idsDisciplinasDoAno ? { id_disciplina: { in: idsDisciplinasDoAno } } : {}),
        },
        include: {
          disciplina: {
            select: {
              id_disciplina: true,
              nome_disciplina: true,
              codigo_disciplina: true,
              ano_curricular: true,
            }
          }
        }
      })

      // Mapear as notas com ano e semestre correctos do CursoDisciplina
      const notasMapeadas = notas.map(n => {
        const anoCurricular = disciplinaAnoMap.get(n.id_disciplina) ?? n.disciplina.ano_curricular
        const semestre = disciplinaSemestreMap.get(n.id_disciplina) ?? 'S1'
        return {
          ...n,
          disciplina: {
            ...n.disciplina,
            ano_curricular: anoCurricular,
            semestre,
          }
        }
      })

      // Ordenar por ano curricular, semestre, nome
      notasMapeadas.sort((a, b) => {
        if (a.disciplina.ano_curricular !== b.disciplina.ano_curricular) {
          return a.disciplina.ano_curricular - b.disciplina.ano_curricular
        }
        if (a.disciplina.semestre !== b.disciplina.semestre) {
          return a.disciplina.semestre.localeCompare(b.disciplina.semestre)
        }
        return a.disciplina.nome_disciplina.localeCompare(b.disciplina.nome_disciplina, 'pt', { sensitivity: 'base' })
      })

      return NextResponse.json(notasMapeadas)
    }

    if (tipo === 'pagamentos') {
      // Buscar propinas do estudante
      const propinas = await prisma.pagamentoPropina.findMany({
        where: { id_estudante },
        orderBy: { data_pagamento: 'desc' }
      })

      // Buscar facturas/outros serviços do estudante
      const facturas = await prisma.factura.findMany({
        where: { id_estudante },
        orderBy: { data_emissao: 'desc' }
      })

      // Formatar propinas com tipo "propina"
      const pagamentosPropinas = propinas.map(p => ({
        id: p.id_pagamento,
        tipo: 'propina',
        referencia: p.referencia,
        descricao: `Propina - ${p.mes}/${p.ano}`,
        valor: Number(p.valor_total),
        valor_base: Number(p.valor_base),
        valor_multa: Number(p.valor_multa),
        valor_total: Number(p.valor_total),
        estado: p.estado,
        data: p.data_pagamento || p.data_vencimento,
        mes: p.mes,
        ano: p.ano
      }))

      // Formatar facturas com tipo "servico"
      const pagamentosServicos = facturas.map(f => ({
        id: f.id_factura,
        tipo: 'servico',
        referencia: f.numero_factura || '',
        descricao: f.descricao_servico || 'Serviço',
        valor: Number(f.valor_final || f.valor_total),
        valor_base: Number(f.valor_total),
        valor_multa: 0,
        valor_total: Number(f.valor_final || f.valor_total),
        estado: f.estado,
        data: f.data_pagamento || f.data_emissao,
        mes: null,
        ano: null
      }))

      // Combinar e ordenar por data (mais recentes primeiro)
      const todosPagamentos = [...pagamentosPropinas, ...pagamentosServicos]
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

      return NextResponse.json(todosPagamentos)
    }

    // Se não especificar tipo, retorna informações básicas do estudante
    const estudante = await prisma.estudante.findUnique({
      where: { id_estudante },
      include: {
        curso: true,
        usuario: {
          select: { email: true, nome_usuario: true }
        }
      }
    })

    return NextResponse.json(estudante)

  } catch (error) {
    console.error('Erro ao buscar detalhes do estudante:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

import bcrypt from "bcryptjs"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { tipo, id_registro, ...dados } = body // tipo: 'nota', 'pagamento' ou 'reset_password'

    if (tipo === 'reset_password') {
      // Reset password to default "estudante12345"
      const id_estudante = Number(id)
      
      // Find the student to get their user ID
      const estudante = await prisma.estudante.findUnique({
        where: { id_estudante },
        select: { id_usuario: true }
      })
      
      if (!estudante) {
        return NextResponse.json({ error: 'Estudante não encontrado' }, { status: 404 })
      }
      
      // Hash new password
      const novaSenhaHash = await bcrypt.hash('estudante12345', 10)
      
      // Update the user's password
      await prisma.usuario.update({
        where: { id_usuario: estudante.id_usuario },
        data: { senha: novaSenhaHash }
      })
      
      // Log audit
      await logAudit({
        id_usuario: Number(session.user.id),
        acao: 'Reset Password Estudante',
        tabela: 'Usuario',
        id_registro: estudante.id_usuario,
        ip_address: request.headers.get('x-forwarded-for') || 'localhost'
      })
      
      return NextResponse.json({ success: true, message: 'Password redefinido para: estudante12345' })
    }

    if (tipo === 'nota') {
      // Atualizar nota
      const notaAtual = await prisma.nota.findUnique({
        where: { id_nota: Number(id_registro) },
        include: {
          disciplina: {
            select: {
              tem_dispensa: true,
              nota_dispensa: true,
            },
          },
        },
      })

      if (!notaAtual) {
        return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 })
      }

      // Preparar dados para atualização
      const dadosAtualizar: Record<string, any> = {}

      // Só atualizar campos que foram enviados com valor numérico (ignorar null)
      if (dados.ac1 !== undefined && dados.ac1 !== null) dadosAtualizar.ac1 = dados.ac1
      if (dados.ac2 !== undefined && dados.ac2 !== null) dadosAtualizar.ac2 = dados.ac2
      if (dados.ac3 !== undefined && dados.ac3 !== null) dadosAtualizar.ac3 = dados.ac3
      if (dados.ttp !== undefined && dados.ttp !== null) dadosAtualizar.ttp = dados.ttp
      if (dados.pp1 !== undefined && dados.pp1 !== null) dadosAtualizar.pp1 = dados.pp1
      if (dados.pp2 !== undefined && dados.pp2 !== null) dadosAtualizar.pp2 = dados.pp2
      if (dados.exame !== undefined && dados.exame !== null) dadosAtualizar.exame = dados.exame
      if (dados.recurso !== undefined && dados.recurso !== null) dadosAtualizar.recurso = dados.recurso
      if (dados.exame_especial !== undefined && dados.exame_especial !== null) dadosAtualizar.exame_especial = dados.exame_especial

      // Calcular nota final com a lógica do sistema
      const resultado = calcularNotaFinal(
        {
          ac1: dadosAtualizar.ac1 ?? notaAtual.ac1,
          ac2: dadosAtualizar.ac2 ?? notaAtual.ac2,
          ac3: dadosAtualizar.ac3 ?? notaAtual.ac3,
          ttp: dadosAtualizar.ttp ?? notaAtual.ttp,
          pp1: dadosAtualizar.pp1 ?? notaAtual.pp1,
          pp2: dadosAtualizar.pp2 ?? notaAtual.pp2,
          exame: dadosAtualizar.exame ?? notaAtual.exame,
          recurso: dadosAtualizar.recurso ?? notaAtual.recurso,
          exame_especial: dadosAtualizar.exame_especial ?? notaAtual.exame_especial,
        },
        {
          tem_dispensa: notaAtual.disciplina.tem_dispensa,
          nota_dispensa: notaAtual.disciplina.nota_dispensa,
        }
      )

      dadosAtualizar.nota_final = resultado.nota_final
      dadosAtualizar.dispensada = resultado.dispensada
      dadosAtualizar.tipo_avaliacao = resultado.tipo

      const nota = await prisma.nota.update({
        where: { id_nota: Number(id_registro) },
        data: dadosAtualizar,
      })

      // Log audit
      await logAudit({
        id_usuario: Number(session.user.id),
        acao: 'Atualizar Nota',
        tabela: 'Nota',
        id_registro: nota.id_nota,
        valor_antes: notaAtual,
        valor_depois: nota,
        ip_address: request.headers.get('x-forwarded-for') || 'localhost'
      })

      return NextResponse.json(nota)
    }

    if (tipo === 'pagamento') {
      // Atualizar pagamento - primeiro verificar se é Propina ou Factura
      const id = Number(id_registro)
      const novoEstado = dados.estado
      
      // Tentar encontrar primeiro como Propina
      let pagamentoAtual: any = await prisma.pagamentoPropina.findUnique({
        where: { id_pagamento: id }
      })

      if (pagamentoAtual) {
        // É uma Propina
        const pagamento = await prisma.pagamentoPropina.update({
          where: { id_pagamento: id },
          data: { estado: novoEstado }
        })

        await logAudit({
          id_usuario: Number(session.user.id),
          acao: 'Atualizar Estado Pagamento Propina',
          tabela: 'PagamentoPropina',
          id_registro: pagamento.id_pagamento,
          valor_antes: pagamentoAtual,
          valor_depois: pagamento,
          ip_address: request.headers.get('x-forwarded-for') || 'localhost'
        })

        return NextResponse.json(pagamento)
      }

      // Se não for Propina, tentar como Factura
      pagamentoAtual = await prisma.factura.findUnique({
        where: { id_factura: id }
      })

      if (pagamentoAtual) {
        // É uma Factura/Serviço
        const pagamento = await prisma.factura.update({
          where: { id_factura: id },
          data: { estado: novoEstado }
        })

        await logAudit({
          id_usuario: Number(session.user.id),
          acao: 'Atualizar Estado Pagamento Factura',
          tabela: 'Factura',
          id_registro: pagamento.id_factura,
          valor_antes: pagamentoAtual,
          valor_depois: pagamento,
          ip_address: request.headers.get('x-forwarded-for') || 'localhost'
        })

        return NextResponse.json(pagamento)
      }

      // Se não encontrou nenhum
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  } catch (error) {
    console.error('Erro ao atualizar:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}