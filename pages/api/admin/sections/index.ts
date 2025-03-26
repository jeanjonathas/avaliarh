import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  if (req.method === 'GET') {
    try {
      // Verificar se a tabela Section existe
      let sections = [];
      
      try {
        // Tentar buscar da tabela Section se existir
        sections = await prisma.$queryRaw`
          SELECT 
            id, 
            title, 
            description, 
            "createdAt", 
            "updatedAt"
          FROM "Section"
          ORDER BY title ASC
        `;
      } catch (error) {
        // Se a tabela não existir, verificar se podemos usar a tabela Stage como alternativa
        try {
          sections = await prisma.$queryRaw`
            SELECT 
              id, 
              title, 
              description, 
              "createdAt", 
              "updatedAt"
            FROM "Stage"
            ORDER BY "order" ASC
          `;
        } catch (stageError) {
          console.error('Erro ao buscar stages como alternativa:', stageError);
          // Se nenhuma das tabelas existir, retornar array vazio
          return res.status(200).json([]);
        }
      }

      return res.status(200).json(Array.isArray(sections) ? sections : []);
    } catch (error) {
      console.error('Erro ao buscar seções:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json([]);
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Título da seção é obrigatório' });
      }

      // Tentar criar na tabela Section se existir
      let newSection = null;
      
      try {
        await prisma.$executeRaw`
          INSERT INTO "Section" (
            id, 
            title, 
            description, 
            "createdAt", 
            "updatedAt"
          ) VALUES (
            uuid_generate_v4(), 
            ${title}, 
            ${description || null}, 
            NOW(), 
            NOW()
          )
        `;
        
        const newSections = await prisma.$queryRaw`
          SELECT 
            id, 
            title, 
            description, 
            "createdAt", 
            "updatedAt"
          FROM "Section"
          WHERE title = ${title}
          ORDER BY "createdAt" DESC
          LIMIT 1
        `;
        
        newSection = Array.isArray(newSections) && newSections.length > 0 ? newSections[0] : null;
      } catch (error) {
        console.error('Erro ao criar seção na tabela Section:', error);
        // Se a tabela Section não existir, tentar criar na tabela Stage
        try {
          // Buscar a maior ordem atual
          const maxOrders = await prisma.$queryRaw`
            SELECT MAX("order") as max_order FROM "Stage"
          `;
          
          const maxOrder = Array.isArray(maxOrders) && maxOrders.length > 0 && maxOrders[0].max_order 
            ? parseInt(maxOrders[0].max_order) 
            : 0;
          
          await prisma.$executeRaw`
            INSERT INTO "Stage" (
              id, 
              title, 
              description, 
              "order",
              "createdAt", 
              "updatedAt"
            ) VALUES (
              uuid_generate_v4(), 
              ${title}, 
              ${description || null}, 
              ${maxOrder + 1},
              NOW(), 
              NOW()
            )
          `;
          
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
          
          newSection = Array.isArray(newStages) && newStages.length > 0 ? newStages[0] : null;
        } catch (stageError) {
          console.error('Erro ao criar seção na tabela Stage:', stageError);
          return res.status(500).json({ error: 'Erro ao criar seção' });
        }
      }

      if (!newSection) {
        return res.status(500).json({ error: 'Erro ao buscar seção criada' });
      }

      return res.status(201).json(newSection);
    } catch (error) {
      console.error('Erro ao criar seção:', error);
      return res.status(500).json({ error: 'Erro ao criar seção' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
