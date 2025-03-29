import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * API para atualizar o campo deleted em perguntas que foram excluídas usando o método antigo
 * Esta API é temporária e deve ser usada apenas para migração de dados
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Não autorizado. Faça login para continuar.' 
      });
    }
    
    // Verificar se o usuário é administrador
    if (session.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        error: 'Acesso negado. Apenas administradores podem executar esta operação.' 
      });
    }
    
    // Apenas permitir método POST
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false, 
        error: 'Método não permitido. Use POST.' 
      });
    }
    
    // Reconectar ao Prisma se necessário
    await reconnectPrisma();
    
    // Buscar perguntas que têm showResults = false ou texto começando com [EXCLUÍDA]
    const questionsToUpdate = await prisma.question.findMany({
      where: {
        OR: [
          { showResults: false },
          { text: { startsWith: '[EXCLUÍDA]' } }
        ]
      }
    });
    
    console.log(`Encontradas ${questionsToUpdate.length} perguntas para atualizar o campo deleted`);
    
    // Atualizar o campo deleted para true em todas as perguntas encontradas
    const updatePromises = questionsToUpdate.map(async (question) => {
      try {
        // Usar type casting para contornar a verificação de tipos do TypeScript
        await prisma.question.update({
          where: { id: question.id },
          data: {
            ...(({ deleted: true } as any))
          }
        });
        return { id: question.id, success: true };
      } catch (error) {
        console.error(`Erro ao atualizar pergunta ${question.id}:`, error);
        return { id: question.id, success: false, error: error.message };
      }
    });
    
    const results = await Promise.all(updatePromises);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return res.status(200).json({
      success: true,
      message: `Campo deleted atualizado com sucesso em ${successCount} perguntas. Falhas: ${failureCount}.`,
      details: results
    });
    
  } catch (error) {
    console.error('Erro ao atualizar campo deleted:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor ao atualizar campo deleted.',
      details: error.message
    });
  }
}
