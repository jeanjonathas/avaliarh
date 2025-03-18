import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'
import { Prisma } from '@prisma/client'

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
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' })
  }

  if (req.method === 'GET') {
    try {
      // Buscar teste por ID usando Prisma Client
      const test = await prisma.test.findUnique({
        where: {
          id: id
        },
        select: {
          id: true,
          title: true,
          description: true,
          timeLimit: true,
          active: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!test) {
        return res.status(404).json({ error: 'Teste não encontrado' });
      }

      // Buscar os estágios (etapas) associados ao teste
      console.log(`[API] Buscando etapas para o teste ${id}...`);
      const stages = await prisma.stage.findMany({
        where: {
          testId: id
        },
        orderBy: {
          order: 'asc'
        },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      console.log(`[API] ${stages.length} etapas encontradas para o teste ${id}`);
      console.log("[API] Etapas ordenadas por ordem ASC:", stages.map(s => ({
        id: s.id,
        title: s.title,
        order: s.order
      })));
      
      // Verificar se há etapas com a mesma ordem
      const orderCounts = stages.reduce((acc, stage) => {
        acc[stage.order] = (acc[stage.order] || 0) + 1;
        return acc;
      }, {});
      
      const hasDuplicateOrders = Object.values(orderCounts).some(count => (count as number) > 1);
      
      if (hasDuplicateOrders) {
        console.log("[API] Detectadas etapas com a mesma ordem. Corrigindo...");
        
        // Corrigir as ordens para garantir que sejam sequenciais (0, 1, 2, ...)
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          
          // Atualizar a ordem no banco de dados
          await prisma.stage.update({
            where: {
              id: stage.id
            },
            data: {
              order: i
            }
          });
          
          // Atualizar a ordem no objeto para retornar ao cliente
          stage.order = i;
        }
        
        console.log("[API] Ordens corrigidas:", stages.map(s => ({
          id: s.id,
          title: s.title,
          order: s.order
        })));
      }
      
      // Para cada estágio, buscar as perguntas
      const stagesWithQuestions = await Promise.all(
        stages.map(async (stage) => {
          const questions = await prisma.question.findMany({
            where: {
              stageId: stage.id
            },
            select: {
              id: true,
              text: true,
              type: true,
              difficulty: true,
              createdAt: true,
              updatedAt: true
            }
          });
          
          return {
            ...stage,
            questions
          };
        })
      );
      
      // Retornar o teste com suas etapas e perguntas
      return res.status(200).json({
        ...test,
        stages: stagesWithQuestions
      });
    } catch (error) {
      console.error('Erro ao buscar teste:', error);
      return res.status(500).json({ error: 'Erro ao buscar teste' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { title, description, timeLimit, active } = req.body;
      
      // Atualizar o teste
      const updatedTest = await prisma.test.update({
        where: {
          id: id
        },
        data: {
          title,
          description,
          timeLimit: timeLimit ? parseInt(timeLimit) : null,
          active: active !== undefined ? active : true
        }
      });
      
      return res.status(200).json(updatedTest);
    } catch (error) {
      console.error('Erro ao atualizar teste:', error);
      return res.status(500).json({ error: 'Erro ao atualizar teste' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Excluir o teste
      await prisma.test.delete({
        where: {
          id: id
        }
      });
      
      return res.status(200).json({ message: 'Teste excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir teste:', error);
      return res.status(500).json({ error: 'Erro ao excluir teste' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { active } = req.body;
      
      if (active === undefined) {
        return res.status(400).json({ error: 'Campo active é obrigatório' });
      }
      
      // Atualizar apenas o status do teste
      const updatedTest = await prisma.test.update({
        where: {
          id: id
        },
        data: {
          active
        }
      });
      
      return res.status(200).json(updatedTest);
    } catch (error) {
      console.error('Erro ao atualizar status do teste:', error);
      return res.status(500).json({ error: 'Erro ao atualizar status do teste' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'PATCH']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
