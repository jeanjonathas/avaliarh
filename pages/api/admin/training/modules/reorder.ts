import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { Role, Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Obter informações do usuário da sessão
  const userEmail = session.user?.email;
  if (!userEmail) {
    return res.status(401).json({ error: 'Usuário não identificado' });
  }

  // Obter usuário do banco de dados para verificar função e empresa
  // Garantir que a conexão com o banco de dados esteja ativa
  await reconnectPrisma();
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado' });
  }

  if (!user.companyId) {
    return res.status(403).json({ error: 'Usuário não está associado a uma empresa' });
  }

  // Verificar se o usuário tem função de administrador
  if (user.role !== Role.COMPANY_ADMIN && user.role !== Role.SUPER_ADMIN && user.role !== Role.INSTRUCTOR) {
    return res.status(403).json({ error: 'Sem permissão para acessar este recurso' });
  }

  // Verificar método HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { courseId, modules } = req.body;

    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({ error: 'ID do curso é obrigatório' });
    }

    if (!modules || !Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({ error: 'Lista de módulos é obrigatória' });
    }

    // Verificar se o curso existe e pertence à empresa do usuário
    const courseExists: { id: string } | null = await prisma.$queryRaw`
      SELECT id
      FROM "TrainingCourse"
      WHERE id = ${courseId} AND "companyId" = ${user.companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (!courseExists) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Verificar se todos os módulos pertencem ao curso
    const moduleIds = modules.map(m => m.id);
    const validModules: { id: string }[] = await prisma.$queryRaw`
      SELECT id
      FROM "TrainingModule"
      WHERE id IN (${Prisma.join(moduleIds)}) AND "courseId" = ${courseId}
    `;

    if (validModules.length !== moduleIds.length) {
      return res.status(400).json({ error: 'Um ou mais módulos não pertencem ao curso especificado' });
    }

    // Atualizar a ordem de cada módulo em uma transação
    await prisma.$transaction(
      modules.map(module => 
        prisma.$executeRaw`
          UPDATE "TrainingModule"
          SET "order" = ${module.order}
          WHERE id = ${module.id}
        `
      )
    );

    return res.status(200).json({ message: 'Módulos reordenados com sucesso' });
  } catch (error) {
    console.error('Erro ao reordenar módulos:', error);
    return res.status(500).json({ error: 'Erro ao reordenar módulos' });
  }
}
