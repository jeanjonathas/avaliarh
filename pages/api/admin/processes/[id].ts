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
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID do processo seletivo é obrigatório' });
  }

  // Verificar se o usuário pertence à empresa do processo
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email as string },
    select: { companyId: true, role: true },
  });

  if (!user || !user.companyId) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  // Verificar se o processo pertence à empresa do usuário
  const process = await prisma.selectionProcess.findUnique({
    where: { id },
    select: { companyId: true },
  });

  if (!process || process.companyId !== user.companyId) {
    return res.status(404).json({ message: 'Processo seletivo não encontrado' });
  }

  switch (method) {
    case 'GET':
      try {
        const processDetails = await prisma.selectionProcess.findUnique({
          where: { id },
          include: {
            stages: {
              orderBy: { order: 'asc' },
            },
            candidates: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
                overallStatus: true,
                createdAt: true,
                progresses: {
                  include: {
                    stage: true,
                  },
                },
              },
            },
          },
        });

        if (!processDetails) {
          return res.status(404).json({ message: 'Processo seletivo não encontrado' });
        }

        return res.status(200).json(processDetails);
      } catch (error) {
        console.error('Erro ao buscar detalhes do processo seletivo:', error);
        return res.status(500).json({ message: 'Erro ao buscar detalhes do processo seletivo' });
      }

    case 'PUT':
      try {
        if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
          return res.status(403).json({ message: 'Acesso negado' });
        }

        const { name, description, cutoffScore, evaluationType, stages } = req.body;

        if (!name) {
          return res.status(400).json({ message: 'Nome do processo seletivo é obrigatório' });
        }

        if (!stages || !Array.isArray(stages) || stages.length === 0) {
          return res.status(400).json({ message: 'Pelo menos uma etapa é obrigatória' });
        }

        // Atualizar o processo seletivo
        const updatedProcess = await prisma.$transaction(async (tx) => {
          // Excluir etapas existentes
          await tx.processStage.deleteMany({
            where: { processId: id },
          });

          // Atualizar o processo
          return tx.selectionProcess.update({
            where: { id },
            data: {
              name,
              description,
              cutoffScore,
              evaluationType,
              stages: {
                create: stages.map((stage: any) => ({
                  name: stage.name,
                  description: stage.description,
                  order: stage.order,
                  type: stage.type,
                  testId: stage.testId || null // Garantir que testId seja null quando vazio
                })),
              },
            },
            include: {
              stages: {
                orderBy: { order: 'asc' },
              },
            },
          });
        });

        return res.status(200).json(updatedProcess);
      } catch (error) {
        console.error('Erro ao atualizar processo seletivo:', error);
        return res.status(500).json({ message: 'Erro ao atualizar processo seletivo' });
      }

    case 'DELETE':
      try {
        if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
          return res.status(403).json({ message: 'Acesso negado' });
        }

        // Verificar se existem candidatos associados
        const candidatesCount = await prisma.candidate.count({
          where: { processId: id },
        });

        if (candidatesCount > 0) {
          // Atualizar candidatos para remover a associação com o processo
          await prisma.candidate.updateMany({
            where: { processId: id },
            data: { processId: null },
          });
        }

        // Excluir etapas do processo
        await prisma.processStage.deleteMany({
          where: { id: { in: (await prisma.processStage.findMany({ where: { id } })).map(s => s.id) } },
        });

        // Excluir o processo
        await prisma.selectionProcess.delete({
          where: { id },
        });

        return res.status(200).json({ message: 'Processo seletivo excluído com sucesso' });
      } catch (error) {
        console.error('Erro ao excluir processo seletivo:', error);
        return res.status(500).json({ message: 'Erro ao excluir processo seletivo' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ message: `Método ${method} não permitido` });
  }
}
