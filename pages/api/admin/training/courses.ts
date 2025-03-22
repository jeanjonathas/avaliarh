import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação usando o middleware centralizado
  const token = await getToken({ req })
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  // Verificar se o usuário tem permissão (COMPANY_ADMIN ou SUPER_ADMIN)
  if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return res.status(403).json({ error: 'Permissão negada' })
  }

  if (req.method === 'GET') {
    try {
      // Retornar um array vazio com uma mensagem indicando que a funcionalidade estará disponível em breve
      return res.status(200).json({
        courses: [],
        message: 'Funcionalidade de cursos de treinamento estará disponível em breve.'
      })
    } catch (error) {
      console.error('Erro ao buscar cursos de treinamento:', error)
      return res.status(500).json({ error: 'Erro ao buscar cursos de treinamento' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
