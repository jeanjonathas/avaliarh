import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma } from '../../../../../lib/prisma';
import { Role, Prisma } from '@prisma/client';

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

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getSectors(req, res, user.companyId);
    case 'POST':
      return createSector(req, res, user.companyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Get all sectors for the company
async function getSectors(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    // Get all sectors for the company
    const sectors: {
      id: string;
      name: string;
      description: string;
      companyId: string;
      createdAt: Date;
      updatedAt: Date;
    }[] = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        description, 
        "companyId", 
        "createdAt", 
        "updatedAt"
      FROM "TrainingSector"
      WHERE "companyId" = ${companyId}
      ORDER BY name ASC
    `;

    // Get course counts for each sector
    const courseCounts: {
      sectorId: string;
      count: number;
    }[] = await prisma.$queryRaw`
      SELECT 
        "sectorId",
        COUNT(*) as count
      FROM "TrainingCourse"
      WHERE "sectorId" IN (${Prisma.join(sectors.map(s => s.id))})
      GROUP BY "sectorId"
    `;

    // Create a map for quick lookup
    const courseCountMap = new Map();
    courseCounts.forEach(item => {
      courseCountMap.set(item.sectorId, Number(item.count));
    });

    // Process sectors to include additional stats
    const processedSectors = sectors.map(sector => {
      // Count total courses
      const totalCourses = courseCountMap.get(sector.id) || 0;

      return {
        id: sector.id,
        name: sector.name,
        description: sector.description,
        companyId: sector.companyId,
        createdAt: sector.createdAt,
        updatedAt: sector.updatedAt,
        totalCourses
      };
    });

    return res.status(200).json(processedSectors);
  } catch (error) {
    console.error('Erro ao buscar setores:', error);
    return res.status(500).json({ error: 'Erro ao buscar setores' });
  }
}

// Create a new sector
async function createSector(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Nome do setor é obrigatório' });
    }

    // Check if sector with the same name already exists
    const existingSector: { id: string } | null = await prisma.$queryRaw`
      SELECT id 
      FROM "TrainingSector" 
      WHERE name = ${name} 
      AND "companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (existingSector) {
      return res.status(400).json({ error: 'Já existe um setor com este nome' });
    }

    // Create the sector
    const sectorId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "TrainingSector" (
        id, 
        name, 
        description, 
        "companyId", 
        "createdAt", 
        "updatedAt"
      ) 
      VALUES (
        ${sectorId}, 
        ${name}, 
        ${description || ''}, 
        ${companyId}, 
        ${Prisma.raw('NOW()')}, 
        ${Prisma.raw('NOW()')}
      )
    `;

    // Fetch the created sector
    const sector = await prisma.$queryRaw`
      SELECT * 
      FROM "TrainingSector" 
      WHERE id = ${sectorId}
    `.then((results: any[]) => results[0]);

    return res.status(201).json(sector);
  } catch (error) {
    console.error('Erro ao criar setor:', error);
    return res.status(500).json({ error: 'Erro ao criar setor' });
  }
}
