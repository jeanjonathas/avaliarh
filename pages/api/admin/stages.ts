import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  // Obter todos os estágios (GET)
  if (req.method === 'GET') {
    try {
      const stages = await prisma.$queryRaw`
        SELECT 
          id, 
          title, 
          description, 
          "createdAt", 
          "updatedAt"
        FROM "Stage"
        ORDER BY title ASC
      `;

      return res.status(200).json(stages);
    } catch (error) {
      console.error('Erro ao buscar estágios:', error);
      return res.status(500).json({ error: 'Erro ao buscar estágios' });
    }
  } 
  // Criar um novo estágio (POST)
  else if (req.method === 'POST') {
    try {
      const { title, description } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Título do estágio é obrigatório' });
      }

      // Verificar se a tabela Stage existe
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Stage" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `);
      } catch (tableError) {
        console.error('Erro ao verificar tabela Stage:', tableError);
        // Continuar mesmo se houver erro, pois a tabela pode já existir
      }

      // Criar o estágio
      const result = await prisma.$queryRaw`
        INSERT INTO "Stage" (title, description, "createdAt", "updatedAt")
        VALUES (${title}, ${description || null}, NOW(), NOW())
        RETURNING id, title, description, "createdAt", "updatedAt"
      `;

      const newStage = Array.isArray(result) && result.length > 0 ? result[0] : null;

      if (!newStage) {
        throw new Error('Erro ao criar estágio');
      }

      return res.status(201).json(newStage);
    } catch (error) {
      console.error('Erro ao criar estágio:', error);
      return res.status(500).json({ error: 'Erro ao criar estágio' });
    }
  }
  // Método não permitido
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
