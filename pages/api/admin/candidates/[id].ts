import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de candidato inválido' })
  }

  if (req.method === 'GET') {
    try {
      // Buscar apenas os dados básicos do candidato
      const candidate = await prisma.candidate.findUnique({
        where: { id }
      });
      
      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' })
      }

      // Formatar datas para evitar problemas de serialização
      const formattedCandidate = {
        ...candidate,
        testDate: candidate.testDate ? candidate.testDate.toISOString() : null,
        interviewDate: candidate.interviewDate ? candidate.interviewDate.toISOString() : null,
        inviteExpires: candidate.inviteExpires ? candidate.inviteExpires.toISOString() : null,
        createdAt: candidate.createdAt ? candidate.createdAt.toISOString() : null,
        updatedAt: candidate.updatedAt ? candidate.updatedAt.toISOString() : null,
      };

      return res.status(200).json({
        ...formattedCandidate,
        score: 0,
        responses: [],
        stageScores: []
      });
    } catch (error) {
      console.error('Erro ao buscar candidato:', error);
      return res.status(500).json({ error: 'Erro ao buscar candidato' });
    }
  } else if (req.method === 'PUT') {
    try {
      const {
        name,
        email,
        phone,
        position,
        status,
        rating,
        observations,
        infoJobsLink,
        socialMediaUrl,
        interviewDate,
        linkedin,
        github,
        portfolio,
        resumeUrl
      } = req.body;

      // Validação básica
      if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios' });
      }

      // Atualizar o candidato
      const updatedCandidate = await prisma.candidate.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          position,
          status: status || 'PENDING',
          rating: rating ? parseFloat(rating) : null,
          observations,
          infoJobsLink,
          socialMediaUrl,
          linkedin,
          github,
          portfolio,
          resumeUrl,
          interviewDate: interviewDate ? new Date(interviewDate) : null
        }
      });

      return res.status(200).json(updatedCandidate);
    } catch (error) {
      console.error('Erro ao atualizar candidato:', error);
      return res.status(500).json({ error: 'Erro ao atualizar candidato' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar se o candidato existe
      const candidate = await prisma.candidate.findUnique({
        where: { id }
      });
      
      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' });
      }

      // Excluir o candidato
      await prisma.candidate.delete({
        where: { id }
      });

      return res.status(200).json({ success: true, message: 'Candidato excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir candidato:', error);
      return res.status(500).json({ error: 'Erro ao excluir candidato' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
