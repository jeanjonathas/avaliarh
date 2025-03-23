import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma } from '../../../../../lib/prisma';
import { Role, Prisma } from '@prisma/client';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Get user info from session
  const userEmail = session.user?.email;
  if (!userEmail) {
    return res.status(401).json({ error: 'Usuário não identificado' });
  }

  // Get user from database to check role and company
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado' });
  }

  if (!user.companyId) {
    return res.status(403).json({ error: 'Usuário não está associado a uma empresa' });
  }

  // Check if user has admin role
  if (user.role !== Role.COMPANY_ADMIN && user.role !== Role.SUPER_ADMIN && user.role !== Role.INSTRUCTOR) {
    return res.status(403).json({ error: 'Sem permissão para acessar este recurso' });
  }

  // Roteamento baseado no método HTTP
  switch (req.method) {
    case 'GET':
      return getMaterials(req, res, user.companyId);
    case 'POST':
      return createMaterial(req, res, user.companyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

/**
 * GET /api/admin/training/materials
 * Busca materiais de estudo com filtros opcionais
 */
async function getMaterials(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const { moduleId, lessonId, type } = req.query;

    // Verificar se o módulo pertence à empresa do usuário
    if (moduleId && typeof moduleId === 'string') {
      const moduleExists = await prisma.$queryRaw`
        SELECT tm.id
        FROM "TrainingModule" tm
        JOIN "TrainingCourse" tc ON tm."courseId" = tc.id
        WHERE tm.id = ${moduleId}
        AND tc."companyId" = ${companyId}
        LIMIT 1
      `.then((results: any[]) => results[0] || null);

      if (!moduleExists) {
        return res.status(404).json({ error: 'Módulo não encontrado' });
      }

      // Construir a query com filtros
      let query = Prisma.sql`
        SELECT 
          tm.id, 
          tm.title, 
          tm.description, 
          tm.type, 
          tm.url, 
          tm."moduleId", 
          tm."lessonId", 
          tm."createdAt", 
          tm."updatedAt",
          tmod.name as "moduleName",
          tmod."courseId",
          tc.name as "courseName",
          tl.name as "lessonName"
        FROM "TrainingMaterial" tm
        JOIN "TrainingModule" tmod ON tm."moduleId" = tmod.id
        JOIN "TrainingCourse" tc ON tmod."courseId" = tc.id
        LEFT JOIN "TrainingLesson" tl ON tm."lessonId" = tl.id
        WHERE tm."moduleId" = ${moduleId}
      `;

      // Adicionar filtro por aula, se fornecido
      if (lessonId && typeof lessonId === 'string') {
        query = Prisma.sql`
          ${query}
          AND tm."lessonId" = ${lessonId}
        `;
      }

      // Adicionar filtro por tipo, se fornecido
      if (type && typeof type === 'string') {
        query = Prisma.sql`
          ${query}
          AND tm.type = ${type}
        `;
      }

      // Adicionar ordenação
      query = Prisma.sql`
        ${query}
        ORDER BY tm."createdAt" DESC
      `;

      // Executar a query
      const materials = await prisma.$queryRaw(query);

      return res.status(200).json(materials);
    } else {
      // Se não for fornecido um moduleId, retornar erro
      return res.status(400).json({ error: 'ID do módulo é obrigatório' });
    }
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    return res.status(500).json({ error: 'Erro ao buscar materiais' });
  }
}

/**
 * POST /api/admin/training/materials
 * Cria um novo material de estudo
 */
async function createMaterial(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const { title, description, type, url, moduleId, lessonId, filePath, fileName, fileSize } = req.body;

    // Validar campos obrigatórios
    if (!title || !type || !moduleId) {
      return res.status(400).json({ error: 'Campos obrigatórios: título, tipo e módulo' });
    }

    // Verificar se URL ou arquivo foi fornecido
    if (!url && !filePath) {
      return res.status(400).json({ error: 'É necessário fornecer uma URL ou um arquivo' });
    }

    // Verificar se o módulo pertence à empresa do usuário
    const moduleExists = await prisma.$queryRaw`
      SELECT tm.id
      FROM "TrainingModule" tm
      JOIN "TrainingCourse" tc ON tm."courseId" = tc.id
      WHERE tm.id = ${moduleId}
      AND tc."companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!moduleExists) {
      return res.status(404).json({ error: 'Módulo não encontrado' });
    }

    // Verificar se a aula pertence ao módulo, se fornecida
    if (lessonId) {
      const lessonExists = await prisma.$queryRaw`
        SELECT tl.id
        FROM "TrainingLesson" tl
        WHERE tl.id = ${lessonId}
        AND tl."moduleId" = ${moduleId}
        LIMIT 1
      `.then((results: any[]) => results[0] || null);

      if (!lessonExists) {
        return res.status(404).json({ error: 'Aula não encontrada ou não pertence ao módulo selecionado' });
      }
    }

    // Criar o material
    const material = await prisma.$executeRaw`
      INSERT INTO "TrainingMaterial" (
        id, 
        title, 
        description, 
        type, 
        url, 
        "filePath",
        "fileName",
        "fileSize",
        "companyId",
        "moduleId", 
        "lessonId", 
        "createdAt", 
        "updatedAt"
      )
      VALUES (
        ${crypto.randomUUID()}, 
        ${title}, 
        ${description || null}, 
        ${type}, 
        ${url || null}, 
        ${filePath || null},
        ${fileName || null},
        ${fileSize || null},
        ${companyId},
        ${moduleId}, 
        ${lessonId || null}, 
        NOW(), 
        NOW()
      )
      RETURNING *
    `;

    // Buscar o material criado com suas relações
    const createdMaterial = await prisma.$queryRaw`
      SELECT 
        tm.id, 
        tm.title, 
        tm.description, 
        tm.type, 
        tm.url, 
        tm."filePath",
        tm."fileName",
        tm."fileSize",
        tm."companyId",
        tm."moduleId", 
        tm."lessonId", 
        tm."createdAt", 
        tm."updatedAt",
        tmod.name as "moduleName",
        tl.name as "lessonName"
      FROM "TrainingMaterial" tm
      JOIN "TrainingModule" tmod ON tm."moduleId" = tmod.id
      LEFT JOIN "TrainingLesson" tl ON tm."lessonId" = tl.id
      WHERE tm.id = (
        SELECT id FROM "TrainingMaterial" 
        ORDER BY "createdAt" DESC 
        LIMIT 1
      )
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    return res.status(201).json(createdMaterial);
  } catch (error) {
    console.error('Erro ao criar material:', error);
    return res.status(500).json({ error: 'Erro ao criar material' });
  }
}
