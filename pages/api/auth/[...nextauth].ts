import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { NextApiRequest, NextApiResponse } from 'next'

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
// Verifica se o ambiente é de produção
const isProduction = process.env.NODE_ENV === 'production'

// Middleware para adicionar headers anti-cache
export async function middleware(req: NextApiRequest, res: NextApiResponse) {
  // Adiciona headers anti-cache
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Adiciona headers de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', isProduction ? 'https://admitto.com.br' : 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Adiciona headers de debug para identificar o ambiente
  res.setHeader('X-Environment', isProduction ? 'production' : 'development');
  res.setHeader('X-Cookie-Prefix', process.env.NEXT_PUBLIC_COOKIE_PREFIX || (isProduction ? 'prod_' : 'dev_'));
  
  // Se for uma requisição OPTIONS (preflight), retorna 200
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  
  return false;
}

// Obter a URL base do ambiente
const baseUrl = process.env.NEXTAUTH_URL || (isProduction ? 'https://admitto.com.br' : 'http://localhost:3000')
const internalUrl = process.env.NEXTAUTH_URL_INTERNAL || baseUrl

// Função para garantir que as URLs de redirecionamento usem o domínio correto
const ensureCorrectDomain = (url: string) => {
  if (!url) return url
  
  // Se for uma URL relativa, retorne-a diretamente
  if (url.startsWith('/')) {
    return url
  }
  
  try {
    const parsedUrl = new URL(url)
    const targetDomain = isProduction 
      ? (process.env.NEXT_PUBLIC_DOMAIN || new URL(baseUrl).hostname)
      : new URL(internalUrl).hostname
    
    // Se o domínio for diferente, corrija-o
    if (parsedUrl.hostname !== targetDomain) {
      parsedUrl.hostname = targetDomain
      parsedUrl.protocol = isProduction ? 'https:' : 'http:'
      return parsedUrl.toString()
    }
  } catch (error) {
    // Silenciado
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
          console.error(`[AUTH DEBUG] Falha na autorização: credenciais incompletas (email ou senha não fornecidos)`);
          return null
        }

        try {
          console.log(`[AUTH INFO] Tentativa de login para: ${credentials.email}`);
          
          // Primeiro, busca o usuário pelo email
          console.log(`[AUTH DEBUG] Buscando usuário com email: ${credentials.email}`);
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
            include: {
              company: true,
            },
          })

          if (!user) {
            console.error(`[AUTH DEBUG] Usuário não encontrado com email: ${credentials.email}`);
            return null
          }
          
          console.log(`[AUTH DEBUG] Usuário encontrado: ${user.id}, verificando senha...`);

          // Verifica se a senha está correta
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            console.error(`[AUTH DEBUG] Senha inválida para usuário: ${user.id}`);
            return null
          }
          
          console.log(`[AUTH DEBUG] Senha válida para usuário: ${user.id}`);

          // Verifica se a empresa está ativa (para usuários vinculados a empresas)
          if (user.companyId && user.company) {
            console.log(`[AUTH DEBUG] Verificando status da empresa: ${user.company.id}`);
            if (!user.company.isActive) {
              console.error(`[AUTH DEBUG] Empresa inativa: ${user.company.id}`);
              return null
            }
            console.log(`[AUTH DEBUG] Empresa ativa: ${user.company.id}`);
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

          console.log(`[AUTH SUCCESS] Login bem-sucedido para: ${user.email}, papel: ${user.role}`);
          
          // Retorna os dados do usuário autenticado
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            company: companyData,
          }
        } catch (error) {
          console.error(`[AUTH ERROR] Erro durante autenticação:`, error);
          
          // Log específico para erros de case sensitivity no PostgreSQL
          if (error instanceof Error && 
              error.message && 
              (error.message.includes('column') || error.message.includes('relation')) && 
              error.message.includes('does not exist')) {
            console.error(`[AUTH ERROR] Provável erro de case sensitivity do PostgreSQL:`);
            console.error(error.message);
          }
          
          // Log específico para erros de bcrypt
          if (error instanceof Error && 
              error.message && 
              error.message.includes('bcrypt')) {
            console.error(`[AUTH ERROR] Provável erro na função de hash bcrypt:`);
            console.error(error.message);
          }
          
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
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Garantir que as URLs de redirecionamento usem o domínio correto
      const correctedUrl = ensureCorrectDomain(url)
      
      return correctedUrl.startsWith('/') ? `${baseUrl}${correctedUrl}` : correctedUrl
    },
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
      name: isProduction 
        ? `${process.env.NEXT_PUBLIC_COOKIE_PREFIX || 'prod_'}next-auth.session-token` 
        : `${process.env.NEXT_PUBLIC_COOKIE_PREFIX || 'dev_'}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        domain: isProduction ? process.env.NEXT_PUBLIC_DOMAIN || undefined : undefined,
      },
    },
    callbackUrl: {
      name: isProduction 
        ? `${process.env.NEXT_PUBLIC_COOKIE_PREFIX || 'prod_'}next-auth.callback-url` 
        : `${process.env.NEXT_PUBLIC_COOKIE_PREFIX || 'dev_'}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        domain: isProduction ? process.env.NEXT_PUBLIC_DOMAIN || undefined : undefined,
      },
    },
    csrfToken: {
      name: isProduction 
        ? `${process.env.NEXT_PUBLIC_COOKIE_PREFIX || 'prod_'}next-auth.csrf-token` 
        : `${process.env.NEXT_PUBLIC_COOKIE_PREFIX || 'dev_'}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        domain: isProduction ? process.env.NEXT_PUBLIC_DOMAIN || undefined : undefined,
      },
    },
  },
  debug: true, // Ativar sempre o modo de debug para capturar todos os erros
  secret: process.env.NEXTAUTH_SECRET,
  logger: {
    error(code, metadata) {
      console.error(`[AUTH ERROR] Código: ${code}`);
      
      // Log detalhado com base no tipo de erro
      if (code === 'credentials-signin') {
        console.error('=== DIAGNÓSTICO DE ERRO DE AUTENTICAÇÃO ===');
        console.error('Erro ao autenticar com credenciais. Possíveis causas:');
        
        // Informações sobre as variáveis de ambiente
        console.error('\n1. VARIÁVEIS DE AMBIENTE:');
        console.error(`NEXTAUTH_SECRET configurado: ${process.env.NEXTAUTH_SECRET ? 'Sim (parcial): ' + process.env.NEXTAUTH_SECRET.substring(0, 5) + '...' : 'Não'}`);
        console.error(`DATABASE_URL configurada: ${process.env.DATABASE_URL ? 'Sim (começa com): ' + process.env.DATABASE_URL.substring(0, 15) + '...' : 'Não'}`);
        console.error(`NODE_ENV: ${process.env.NODE_ENV}`);
        console.error(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);
        console.error(`NEXTAUTH_URL_INTERNAL: ${process.env.NEXTAUTH_URL_INTERNAL}`);
        
        // Informações sobre o erro específico se disponível no metadata
        if (metadata?.cause) {
          console.error('\n2. CAUSA DO ERRO:');
          console.error(metadata.cause);
          
          // Verificar erros específicos do PostgreSQL para identificar problemas de case sensitivity
          if (metadata.cause.toString().includes('column') && metadata.cause.toString().includes('does not exist')) {
            console.error('\n3. PROVÁVEL ERRO DE CASE SENSITIVITY DO POSTGRESQL:');
            console.error('Erro indica problema com nome de coluna ou tabela. PostgreSQL em produção é case-sensitive.');
          }
          
          // Verificar erros de hash de senha
          if (metadata.cause.toString().includes('bcrypt') || metadata.cause.toString().includes('hash')) {
            console.error('\n3. PROVÁVEL ERRO DE HASH DE SENHA:');
            console.error('Erro relacionado à comparação de hash/bcrypt. Pode haver diferenças na implementação entre ambientes.');
          }
        }
        
        // Informações sobre cookies e domínios
        console.error('\n4. CONFIGURAÇÃO DE COOKIES:');
        console.error(`Cookie Prefix: ${process.env.NEXT_PUBLIC_COOKIE_PREFIX || (isProduction ? 'prod_' : 'dev_')}`);
        console.error(`Domain: ${isProduction ? process.env.NEXT_PUBLIC_DOMAIN || 'não definido' : 'localhost'}`);
        console.error(`Secure Cookies: ${isProduction}`);
        
        // Headers da requisição se disponíveis
        if (metadata && typeof metadata === 'object' && 'error' in metadata) {
          const metadataObj = metadata as { [key: string]: unknown };
          if (metadataObj.headers) {
            console.error('\n5. HEADERS DA REQUISIÇÃO:');
            const headers = metadataObj.headers as Record<string, string>;
            console.error(`Origin: ${headers.origin || 'não disponível'}`);
            console.error(`Referer: ${headers.referer || 'não disponível'}`);
            console.error(`User-Agent: ${headers['user-agent'] || 'não disponível'}`);
          }
        }
        
        console.error('==========================================');
      } else {
        // Log para outros tipos de erro
        console.error('Detalhes do erro:', metadata);
      }
    },
    warn(code) {
      console.warn(`[AUTH WARN] ${code}`);
    },
    debug(code, metadata) {
      if (code === 'authorize' || code === 'jwt') {
        console.log(`[AUTH DEBUG] ${code}:`, 
          metadata && typeof metadata === 'object' 
            ? JSON.stringify(metadata, (_, v) => 
                typeof v === 'string' && v.length > 100 
                  ? v.substring(0, 100) + '...' 
                  : v
              ) 
            : metadata
        );
      }
    },
  },
  // Configurações específicas para proxy reverso
  useSecureCookies: isProduction,
  // @ts-ignore - A propriedade trustHost existe, mas pode não estar na tipagem atual
  trustHost: true,
}

export default NextAuth(authOptions)
