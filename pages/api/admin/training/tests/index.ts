import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  console.log('[TRAINING_TESTS] Verificando sessão em training/tests');
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    console.log('[TRAINING_TESTS] Erro de autenticação: Sessão não encontrada');
    return res.status(401).json({ 
      success: false,
      error: 'Não autorizado' 
    });
  }

  // Garantir que temos uma conexão fresca com o banco de dados
  console.log('[TRAINING_TESTS] Forçando reconexão do Prisma antes de buscar testes');
  await reconnectPrisma();

  // Get user and check if they are an admin
  console.log(`[TRAINING_TESTS] Buscando usuário com ID: ${session.user.id}`);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      companyId: true,
      role: true
    }
  });

  if (!user || (user.role !== 'COMPANY_ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'INSTRUCTOR')) {
    console.log('[TRAINING_TESTS] Acesso negado: Usuário não tem permissão');
    return res.status(403).json({ 
      success: false,
      error: 'Acesso negado' 
    });
  }

  const companyId = user.companyId;

  if (req.method === 'GET') {
    try {
      console.log('[TRAINING_TESTS] Buscando testes de treinamento...');
      
      // Buscar todos os testes de treinamento para a empresa
      const tests = await prisma.test.findMany({
        where: {
          companyId: companyId,
          testType: 'training'
        },
        select: {
          id: true,
          title: true,
          description: true,
          timeLimit: true,
          cutoffScore: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          stages: {
            select: {
              questions: {
                select: {
                  id: true
                }
              }
            }
          }
        },
        orderBy: {
          title: 'asc'
        }
      });
      
      console.log(`[TRAINING_TESTS] Encontrados ${tests.length} testes de treinamento`);
      
      // Contar o número total de questões para cada teste
      const testsWithQuestionCount = tests.map(test => {
        // Contar todas as questões em todos os estágios
        let questionCount = 0;
        test.stages.forEach(stage => {
          questionCount += stage.questions.length;
        });
        
        return {
          id: test.id,
          name: test.title,
          description: test.description,
          timeLimit: test.timeLimit,
          cutoffScore: test.cutoffScore,
          active: test.active,
          createdAt: test.createdAt,
          updatedAt: test.updatedAt,
          questionCount: questionCount
        };
      });
      
      return res.status(200).json({
        success: true,
        tests: testsWithQuestionCount
      });
    } catch (error) {
      console.error('[TRAINING_TESTS] Erro ao buscar testes:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar testes de treinamento'
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Método não permitido'
    });
  }
}
