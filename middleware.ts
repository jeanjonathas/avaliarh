import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Definição dos papéis de usuário como strings
type RoleType = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'USER' | 'ADMIN';

// Mapeamento de rotas para papéis autorizados
const routePermissions: Record<string, RoleType[]> = {
  '/api/superadmin': ['SUPER_ADMIN'],
  '/api/admin': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  '/api/instructor': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR'],
  '/api/student': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR', 'STUDENT'],
  '/superadmin': ['SUPER_ADMIN'],
  '/admin': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
};

// Função para verificar se a rota é protegida
function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/superadmin') ||
    pathname.startsWith('/admin/dashboard') ||
    pathname.startsWith('/superadmin/dashboard')
  )
}

// Função para verificar se a rota é de login
function isLoginRoute(pathname: string): boolean {
  return pathname === '/admin/login' || pathname === '/superadmin/login'
}

// Configuração do middleware
const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/superadmin/:path*',
    '/admin/:path*',
    '/superadmin/:path*',
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

// Middleware principal para autenticação e autorização
export async function middleware(request: NextRequest) {
  // Obter o caminho da URL
  const { pathname } = request.nextUrl
  
  console.log('Middleware - Rota acessada:', pathname)
  
  // Log dos headers para diagnóstico
  const host = request.headers.get('host') || 'desconhecido'
  const referer = request.headers.get('referer')
  const cookieHeader = request.headers.get('cookie')
  const hasSecureCookie = cookieHeader?.includes('__Secure-next-auth.session-token')
  const hasNormalCookie = cookieHeader?.includes('next-auth.session-token')
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const isProduction = process.env.NODE_ENV === 'production'
  
  console.log('Middleware - Headers:', JSON.stringify({
    host,
    referer,
    cookie: cookieHeader ? 'Presente' : 'Ausente',
    hasSecureCookie: hasSecureCookie ? 'Sim' : 'Não',
    hasNormalCookie: hasNormalCookie ? 'Sim' : 'Não',
    protocol,
    isProduction: isProduction ? 'Sim' : 'Não',
    nextauthUrl: process.env.NEXTAUTH_URL || 'não definido',
    nextauthUrlInternal: process.env.NEXTAUTH_URL_INTERNAL || 'não definido'
  }))

  // Verificar se é uma página de login
  if (isLoginRoute(pathname)) {
    console.log('Middleware: Página de login detectada, permitindo acesso')
    return NextResponse.next()
  }

  // Endpoints públicos que não exigem autenticação
  const publicEndpoints = [
    '/api/responses/save-progress',
    '/api/responses/save-answers',
    '/api/auth/*',
    '/api/public/*',
    '/_next/*',
    '/favicon.ico',
    '/images/*',
    '/styles/*',
    '/scripts/*',
  ];

  // Verificar se é um endpoint público
  if (isPublicRoute(pathname, publicEndpoints)) {
    console.log('Middleware: Endpoint público detectado, permitindo acesso')
    return NextResponse.next()
  }

  try {
    console.log('Middleware: Verificando token JWT...')
    
    // Obter o token JWT da requisição
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: isProduction,
      cookieName: isProduction ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
    })
    
    // Log do token para diagnóstico (sem expor dados sensíveis)
    console.log('Middleware - Token:', token ? {
      name: token.name,
      email: token.email,
      role: token.role,
      iat: token.iat,
      exp: token.exp,
      jti: token.jti
    } : 'Token não encontrado')
    
    // Se o token não existir, redirecionar para a página de login
    if (!token) {
      console.log('Middleware: Token não encontrado, redirecionando para login')
      
      // Determinar a página de login apropriada com base na rota
      const loginUrl = pathname.startsWith('/superadmin') 
        ? '/superadmin/login' 
        : '/admin/login'
      
      // Criar URL de redirecionamento com callbackUrl
      const url = request.nextUrl.clone()
      url.pathname = loginUrl
      url.search = `?callbackUrl=${encodeURIComponent(request.url)}`
      
      return NextResponse.redirect(url)
    }
    
    // Verificar permissões para rotas de superadmin
    if (pathname.startsWith('/api/superadmin') || pathname.startsWith('/superadmin')) {
      if (token.role !== 'SUPER_ADMIN') {
        console.log('Middleware: Acesso negado a rota de superadmin para usuário com papel:', token.role)
        return new NextResponse(
          JSON.stringify({ success: false, message: 'Acesso negado. Apenas Super Administradores podem acessar esta rota.' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        )
      }
    }
    
    // Verificar permissões para rotas de admin
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/admin')) {
      if (token.role !== 'SUPER_ADMIN' && token.role !== 'COMPANY_ADMIN') {
        console.log('Middleware: Acesso negado a rota de admin para usuário com papel:', token.role)
        return new NextResponse(
          JSON.stringify({ success: false, message: 'Acesso negado. Apenas Administradores podem acessar esta rota.' }),
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
        console.log(`Middleware: Acesso negado. Papel ${token.role} não tem permissão para ${routePrefix}`);
        
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
    
    console.log('Middleware: Acesso permitido para usuário com papel:', token.role)
    return NextResponse.next()
  } catch (error) {
    console.error('Middleware: Erro ao verificar token:', error)
    
    // Em caso de erro, redirecionar para a página de login
    const loginUrl = pathname.startsWith('/superadmin') 
      ? '/superadmin/login' 
      : '/admin/login'
    
    const url = request.nextUrl.clone()
    url.pathname = loginUrl
    
    return NextResponse.redirect(url)
  }
}
