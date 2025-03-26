import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma, reconnectPrisma } from '@/lib/prisma'

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
      SELECT id FROM "Test" WHERE id = ${id}::uuid
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
      const { stageId, order } = req.body;

      if (!stageId) {
        return res.status(400).json({ error: 'ID do estágio é obrigatório' });
      }

      console.log('Recebido stageId:', stageId);
      console.log('Recebido order:', order);

      // Verificar se o estágio existe
      const stageExists = await prisma.$queryRaw`
        SELECT id FROM "Stage" WHERE id = ${stageId}::uuid
      `;

      if (!Array.isArray(stageExists) || stageExists.length === 0) {
        return res.status(404).json({ error: 'Estágio não encontrado' });
      }

      // Criar a tabela TestStage se não existir
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "TestStage" (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "testId" UUID NOT NULL REFERENCES "Test"(id) ON DELETE CASCADE,
            "stageId" UUID NOT NULL,
            "order" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            UNIQUE("testId", "stageId")
          )
        `);
      } catch (tableError) {
        console.error('Erro ao criar tabela TestStage:', tableError);
        // Continuar mesmo se houver erro, pois a tabela pode já existir
      }

      // Verificar se a relação já existe
      const existingRelation = await prisma.$queryRaw`
        SELECT * FROM "TestStage" 
        WHERE "testId" = ${id}::uuid AND "stageId" = ${stageId}::uuid
      `;

      if (Array.isArray(existingRelation) && existingRelation.length > 0) {
        return res.status(400).json({ error: 'Este estágio já está associado a este teste' });
      }

      // Adicionar o estágio ao teste
      await prisma.$queryRaw`
        INSERT INTO "TestStage" (id, "testId", "stageId", "order", "createdAt", "updatedAt")
        VALUES (
          uuid_generate_v4(),
          ${id}::uuid, 
          ${stageId}::uuid, 
          ${order || 0}, 
          NOW(), 
          NOW()
        )
      `;

      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Erro ao adicionar estágio ao teste:', error);
      return res.status(500).json({ error: 'Erro ao adicionar estágio ao teste' });
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
            ts."testId",
            ts."stageId",
            ts."order",
            s.title,
            s.description
          FROM "TestStage" ts
          JOIN "Stage" s ON ts."stageId" = s.id
          WHERE ts."testId" = ${id}::uuid
          ORDER BY ts."order" ASC
        `;
      } catch (error) {
        console.error('Erro ao buscar estágios do teste:', error);
        // Se a tabela não existir, retornar array vazio
        return res.status(200).json([]);
      }

      return res.status(200).json(Array.isArray(testStages) ? testStages : []);
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
