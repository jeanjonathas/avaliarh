import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/companies`);
    
    // Manipula diferentes métodos HTTP
    switch (req.method) {
      case 'GET':
        return getCompanies(req, res);
      case 'POST':
        return createCompany(req, res);
      default:
        return res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('[API] Erro no manipulador de API de empresas:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

// GET - Listar todas as empresas
async function getCompanies(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[COMPANIES] Iniciando busca de empresas (${new Date().toISOString()})`);
    
    // Usando métodos nativos do Prisma em vez de $queryRaw
    console.log('[COMPANIES] Executando consulta Prisma para buscar empresas');
    const companies = await prisma.company.findMany({
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        cnpj: true,
        planType: true,
        isActive: true,
        maxUsers: true,
        maxCandidates: true,
        lastPaymentDate: true,
        trialEndDate: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            candidates: true,
            questions: true, // Usamos questions como proxy para testes
            processes: true
          }
        }
      }
    });
    
    console.log(`[COMPANIES] Encontradas ${companies.length} empresas`);
    console.log(`[COMPANIES] IDs das empresas encontradas: ${companies.map(c => c.id).join(', ')}`);
    
    // Verificar se há duplicatas
    const uniqueIds = new Set(companies.map(c => c.id));
    console.log(`[COMPANIES] Número de IDs únicos: ${uniqueIds.size}`);
    if (uniqueIds.size !== companies.length) {
      console.warn('[COMPANIES] ALERTA: Foram encontradas empresas com IDs duplicados!');
      
      // Identificar as duplicatas
      const idCounts: Record<string, number> = {};
      companies.forEach(c => {
        idCounts[c.id] = (idCounts[c.id] || 0) + 1;
      });
      
      Object.entries(idCounts).forEach(([id, count]) => {
        if (count as number > 1) {
          console.warn(`[COMPANIES] ID duplicado: ${id} (${count} ocorrências)`);
          
          // Mostrar detalhes das empresas duplicadas
          const duplicates = companies.filter(c => c.id === id);
          duplicates.forEach((dup, index) => {
            console.warn(`[COMPANIES] Duplicata #${index + 1} - Nome: ${dup.name}, Plano: ${dup.planType}, Criado em: ${dup.createdAt}`);
          });
        }
      });
    }

    // Mapear os resultados para o formato esperado pelo frontend
    console.log('[COMPANIES] Formatando resultados para o frontend');
    const formattedCompanies = companies.map(company => ({
      ...company,
      userCount: company._count.users,
      candidateCount: company._count.candidates,
      testCount: company._count.questions, // Usamos questions como proxy para testes
      processCount: company._count.processes
    }));

    console.log(`[COMPANIES] Retornando ${formattedCompanies.length} empresas formatadas`);
    return res.status(200).json(formattedCompanies);
  } catch (error) {
    console.error('[COMPANIES] Erro ao buscar empresas:', error);
    
    // Verificar se é um erro de conexão com o banco
    if (error instanceof Error) {
      console.error(`[COMPANIES] Tipo de erro: ${error.name}`);
      console.error(`[COMPANIES] Mensagem de erro: ${error.message}`);
      
      // Verificar problemas de case sensitivity
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.error('[COMPANIES] ERRO DE CASE SENSITIVITY DETECTADO!');
        console.error('[COMPANIES] Detalhes do erro:', error.message);
      }
      
      // Verificar problemas de conexão
      if (error.message.includes('connect') || error.message.includes('connection')) {
        console.error('[COMPANIES] ERRO DE CONEXÃO COM O BANCO DETECTADO!');
        console.error('[COMPANIES] Verifique o pool de conexões e limite de conexões.');
      }
    }
    
    return res.status(500).json({ message: 'Erro ao buscar empresas' });
  } finally {
    console.log(`[COMPANIES] Finalizando requisição, desconectando Prisma (${new Date().toISOString()})`);
    await prisma.$disconnect();
  }
}

// POST - Criar uma nova empresa
async function createCompany(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[COMPANIES] Iniciando criação de empresa (${new Date().toISOString()})`);
    console.log(`[COMPANIES] Dados recebidos:`, JSON.stringify(req.body));
    
    const {
      name,
      cnpj,
      planType,
      isActive,
      maxUsers,
      maxCandidates,
      lastPaymentDate,
      trialEndDate,
    } = req.body;

    // Validação básica
    if (!name || !planType) {
      console.log('[COMPANIES] Erro de validação: Nome e plano são obrigatórios');
      return res.status(400).json({ message: 'Nome e plano são obrigatórios' });
    }

    // Verifica se já existe uma empresa com o mesmo CNPJ
    if (cnpj) {
      console.log(`[COMPANIES] Verificando se já existe empresa com CNPJ: ${cnpj}`);
      const existingCompany = await prisma.company.findUnique({
        where: {
          cnpj: cnpj
        }
      });

      if (existingCompany) {
        console.log(`[COMPANIES] Empresa com CNPJ ${cnpj} já existe (ID: ${existingCompany.id})`);
        return res.status(400).json({ message: 'Já existe uma empresa com este CNPJ' });
      }
    }

    // Cria a nova empresa usando o Prisma Client diretamente
    console.log('[COMPANIES] Criando nova empresa no banco de dados');
    const newCompany = await prisma.company.create({
      data: {
        name,
        cnpj: cnpj || null,
        planType,
        isActive: isActive !== undefined ? isActive : true,
        maxUsers: maxUsers || 10,
        maxCandidates: maxCandidates || 100,
        lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate) : null,
        trialEndDate: trialEndDate ? new Date(trialEndDate) : null,
      }
    });

    console.log(`[COMPANIES] Empresa criada com sucesso. ID: ${newCompany.id}`);
    return res.status(201).json(newCompany);
  } catch (error) {
    console.error('[COMPANIES] Erro ao criar empresa:', error);
    return res.status(500).json({ message: 'Erro ao criar empresa' });
  } finally {
    console.log(`[COMPANIES] Finalizando requisição de criação, desconectando Prisma (${new Date().toISOString()})`);
    await prisma.$disconnect();
  }
}
