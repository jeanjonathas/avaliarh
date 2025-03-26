import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    console.log('[API] Erro de autenticação: Sessão não encontrada');
    return res.status(401).json({ error: 'Não autorizado' })
  }

  // Forçar reconexão do Prisma
  console.log('[API] Forçando reconexão do Prisma antes de acessar as etapas');
  await reconnectPrisma();

  // Verificar se o usuário é admin
  const userEmail = session.user?.email;
  if (!userEmail) {
    return res.status(401).json({ error: 'Email de usuário não encontrado na sessão' });
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user || (user.role !== Role.COMPANY_ADMIN && user.role !== Role.SUPER_ADMIN)) {
    return res.status(403).json({ error: 'Não autorizado. Acesso apenas para administradores.' });
  }

  if (req.method === 'GET') {
    try {
      // Verificar se a tabela Stage existe
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Stage" (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            "order" INTEGER,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `);
      } catch (tableError) {
        console.error('Erro ao verificar tabela Stage:', tableError);
        // Continuar mesmo se houver erro, pois a tabela pode já existir
      }

      // Buscar todas as etapas com contagem de perguntas usando SQL raw
      const stages = await prisma.$queryRaw`
        SELECT 
          s.id, 
          s.title, 
          s.description, 
          s.order,
          CAST(COUNT(q.id) AS INTEGER) as "questionCount"
        FROM "Stage" s
        LEFT JOIN "Question" q ON q."stageId" = s.id
        GROUP BY s.id, s.title, s.description, s.order
        ORDER BY s.order ASC
      `;

      // Converter BigInt para Number antes de serializar para JSON
      const serializedStages = Array.isArray(stages) 
        ? stages.map(stage => ({
            ...stage,
            questionCount: Number(stage.questionCount)
          }))
        : [];

      return res.status(200).json(serializedStages);
    } catch (error) {
      console.error('Erro ao buscar etapas:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json([]);
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, order, testId, questionType } = req.body

      // Validar dados
      if (!title) {
        return res.status(400).json({ error: 'Título é obrigatório' })
      }

      // Determinar a próxima ordem disponível se não for fornecida
      let nextOrder = order;
      if (testId && (nextOrder === undefined || nextOrder === null)) {
        try {
          // Buscar a maior ordem existente para este teste
          const existingStages = await prisma.stage.findMany({
            where: { 
              testId: testId 
            },
            orderBy: { 
              order: 'desc' 
            },
            take: 1
          });
          
          nextOrder = existingStages.length > 0 ? existingStages[0].order + 1 : 0;
          console.log('Próxima ordem determinada:', nextOrder);
        } catch (orderError) {
          console.error('Erro ao determinar próxima ordem:', orderError);
          nextOrder = 0; // Fallback para ordem 0 se houver erro
        }
      } else {
        nextOrder = nextOrder || 0;
      }

      console.log('Inserindo nova etapa com valores:', {
        title,
        description: description || null,
        order: nextOrder,
        questionType: questionType || null
      });
      
      // Criar a etapa usando Prisma Client
      const newStage = await prisma.stage.create({
        data: {
          title,
          description,
          order: nextOrder,
          // Usar o tipo como string, já que o campo questionType é do tipo String? no schema
          ...(questionType ? { questionType } : {}),
          testId: testId || undefined
        }
      });

      console.log('Etapa criada com sucesso:', newStage);
      return res.status(201).json(newStage);
    } catch (error) {
      console.error('Erro ao criar etapa:', error)
      return res.status(500).json({ error: `Erro ao criar etapa: ${error}` })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
