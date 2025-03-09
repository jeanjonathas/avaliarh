import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../../lib/auth'
import { prisma } from '../../../../../lib/prisma'

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
    return res.status(400).json({ error: 'ID do teste inválido' })
  }

  // Verificar se o teste existe
  try {
    const testExists = await prisma.$queryRaw`
      SELECT id FROM "tests" WHERE id = ${id}
    `;

    if (!Array.isArray(testExists) || testExists.length === 0) {
      return res.status(404).json({ error: 'Teste não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao verificar teste:', error);
    return res.status(500).json({ error: 'Erro ao verificar teste' });
  }

  // Adicionar estágio ao teste (POST)
  if (req.method === 'POST') {
    try {
      const { title, description } = req.body;

      // Se estamos recebendo um stageId, é porque queremos associar um estágio existente
      if (req.body.stageId) {
        const { stageId, order } = req.body;
        
        if (!stageId) {
          return res.status(400).json({ error: 'ID do estágio é obrigatório' });
        }

        console.log('Recebido stageId:', stageId);
        console.log('Recebido order:', order);

        // Verificar se o estágio existe
        const stageExists = await prisma.$queryRaw`
          SELECT id FROM "Stage" WHERE id = ${stageId}
        `;

        if (!Array.isArray(stageExists) || stageExists.length === 0) {
          return res.status(404).json({ error: 'Estágio não encontrado' });
        }

        // Verificar se o estágio já está associado ao teste
        const stageAlreadyAssociated = await prisma.$queryRaw`
          SELECT id FROM "Stage" 
          WHERE id = ${stageId} AND "testId" = ${id}::uuid
        `;

        if (Array.isArray(stageAlreadyAssociated) && stageAlreadyAssociated.length > 0) {
          return res.status(400).json({ error: 'Este estágio já está associado a este teste' });
        }

        // Associar o estágio ao teste atualizando o testId
        try {
          await prisma.$queryRaw`
            UPDATE "Stage"
            SET "testId" = ${id}::uuid, "order" = ${order || 0}
            WHERE id = ${stageId}
          `;
          
          console.log('Estágio associado ao teste com sucesso');
          return res.status(201).json({ success: true });
        } catch (updateError) {
          console.error('Erro ao associar estágio ao teste:', updateError);
          return res.status(500).json({ error: 'Erro ao associar estágio ao teste: ' + updateError.message });
        }
      } 
      // Se não recebemos um stageId, é porque queremos criar um novo estágio
      else if (title) {
        // Criar um novo estágio já associado ao teste
        try {
          const newStageId = await prisma.$queryRaw`
            INSERT INTO "Stage" (
              id,
              title,
              description,
              "order",
              "testId",
              "createdAt",
              "updatedAt"
            ) VALUES (
              gen_random_uuid(),
              ${title},
              ${description || null},
              0,
              ${id}::uuid,
              NOW(),
              NOW()
            )
            RETURNING id
          `;
          
          console.log('Novo estágio criado e associado ao teste:', newStageId);
          return res.status(201).json({ success: true, stageId: newStageId });
        } catch (insertError) {
          console.error('Erro ao criar novo estágio:', insertError);
          return res.status(500).json({ error: 'Erro ao criar novo estágio: ' + insertError.message });
        }
      } else {
        return res.status(400).json({ error: 'É necessário fornecer um stageId existente ou um título para criar um novo estágio' });
      }
    } catch (error) {
      console.error('Erro ao processar requisição:', error);
      return res.status(500).json({ error: 'Erro ao processar requisição: ' + error.message });
    }
  } 
  // Obter todos os estágios de um teste (GET)
  else if (req.method === 'GET') {
    try {
      // Verificar se a tabela TestStage existe
      let testStages = [];
      
      try {
        testStages = await prisma.$queryRaw`
          SELECT 
            ts.id,
            ts."testId",
            ts."stageId",
            ts."order",
            s.id as "stage_id",
            s.title as "stage_title",
            s.description as "stage_description"
          FROM "TestStage" ts
          JOIN "Stage" s ON ts."stageId" = s.id
          WHERE ts."testId" = ${id}
          ORDER BY ts."order" ASC
        `;
        
        console.log('Etapas encontradas para o teste:', id, testStages);
      } catch (error) {
        console.error('Erro ao buscar estágios do teste:', error);
        // Se houver erro, continuar com array vazio
      }

      return res.status(200).json(testStages);
    } catch (error) {
      console.error('Erro ao buscar estágios do teste:', error);
      return res.status(500).json({ error: 'Erro ao buscar estágios do teste' });
    }
  }
  // Método não permitido
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
