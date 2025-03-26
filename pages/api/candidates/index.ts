import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    // Criar um novo candidato
    try {
      const { name, email, phone, position, companyId } = req.body

      if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios' })
      }

      const candidate = await prisma.candidate.create({
        data: {
          name,
          email,
          phone,
          position,
          company: {
            connect: { id: companyId || '1' } // Você precisa fornecer um ID de empresa válido
          }
        },
      })

      return res.status(201).json(candidate)
    } catch (error) {
      console.error('Erro ao criar candidato:', error)
      return res.status(500).json({ error: 'Erro ao criar candidato' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
