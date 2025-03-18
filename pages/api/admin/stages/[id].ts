import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

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
      const existingStages = await prisma.$queryRaw`
        SELECT id FROM "Stage" 
        WHERE "order" = ${Number(order)} AND id != ${id}
      `;

      if (Array.isArray(existingStages) && existingStages.length > 0) {
        return res.status(400).json({ error: 'Já existe outra etapa com esta ordem' })
      }

      // Atualizar a etapa usando SQL raw
      await prisma.$executeRaw`
        UPDATE "Stage"
        SET 
          title = ${title},
          description = ${description || null},
          "order" = ${Number(order)},
          "updatedAt" = NOW()
        WHERE id = ${id}
      `;

      // Buscar a etapa atualizada
      const updatedStages = await prisma.$queryRaw`
        SELECT id, title, description, "order"
        FROM "Stage"
        WHERE id = ${id}
      `;

      const updatedStage = Array.isArray(updatedStages) && updatedStages.length > 0
        ? updatedStages[0]
        : null;

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
        where: { id }
      });

      if (!stage) {
        console.log(`[API] Etapa com ID ${id} não encontrada`);
        return res.status(404).json({ error: 'Etapa não encontrada' });
      }

      try {
        // Primeiro, remover todas as associações com testes
        console.log(`[API] Removendo associações da etapa ${id} com testes`);
        
        // Usando transação para garantir que todas as operações sejam concluídas ou nenhuma
        await prisma.$transaction(async (tx) => {
          // Excluir as associações TestStage
          await tx.$executeRaw`DELETE FROM "TestStage" WHERE "stageId" = ${id}::uuid`;
          
          // Excluir a etapa
          await tx.$executeRaw`DELETE FROM "Stage" WHERE id = ${id}::uuid`;
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
      const stageExists = await prisma.$queryRaw`
        SELECT id FROM "Stage" WHERE id = ${id}
      `;

      if (!Array.isArray(stageExists) || stageExists.length === 0) {
        return res.status(404).json({ error: 'Etapa não encontrada' });
      }

      // Buscar a etapa com contagem de perguntas
      try {
        const stages = await prisma.$queryRaw`
          SELECT 
            s.id, 
            s.title, 
            s.description, 
            s.order,
            COUNT(q.id) as "questionCount"
          FROM "Stage" s
          LEFT JOIN "Question" q ON q."stageId" = s.id
          WHERE s.id = ${id}
          GROUP BY s.id, s.title, s.description, s.order
        `;

        const stage = Array.isArray(stages) && stages.length > 0
          ? stages[0]
          : null;

        if (!stage) {
          return res.status(404).json({ error: 'Etapa não encontrada' });
        }

        return res.status(200).json(stage);
      } catch (queryError) {
        console.error('Erro na consulta de etapa:', queryError);
        
        // Se houver erro na consulta com JOIN, tentar uma consulta mais simples
        const simpleStages = await prisma.$queryRaw`
          SELECT id, title, description, "order"
          FROM "Stage"
          WHERE id = ${id}
        `;

        const simpleStage = Array.isArray(simpleStages) && simpleStages.length > 0
          ? { ...simpleStages[0], questionCount: 0 }
          : null;

        if (!simpleStage) {
          return res.status(404).json({ error: 'Etapa não encontrada' });
        }

        return res.status(200).json(simpleStage);
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
      const existingStageData = await prisma.$queryRaw`
        SELECT 
          s.id as "stageId", 
          ts.id as "testStageId", 
          ts."testId",
          ts."order"
        FROM "Stage" s
        JOIN "TestStage" ts ON s.id = ts."stageId"
        WHERE s.id = ${id}
      `;

      if (!Array.isArray(existingStageData) || existingStageData.length === 0) {
        console.log('Etapa não encontrada');
        return res.status(404).json({ error: 'Etapa não encontrada' });
      }
      
      console.log('Etapa encontrada:', existingStageData[0]);
      
      const { testId, testStageId, order } = existingStageData[0];
      
      // Atualizar APENAS o título da etapa
      if (title) {
        console.log('Atualizando título para:', title);
        await prisma.$executeRaw`
          UPDATE "Stage"
          SET 
            title = ${title},
            "updatedAt" = NOW()
          WHERE id = ${id}
        `;
      }
      
      // Atualizar a descrição apenas se fornecida
      if (description !== undefined) {
        console.log('Atualizando descrição para:', description);
        await prisma.$executeRaw`
          UPDATE "Stage"
          SET 
            description = ${description || null},
            "updatedAt" = NOW()
          WHERE id = ${id}
        `;
      }
      
      // Buscar a etapa atualizada com os mesmos dados de ordem e associação
      const updatedStageData = await prisma.$queryRaw`
        SELECT 
          s.id, 
          s.title, 
          s.description, 
          ts."order",
          ts.id as "testStageId",
          ts."testId"
        FROM "Stage" s
        JOIN "TestStage" ts ON s.id = ts."stageId"
        WHERE s.id = ${id} AND ts."testId" = ${testId}
      `;
      
      if (!Array.isArray(updatedStageData) || updatedStageData.length === 0) {
        console.log('Etapa não encontrada após atualização');
        return res.status(404).json({ error: 'Etapa não encontrada após atualização' });
      }
      
      const updatedStage = updatedStageData[0];
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
