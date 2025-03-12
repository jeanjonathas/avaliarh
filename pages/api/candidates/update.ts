import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const prisma = new PrismaClient()

  try {
    const { id, name, email, phone, position, instagram, photoUrl } = req.body

    if (!id || !name || !email) {
      return res.status(400).json({ error: 'ID, nome e email são obrigatórios' })
    }

    // Usar SQL raw para atualizar o candidato, incluindo o campo instagram e photoUrl
    const updatedCandidate = await prisma.$queryRaw`
      UPDATE "Candidate"
      SET 
        name = ${name},
        email = ${email},
        phone = ${phone || null},
        position = ${position || null},
        instagram = ${instagram || null},
        "photoUrl" = ${photoUrl || null},
        "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return res.status(200).json(updatedCandidate[0])
  } catch (error) {
    console.error('Erro ao atualizar candidato:', error)
    return res.status(500).json({ error: 'Erro ao atualizar candidato', details: error.message })
  } finally {
    await prisma.$disconnect()
  }
}
