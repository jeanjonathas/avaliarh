import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { Role, Prisma } from '@prisma/client';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[MODULES] Verificando sessão em training/modules');
  
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    console.log('[MODULES] Erro de autenticação: Sessão não encontrada');
    return res.status(401).json({ 
      success: false,
      error: 'Não autorizado' 
    });
  }

  // Garantir que temos uma conexão fresca com o banco de dados
  console.log('[MODULES] Forçando reconexão do Prisma antes de acessar módulos');
  await reconnectPrisma();

  // Get user from database to check role and company
  console.log(`[MODULES] Buscando usuário com ID: ${session.user.id}`);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      companyId: true,
      role: true
    }
  });

  if (!user) {
    console.log('[MODULES] Erro: Usuário não encontrado');
    return res.status(401).json({ 
      success: false,
      error: 'Usuário não encontrado' 
    });
  }

  if (!user.companyId) {
    console.log('[MODULES] Erro: Usuário não está associado a uma empresa');
    return res.status(403).json({ 
      success: false,
      error: 'Usuário não está associado a uma empresa' 
    });
  }

  // Check if user has admin role
  if (user.role !== Role.COMPANY_ADMIN && user.role !== Role.SUPER_ADMIN && user.role !== Role.INSTRUCTOR) {
    console.log('[MODULES] Acesso negado: Usuário não tem permissão');
    return res.status(403).json({ 
      success: false,
      error: 'Sem permissão para acessar este recurso' 
    });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getModules(req, res, user.companyId);
    case 'POST':
      return createModule(req, res, user.companyId);
    default:
      return res.status(405).json({ 
        success: false,
        error: 'Método não permitido' 
      });
  }
}

// Get all modules for a specific course
async function getModules(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    console.log(`[MODULES] Buscando módulos para a empresa: ${companyId}`);
    const { courseId } = req.query;
    
    // Se courseId não for fornecido, retornar todos os módulos da empresa
    if (!courseId) {
      console.log('[MODULES] Nenhum ID de curso fornecido, retornando todos os módulos');
      
      const allModules = await prisma.trainingModule.findMany({
        where: {
          course: {
            companyId: companyId
          }
        },
        include: {
          course: {
            select: {
              id: true,
              name: true
            }
          },
          lessons: {
            orderBy: {
              order: 'asc'
            }
          },
          finalTest: true
        },
        orderBy: {
          order: 'asc'
        }
      });

      // Processar módulos para incluir estatísticas adicionais
      const processedModules = allModules.map(module => {
        return {
          id: module.id,
          name: module.name,
          description: module.description,
          order: module.order,
          courseId: module.courseId,
          courseName: module.course.name,
          finalTestId: module.finalTestId,
          createdAt: module.createdAt,
          updatedAt: module.updatedAt,
          lessons: module.lessons,
          finalTest: module.finalTest,
          totalLessons: module.lessons.length,
          hasFinalTest: !!module.finalTestId
        };
      });

      console.log(`[MODULES] Retornando ${processedModules.length} módulos`);
      return res.status(200).json({
        success: true,
        modules: processedModules
      });
    }
    
    if (typeof courseId !== 'string') {
      console.log('[MODULES] Erro: ID do curso inválido');
      return res.status(400).json({ 
        success: false,
        error: 'ID do curso é obrigatório e deve ser uma string' 
      });
    }

    console.log(`[MODULES] Verificando se o curso ${courseId} pertence à empresa ${companyId}`);
    // Verify if the course belongs to the company
    const course = await prisma.trainingCourse.findFirst({
      where: {
        id: courseId,
        companyId: companyId
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!course) {
      console.log(`[MODULES] Erro: Curso ${courseId} não encontrado para a empresa ${companyId}`);
      return res.status(404).json({ 
        success: false,
        error: 'Curso não encontrado' 
      });
    }

    console.log(`[MODULES] Buscando módulos para o curso: ${courseId}`);
    // Get all modules for the course using Prisma
    const modules = await prisma.trainingModule.findMany({
      where: {
        courseId: courseId
      },
      include: {
        lessons: {
          orderBy: {
            order: 'asc'
          }
        },
        finalTest: true
      },
      orderBy: {
        order: 'asc'
      }
    });

    // Process modules to include additional stats
    const processedModules = modules.map(module => {
      return {
        id: module.id,
        name: module.name,
        description: module.description,
        order: module.order,
        courseId: module.courseId,
        courseName: course.name,
        finalTestId: module.finalTestId,
        createdAt: module.createdAt,
        updatedAt: module.updatedAt,
        lessons: module.lessons,
        finalTest: module.finalTest,
        totalLessons: module.lessons.length,
        hasFinalTest: !!module.finalTestId
      };
    });

    console.log(`[MODULES] Retornando ${processedModules.length} módulos para o curso ${courseId}`);
    return res.status(200).json({
      success: true,
      modules: processedModules
    });
  } catch (error) {
    console.error('[MODULES] Erro ao buscar módulos:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar módulos' 
    });
  }
}

// Create a new module
async function createModule(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    console.log('[MODULES] Criando novo módulo');
    const { name, description, courseId, order } = req.body;

    // Validate required fields
    if (!name || !courseId) {
      console.log('[MODULES] Erro: Campos obrigatórios ausentes');
      return res.status(400).json({ 
        success: false,
        error: 'Nome e ID do curso são obrigatórios' 
      });
    }

    // Verify if the course belongs to the company
    console.log(`[MODULES] Verificando se o curso ${courseId} pertence à empresa ${companyId}`);
    const course = await prisma.trainingCourse.findFirst({
      where: {
        id: courseId,
        companyId: companyId
      }
    });

    if (!course) {
      console.log(`[MODULES] Erro: Curso ${courseId} não encontrado para a empresa ${companyId}`);
      return res.status(404).json({ 
        success: false,
        error: 'Curso não encontrado' 
      });
    }

    // If order is not provided, get the highest order and add 1
    let moduleOrder = order;
    if (moduleOrder === undefined) {
      console.log('[MODULES] Ordem não fornecida, calculando automaticamente');
      const highestOrderModule = await prisma.trainingModule.findFirst({
        where: {
          courseId: courseId
        },
        orderBy: {
          order: 'desc'
        }
      });

      moduleOrder = highestOrderModule ? highestOrderModule.order + 1 : 1;
    }

    // Create the module
    console.log(`[MODULES] Criando módulo para o curso ${courseId} com ordem ${moduleOrder}`);
    const newModule = await prisma.trainingModule.create({
      data: {
        name,
        description: description || '',
        courseId,
        order: moduleOrder
      }
    });

    console.log(`[MODULES] Módulo criado com sucesso: ${newModule.id}`);
    return res.status(201).json({
      success: true,
      module: newModule
    });
  } catch (error) {
    console.error('[MODULES] Erro ao criar módulo:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao criar módulo' 
    });
  }
}
