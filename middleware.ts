import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Definição dos papéis de usuário como strings
type RoleType = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'USER';

// Mapeamento de rotas para papéis autorizados
const routePermissions: Record<string, RoleType[]> = {
  '/api/superadmin': ['SUPER_ADMIN'],
  '/api/admin': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  '/api/instructor': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR'],
  '/api/student': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR', 'STUDENT'],
  '/api/training': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR', 'STUDENT'],
  '/superadmin': ['SUPER_ADMIN'],
  '/admin': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  '/treinamento': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR', 'STUDENT'],
};

// Função para verificar se a rota é protegida
function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/superadmin') ||
    pathname.startsWith('/api/training') ||
    pathname.startsWith('/admin/dashboard') ||
    pathname.startsWith('/superadmin/dashboard') ||
    pathname.startsWith('/treinamento') && !pathname.startsWith('/treinamento/login')
  )
}

// Função para verificar se a rota é de login
function isLoginRoute(pathname: string): boolean {
  return pathname === '/admin/login' || pathname === '/superadmin/login' || pathname === '/treinamento/login'
}

// Configuração do middleware
const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/superadmin/:path*',
    '/api/training/:path*',
    '/admin/:path*',
    '/superadmin/:path*',
    '/treinamento/:path*',
  ],
}

export { config }

// Função para verificar se a rota é pública
function isPublicRoute(pathname: string, publicEndpoints: string[]): boolean {
  return publicEndpoints.some(endpoint => {
    // Verificar se o endpoint termina com * para correspondência parcial
    if (endpoint.endsWith('*')) {
      const baseEndpoint = endpoint.slice(0, -1)
      return pathname.startsWith(baseEndpoint)
    }
    // Caso contrário, verificar correspondência exata
    return pathname === endpoint
  })
}

// Função para obter a URL base do ambiente atual
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  
  // Usar NEXTAUTH_URL se estiver definido
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  
  // Caso contrário, construir a URL base a partir dos headers
  return `${protocol}://${host}`
}

// Middleware principal para autenticação e autorização
export async function middleware(request: NextRequest) {
  // Obter o caminho da URL
  const { pathname } = request.nextUrl
  
  // Verificar se é uma página de login
  if (isLoginRoute(pathname)) {
    return NextResponse.next()
  }

  // Endpoints públicos que não exigem autenticação
  const publicEndpoints = [
    '/api/responses',
    '/api/responses/save-progress',
    '/api/responses/save-answers',
    '/api/candidates/validate-invite',
    '/teste/*',
    '/test/*',
    '/api/teste/*',
    '/api/candidates/*',
    '/api/questions',
    '/api/questions/*',
    '/api/stages/*',
    '/api/responses/*',
    '/api/auth/*',
    '/api/public/*',
    '/_next/*',
    '/favicon.ico',
    '/images/*',
    '/styles/*',
    '/scripts/*',
    '/',
  ];

  // Verificar se é um endpoint público
  if (isPublicRoute(pathname, publicEndpoints)) {
    return NextResponse.next()
  }

  try {
    // Obter informações do ambiente
    const host = request.headers.get('host') || 'desconhecido'
    const cookieHeader = request.headers.get('cookie')
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const isProduction = process.env.NODE_ENV === 'production'
    const cookiePrefix = isProduction 
      ? process.env.NEXT_PUBLIC_COOKIE_PREFIX || 'prod_' 
      : process.env.NEXT_PUBLIC_COOKIE_PREFIX || 'dev_'
    const baseUrl = getBaseUrl(request)
    
    // Obter o token JWT da requisição
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: isProduction,
      cookieName: `${cookiePrefix}next-auth.session-token`,
    })
    
    // Se o token não existir, redirecionar para a página de login
    if (!token) {
      // Determinar a página de login apropriada com base na rota
      const loginUrl = pathname.startsWith('/superadmin') 
        ? '/superadmin/login' 
        : pathname.startsWith('/treinamento') ? '/treinamento/login' : '/admin/login'
      
      // Criar URL de redirecionamento com callbackUrl
      const url = request.nextUrl.clone()
      url.pathname = loginUrl
      
      // Usar a URL base atual para o callbackUrl, não a URL da requisição
      // Isso evita misturar domínios como localhost e admitto.com.br
      const currentPath = request.nextUrl.pathname
      const callbackUrl = new URL(currentPath, baseUrl).toString()
      
      url.search = `?callbackUrl=${encodeURIComponent(callbackUrl)}`
      
      return NextResponse.redirect(url)
    }
    
    // Verificar permissões para rotas de superadmin
    if (pathname.startsWith('/api/superadmin') || pathname.startsWith('/superadmin')) {
      if (token.role !== 'SUPER_ADMIN') {
        return new NextResponse(
          JSON.stringify({ success: false, message: 'Acesso negado. Permissão insuficiente.' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        )
      }
    }
    
    // Verificar permissões para rotas de admin
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/admin')) {
      if (token.role !== 'SUPER_ADMIN' && token.role !== 'COMPANY_ADMIN') {
        return new NextResponse(
          JSON.stringify({ success: false, message: 'Acesso negado. Permissão insuficiente.' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        )
      }
    }
    
    // Verificar permissões para rotas de treinamento
    if (pathname.startsWith('/api/training') || pathname.startsWith('/treinamento')) {
      if (token.role !== 'SUPER_ADMIN' && token.role !== 'COMPANY_ADMIN' && 
          token.role !== 'INSTRUCTOR' && token.role !== 'STUDENT') {
        return new NextResponse(
          JSON.stringify({ success: false, message: 'Acesso negado. Permissão insuficiente.' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        )
      }
    }
    
    // Determinar qual rota está sendo acessada
    const routePrefix = Object.keys(routePermissions).find(
      prefix => pathname.startsWith(prefix)
    );
    
    if (routePrefix) {
      // Obter os papéis permitidos para esta rota
      const allowedRoles = routePermissions[routePrefix];
      
      // Verificar se o papel do usuário está na lista de papéis permitidos
      if (!allowedRoles.includes(token.role as RoleType)) {
        // Se for uma rota de API, retorna 403
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ message: 'Não autorizado' }),
            {
              status: 403,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }
        
        // Se for uma página, redireciona para dashboard apropriado
        if (token.role === 'SUPER_ADMIN') {
          return NextResponse.redirect(new URL('/superadmin/dashboard', request.url));
        } else {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
      }
    }
    
    return NextResponse.next()
  } catch (error) {
    // Em caso de erro, redirecionar para a página de login
    const loginUrl = pathname.startsWith('/superadmin') 
      ? '/superadmin/login' 
      : pathname.startsWith('/treinamento') ? '/treinamento/login' : '/admin/login'
    
    const url = request.nextUrl.clone()
    url.pathname = loginUrl
    
    return NextResponse.redirect(url)
  }
}
