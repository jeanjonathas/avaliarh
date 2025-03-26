import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'PUT') {
    try {
      const { id } = req.query

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID do candidato é obrigatório' })
      }

      const candidate = await prisma.candidate.update({
        where: {
          id,
        },
        data: {
          completed: true,
        },
      })

      return res.status(200).json(candidate)
    } catch (error) {
      console.error('Erro ao atualizar status do candidato:', error)
      return res.status(500).json({ error: 'Erro ao atualizar status do candidato' })
    }
  } else {
    res.setHeader('Allow', ['PUT'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
