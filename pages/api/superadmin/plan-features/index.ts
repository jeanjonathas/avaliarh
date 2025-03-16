import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  // Verificar autenticação e permissão de superadmin
  if (!session || (session.user.role as string) !== 'SUPER_ADMIN') {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  try {
    // GET - Listar todos os recursos disponíveis
    if (req.method === 'GET') {
      const features = await prisma.feature.findMany({
        orderBy: {
          name: 'asc',
        },
      });

      return res.status(200).json(features);
    }

    // POST - Criar um novo recurso
    if (req.method === 'POST') {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Nome do recurso é obrigatório' });
      }

      // Criar o recurso
      const newFeature = await prisma.feature.create({
        data: {
          name,
          description: description || null,
        },
      });

      return res.status(201).json(newFeature);
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de recursos:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
