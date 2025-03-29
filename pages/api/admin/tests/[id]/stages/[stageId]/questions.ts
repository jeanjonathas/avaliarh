import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Não autorizado. Faça login para continuar.' 
    });
  }
  
  // Verificar se o usuário é administrador
  if (session.user.role !== 'COMPANY_ADMIN') {
    return res.status(403).json({ 
      success: false, 
      error: 'Acesso negado. Apenas administradores podem executar esta operação.' 
    });
  }

  // Obter IDs da URL
  const { id, stageId } = req.query;
  
  if (!id || !stageId) {
    return res.status(400).json({ 
      success: false, 
      error: 'ID do teste e ID da etapa são obrigatórios.' 
    });
  }

  // Reconectar ao Prisma se necessário
  await reconnectPrisma();

  // Verificar se o teste existe
  const testExists = await prisma.test.findUnique({
    where: { id: id as string }
  });

  if (!testExists) {
    return res.status(404).json({ 
      success: false, 
      error: 'Teste não encontrado.' 
    });
  }

  // Verificar se a etapa existe e pertence ao teste
  const testStageExists = await prisma.testStage.findFirst({
    where: {
      testId: id as string,
      stageId: stageId as string
    }
  });

  if (!testStageExists) {
    return res.status(404).json({ 
      success: false, 
      error: 'Etapa não encontrada ou não pertence a este teste.' 
    });
  }

  // Método DELETE - Remover perguntas da etapa
  if (req.method === 'DELETE') {
    try {
      const { questionIds } = req.body;
      
      if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Lista de IDs de perguntas é obrigatória.' 
        });
      }
      
      console.log(`Removendo ${questionIds.length} perguntas da etapa ${stageId} do teste ${id}`);
      
      // Atualizar as perguntas para remover a associação com a etapa
      const updateResult = await prisma.question.updateMany({
        where: {
          stageId: stageId as string,
          id: {
            in: questionIds
          }
        },
        data: {
          stageId: null
        }
      });
      
      console.log(`Removidas ${updateResult.count} associações entre perguntas e etapa`);
      
      return res.status(200).json({
        success: true,
        message: `${updateResult.count} perguntas foram removidas da etapa com sucesso.`,
        removedCount: updateResult.count
      });
    } catch (error) {
      console.error('Erro ao remover perguntas da etapa:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor ao remover perguntas da etapa.',
        details: error.message
      });
    }
  }
  
  // Método não permitido
  return res.status(405).json({ 
    success: false, 
    error: 'Método não permitido.' 
  });
}
