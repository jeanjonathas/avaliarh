import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma } from '../../../../../lib/prisma';
import { Role } from '@prisma/client';

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

  // Obter ID do material
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do material é obrigatório' });
  }

  // Roteamento baseado no método HTTP
  switch (req.method) {
    case 'GET':
      return getMaterial(req, res, id, user.companyId);
    case 'PUT':
      return updateMaterial(req, res, id, user.companyId);
    case 'DELETE':
      return deleteMaterial(req, res, id, user.companyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

/**
 * GET /api/admin/training/materials/[id]
 * Busca um material específico pelo ID
 */
async function getMaterial(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    // Verificar se o material existe e pertence à empresa do usuário
    const materialExists = await prisma.$queryRaw`
      SELECT tm.id
      FROM "TrainingMaterial" tm
      JOIN "TrainingModule" tmod ON tm."moduleId" = tmod.id
      JOIN "TrainingCourse" tc ON tmod."courseId" = tc.id
      WHERE tm.id = ${id}
      AND tc."companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!materialExists) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    // Buscar o material com suas relações
    const material = await prisma.$queryRaw`
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
      WHERE tm.id = ${id}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    return res.status(200).json(material);
  } catch (error) {
    console.error('Erro ao buscar material:', error);
    return res.status(500).json({ error: 'Erro ao buscar material' });
  }
}

/**
 * PUT /api/admin/training/materials/[id]
 * Atualiza um material existente
 */
async function updateMaterial(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    const { title, description, type, url, moduleId, lessonId } = req.body;

    // Validar campos obrigatórios
    if (!title || !type || !url || !moduleId) {
      return res.status(400).json({ error: 'Campos obrigatórios: título, tipo, URL e módulo' });
    }

    // Verificar se o material existe e pertence à empresa do usuário
    const materialExists = await prisma.$queryRaw`
      SELECT tm.id
      FROM "TrainingMaterial" tm
      JOIN "TrainingModule" tmod ON tm."moduleId" = tmod.id
      JOIN "TrainingCourse" tc ON tmod."courseId" = tc.id
      WHERE tm.id = ${id}
      AND tc."companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!materialExists) {
      return res.status(404).json({ error: 'Material não encontrado' });
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

    // Atualizar o material
    await prisma.$executeRaw`
      UPDATE "TrainingMaterial"
      SET 
        title = ${title},
        description = ${description || null},
        type = ${type},
        url = ${url},
        "moduleId" = ${moduleId},
        "lessonId" = ${lessonId || null},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    // Buscar o material atualizado
    const updatedMaterial = await prisma.$queryRaw`
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
        tl.name as "lessonName"
      FROM "TrainingMaterial" tm
      JOIN "TrainingModule" tmod ON tm."moduleId" = tmod.id
      LEFT JOIN "TrainingLesson" tl ON tm."lessonId" = tl.id
      WHERE tm.id = ${id}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    return res.status(200).json(updatedMaterial);
  } catch (error) {
    console.error('Erro ao atualizar material:', error);
    return res.status(500).json({ error: 'Erro ao atualizar material' });
  }
}

/**
 * DELETE /api/admin/training/materials/[id]
 * Exclui um material existente
 */
async function deleteMaterial(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    // Verificar se o material existe e pertence à empresa do usuário
    const materialExists = await prisma.$queryRaw`
      SELECT tm.id
      FROM "TrainingMaterial" tm
      JOIN "TrainingModule" tmod ON tm."moduleId" = tmod.id
      JOIN "TrainingCourse" tc ON tmod."courseId" = tc.id
      WHERE tm.id = ${id}
      AND tc."companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!materialExists) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    // Excluir o material
    await prisma.$executeRaw`
      DELETE FROM "TrainingMaterial"
      WHERE id = ${id}
    `;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir material:', error);
    return res.status(500).json({ error: 'Erro ao excluir material' });
  }
}
