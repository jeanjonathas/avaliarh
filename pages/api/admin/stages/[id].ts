import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/prisma';

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
    return res.status(400).json({ error: 'ID da etapa é obrigatório' })
  }

  if (req.method === 'PUT') {
    try {
      const { title, description, order } = req.body

      if (!title || !order) {
        return res.status(400).json({ error: 'Título e ordem são obrigatórios' })
      }

      // Verificar se já existe outra etapa com a mesma ordem (exceto a atual)
      const existingStages = await prisma.stage.findMany({
        where: {
          order: Number(order),
          id: { not: id }
        }
      });

      if (existingStages.length > 0) {
        return res.status(400).json({ error: 'Já existe outra etapa com esta ordem' })
      }

      // Atualizar a etapa usando Prisma Client
      await prisma.stage.update({
        where: { id },
        data: {
          title,
          description,
          order: Number(order),
          updatedAt: new Date()
        }
      });

      // Buscar a etapa atualizada
      const updatedStage = await prisma.stage.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          order: true
        }
      });

      if (!updatedStage) {
        return res.status(404).json({ error: 'Etapa não encontrada após atualização' });
      }

      return res.status(200).json(updatedStage);
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      return res.status(500).json({ error: 'Erro ao atualizar etapa' });
    }
  } else if (req.method === 'DELETE') {
    try {
      console.log(`[API] Iniciando exclusão da etapa com ID: ${id}`);
      
      // Verificar se a etapa existe
      const stage = await prisma.stage.findUnique({
        where: { id },
        include: {
          questions: true
        }
      });

      if (!stage) {
        console.log(`[API] Etapa com ID ${id} não encontrada`);
        return res.status(404).json({ error: 'Etapa não encontrada' });
      }

      // Verificar se há perguntas associadas à etapa
      if (stage.questions && stage.questions.length > 0) {
        console.log(`[API] A etapa ${id} possui ${stage.questions.length} perguntas associadas`);
        
        // Buscar ou criar um estágio "Banco de Questões"
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
        
        // Mover todas as perguntas para o estágio "Banco de Questões"
        await prisma.question.updateMany({
          where: {
            stageId: id
          },
          data: {
            stageId: questionBankStage.id
          }
        });
        
        console.log(`[API] ${stage.questions.length} perguntas movidas para o Banco de Questões ${questionBankStage.id}`);
      }

      try {
        // Primeiro, remover todas as associações com testes
        console.log(`[API] Removendo associações da etapa ${id} com testes`);
        
        // Usando transação para garantir que todas as operações sejam concluídas ou nenhuma
        await prisma.$transaction(async (tx) => {
          // Excluir as associações TestStage
          await tx.testStage.deleteMany({
            where: {
              stageId: id
            }
          });
          
          // Excluir a etapa
          await tx.stage.delete({
            where: {
              id: id
            }
          });
        });
        
        console.log(`[API] Etapa ${id} excluída com sucesso`);
        return res.status(204).end();
      } catch (transactionError) {
        console.error('Erro na transação:', transactionError);
        throw transactionError;
      }
    } catch (error) {
      console.error('Erro ao excluir etapa:', error);
      return res.status(500).json({ error: 'Erro ao excluir etapa' });
    }
  } else if (req.method === 'GET') {
    try {
      // Verificar se a etapa existe antes de tentar buscar detalhes
      const stageExists = await prisma.stage.findUnique({
        where: { id }
      });

      if (!stageExists) {
        return res.status(404).json({ error: 'Etapa não encontrada' });
      }

      // Buscar a etapa com contagem de perguntas
      try {
        const stages = await prisma.stage.findMany({
          where: { id },
          include: {
            questions: true
          }
        });

        const stage = stages[0];

        if (!stage) {
          return res.status(404).json({ error: 'Etapa não encontrada' });
        }

        return res.status(200).json({
          ...stage,
          questionCount: stage.questions.length
        });
      } catch (queryError) {
        console.error('Erro na consulta de etapa:', queryError);
        
        // Se houver erro na consulta com JOIN, tentar uma consulta mais simples
        const simpleStage = await prisma.stage.findUnique({
          where: { id },
          select: {
            id: true,
            title: true,
            description: true,
            order: true
          }
        });

        if (!simpleStage) {
          return res.status(404).json({ error: 'Etapa não encontrada' });
        }

        return res.status(200).json({ ...simpleStage, questionCount: 0 });
      }
    } catch (error) {
      console.error('Erro ao buscar etapa:', error);
      return res.status(500).json({ error: 'Erro ao buscar etapa' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { title, description } = req.body;
      console.log('Iniciando PATCH de etapa:', id, 'Dados:', { title, description });
      
      // Verificar primeiro se a etapa existe nas tabelas Stage e TestStage
      const existingStageData = await prisma.stage.findUnique({
        where: { id },
        include: {
          TestStage: true
        }
      });

      if (!existingStageData) {
        console.log('Etapa não encontrada');
        return res.status(404).json({ error: 'Etapa não encontrada' });
      }
      
      console.log('Etapa encontrada:', existingStageData);
      
      // Atualizar APENAS o título da etapa
      if (title) {
        console.log('Atualizando título para:', title);
        await prisma.stage.update({
          where: { id },
          data: {
            title,
            updatedAt: new Date()
          }
        });
      }
      
      // Atualizar a descrição apenas se fornecida
      if (description !== undefined) {
        console.log('Atualizando descrição para:', description);
        await prisma.stage.update({
          where: { id },
          data: {
            description,
            updatedAt: new Date()
          }
        });
      }
      
      // Buscar a etapa atualizada com os mesmos dados de ordem e associação
      const updatedStageData = await prisma.stage.findUnique({
        where: { id },
        include: {
          TestStage: true
        }
      });
      
      if (!updatedStageData) {
        console.log('Etapa não encontrada após atualização');
        return res.status(404).json({ error: 'Etapa não encontrada após atualização' });
      }
      
      const updatedStage = updatedStageData;
      console.log('Etapa atualizada:', updatedStage);
      
      return res.status(200).json(updatedStage);
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      return res.status(500).json({ error: 'Erro ao atualizar etapa' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'PATCH']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
