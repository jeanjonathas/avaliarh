import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Interface para a empresa
interface CompanyData {
  id: string
  name: string
  plan: string
  isActive: boolean
}

// Interface para o usuário com base no modelo Prisma
interface PrismaUser {
  id: string
  name: string
  email: string
  password: string
  role: Role
  companyId: string | null
  createdAt: Date
  updatedAt: Date
}

// Interface para a empresa com base no modelo Prisma
interface PrismaCompany {
  id: string
  name: string
  plan: string
  isActive: boolean
  cnpj: string | null
  maxUsers: number
  maxCandidates: number
  lastPaymentDate: Date | null
  trialEndDate: Date | null
  createdAt: Date
  updatedAt: Date
}

// Estendendo os tipos do NextAuth para incluir nossos campos personalizados
declare module "next-auth" {
  interface User {
    id: string
    name: string
    email: string
    role: Role
    companyId?: string | null
    company?: CompanyData | null
  }

  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: Role
      companyId?: string | null
      company?: CompanyData | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
    companyId?: string | null
    company?: CompanyData | null
  }
}

// Inicializando o cliente Prisma
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
          // Primeiro, busca o usuário pelo email
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          }) as PrismaUser | null

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

          // Se o usuário tiver uma empresa associada, busca os dados da empresa
          let companyData: CompanyData | null = null
          
          if (user.companyId) {
            try {
              // Usando prisma.$queryRaw para evitar problemas de tipagem
              const companyRecords = await prisma.$queryRaw`
                SELECT id, name, plan, "isActive" 
                FROM "Company" 
                WHERE id = ${user.companyId}
              ` as any[]
              
              if (companyRecords && companyRecords.length > 0) {
                const companyRecord = companyRecords[0]
                companyData = {
                  id: companyRecord.id,
                  name: companyRecord.name,
                  plan: companyRecord.plan,
                  isActive: companyRecord.isActive
                }
              }
            } catch (error) {
              console.error('Erro ao buscar empresa:', error)
            }
          }

          // Construir o objeto de usuário para autenticação
          const authUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            company: companyData
          }

          return authUser
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
        token.id = user.id;
        token.role = user.role;
        
        // Log para depuração do papel do usuário
        console.log('NextAuth JWT: Papel do usuário:', user.role);
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        
        // Log para depuração da sessão
        console.log('NextAuth Session: Papel do usuário:', token.role);
      }
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
    signOut: '/',
    error: '/admin/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  debug: process.env.NODE_ENV !== 'production',
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
