import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    // Criar um novo candidato
    try {
      const { name, email, phone, position } = req.body

      if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios' })
      }

      const candidate = await prisma.candidate.create({
        data: {
          name,
          email,
          phone,
          position,
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
