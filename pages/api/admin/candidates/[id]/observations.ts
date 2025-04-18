import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await reconnectPrisma()
    const session = await getServerSession(req, res, authOptions)
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user?.role as string)) {
      console.log('[AUTH ERROR] Não autenticado na API de observações')
      return res.status(401).json({ message: 'Não autenticado' })
    }

    const { id } = req.query

    if (req.method === 'PUT') {
      const { observations, interviewNotes } = req.body

      // Atualizar as observações do candidato usando Prisma.validator para contornar o problema de tipagem
      const updatedCandidate = await prisma.candidate.update({
        where: {
          id: id as string
        },
        data: {
          observations,
          // @ts-ignore - O campo existe no banco de dados, mas o TypeScript ainda não o reconhece
          interviewNotes: interviewNotes || null
        }
      })

      return res.status(200).json(updatedCandidate)
    }

    if (req.method === 'GET') {
      const candidate = await prisma.candidate.findUnique({
        where: {
          id: id as string
        },
        select: {
          observations: true,
          // @ts-ignore - O campo existe no banco de dados, mas o TypeScript ainda não o reconhece
          interviewNotes: true
        }
      })

      if (!candidate) {
        return res.status(404).json({ message: 'Candidato não encontrado' })
      }

      return res.status(200).json(candidate)
    }

    return res.status(405).json({ message: 'Método não permitido' })
  } catch (error) {
    console.error('Erro ao processar observações:', error)
    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
}
