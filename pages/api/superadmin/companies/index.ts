import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { countUsersForCompany } from '@/lib/user-counter';

// Função para normalizar CNPJ (remover formatação)
function normalizeCNPJ(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  return cnpj.replace(/[^0-9]/g, '');
}

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

// Função para buscar empresas
async function getCompanies(req: NextApiRequest, res: NextApiResponse) {
  console.log(`[COMPANIES] Iniciando busca de empresas (${new Date().toISOString()})`);
  
  try {
    console.log(`[COMPANIES] Executando consulta Prisma para buscar empresas`);
    
    // Forçar desconexão e reconexão para garantir dados frescos
    const reconnected = await reconnectPrisma();
    console.log(`[COMPANIES] Reconexão do Prisma ${reconnected ? 'bem-sucedida' : 'falhou'}`);
    
    // Limpar cache do Prisma explicitamente
    console.log(`[COMPANIES] Limpando cache do Prisma antes da consulta`);
    
    // Buscar empresas com ordenação por nome
    const companies = await prisma.company.findMany({
      orderBy: {
        name: 'asc'
      },
    });
    
    console.log(`[COMPANIES] Encontradas ${companies.length} empresas`);
    
    // Verificar se há duplicatas nos IDs
    const uniqueIds = new Set(companies.map(company => company.id));
    console.log(`[COMPANIES] IDs das empresas encontradas: ${companies.map(c => c.id).join(', ')}`);
    console.log(`[COMPANIES] Número de IDs únicos: ${uniqueIds.size}`);
    
    if (uniqueIds.size !== companies.length) {
      console.warn(`[COMPANIES] ALERTA: Foram encontradas empresas com IDs duplicados!`);
    }
    
    // Verificar duplicatas por CNPJ
    const cnpjMap = new Map();
    companies.forEach(company => {
      const normalizedCnpj = normalizeCNPJ(company.cnpj);
      if (normalizedCnpj) {
        if (cnpjMap.has(normalizedCnpj)) {
          console.warn(`[COMPANIES] ALERTA: CNPJ duplicado encontrado: ${normalizedCnpj}`);
          console.warn(`[COMPANIES] Empresas com mesmo CNPJ: ${cnpjMap.get(normalizedCnpj).id} e ${company.id}`);
        } else {
          cnpjMap.set(normalizedCnpj, company);
        }
      }
    });
    
    // Formatar resultados para o frontend
    console.log(`[COMPANIES] Formatando resultados para o frontend`);
    
    // Buscar contagem de usuários para cada empresa usando o contador dedicado
    const formattedCompanies = await Promise.all(companies.map(async company => {
      // Usar o contador dedicado para obter o número de usuários
      const userCount = await countUsersForCompany(company.id);
      
      // Contar candidatos usando query raw para evitar problemas de cache
      const candidateResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM "Candidate" 
        WHERE "companyId" = ${company.id}
      `;
      const candidateCount = parseInt(candidateResult[0].count, 10);
      
      return {
        ...company,
        createdAt: company.createdAt?.toISOString() || null,
        updatedAt: company.updatedAt?.toISOString() || null,
        lastPaymentDate: company.lastPaymentDate?.toISOString() || null,
        trialEndDate: company.trialEndDate?.toISOString() || null,
        _userCount: userCount,
        _candidateCount: candidateCount
      };
    }));
    
    console.log(`[COMPANIES] Retornando ${formattedCompanies.length} empresas formatadas`);
    
    // Remover duplicatas antes de retornar
    const uniqueCompanies = Array.from(
      new Map(formattedCompanies.map(company => [company.id, company])).values()
    );
    
    if (uniqueCompanies.length !== formattedCompanies.length) {
      console.warn(`[COMPANIES] Removidas ${formattedCompanies.length - uniqueCompanies.length} empresas duplicadas`);
    }
    
    res.status(200).json(uniqueCompanies);
  } catch (error) {
    console.error(`[COMPANIES] Erro ao buscar empresas:`, error);
    res.status(500).json({ error: 'Erro ao buscar empresas' });
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
          cnpj: normalizeCNPJ(cnpj)
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
        cnpj: normalizeCNPJ(cnpj) || null,
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
