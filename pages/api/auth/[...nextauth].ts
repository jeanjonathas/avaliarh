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
const baseUrl = process.env.NEXTAUTH_URL || (isProduction ? 'https://admitto.com.br' : 'http://localhost:3000')
const internalUrl = process.env.NEXTAUTH_URL_INTERNAL || baseUrl

console.log('NextAuth URL:', baseUrl)
console.log('NextAuth URL Internal:', internalUrl)
console.log('Ambiente:', isProduction ? 'Produção' : 'Desenvolvimento')
console.log('Domain:', process.env.NEXT_PUBLIC_DOMAIN || 'não definido')

// Função para garantir que as URLs de redirecionamento usem o domínio correto
const ensureCorrectDomain = (url: string) => {
  if (!url) return url
  
  try {
    const parsedUrl = new URL(url)
    const targetDomain = isProduction 
      ? (process.env.NEXT_PUBLIC_DOMAIN || new URL(baseUrl).hostname)
      : new URL(internalUrl).hostname
    
    // Se o domínio for diferente, corrija-o
    if (parsedUrl.hostname !== targetDomain) {
      console.log(`Corrigindo URL de redirecionamento: ${url} -> ${targetDomain}`)
      parsedUrl.hostname = targetDomain
      parsedUrl.protocol = isProduction ? 'https:' : 'http:'
      return parsedUrl.toString()
    }
  } catch (error) {
    console.error('Erro ao processar URL:', error)
  }
  
  return url
}

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
            include: {
              company: true,
            },
          })

          if (!user) {
            console.log(`Autorização: Usuário não encontrado para o email ${credentials.email}`);
            return null
          }

          // Verifica se a senha está correta
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            console.log(`Autorização: Senha inválida para o usuário ${user.email}`);
            return null
          }

          // Verifica se a empresa está ativa (para usuários vinculados a empresas)
          if (user.companyId && user.company) {
            if (!user.company.isActive) {
              console.log(`Autorização: Empresa ${user.company.name} está inativa`);
              return null
            }
          }

          // Mapeia os dados da empresa para o formato simplificado
          let companyData: CompanyData | null = null
          if (user.company) {
            companyData = {
              id: user.company.id,
              name: user.company.name,
              planType: user.company.planType,
              isActive: user.company.isActive,
            }
          }

          // Retorna os dados do usuário autenticado
          console.log(`Autorização: Usuário ${user.email} autenticado com sucesso`);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            company: companyData,
          }
        } catch (error) {
          console.error('Autorização: Erro ao autenticar usuário:', error);
          return null
        } finally {
          // Não é necessário desconectar o cliente Prisma aqui, pois ele é reutilizado
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
    async redirect({ url, baseUrl }) {
      // Garantir que as URLs de redirecionamento usem o domínio correto
      const correctedUrl = ensureCorrectDomain(url)
      
      // Log para depuração de redirecionamento
      console.log('NextAuth Redirect:', { 
        originalUrl: url, 
        baseUrl, 
        correctedUrl 
      })
      
      // Se a URL começar com o baseUrl, retorne-a diretamente
      if (correctedUrl.startsWith(baseUrl) || correctedUrl.startsWith('/')) {
        return correctedUrl
      }
      
      // Caso contrário, retorne o baseUrl
      return baseUrl
    }
  },
  pages: {
    signIn: ensureCorrectDomain('/admin/login'),
    signOut: ensureCorrectDomain('/'),
    error: ensureCorrectDomain('/admin/login')
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
