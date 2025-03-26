import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/plans/${req.query.id}/features`);
    
    const session = await getServerSession(req, res, authOptions);

    // Verificar autenticação e permissão de superadmin
    if (!session) {
      console.log('[API] Erro: Usuário não autenticado');
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    if ((session.user.role as string) !== 'SUPER_ADMIN') {
      console.log(`[API] Erro: Usuário não é SUPER_ADMIN (role: ${session.user.role})`);
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID do plano é obrigatório' });
    }

    try {
      // Verificar se o plano existe
      const plan = await prisma.plan.findUnique({
        where: { id },
      });

      if (!plan) {
        return res.status(404).json({ message: 'Plano não encontrado' });
      }

      // GET - Obter recursos de um plano específico
      if (req.method === 'GET') {
        // Buscar todos os recursos disponíveis
        const allFeatures = await prisma.feature.findMany({
          orderBy: {
            name: 'asc',
          },
        });

        // Buscar recursos associados ao plano
        const planFeatures = await prisma.planFeature.findMany({
          where: {
            planId: id,
          },
          include: {
            feature: true,
          },
        });

        const planFeatureIds = planFeatures.map(pf => pf.featureId);

        // Formatar a resposta para incluir todos os recursos, marcando os que estão incluídos no plano
        const formattedFeatures = allFeatures.map(feature => ({
          id: feature.id,
          name: feature.name,
          description: feature.description,
          isIncluded: planFeatureIds.includes(feature.id),
        }));

        return res.status(200).json(formattedFeatures);
      }

      // PUT - Atualizar recursos de um plano
      if (req.method === 'PUT') {
        const { featureIds } = req.body;

        if (!featureIds || !Array.isArray(featureIds)) {
          return res.status(400).json({ message: 'Lista de IDs de recursos é obrigatória' });
        }

        // Remover todos os recursos atuais do plano
        await prisma.planFeature.deleteMany({
          where: {
            planId: id,
          },
        });

        // Adicionar os novos recursos selecionados
        const planFeaturePromises = featureIds.map(featureId => 
          prisma.planFeature.create({
            data: {
              plan: {
                connect: { id },
              },
              feature: {
                connect: { id: featureId },
              },
            },
          })
        );

        await Promise.all(planFeaturePromises);

        // Buscar os recursos atualizados
        const updatedPlanFeatures = await prisma.planFeature.findMany({
          where: {
            planId: id,
          },
          include: {
            feature: true,
          },
        });

        // Formatar a resposta
        const formattedFeatures = updatedPlanFeatures.map(pf => ({
          id: pf.feature.id,
          name: pf.feature.name,
          description: pf.feature.description,
          isIncluded: true,
        }));

        return res.status(200).json(formattedFeatures);
      }

      // Método não permitido
      return res.status(405).json({ message: 'Método não permitido' });
    } catch (error) {
      console.error('Erro na API de recursos do plano:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Erro na API de recursos do plano:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
