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

  if (req.method === 'GET') {
    try {
      // Verificar se a tabela Stage existe
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Stage" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            "order" INTEGER,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `);
      } catch (tableError) {
        console.error('Erro ao verificar tabela Stage:', tableError);
        // Continuar mesmo se houver erro, pois a tabela pode já existir
      }

      // Buscar todas as etapas com contagem de perguntas usando SQL raw
      const stages = await prisma.$queryRaw`
        SELECT 
          s.id, 
          s.title, 
          s.description, 
          s.order,
          CAST(COUNT(q.id) AS INTEGER) as "questionCount"
        FROM "Stage" s
        LEFT JOIN "Question" q ON q."stageId" = s.id
        GROUP BY s.id, s.title, s.description, s.order
        ORDER BY s.order ASC
      `;

      // Converter BigInt para Number antes de serializar para JSON
      const serializedStages = Array.isArray(stages) 
        ? stages.map(stage => ({
            ...stage,
            questionCount: Number(stage.questionCount)
          }))
        : [];

      return res.status(200).json(serializedStages);
    } catch (error) {
      console.error('Erro ao buscar etapas:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json([]);
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, order, testId } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Título é obrigatório' });
      }

      console.log('Recebido para criar estágio:', { title, description, order, testId });

      // Verificar se a tabela Stage existe
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Stage" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            "order" INTEGER,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `);
      } catch (tableError) {
        console.error('Erro ao verificar tabela Stage:', tableError);
        // Continuar mesmo se houver erro, pois a tabela pode já existir
      }

      // Determinar a próxima ordem disponível se não for fornecida
      let nextOrder = order;
      if (testId && (nextOrder === undefined || nextOrder === null)) {
        try {
          // Verificar a maior ordem existente para este teste
          const maxOrderResult = await prisma.$queryRaw`
            SELECT COALESCE(MAX(ts."order"), -1) as "maxOrder"
            FROM "TestStage" ts
            WHERE ts."testId" = ${testId}
          `;
          
          if (Array.isArray(maxOrderResult) && maxOrderResult.length > 0) {
            const maxOrder = maxOrderResult[0].maxOrder;
            // Garantir que a próxima ordem seja sempre maxOrder + 1
            nextOrder = maxOrder !== null ? Number(maxOrder) + 1 : 0;
          } else {
            nextOrder = 0;
          }
          
          console.log(`Próxima ordem para o teste ${testId}:`, nextOrder);
        } catch (orderError) {
          console.error('Erro ao determinar próxima ordem:', orderError);
          nextOrder = 0;
        }
      } else {
        nextOrder = nextOrder || 0;
      }

      // Criar nova etapa usando executeRawUnsafe para maior controle
      let newStageId = '';
      try {
        console.log('Inserindo nova etapa com valores:', {
          title,
          description: description || null,
          order: nextOrder
        });
        
        // Verificar se a tabela TestStage existe
        try {
          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "TestStage" (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              "testId" UUID NOT NULL,
              "stageId" UUID NOT NULL,
              "order" INTEGER NOT NULL,
              "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              FOREIGN KEY ("testId") REFERENCES "tests"(id) ON DELETE CASCADE,
              FOREIGN KEY ("stageId") REFERENCES "Stage"(id) ON DELETE CASCADE
            )
          `);
        } catch (tableError) {
          console.error('Erro ao verificar tabela TestStage:', tableError);
          // Continuar mesmo se houver erro, pois a tabela pode já existir
        }
        
        // Gerar um UUID para a nova etapa
        const uuidResult = await prisma.$queryRaw`SELECT gen_random_uuid() as uuid`;
        if (!Array.isArray(uuidResult) || uuidResult.length === 0) {
          throw new Error('Falha ao gerar UUID para nova etapa');
        }
        
        newStageId = uuidResult[0].uuid;
        console.log('UUID gerado para nova etapa:', newStageId);
        
        const result = await prisma.$queryRaw`
          INSERT INTO "Stage" (
            id,
            title,
            description,
            "order",
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${newStageId}::uuid,
            ${title},
            ${description || null},
            ${nextOrder},
            NOW(),
            NOW()
          )
          RETURNING id
        `;
        
        if (Array.isArray(result) && result.length > 0) {
          newStageId = result[0].id;
          console.log('Nova etapa criada com ID:', newStageId);
        } else {
          throw new Error('Falha ao criar etapa: ID não retornado');
        }
        
        // Se um testId foi fornecido, associar a etapa ao teste
        if (testId) {
          console.log(`Associando etapa ${newStageId} ao teste ${testId} com ordem ${nextOrder}`);
          
          try {
            // Verificar se o testId e stageId são válidos antes de inserir
            if (!testId || !newStageId) {
              throw new Error(`Valores inválidos para associação: testId=${testId}, stageId=${newStageId}`);
            }

            // Garantir que nextOrder seja um número
            const orderValue = typeof nextOrder === 'number' ? nextOrder : 0;
            
            console.log('Valores para inserção em TestStage:', {
              testId,
              stageId: newStageId,
              order: orderValue
            });

            // Usar o Prisma Client para criar o TestStage
            const testStage = await prisma.$executeRawUnsafe(`
              INSERT INTO "TestStage" (
                id,
                "testId",
                "stageId",
                "order",
                "createdAt",
                "updatedAt"
              ) VALUES (
                gen_random_uuid(),
                '${testId}'::uuid,
                '${newStageId}'::uuid,
                ${orderValue},
                NOW(),
                NOW()
              )
            `);
            
            console.log(`Relação TestStage criada com sucesso para teste ${testId} e etapa ${newStageId}`);
          } catch (relationError) {
            console.error('Erro ao criar relação TestStage:', relationError);
            throw new Error(`Erro ao associar etapa ao teste: ${relationError.message}`);
          }
        }
        
        // Buscar o estágio recém-criado com todas as informações
        const newStage = await prisma.$queryRaw`
          SELECT 
            s.id, 
            s.title, 
            s.description, 
            s."order",
            ts.id as "testStageId",
            ts."testId",
            s."createdAt",
            s."updatedAt"
          FROM "Stage" s
          LEFT JOIN "TestStage" ts ON s.id = ts."stageId" AND ts."testId" = ${testId || null}
          WHERE s.id = ${newStageId}
        `;
        
        console.log('Etapa criada com sucesso:', newStage);
        
        if (Array.isArray(newStage) && newStage.length > 0) {
          return res.status(201).json({
            ...newStage[0],
            questionCount: 0
          });
        } else {
          throw new Error('Não foi possível encontrar a etapa criada');
        }
      } catch (insertError) {
        console.error('Erro específico ao inserir estágio:', insertError);
        throw insertError;
      }
    } catch (error) {
      console.error('Erro ao criar estágio:', error);
      return res.status(500).json({ error: 'Erro ao criar estágio: ' + (error.message || 'Erro desconhecido') });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
