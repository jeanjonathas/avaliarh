import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user?.email as string },
          select: { companyId: true, role: true },
        });

        if (!user || !user.companyId) {
          return res.status(403).json({ message: 'Acesso negado' });
        }

        const processes = await prisma.selectionProcess.findMany({
          where: { companyId: user.companyId },
          include: {
            stages: {
              orderBy: { order: 'asc' },
            },
            _count: {
              select: { candidates: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json(processes);
      } catch (error) {
        console.error('Erro ao buscar processos seletivos:', error);
        return res.status(500).json({ message: 'Erro ao buscar processos seletivos' });
      }

    case 'POST':
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user?.email as string },
          select: { companyId: true, role: true },
        });

        if (!user || !user.companyId || !['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
          return res.status(403).json({ message: 'Acesso negado' });
        }

        const { name, description, cutoffScore, evaluationType, stages } = req.body;

        if (!name) {
          return res.status(400).json({ message: 'Nome do processo seletivo é obrigatório' });
        }

        if (!stages || !Array.isArray(stages) || stages.length === 0) {
          return res.status(400).json({ message: 'Pelo menos uma etapa é obrigatória' });
        }

        const newProcess = await prisma.selectionProcess.create({
          data: {
            name,
            description,
            cutoffScore,
            evaluationType,
            companyId: user.companyId,
            stages: {
              create: stages.map((stage: any) => ({
                name: stage.name,
                description: stage.description,
                order: stage.order,
                type: stage.type,
              })),
            },
          },
          include: {
            stages: {
              orderBy: { order: 'asc' },
            },
          },
        });

        return res.status(201).json(newProcess);
      } catch (error) {
        console.error('Erro ao criar processo seletivo:', error);
        return res.status(500).json({ message: 'Erro ao criar processo seletivo' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ message: `Método ${method} não permitido` });
  }
}
