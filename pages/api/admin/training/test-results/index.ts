import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  console.log('[TEST_RESULTS] Verificando sessão em training/test-results');
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    console.log('[TEST_RESULTS] Erro de autenticação: Sessão não encontrada');
    return res.status(401).json({ 
      success: false,
      error: 'Não autorizado' 
    });
  }

  // Garantir que temos uma conexão fresca com o banco de dados
  console.log('[TEST_RESULTS] Forçando reconexão do Prisma antes de buscar resultados de testes');
  await reconnectPrisma();

  // Get user and check if they are an admin
  console.log(`[TEST_RESULTS] Buscando usuário com ID: ${session.user.id}`);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      companyId: true,
      role: true
    }
  });

  if (!user || (user.role !== 'COMPANY_ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'INSTRUCTOR')) {
    console.log('[TEST_RESULTS] Acesso negado: Usuário não tem permissão');
    return res.status(403).json({ 
      success: false,
      error: 'Acesso negado' 
    });
  }

  const companyId = user.companyId;
  
  // Lidar com diferentes métodos HTTP
  if (req.method === 'GET') {
    try {
      // Obter parâmetros de consulta
      const { testId, studentId, page = '1', limit = '10' } = req.query;
      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);
      const offset = (pageNumber - 1) * limitNumber;
      
      console.log('[TEST_RESULTS] Buscando resultados de testes de treinamento...');
      
      // Verificar se existem testes de treinamento para a empresa
      const testsCount = await prisma.trainingTest.count({
        where: {
          companyId: companyId
        }
      });
      
      console.log(`[TEST_RESULTS] Encontrados ${testsCount} testes de treinamento`);
      
      // Se não houver testes, retornar uma resposta vazia
      if (testsCount === 0) {
        console.log('[TEST_RESULTS] Nenhum teste de treinamento encontrado, retornando array vazio');
        return res.status(200).json({
          success: true,
          results: [],
          pagination: {
            total: 0,
            page: pageNumber,
            limit: limitNumber,
            totalPages: 0
          }
        });
      }
      
      // Verificar se existem estudantes para a empresa
      const studentsCount = await prisma.student.count({
        where: {
          companyId: companyId
        }
      });
      
      console.log(`[TEST_RESULTS] Encontrados ${studentsCount} estudantes`);
      
      // Se não houver estudantes, retornar uma resposta vazia
      if (studentsCount === 0) {
        console.log('[TEST_RESULTS] Nenhum estudante encontrado, retornando array vazio');
        return res.status(200).json({
          success: true,
          results: [],
          pagination: {
            total: 0,
            page: pageNumber,
            limit: limitNumber,
            totalPages: 0
          }
        });
      }
      
      // Construir a consulta base para resultados de testes
      const whereConditions: any = {};
      
      // Adicionar filtro de empresa através da relação com o teste
      whereConditions.test = {
        companyId: companyId
      };
      
      // Adicionar filtros adicionais se fornecidos
      if (testId) {
        whereConditions.testId = testId as string;
      }
      
      if (studentId) {
        whereConditions.studentId = studentId as string;
      }
      
      // Contar o total de resultados para paginação
      const totalCount = await prisma.testAttempt.count({
        where: whereConditions
      });
      
      console.log(`[TEST_RESULTS] Total de ${totalCount} resultados encontrados`);
      
      // Se não houver resultados, retornar uma resposta vazia
      if (totalCount === 0) {
        console.log('[TEST_RESULTS] Nenhum resultado de teste encontrado, retornando array vazio');
        return res.status(200).json({
          success: true,
          results: [],
          pagination: {
            total: 0,
            page: pageNumber,
            limit: limitNumber,
            totalPages: 0
          }
        });
      }
      
      // Buscar os resultados com paginação
      const results = await prisma.testAttempt.findMany({
        where: whereConditions,
        include: {
          test: {
            select: {
              id: true,
              name: true,
              description: true,
              passingScore: true
            }
          },
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          endTime: 'desc'
        },
        skip: offset,
        take: limitNumber
      });
      
      console.log(`[TEST_RESULTS] Retornando ${results.length} resultados`);
      
      // Formatar os resultados para a resposta
      const formattedResults = results.map(attempt => {
        // Acessar as propriedades de forma segura
        const testName = attempt.test?.name || 'Teste sem nome';
        const testDescription = attempt.test?.description || '';
        const studentName = attempt.student?.user?.name || 'Estudante sem nome';
        const studentEmail = attempt.student?.user?.email || '';
        
        return {
          id: attempt.id,
          testId: attempt.testId,
          testName,
          testDescription,
          studentId: attempt.studentId,
          studentName,
          studentEmail,
          startTime: attempt.startTime,
          endTime: attempt.endTime,
          score: attempt.score,
          passed: attempt.passed
        };
      });
      
      // Calcular o número total de páginas
      const totalPages = Math.ceil(totalCount / limitNumber);
      
      return res.status(200).json({
        success: true,
        results: formattedResults,
        pagination: {
          total: totalCount,
          page: pageNumber,
          limit: limitNumber,
          totalPages
        }
      });
    } catch (error) {
      console.error('[TEST_RESULTS] Erro ao buscar resultados de testes:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar resultados de testes'
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Método não permitido'
    });
  }
}
