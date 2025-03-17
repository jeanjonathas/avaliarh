import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  // Obtém o token da requisição
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Verificar se a requisição é para uma rota de API protegida
  if (request.nextUrl.pathname.startsWith('/api/superadmin')) {
    // Se não houver token, retorna 401
    if (!token) {
      return new NextResponse(
        JSON.stringify({ message: 'Não autenticado' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Se o usuário não for SUPER_ADMIN, retorna 403
    if (token.role !== 'SUPER_ADMIN') {
      return new NextResponse(
        JSON.stringify({ message: 'Não autorizado - Apenas SUPER_ADMIN pode acessar este recurso' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
  }

  // Verificar se a requisição é para uma rota de API de admin
  if (request.nextUrl.pathname.startsWith('/api/admin')) {
    // Se não houver token, retorna 401
    if (!token) {
      return new NextResponse(
        JSON.stringify({ message: 'Não autenticado' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Se o usuário não for ADMIN ou SUPER_ADMIN, retorna 403
    if (token.role !== 'ADMIN' && token.role !== 'SUPER_ADMIN') {
      return new NextResponse(
        JSON.stringify({ message: 'Não autorizado - Apenas ADMIN ou SUPER_ADMIN podem acessar este recurso' }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
  }

  // Continua com a requisição para outras rotas
  return NextResponse.next()
}

// Configurar quais rotas o middleware deve ser executado
export const config = {
  matcher: [
    '/api/superadmin/:path*',
    '/api/admin/:path*',
  ],
}
