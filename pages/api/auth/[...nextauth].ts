import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Interface para a empresa
interface CompanyData {
  id: string
  name: string
  planType: string
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
  planType: string
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

// Verificar se estamos em produção
const isProduction = process.env.NODE_ENV === 'production'

// Obter a URL base do ambiente
const baseUrl = process.env.NEXTAUTH_URL || (isProduction ? 'https://avaliarh.com.br' : 'http://localhost:3000')

console.log('NextAuth URL:', baseUrl)
console.log('Ambiente:', isProduction ? 'Produção' : 'Desenvolvimento')

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
          console.log('Autorização: Credenciais incompletas');
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
            console.log('Autorização: Usuário não encontrado');
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            console.log('Autorização: Senha inválida');
            return null
          }

          // Se o usuário tiver uma empresa associada, busca os dados da empresa
          let companyData: CompanyData | null = null
          
          if (user.companyId) {
            try {
              // Usando prisma.$queryRaw para evitar problemas de tipagem
              const companyRecords = await prisma.$queryRaw`
                SELECT id, name, "planType", "isActive" 
                FROM "Company" 
                WHERE id = ${user.companyId}
              ` as any[]
              
              if (companyRecords && companyRecords.length > 0) {
                const companyRecord = companyRecords[0]
                companyData = {
                  id: companyRecord.id,
                  name: companyRecord.name,
                  planType: companyRecord.planType,
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

          console.log('Autorização: Login bem-sucedido para', user.email, 'com papel', user.role);
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
        token.id = user.id
        token.role = user.role
        token.companyId = user.companyId
        token.company = user.company
        
        // Log para depuração do papel do usuário
        console.log('NextAuth JWT: Papel do usuário:', user.role);
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role as Role
        session.user.companyId = token.companyId
        session.user.company = token.company
        
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
      name: isProduction ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        domain: isProduction ? process.env.NEXT_PUBLIC_DOMAIN || undefined : undefined,
      },
    },
    callbackUrl: {
      name: isProduction ? `__Secure-next-auth.callback-url` : `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        domain: isProduction ? process.env.NEXT_PUBLIC_DOMAIN || undefined : undefined,
      },
    },
    csrfToken: {
      name: isProduction ? `__Secure-next-auth.csrf-token` : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        domain: isProduction ? process.env.NEXT_PUBLIC_DOMAIN || undefined : undefined,
      },
    },
  },
  debug: !isProduction,
  secret: process.env.NEXTAUTH_SECRET,
  logger: {
    error(code, metadata) {
      console.error(`NextAuth Error [${code}]:`, metadata);
    },
    warn(code) {
      console.warn(`NextAuth Warning [${code}]`);
    },
    debug(code, metadata) {
      console.log(`NextAuth Debug [${code}]:`, metadata);
    },
  },
  // Configurações específicas para proxy reverso
  useSecureCookies: isProduction,
  // @ts-ignore - A propriedade trustHost existe, mas pode não estar na tipagem atual
  trustHost: true,
}

export default NextAuth(authOptions)
