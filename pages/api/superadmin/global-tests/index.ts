import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/global-tests`);
    
    const session = await getServerSession(req, res, authOptions);

    // Verificar autenticação e permissão de superadmin
    if (!session) {
      console.log('[API] Erro: Usuário não autenticado');
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    if ((session.user.role as string) !== 'SUPER_ADMIN') {
      console.log(`[API] Erro: Usuário não é SUPER_ADMIN (role: ${session.user.role})`);
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // GET - Listar todos os testes globais
    if (req.method === 'GET') {
      const globalTests = await prisma.globalTest.findMany({
        include: {
          questions: true,
          companies: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Formatar os dados para o frontend
      const formattedTests = globalTests.map(test => {
        return {
          id: test.id,
          title: test.title,
          description: test.description,
          isActive: test.isActive,
          questions: (test as any).questions,
          companiesCount: (test as any).companies?.length || 0,
          createdAt: test.createdAt,
          updatedAt: test.updatedAt,
        };
      });

      return res.status(200).json(formattedTests);
    }

    // POST - Criar um novo teste global
    if (req.method === 'POST') {
      const { title, description, isActive, questionIds } = req.body;

      if (!title || !questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({ message: 'Dados incompletos' });
      }

      // Criar o teste global
      const newGlobalTest = await prisma.globalTest.create({
        data: {
          title,
          description: description || null,
          isActive: isActive !== undefined ? isActive : true,
          questions: {
            connect: questionIds.map((id: string) => ({ id })),
          },
        },
        include: {
          questions: true,
          companies: true,
        },
      });

      // Formatar a resposta
      const response = {
        id: newGlobalTest.id,
        title: newGlobalTest.title,
        description: newGlobalTest.description,
        isActive: newGlobalTest.isActive,
        questions: (newGlobalTest as any).questions,
        companiesCount: (newGlobalTest as any).companies?.length || 0,
        createdAt: newGlobalTest.createdAt,
        updatedAt: newGlobalTest.updatedAt,
      };

      return res.status(201).json(response);
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de testes globais:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
