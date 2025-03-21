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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID do teste é obrigatório' });
  }

  try {
    // GET - Obter detalhes de um teste global específico
    if (req.method === 'GET') {
      const globalTest = await prisma.globalTest.findUnique({
        where: { id },
        include: {
          questions: true,
          companies: true,
        },
      });

      if (!globalTest) {
        return res.status(404).json({ message: 'Teste global não encontrado' });
      }

      // Formatar a resposta
      const response = {
        id: globalTest.id,
        title: globalTest.title,
        description: globalTest.description,
        isActive: globalTest.isActive,
        questions: globalTest.questions,
        companies: globalTest.companies,
        companiesCount: globalTest.companies.length,
        createdAt: globalTest.createdAt,
        updatedAt: globalTest.updatedAt,
      };

      return res.status(200).json(response);
    }

    // PUT - Atualizar um teste global
    if (req.method === 'PUT') {
      const { title, description, isActive, questionIds } = req.body;

      if (!title || !questionIds || !Array.isArray(questionIds)) {
        return res.status(400).json({ message: 'Dados incompletos' });
      }

      // Verificar se o teste global existe
      const existingGlobalTest = await prisma.globalTest.findUnique({
        where: { id },
      });

      if (!existingGlobalTest) {
        return res.status(404).json({ message: 'Teste global não encontrado' });
      }

      // Atualizar o teste global
      const updatedGlobalTest = await prisma.globalTest.update({
        where: { id },
        data: {
          title,
          description: description || null,
          isActive: isActive !== undefined ? isActive : true,
          questions: {
            set: [], // Remover todas as perguntas existentes
            connect: questionIds.map((qId: string) => ({ id: qId })), // Adicionar as novas perguntas
          },
        },
        include: {
          questions: true,
          companies: true,
        },
      });

      // Formatar a resposta
      const response = {
        id: updatedGlobalTest.id,
        title: updatedGlobalTest.title,
        description: updatedGlobalTest.description,
        isActive: updatedGlobalTest.isActive,
        questions: updatedGlobalTest.questions,
        companiesCount: updatedGlobalTest.companies.length,
        createdAt: updatedGlobalTest.createdAt,
        updatedAt: updatedGlobalTest.updatedAt,
      };

      return res.status(200).json(response);
    }

    // DELETE - Excluir um teste global
    if (req.method === 'DELETE') {
      // Verificar se o teste global existe
      const existingGlobalTest = await prisma.globalTest.findUnique({
        where: { id },
        include: {
          companies: true,
        },
      });

      if (!existingGlobalTest) {
        return res.status(404).json({ message: 'Teste global não encontrado' });
      }

      // Remover todos os registros de acesso relacionados
      if (existingGlobalTest.companies.length > 0) {
        await prisma.globalAccess.deleteMany({
          where: {
            globalTestId: id,
          },
        });
      }

      // Excluir o teste global
      await prisma.globalTest.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Teste global excluído com sucesso' });
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de testes globais:', error);
    
    // Verificar se é um erro de registro não encontrado
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Teste global não encontrado' });
    }
    
    return res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
