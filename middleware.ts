import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Definição dos papéis de usuário conforme o schema
type Role = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'USER';

// Mapeamento de rotas para papéis autorizados
const routePermissions: Record<string, Role[]> = {
  '/api/superadmin': ['SUPER_ADMIN'],
  '/api/admin': ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  '/api/instructor': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR'],
  '/api/student': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR', 'STUDENT'],
  '/api/user': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'INSTRUCTOR', 'STUDENT', 'USER'],
};

export async function middleware(request: NextRequest) {
  // Log da URL sendo acessada
  console.log(`Middleware: Acessando ${request.nextUrl.pathname}`);
  
  // Obtém o token da requisição
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })
  
  // Log do token para depuração
  console.log('Middleware: Token encontrado:', token ? 'Sim' : 'Não');
  if (token) {
    console.log('Middleware: Papel do usuário:', token.role);
  }

  // Determinar qual rota está sendo acessada
  const routePrefix = Object.keys(routePermissions).find(
    prefix => request.nextUrl.pathname.startsWith(prefix)
  );

  // Se a rota não estiver no mapeamento, permite o acesso
  if (!routePrefix) {
    console.log('Middleware: Rota não protegida, continuando com a requisição');
    return NextResponse.next();
  }

  console.log(`Middleware: Verificando acesso a rota ${routePrefix}`);
  
  // Se não houver token, retorna 401 (Não autenticado)
  if (!token) {
    console.log('Middleware: Token não encontrado, retornando 401');
    return new NextResponse(
      JSON.stringify({ message: 'Não autenticado' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Obter os papéis permitidos para a rota
  const allowedRoles = routePermissions[routePrefix];
  
  // Verificar se o papel do usuário está na lista de papéis permitidos
  if (!allowedRoles.includes(token.role as Role)) {
    console.log(`Middleware: Papel ${token.role} não autorizado para ${routePrefix}, retornando 403`);
    
    // Formatar a mensagem de erro com os papéis permitidos
    const rolesMessage = allowedRoles.join(' ou ');
    
    return new NextResponse(
      JSON.stringify({ 
        message: `Não autorizado - Apenas ${rolesMessage} podem acessar este recurso` 
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  
  console.log(`Middleware: Acesso autorizado para ${routePrefix}`);
  return NextResponse.next();
}

// Configurar quais rotas o middleware deve ser executado
export const config = {
  matcher: [
    '/api/superadmin/:path*',
    '/api/admin/:path*',
    '/api/instructor/:path*',
    '/api/student/:path*',
    '/api/user/:path*',
  ],
}
