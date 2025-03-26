import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  try {
    const { id, name, email, phone, position, instagram, photoUrl, fromTest, testId } = req.body

    if (!id || !name || !email) {
      return res.status(400).json({ error: 'ID, nome e email são obrigatórios' })
    }
    
    // Verificar autenticação apenas se a requisição não vier do teste (fromTest = true)
    if (!fromTest) {
      const session = await getServerSession(req, res, authOptions)
      if (!session) {
        return res.status(401).json({ error: 'Não autorizado' })
      }
    }
    
    // Verificar se o candidato existe
    const existingCandidate = await prisma.candidate.findUnique({
      where: { id }
    });

    if (!existingCandidate) {
      return res.status(404).json({ error: 'Candidato não encontrado' });
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
        "testId" = ${req.body.testId || existingCandidate.testId},
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
