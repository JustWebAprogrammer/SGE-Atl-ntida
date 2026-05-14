import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { TipoUsuario } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { DefaultSession } from "next-auth"

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
      async authorize(credentials) {
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
        if (user) {
          token.role = user.role
          token.id = user.id
          token.nome_usuario = (user.nome_usuario || user.name) as string | undefined
        // Buscar e_gestor e nome_completo se for orientador
        if (user.role === "orientador") {
          const orientador = await prisma.orientador.findUnique({
            where: { id_usuario: parseInt(user.id) }
          })
          token.e_gestor = orientador?.e_gestor ?? false
          token.nome_completo = orientador?.nome_completo ?? undefined
        } else {
          token.e_gestor = false
          // Para admin, buscar nome_completo em Admin
          if (user.role === "admin") {
            const admin = await prisma.admin.findUnique({
              where: { id_usuario: parseInt(user.id) }
            })
            token.nome_completo = admin?.nome_completo ?? undefined
          }
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