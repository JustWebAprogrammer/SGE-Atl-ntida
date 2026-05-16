import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { TipoUsuario } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { DefaultSession } from "next-auth"
import { logAudit } from "@/lib/audit"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: TipoUsuario
      e_gestor: boolean
      tipo_bolsa?: string
      nome_usuario?: string
      nome_completo?: string
    } & DefaultSession["user"]
  }
  interface User {
    role: TipoUsuario
    nome_usuario?: string
    nome_completo?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: TipoUsuario
    id: string
    e_gestor: boolean
    nome_usuario?: string
    nome_completo?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email }
        })

        if (!usuario) return null

        const senhaCorreta = await bcrypt.compare(
          credentials.password,
          usuario.senha
        )

        if (!senhaCorreta) return null

        // Registar login no audit log
        // Nota: req.headers no authorize do NextAuth é um objecto normal, não um Headers padrão
        // por isso usamos bracket notation em vez de .get()
        const headers = req?.headers as Record<string, string> | undefined
        const ip = headers?.["x-forwarded-for"] || "127.0.0.1"
        await logAudit({
          id_usuario: usuario.id_usuario,
          acao: "LOGIN",
          tabela: "Usuario",
          id_registro: usuario.id_usuario,
          valor_depois: { email: usuario.email, tipo: usuario.tipo_usuario },
          ip_address: ip
        })

        return {
          id: usuario.id_usuario.toString(),
          email: usuario.email,
          name: usuario.nome_usuario,
          nome_usuario: usuario.nome_usuario,
          role: usuario.tipo_usuario
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Se está a fazer login (user existe), preencher os campos base
      if (user) {
        token.role = user.role
        token.id = user.id
        token.nome_usuario = (user.nome_usuario || user.name) as string | undefined
      }

      // Buscar dados actualizados da DB em TODAS as chamadas (não só no login)
      // Isto garante que alterações de nome feitas por admin aparecem sem precisar de logout
      if (token.id) {
        const userId = parseInt(token.id)
        const role = token.role

        if (role === "orientador") {
          const orientador = await prisma.orientador.findUnique({
            where: { id_usuario: userId }
          })
          token.e_gestor = orientador?.e_gestor ?? false
          token.nome_completo = orientador?.nome_completo ?? undefined
        } else if (role === "admin") {
          const admin = await prisma.admin.findUnique({
            where: { id_usuario: userId }
          })
          token.nome_completo = admin?.nome_completo ?? undefined
          token.e_gestor = false
        } else if (role === "estudante") {
          const estudante = await prisma.estudante.findUnique({
            where: { id_usuario: userId }
          })
          token.nome_completo = estudante?.nome_completo ?? undefined
          token.e_gestor = false
        } else if (role === "recepcionista") {
          const recepcionista = await prisma.recepcionista.findUnique({
            where: { id_usuario: userId }
          })
          token.nome_completo = recepcionista?.nome_completo ?? undefined
          token.e_gestor = false
        } else {
          token.e_gestor = false
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role
      session.user.id = token.id
      session.user.e_gestor = token.e_gestor
      session.user.nome_usuario = token.nome_usuario
      session.user.nome_completo = token.nome_completo
      return session
    }
  },
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  }
}