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
    return res.status(400).json({ error: 'ID do estágio inválido' })
  }

  // Verificar se o estágio existe
  try {
    const stageExists = await prisma.$queryRaw`
      SELECT id FROM "Stage" WHERE id = ${id}
    `;

    if (!Array.isArray(stageExists) || stageExists.length === 0) {
      return res.status(404).json({ error: 'Estágio não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao verificar estágio:', error);
    return res.status(500).json({ error: 'Erro ao verificar estágio' });
  }

  // Adicionar questão ao estágio (POST)
  if (req.method === 'POST') {
    try {
      const { questionId, order } = req.body;

      if (!questionId) {
        return res.status(400).json({ error: 'ID da questão é obrigatório' });
      }

      // Verificar se a questão existe
      const questionExists = await prisma.$queryRaw`
        SELECT id FROM "Question" WHERE id = ${questionId}
      `;

      if (!Array.isArray(questionExists) || questionExists.length === 0) {
        return res.status(404).json({ error: 'Questão não encontrada' });
      }

      // Criar a tabela QuestionStage se não existir
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "QuestionStage" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "stageId" VARCHAR(255) NOT NULL,
            "questionId" VARCHAR(255) NOT NULL,
            "order" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            UNIQUE("stageId", "questionId")
          )
        `);
      } catch (tableError) {
        console.error('Erro ao criar tabela QuestionStage:', tableError);
        // Continuar mesmo se houver erro, pois a tabela pode já existir
      }

      // Verificar se a relação já existe
      const existingRelation = await prisma.$queryRaw`
        SELECT * FROM "QuestionStage" 
        WHERE "stageId" = ${id} AND "questionId" = ${questionId}
      `;

      if (Array.isArray(existingRelation) && existingRelation.length > 0) {
        return res.status(400).json({ error: 'Esta questão já está associada a este estágio' });
      }

      // Adicionar a questão ao estágio
      await prisma.$executeRawUnsafe(`
        INSERT INTO "QuestionStage" ("stageId", "questionId", "order", "createdAt", "updatedAt")
        VALUES ('${id}', '${questionId}', ${order || 0}, NOW(), NOW())
      `);

      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Erro ao adicionar questão ao estágio:', error);
      return res.status(500).json({ error: 'Erro ao adicionar questão ao estágio' });
    }
  } 
  // Obter todas as questões de um estágio (GET)
  else if (req.method === 'GET') {
    try {
      // Verificar se a tabela QuestionStage existe
      let questionStages = [];
      
      try {
        questionStages = await prisma.$queryRaw`
          SELECT 
            qs.id,
            qs."stageId",
            qs."questionId",
            qs."order",
            q.id as "question_id",
            q.text as "question_text",
            q.difficulty as "question_difficulty"
          FROM "QuestionStage" qs
          JOIN "Question" q ON qs."questionId" = q.id
          WHERE qs."stageId" = ${id}
          ORDER BY qs."order" ASC
        `;
      } catch (error) {
        console.error('Erro ao buscar questões do estágio:', error);
        // Se houver erro, continuar com array vazio
      }

      return res.status(200).json(questionStages);
    } catch (error) {
      console.error('Erro ao buscar questões do estágio:', error);
      return res.status(500).json({ error: 'Erro ao buscar questões do estágio' });
    }
  }
  // Método não permitido
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
