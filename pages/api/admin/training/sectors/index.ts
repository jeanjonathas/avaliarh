import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { Role, Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  
  // Log para depuração
  console.log('[PRISMA] Verificando sessão em training/sectors:', session ? 'Autenticado' : 'Não autenticado');
  
  if (!session) {
    console.log('[PRISMA] Erro de autenticação: Sessão não encontrada');
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Garantir que temos uma conexão fresca com o banco de dados
  console.log('[PRISMA] Forçando reconexão do Prisma antes de buscar setores');
  await reconnectPrisma();

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
    console.log(`[SECTORS] Buscando setores para empresa ID: ${companyId}`);
    
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

    console.log(`[SECTORS] Encontrados ${sectors.length} setores`);
    
    // Se não houver setores, retornar array vazio imediatamente
    if (sectors.length === 0) {
      console.log('[SECTORS] Nenhum setor encontrado, retornando array vazio');
      return res.status(200).json([]);
    }

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
    console.log(`[SECTORS] Iniciando criação de setor para empresa ID: ${companyId}`);
    console.log(`[SECTORS] Dados recebidos:`, req.body);
    
    const { name, description } = req.body;

    // Validate required fields
    if (!name) {
      console.log('[SECTORS] Erro: Nome do setor não fornecido');
      return res.status(400).json({ error: 'Nome do setor é obrigatório' });
    }

    // Garantir que temos uma conexão fresca com o banco de dados
    console.log('[SECTORS] Forçando reconexão do Prisma antes de verificar duplicatas');
    await reconnectPrisma();

    // Check if sector with the same name already exists
    const existingSector: { id: string } | null = await prisma.$queryRaw`
      SELECT id 
      FROM "TrainingSector" 
      WHERE name = ${name} 
      AND "companyId" = ${companyId}
      LIMIT 1
    `.then((results: any[]) => results[0] || null);

    if (existingSector) {
      console.log(`[SECTORS] Erro: Já existe um setor com o nome "${name}" para esta empresa`);
      return res.status(400).json({ error: 'Já existe um setor com este nome' });
    }

    // Verificar se a empresa existe
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      console.log(`[SECTORS] Erro: Empresa com ID ${companyId} não encontrada`);
      return res.status(400).json({ error: 'Empresa não encontrada' });
    }

    console.log(`[SECTORS] Empresa verificada: ${company.name} (${companyId})`);

    // Create the sector
    const sectorId = crypto.randomUUID();
    console.log(`[SECTORS] Criando setor com ID: ${sectorId}`);
    
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

    console.log(`[SECTORS] Setor criado com sucesso, buscando dados completos`);

    // Fetch the created sector
    const sector = await prisma.$queryRaw`
      SELECT * 
      FROM "TrainingSector" 
      WHERE id = ${sectorId}
    `.then((results: any[]) => results[0]);

    console.log(`[SECTORS] Retornando setor criado:`, sector);

    return res.status(201).json(sector);
  } catch (error) {
    console.error('[SECTORS] Erro ao criar setor:', error);
    return res.status(500).json({ error: 'Erro ao criar setor' });
  }
}
