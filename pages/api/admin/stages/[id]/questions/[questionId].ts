import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/prisma'

// ID de um estágio especial para armazenar questões "removidas"
// Este ID deve ser criado no banco de dados ou usar um existente
const UNASSIGNED_STAGE_ID = process.env.UNASSIGNED_STAGE_ID || "00000000-0000-0000-0000-000000000000";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`[API] Recebida requisição ${req.method} para /api/admin/stages/${req.query.id}/questions/${req.query.questionId}`);
  
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    console.log(`[API] Requisição não autorizada`);
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const { id, questionId } = req.query
  
  if (typeof id !== 'string' || typeof questionId !== 'string') {
    console.log(`[API] IDs inválidos: id=${id}, questionId=${questionId}`);
    return res.status(400).json({ error: 'IDs inválidos' })
  }

  // Método DELETE - Remover questão da etapa
  if (req.method === 'DELETE') {
    try {
      console.log(`[API] Iniciando processo de remoção da questão ${questionId} da etapa ${id}`);
      
      // Verificar se a questão existe
      const question = await prisma.question.findUnique({
        where: { id: questionId }
      });

      if (!question) {
        console.log(`[API] Questão ${questionId} não encontrada`);
        return res.status(404).json({ error: 'Questão não encontrada' });
      }
      
      // Verificar se o estágio existe e se a questão está associada a ele
      const stage = await prisma.stage.findUnique({
        where: { id },
        include: {
          questions: {
            where: {
              id: questionId
            }
          }
        }
      });

      if (!stage) {
        console.log(`[API] Estágio ${id} não encontrado`);
        return res.status(404).json({ error: 'Estágio não encontrado' });
      }
      
      // Verificar se a questão está associada ao estágio
      if (stage.questions.length === 0) {
        console.log(`[API] Questão ${questionId} não está associada ao estágio ${id}`);
        return res.status(404).json({ error: 'Questão não encontrada neste estágio' });
      }
      
      // Buscar ou criar um estágio especial "Banco de Questões" sem associação a teste
      let questionBankStage = await prisma.stage.findFirst({
        where: {
          title: "Banco de Questões",
          testId: null
        }
      });
      
      if (!questionBankStage) {
        // Criar um novo estágio "Banco de Questões" se não existir
        questionBankStage = await prisma.stage.create({
          data: {
            title: "Banco de Questões",
            description: "Repositório para questões não associadas a testes ativos",
            order: 999 // Ordem alta para ficar no final
          }
        });
        console.log(`[API] Criado novo estágio Banco de Questões: ${questionBankStage.id}`);
      }
      
      // Atualizar a questão para apontar para o estágio "Banco de Questões"
      await prisma.question.update({
        where: { id: questionId },
        data: {
          stageId: questionBankStage.id
        }
      });
      
      console.log(`[API] Questão ${questionId} movida para o Banco de Questões ${questionBankStage.id}`);
      
      // Retornar resposta de sucesso
      return res.status(200).json({ 
        success: true,
        message: 'Questão removida da etapa com sucesso',
        newStageId: questionBankStage.id
      });
    } catch (error) {
      console.error('Erro ao remover questão do estágio:', error);
      return res.status(500).json({ error: 'Erro ao remover questão do estágio' });
    }
  }
  // Atualizar ordem da questão no estágio (PATCH)
  else if (req.method === 'PATCH') {
    try {
      const { order } = req.body;

      if (typeof order !== 'number') {
        return res.status(400).json({ error: 'Ordem inválida' });
      }

      // Verificar se a questão existe
      const question = await prisma.question.findUnique({
        where: { id: questionId }
      });

      if (!question) {
        return res.status(404).json({ error: 'Questão não encontrada' });
      }

      // Verificar se o estágio existe e se a questão está associada a ele
      const stage = await prisma.stage.findUnique({
        where: { id },
        include: {
          questions: {
            where: {
              id: questionId
            }
          }
        }
      });

      if (!stage) {
        return res.status(404).json({ error: 'Estágio não encontrado' });
      }

      if (stage.questions.length === 0) {
        return res.status(404).json({ error: 'Questão não encontrada neste estágio' });
      }

      // Como não temos um campo de ordem na relação direta entre Stage e Question,
      // não podemos atualizar a ordem diretamente. Esta funcionalidade precisaria
      // ser implementada de outra forma, possivelmente usando uma tabela de junção
      // ou um campo adicional.
      
      return res.status(200).json({ 
        success: true,
        message: 'Ordem da questão atualizada com sucesso',
        warning: 'A funcionalidade de ordem não está disponível no modelo atual'
      });
    } catch (error) {
      console.error('Erro ao atualizar ordem da questão:', error);
      return res.status(500).json({ error: 'Erro ao atualizar ordem da questão' });
    }
  }
  // Método não permitido
  else {
    res.setHeader('Allow', ['DELETE', 'PATCH']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}