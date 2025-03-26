import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Código de convite inválido' });
  }

  try {
    console.log(`Verificando convite com código: ${code}`);

    // Buscar o candidato pelo código de convite
    const candidate = await prisma.candidate.findFirst({
      where: {
        inviteCode: code,
      },
      select: {
        id: true,
        name: true,
        email: true,
        inviteExpires: true,
        requiresProfileCompletion: true,
        testId: true,
        processId: true,
      },
    });

    if (!candidate) {
      console.log(`Convite não encontrado: ${code}`);
      return res.status(404).json({ error: 'Convite não encontrado' });
    }

    // Verificar se o convite expirou
    if (candidate.inviteExpires && new Date(candidate.inviteExpires) < new Date()) {
      console.log(`Convite expirado: ${code}`);
      return res.status(400).json({ error: 'Este convite expirou' });
    }

    // Buscar informações do teste ou processo separadamente
    let testName = '';
    
    if (candidate.testId) {
      const test = await prisma.test.findUnique({
        where: { id: candidate.testId },
        select: { title: true }
      });
      if (test) {
        testName = test.title;
      }
    } else if (candidate.processId) {
      const process = await prisma.selectionProcess.findUnique({
        where: { id: candidate.processId },
        select: { name: true }
      });
      if (process) {
        testName = process.name;
      }
    }

    // Retornar os detalhes do convite
    return res.status(200).json({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      testName,
      requiresProfileCompletion: candidate.requiresProfileCompletion,
    });
  } catch (error) {
    console.error('Erro ao verificar convite:', error);
    return res.status(500).json({ error: 'Erro ao verificar convite' });
  }
}
