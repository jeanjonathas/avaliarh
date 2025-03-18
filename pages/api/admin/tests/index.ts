import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

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
      // Buscar todos os testes usando Prisma Client em vez de SQL raw
      const tests = await prisma.test.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          title: true,
          description: true,
          timeLimit: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          stages: {
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              questions: {
                select: {
                  id: true,
                  text: true,
                  type: true,
                  options: {
                    select: {
                      id: true,
                      text: true,
                      isCorrect: true
                    }
                  }
                }
              }
            },
            orderBy: {
              order: 'asc'
            }
          }
        }
      });
      
      // Corrigir o formato da resposta para incluir a propriedade 'tests'
      return res.status(200).json({ tests });
    } catch (error) {
      console.error('Erro ao buscar testes:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json({ tests: [] });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, timeLimit, active } = req.body;

      console.log('Dados recebidos:', { title, description, timeLimit, active });
      console.log('Sessão do usuário:', JSON.stringify(session, null, 2));

      if (!title) {
        return res.status(400).json({ error: 'Título do teste é obrigatório' });
      }

      // Obter o companyId do usuário da sessão
      let companyId = session.user?.companyId;
      
      console.log('CompanyId obtido da sessão:', companyId);
      
      // Se o companyId não estiver na sessão, buscar do banco de dados
      if (!companyId) {
        console.log('CompanyId não encontrado na sessão, buscando do banco de dados...');
        
        // Buscar o usuário no banco de dados para obter o companyId
        const user = await prisma.user.findUnique({
          where: {
            id: session.user.id
          },
          select: {
            companyId: true
          }
        });
        
        companyId = user?.companyId;
        console.log('CompanyId obtido do banco de dados:', companyId);
      }
      
      if (!companyId) {
        return res.status(400).json({ error: 'ID da empresa não encontrado. O usuário precisa estar associado a uma empresa para criar testes.' });
      }

      // Criar o teste usando Prisma Client incluindo o companyId
      const newTest = await prisma.test.create({
        data: {
          title,
          description,
          timeLimit: timeLimit ? parseInt(timeLimit) : null,
          active: active !== undefined ? active : true,
          companyId: companyId
        }
      });

      return res.status(201).json(newTest);
    } catch (error) {
      console.error('Erro ao criar teste:', error);
      return res.status(500).json({ error: 'Erro ao criar teste' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
