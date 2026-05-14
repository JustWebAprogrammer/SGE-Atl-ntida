import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return new Response('Não autorizado', { status: 401 })
    }

    const userId = Number(session.user.id)
    const role = session.user.role

    let perfil = null

    // Detectar automaticamente o tipo de utilizador
    switch (role) {
      case 'estudante':
        // First get usuario data (always exists)
        const usuarioEstudante = await prisma.usuario.findUnique({
          where: { id_usuario: userId },
          select: { nome_usuario: true, email: true }
        })
        
        // Then get estudante-specific data (may not exist)
        const estudanteData = await prisma.estudante.findUnique({
          where: { id_usuario: userId },
          select: {
            nome_completo: true,
            numero_estudante: true,
            numero_telemovel: true
          }
        })

        perfil = {
          nome: estudanteData?.nome_completo || usuarioEstudante?.nome_usuario || "",
          nome_usuario: usuarioEstudante?.nome_usuario || "",
          telemovel: estudanteData?.numero_telemovel || "",
          morada: "",
          numero_estudante: estudanteData?.numero_estudante || "",
          email: usuarioEstudante?.email || ""
        }
        break

      case 'orientador':
        // First get usuario data (always exists)
        const usuarioOrientador = await prisma.usuario.findUnique({
          where: { id_usuario: userId },
          select: { nome_usuario: true, email: true }
        })
        
        // Then get orientador-specific data (may not exist)
        const orientadorData = await prisma.orientador.findUnique({
          where: { id_usuario: userId },
          select: {
            nome_completo: true,
            especialidade: true,
            numero_telemovel: true
          }
        })

        perfil = {
          nome: orientadorData?.nome_completo || usuarioOrientador?.nome_usuario || "",
          nome_usuario: usuarioOrientador?.nome_usuario || "",
          telemovel: orientadorData?.numero_telemovel || "",
          morada: "",
          especialidade: orientadorData?.especialidade || "",
          email: usuarioOrientador?.email || ""
        }
        break

      case 'recepcionista':
        // First get usuario data (always exists)
        const usuarioRecepcionista = await prisma.usuario.findUnique({
          where: { id_usuario: userId },
          select: { nome_usuario: true, email: true }
        })
        
        // Then try to get recepcionista-specific data (may not exist)
        const recepcionistaData = await prisma.recepcionista.findUnique({
          where: { id_usuario: userId },
          select: {
            nome_completo: true,
            numero_telemovel: true
          }
        })

        perfil = {
          nome: recepcionistaData?.nome_completo || usuarioRecepcionista?.nome_usuario || "",
          nome_usuario: usuarioRecepcionista?.nome_usuario || "",
          telemovel: recepcionistaData?.numero_telemovel || "",
          morada: "",
          email: usuarioRecepcionista?.email || ""
        }
        break

      case 'admin':
        // First get the usuario data (always exists)
        const usuarioAdmin = await prisma.usuario.findUnique({
          where: { id_usuario: userId },
          select: { nome_usuario: true, email: true }
        })
        
        // Then try to get admin-specific data (may not exist)
        const adminData = await prisma.admin.findUnique({
          where: { id_usuario: userId },
          select: { nome_completo: true, numero_telemovel: true }
        })

        perfil = {
          nome: adminData?.nome_completo || usuarioAdmin?.nome_usuario || "",
          nome_usuario: usuarioAdmin?.nome_usuario || "",
          telemovel: adminData?.numero_telemovel || "",
          morada: "",
          email: usuarioAdmin?.email || ""
        }
        break
    }

    return Response.json(perfil)

  } catch (error) {
    console.error('Erro perfil:', error)
    return new Response('Erro interno', { status: 500 })
  }
}


export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return new Response('Não autorizado', { status: 401 })
    }

    const userId = Number(session.user.id)
    const role = session.user.role
    const dados = await request.json()

    // ====== VALIDAÇÃO DE EMAIL (tabela Usuario) ======
    // Verificar se o novo email já existe em outro utilizador
    if (dados.email) {
      const emailExistente = await prisma.usuario.findFirst({
        where: {
          email: dados.email,
          NOT: { id_usuario: userId }
        }
      })
      
      if (emailExistente) {
        return Response.json(
          { error: 'Este email já está registado por outro utilizador' },
          { status: 409 }
        )
      }
    }

    // ====== VALIDAÇÃO DE TELEFONE (tabelas Estudante, Admin, Recepcionista) ======
    // Telefone só é verificado se for fornecido e não for vazio
    if (dados.telemovel && dados.telemovel.trim() !== '') {
      // Remover caracteres não numéricos e validar quantidade de dígitos
      const telefoneSemFormatacao = dados.telemovel.replace(/\D/g, '')
      
      // Telefone angolano deve ter exatamente 8 dígitos
      if (telefoneSemFormatacao.length !== 8) {
        return Response.json(
          { error: 'O número de telefone deve ter 8 dígitos (ex: 912345678)' },
          { status: 400 }
        )
      }
      
      // Formatar para padrão angolano (+244 9XXXXXXXX)
      dados.telemovel = `+244 9${telefoneSemFormatacao}`

      // Verificar em estudantes (excluindo o próprio utilizador)
      const telefoneEstudante = await prisma.estudante.findFirst({
        where: {
          numero_telemovel: dados.telemovel,
          NOT: { id_usuario: userId }
        }
      })
      
      if (telefoneEstudante) {
        return Response.json(
          { error: 'Este número de telefone já está registado por outro utilizador' },
          { status: 409 }
        )
      }

      // Verificar em admins (excluindo o próprio utilizador)
      const telefoneAdmin = await prisma.admin.findFirst({
        where: {
          numero_telemovel: dados.telemovel,
          NOT: { id_usuario: userId }
        }
      })
      
      if (telefoneAdmin) {
        return Response.json(
          { error: 'Este número de telefone já está registado por outro utilizador' },
          { status: 409 }
        )
      }

      // Verificar em rececionistas (excluindo o próprio utilizador)
      const telefoneRecepcionista = await prisma.recepcionista.findFirst({
        where: {
          numero_telemovel: dados.telemovel,
          NOT: { id_usuario: userId }
        }
      })
      
      if (telefoneRecepcionista) {
        return Response.json(
          { error: 'Este número de telefone já está registado por outro utilizador' },
          { status: 409 }
        )
      }
    }

    // Actualizar dados do usuario
    // NOTE: nome_completo lives in role-specific tables (Admin, Estudante, etc.), not in Usuario
    const dadosUpdate: {
      nome_usuario: string
      email?: string
      senha?: string
    } = {
      nome_usuario: dados.nome_usuario
    }

    // Actualizar email se foi alterado
    if (dados.email) {
      dadosUpdate.email = dados.email
    }

    // Alterar password se for fornecido
    if (dados.password_actual && dados.password_nova && dados.password_nova === dados.password_confirmar) {
      const usuario = await prisma.usuario.findUnique({ where: { id_usuario: userId } })
      if (usuario) {
        const senhaCorreta = await bcrypt.compare(dados.password_actual, usuario.senha)
        if (senhaCorreta) {
          dadosUpdate.senha = await bcrypt.hash(dados.password_nova, 10)
        }
      }
    }

    await prisma.usuario.update({
      where: { id_usuario: userId },
      data: dadosUpdate
    })

    // Actualizar dados especificos do role
    switch (role) {
      case 'estudante':
        await prisma.estudante.update({
          where: { id_usuario: userId },
          data: {
            nome_completo: dados.nome,
            numero_telemovel: dados.telemovel || null
          }
        })
        break

      case 'orientador':
        await prisma.orientador.update({
          where: { id_usuario: userId },
          data: {
            nome_completo: dados.nome,
            numero_telemovel: dados.telemovel || null
          }
        })
        break

      case 'recepcionista':
        await prisma.recepcionista.update({
          where: { id_usuario: userId },
          data: {
            nome_completo: dados.nome,
            numero_telemovel: dados.telemovel || null
          }
        })
        break

      case 'admin':
        await prisma.admin.update({
          where: { id_usuario: userId },
          data: {
            nome_completo: dados.nome,
            numero_telemovel: dados.telemovel || null
          }
        })
        break
    }

    // Recarregar dados atualizados para retornar na resposta
    let perfilAtualizado = null
    switch (role) {
      case 'estudante':
        const usuarioEstudante = await prisma.usuario.findUnique({
          where: { id_usuario: userId },
          select: { nome_usuario: true, email: true }
        })
        const estudanteData = await prisma.estudante.findUnique({
          where: { id_usuario: userId },
          select: { nome_completo: true, numero_telemovel: true }
        })
        perfilAtualizado = {
          nome: estudanteData?.nome_completo || usuarioEstudante?.nome_usuario || "",
          nome_usuario: usuarioEstudante?.nome_usuario || "",
          telemovel: estudanteData?.numero_telemovel || "",
          email: usuarioEstudante?.email || ""
        }
        break
      case 'orientador':
        const usuarioOrientador = await prisma.usuario.findUnique({
          where: { id_usuario: userId },
          select: { nome_usuario: true, email: true }
        })
        const orientadorData = await prisma.orientador.findUnique({
          where: { id_usuario: userId },
          select: { nome_completo: true, numero_telemovel: true }
        })
        perfilAtualizado = {
          nome: orientadorData?.nome_completo || usuarioOrientador?.nome_usuario || "",
          nome_usuario: usuarioOrientador?.nome_usuario || "",
          telemovel: orientadorData?.numero_telemovel || "",
          email: usuarioOrientador?.email || ""
        }
        break
      case 'recepcionista':
        const usuarioRecepcionista = await prisma.usuario.findUnique({
          where: { id_usuario: userId },
          select: { nome_usuario: true, email: true }
        })
        const recepcionistaData = await prisma.recepcionista.findUnique({
          where: { id_usuario: userId },
          select: { nome_completo: true, numero_telemovel: true }
        })
        perfilAtualizado = {
          nome: recepcionistaData?.nome_completo || usuarioRecepcionista?.nome_usuario || "",
          nome_usuario: usuarioRecepcionista?.nome_usuario || "",
          telemovel: recepcionistaData?.numero_telemovel || "",
          email: usuarioRecepcionista?.email || ""
        }
        break
      case 'admin':
        const usuarioAdmin = await prisma.usuario.findUnique({
          where: { id_usuario: userId },
          select: { nome_usuario: true, email: true }
        })
        const adminData = await prisma.admin.findUnique({
          where: { id_usuario: userId },
          select: { nome_completo: true, numero_telemovel: true }
        })
        perfilAtualizado = {
          nome: adminData?.nome_completo || usuarioAdmin?.nome_usuario || "",
          nome_usuario: usuarioAdmin?.nome_usuario || "",
          telemovel: adminData?.numero_telemovel || "",
          email: usuarioAdmin?.email || ""
        }
        break
    }
    
    return Response.json({ sucesso: true, perfil: perfilAtualizado })

  } catch (error) {
    console.error('Erro salvar perfil:', error)
    return new Response('Erro interno', { status: 500 })
  }
}