import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../lib/auth'

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const { id } = req.query
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  console.log(`[${req.method}] /api/admin/questions/${id}/force-delete`);

  if (req.method === 'DELETE') {
    try {
      // Verificar se a pergunta existe
      const question = await prisma.question.findUnique({
        where: { id: id as string }
      });
      
      if (!question) {
        return res.status(404).json({ error: 'Pergunta não encontrada' });
      }

      // Primeiro, remover todas as associações na tabela TestQuestion
      await prisma.$executeRaw`
        DELETE FROM "TestQuestion" WHERE "questionId"::text = ${id}::text
      `;
      
      // Depois, remover todas as opções associadas à pergunta
      await prisma.$executeRaw`
        DELETE FROM "Option" WHERE "questionId"::text = ${id}::text
      `;

      // Por fim, excluir a pergunta
      await prisma.$executeRaw`
        DELETE FROM "Question" WHERE id::text = ${id}::text
      `;

      return res.status(204).end();
    } catch (error) {
      console.error('Erro ao forçar exclusão da pergunta:', error);
      return res.status(500).json({ error: 'Erro ao excluir a pergunta' })
    }
  } else {
    return res.status(405).json({ error: 'Método não permitido' })
  }
}
