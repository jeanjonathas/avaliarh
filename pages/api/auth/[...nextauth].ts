import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Primeiro, tenta autenticar usando o novo modelo Admin
          const admin = await prisma.admin.findUnique({
            where: {
              email: credentials.email,
            },
          })

          if (admin) {
            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              admin.password
            )

            if (isPasswordValid) {
              return {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: 'ADMIN',
                company: admin.company,
                position: admin.position,
                phone: admin.phone,
                isNewModel: true, // Indica que está usando o novo modelo
              }
            }
          }

          // Se não encontrar no modelo Admin, tenta o modelo User legado
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          })

          if (!user) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isNewModel: false, // Indica que está usando o modelo legado
          }
        } catch (error) {
          console.error('Erro na autenticação:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        
        // Adiciona os novos campos do modelo Admin ao token
        if (user.isNewModel) {
          token.company = user.company
          token.position = user.position
          token.phone = user.phone
          token.isNewModel = true
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        
        // Adiciona os novos campos do modelo Admin à sessão
        if (token.isNewModel) {
          session.user.company = token.company as string
          session.user.position = token.position as string
          session.user.phone = token.phone as string
          session.user.isNewModel = true
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
    signOut: '/'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
