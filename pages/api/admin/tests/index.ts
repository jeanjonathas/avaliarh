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
      console.log('[API] Buscando todos os testes...');
      
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
      
      console.log(`[API] Encontrados ${tests.length} testes`);
      
      // Adicionar contagens de seções e perguntas para cada teste
      const testsWithCounts = tests.map(test => {
        const sectionsCount = test.stages.length;
        const questionsCount = test.stages.reduce((total, stage) => total + stage.questions.length, 0);
        
        return {
          ...test,
          sectionsCount,
          questionsCount
        };
      });
      
      // Corrigir o formato da resposta para incluir a propriedade 'tests'
      return res.status(200).json({ 
        success: true,
        tests: testsWithCounts 
      });
    } catch (error) {
      console.error('Erro ao buscar testes:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json({ 
        success: false,
        error: 'Erro ao buscar testes',
        tests: [] 
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, timeLimit, active } = req.body;

      console.log('[API] Criando novo teste:', { title, description, timeLimit, active });
      console.log('[API] Sessão do usuário:', JSON.stringify(session, null, 2));

      if (!title) {
        return res.status(400).json({ 
          success: false,
          error: 'Título do teste é obrigatório' 
        });
      }

      // Obter o companyId do usuário da sessão
      let companyId = session.user?.companyId;
      
      console.log('[API] CompanyId obtido da sessão:', companyId);
      
      // Se o companyId não estiver na sessão, buscar do banco de dados
      if (!companyId) {
        console.log('[API] CompanyId não encontrado na sessão, buscando do banco de dados...');
        
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
        console.log('[API] CompanyId obtido do banco de dados:', companyId);
      }
      
      if (!companyId) {
        return res.status(400).json({ 
          success: false,
          error: 'ID da empresa não encontrado. O usuário precisa estar associado a uma empresa para criar testes.' 
        });
      }

      // Criar o teste
      const newTest = await prisma.test.create({
        data: {
          title,
          description,
          timeLimit: timeLimit ? parseInt(timeLimit) : null,
          active: active === undefined ? true : active,
          company: {
            connect: {
              id: companyId
            }
          }
        }
      });

      console.log(`[API] Teste criado com sucesso. ID: ${newTest.id}`);

      return res.status(201).json({ 
        success: true, 
        message: 'Teste criado com sucesso',
        test: newTest 
      });
    } catch (error) {
      console.error('[API] Erro ao criar teste:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro ao criar teste' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ 
      success: false,
      error: `Método ${req.method} não permitido` 
    });
  }
}
