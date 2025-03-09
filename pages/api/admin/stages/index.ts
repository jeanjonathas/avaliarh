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
          COUNT(q.id) as "questionCount"
        FROM "Stage" s
        LEFT JOIN "Question" q ON q."stageId" = s.id
        GROUP BY s.id, s.title, s.description, s.order
        ORDER BY s.order ASC
      `;

      return res.status(200).json(Array.isArray(stages) ? stages : []);
    } catch (error) {
      console.error('Erro ao buscar etapas:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json([]);
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, order } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Título é obrigatório' });
      }

      console.log('Recebido para criar estágio:', { title, description, order });

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

      // Criar nova etapa usando executeRawUnsafe para maior controle
      let newStageId = '';
      try {
        const insertResult = await prisma.$executeRawUnsafe(`
          INSERT INTO "Stage" (
            id,
            title,
            description,
            "order",
            "createdAt",
            "updatedAt"
          ) VALUES (
            gen_random_uuid(),
            '${title.replace(/'/g, "''")}',
            ${description ? `'${description.replace(/'/g, "''")}'` : 'NULL'},
            ${order !== undefined ? Number(order) : 0},
            NOW(),
            NOW()
          )
          RETURNING id
        `);
        
        console.log('Resultado da inserção:', insertResult);
        
        // Buscar o estágio recém-criado
        const newStages = await prisma.$queryRaw`
          SELECT 
            id, 
            title, 
            description, 
            "order",
            "createdAt",
            "updatedAt"
          FROM "Stage"
          WHERE title = ${title}
          ORDER BY "createdAt" DESC
          LIMIT 1
        `;
        
        console.log('Estágio encontrado após inserção:', newStages);
        
        if (Array.isArray(newStages) && newStages.length > 0) {
          return res.status(201).json({
            ...newStages[0],
            questionCount: 0
          });
        } else {
          throw new Error('Não foi possível encontrar o estágio criado');
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
