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

        // Verificar se o estágio já está associado ao teste na tabela TestStage
        const stageAlreadyAssociated = await prisma.$queryRaw`
          SELECT id FROM "TestStage" 
          WHERE "stageId" = ${stageId} AND "testId" = ${id}::uuid
        `;

        if (Array.isArray(stageAlreadyAssociated) && stageAlreadyAssociated.length > 0) {
          return res.status(400).json({ error: 'Este estágio já está associado a este teste' });
        }

        // Associar o estágio ao teste na tabela TestStage
        try {
          await prisma.$queryRaw`
            INSERT INTO "TestStage" (
              id,
              "testId",
              "stageId",
              "order",
              "createdAt",
              "updatedAt"
            ) VALUES (
              gen_random_uuid(),
              ${id}::uuid,
              ${stageId},
              ${order || 0},
              NOW(),
              NOW()
            )
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
        // Criar um novo estágio
        try {
          // 1. Criar o estágio primeiro
          const newStageId = await prisma.$queryRaw`
            INSERT INTO "Stage" (
              id,
              title,
              description,
              "order",
              "createdAt",
              "updatedAt"
            ) VALUES (
              gen_random_uuid(),
              ${title},
              ${description || null},
              0,
              NOW(),
              NOW()
            )
            RETURNING id
          `;
          
          if (!Array.isArray(newStageId) || newStageId.length === 0) {
            throw new Error('Falha ao criar novo estágio');
          }
          
          const stageId = newStageId[0].id;
          
          // 2. Associar o estágio ao teste na tabela TestStage
          await prisma.$queryRaw`
            INSERT INTO "TestStage" (
              id,
              "testId",
              "stageId",
              "order",
              "createdAt",
              "updatedAt"
            ) VALUES (
              gen_random_uuid(),
              ${id}::uuid,
              ${stageId},
              0,
              NOW(),
              NOW()
            )
          `;
          
          console.log('Novo estágio criado e associado ao teste:', stageId);
          return res.status(201).json({ success: true, stageId: stageId });
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
      // Buscar estágios usando a tabela de junção TestStage
      // Adicionando logs para debug
      console.log('Buscando estágios para o teste:', id);
      
      const stages = await prisma.$queryRaw`
        SELECT 
          s.id as "stageId",
          s.title as "stage_title",
          s.description as "stage_description",
          ts.order,
          s."testId",
          s."createdAt",
          s."updatedAt"
        FROM "Stage" s
        JOIN "TestStage" ts ON s.id = ts."stageId"
        WHERE ts."testId" = ${id}
        ORDER BY ts.order ASC
      `;
      
      console.log('Resultado da busca de estágios:', stages);
      
      // Se não encontrar nenhum estágio usando a nova tabela, tente buscar pelo método antigo
      if (!Array.isArray(stages) || stages.length === 0) {
        console.log('Nenhum estágio encontrado na tabela TestStage, tentando método antigo');
        
        const oldStages = await prisma.$queryRaw`
          SELECT 
            id as "stageId",
            title as "stage_title",
            description as "stage_description",
            "order",
            "testId",
            "createdAt",
            "updatedAt"
          FROM "Stage"
          WHERE "testId" = ${id}
          ORDER BY "order" ASC
        `;
        
        console.log('Estágios encontrados pelo método antigo:', oldStages);
        
        // Se encontrar estágios pelo método antigo, migre-os para a nova estrutura
        if (Array.isArray(oldStages) && oldStages.length > 0) {
          console.log('Migrando estágios antigos para a nova estrutura');
          // Migrar estágios antigos para a nova estrutura
          for (let i = 0; i < oldStages.length; i++) {
            const stage = oldStages[i];
            
            // Verificar se já existe um registro na tabela TestStage
            const existingTestStage = await prisma.$queryRaw`
              SELECT id FROM "TestStage" 
              WHERE "testId" = ${id} AND "stageId" = ${stage.stageId}
            `;
            
            if (!Array.isArray(existingTestStage) || existingTestStage.length === 0) {
              console.log('Criando registro na tabela TestStage para o estágio:', stage.stageId);
              // Criar registro na tabela TestStage
              await prisma.$executeRaw`
                INSERT INTO "TestStage" (
                  id,
                  "testId",
                  "stageId",
                  "order",
                  "createdAt",
                  "updatedAt"
                ) VALUES (
                  gen_random_uuid(),
                  ${id},
                  ${stage.stageId},
                  ${stage.order || 0},
                  NOW(),
                  NOW()
                )
              `;
            }
          }
          
          return res.status(200).json(oldStages);
        }
      }
      
      console.log('Etapas encontradas para o teste:', id, stages);
      return res.status(200).json(stages);
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
