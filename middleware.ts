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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Logs para depuração
  console.log('Middleware - Rota acessada:', pathname)
  console.log('Middleware - Headers:', JSON.stringify({
    host: request.headers.get('host'),
    referer: request.headers.get('referer'),
    cookie: request.headers.get('cookie') ? 'Presente' : 'Ausente'
  }))
  
  // Se for a página de login, permite o acesso
  if (isLoginRoute(pathname)) {
    console.log('Middleware: Página de login detectada, permitindo acesso');
    return NextResponse.next();
  }
  
  // Endpoints públicos que não exigem autenticação
  const publicEndpoints = [
    '/api/responses/save-progress',
    '/api/responses/save-answers',
    '/api/auth',
  ];
  
  // Verificar se a rota é um endpoint público
  for (const endpoint of publicEndpoints) {
    if (pathname.startsWith(endpoint)) {
      console.log(`Middleware: Endpoint público ${endpoint} detectado, permitindo acesso`);
      return NextResponse.next();
    }
  }
  
  // Se não for uma rota protegida, permite o acesso
  if (!isProtectedRoute(pathname)) {
    console.log('Middleware - Rota não protegida, permitindo acesso')
    return NextResponse.next()
  }
  
  try {
    // Obter o token JWT da requisição
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
    })
    
    // Log do token para depuração (apenas em desenvolvimento)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Middleware - Token JWT:', token ? 'Presente' : 'Ausente')
      if (token) {
        console.log('Middleware - Papel do usuário:', token.role)
      }
    }
    
    // Se não houver token, redireciona para a página de login
    if (!token) {
      console.log('Middleware - Token não encontrado, redirecionando para login')
      
      // Criar URL de redirecionamento
      const loginUrl = new URL('/admin/login', request.url)
      
      // Adicionar URL original como parâmetro de callback
      loginUrl.searchParams.set('callbackUrl', request.url)
      
      return NextResponse.redirect(loginUrl)
    }
    
    // Verificar permissões com base no papel do usuário
    if (pathname.startsWith('/api/superadmin') || pathname.startsWith('/superadmin')) {
      if (token.role !== 'SUPER_ADMIN') {
        console.log('Middleware - Acesso negado: usuário não é SUPER_ADMIN')
        return new NextResponse(
          JSON.stringify({ success: false, message: 'Acesso não autorizado' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        )
      }
    } else if (pathname.startsWith('/api/admin') || pathname.startsWith('/admin/dashboard')) {
      if (token.role !== 'SUPER_ADMIN' && token.role !== 'COMPANY_ADMIN') {
        console.log('Middleware - Acesso negado: usuário não tem papel adequado para acessar área administrativa')
        return new NextResponse(
          JSON.stringify({ success: false, message: 'Acesso não autorizado' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        )
      }
    } else {
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
    }
    
    // Se chegou até aqui, o usuário está autenticado e autorizado
    console.log('Middleware - Acesso permitido para', pathname)
    return NextResponse.next()
  } catch (error) {
    // Log de erro detalhado
    console.error('Middleware - Erro ao processar requisição:', error)
    
    // Em caso de erro, redireciona para a página de login
    const loginUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
}

// Configurar as rotas que o middleware deve processar
export const config = {
  matcher: [
    // Rotas de API protegidas
    '/api/admin/:path*',
    '/api/superadmin/:path*',
    // Rotas de dashboard protegidas
    '/admin/dashboard/:path*',
    '/superadmin/dashboard/:path*',
    // Não incluir rotas de login para evitar loops de redirecionamento
    '/((?!api/auth|_next/static|_next/image|favicon.ico|images).*)',
  ],
}
