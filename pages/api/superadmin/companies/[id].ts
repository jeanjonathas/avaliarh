import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';
import { ReadStream } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/companies/${req.query.id}`);
    
    const session = await getServerSession(req, res, authOptions);

    // Verifica se o usuário está autenticado e é um SUPER_ADMIN
    if (!session) {
      console.log('[API] Erro: Usuário não autenticado');
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    if ((session.user.role as string) !== 'SUPER_ADMIN') {
      console.log(`[API] Erro: Usuário não é SUPER_ADMIN (role: ${session.user.role})`);
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      console.log(`[API] Erro: ID inválido (${id})`);
      return res.status(400).json({ message: 'ID da empresa é obrigatório' });
    }

    console.log(`[API] Processando requisição ${req.method} para empresa ${id}`);

    // Manipula diferentes métodos HTTP
    switch (req.method) {
      case 'GET':
        return getCompany(req, res, id);
      case 'PUT':
        return updateCompany(req, res, id);
      case 'DELETE':
        return deleteCompany(req, res, id);
      case 'PATCH':
        return deactivateCompany(req, res, id);
      default:
        console.log(`[API] Método não permitido: ${req.method}`);
        return res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('[API] Erro não tratado no handler principal:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// GET - Obter detalhes de uma empresa específica
async function getCompany(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Usando métodos nativos do Prisma em vez de $queryRaw
    const company = await prisma.company.findUnique({
      where: { id },
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

    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Serializar a empresa para o formato esperado pelo frontend
    const serializedCompany = {
      ...company,
      userCount: company._count.users,
      candidateCount: company._count.candidates,
      testCount: company._count.questions, // Usamos questions como proxy para testes
      processCount: company._count.processes,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
      lastPaymentDate: company.lastPaymentDate ? company.lastPaymentDate.toISOString() : null,
      trialEndDate: company.trialEndDate ? company.trialEndDate.toISOString() : null,
    };

    return res.status(200).json(serializedCompany);
  } catch (error) {
    console.error('Error fetching company:', error);
    return res.status(500).json({ message: 'Erro ao buscar empresa' });
  }
}

// PUT - Atualizar uma empresa existente
async function updateCompany(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
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
      return res.status(400).json({ message: 'Nome e plano são obrigatórios' });
    }

    // Verifica se a empresa existe
    const existingCompany = await prisma.company.findUnique({
      where: { id }
    });

    if (!existingCompany) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Verifica se já existe outra empresa com o mesmo CNPJ
    if (cnpj) {
      const companyWithSameCNPJ = await prisma.company.findFirst({
        where: {
          cnpj,
          id: { not: id }
        }
      });

      if (companyWithSameCNPJ) {
        return res.status(400).json({ message: 'Já existe outra empresa com este CNPJ' });
      }
    }

    // Atualiza a empresa
    const updatedCompany = await prisma.company.update({
      where: { id },
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

    return res.status(200).json(updatedCompany);
  } catch (error) {
    console.error('Error updating company:', error);
    return res.status(500).json({ message: 'Erro ao atualizar empresa' });
  }
}

// DELETE - Excluir uma empresa
async function deleteCompany(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    console.log(`[DELETE] Iniciando exclusão da empresa ${id}`);
    
    // Verifica se a empresa existe
    console.log(`[DELETE] Verificando se a empresa ${id} existe`);
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: true,
        subscription: true,
        plan: true,
      },
    });

    if (!company) {
      console.log(`[DELETE] Erro: Empresa ${id} não encontrada`);
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    console.log(`[DELETE] Empresa ${id} encontrada. Nome: ${company.name}`);

    // Exporta todos os dados relacionados à empresa antes da exclusão
    console.log(`[DELETE] Exportando dados da empresa ${id}`);
    const exportData = await exportCompanyData(id);
    
    // Gera um nome para o arquivo de exportação (apenas para referência)
    const exportFileName = `company_export_${id}_${Date.now()}.json`;
    
    // Não salvamos mais no sistema de arquivos local
    console.log(`[DELETE] Dados da empresa ${id} exportados com sucesso`);

    // Exclui todos os dados relacionados à empresa usando transação
    console.log(`[DELETE] Iniciando transação para excluir dados da empresa ${id}`);
    try {
      await prisma.$transaction([
        // Exclui os usuários associados à empresa
        prisma.user.deleteMany({
          where: { companyId: id }
        }),
        
        // Exclui as assinaturas associadas à empresa
        prisma.subscription.deleteMany({
          where: { companyId: id }
        }),
        
        // Exclui o histórico de pagamentos associado à empresa
        prisma.paymentHistory.deleteMany({
          where: { companyId: id }
        }),
        
        // Exclui os processos seletivos associados à empresa
        prisma.selectionProcess.deleteMany({
          where: { companyId: id }
        }),
        
        // Exclui os testes associados à empresa
        prisma.test.deleteMany({
          where: { companyId: id }
        }),
        
        // Exclui os candidatos associados à empresa
        prisma.candidate.deleteMany({
          where: { companyId: id }
        }),
        
        // Finalmente, exclui a empresa
        prisma.company.delete({
          where: { id }
        })
      ]);
      console.log(`[DELETE] Transação concluída com sucesso. Empresa ${id} excluída.`);
    } catch (transactionError) {
      console.error(`[DELETE] Erro na transação:`, transactionError);
      throw new Error(`Erro ao excluir dados relacionados: ${transactionError.message}`);
    }

    // Retorna sucesso e os dados exportados diretamente na resposta
    console.log(`[DELETE] Retornando resposta de sucesso para exclusão da empresa ${id}`);
    return res.status(200).json({ 
      message: 'Empresa excluída com sucesso',
      exportData: JSON.stringify(exportData).length > 1000 ? 
        { message: 'Dados exportados com sucesso (muito grandes para exibir)' } : 
        exportData
    });
  } catch (error) {
    console.error(`[DELETE] Erro ao excluir empresa ${id}:`, error);
    return res.status(500).json({ 
      message: 'Erro ao excluir empresa', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Função para exportar todos os dados relacionados a uma empresa
async function exportCompanyData(companyId: string) {
  try {
    // Busca a empresa e todos os dados relacionados
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        // Dados básicos da empresa
        users: true,
        subscription: {
          include: {
            plan: true
          }
        },
        plan: true,
        paymentHistory: true,
        
        // Processos seletivos e candidatos
        processes: {
          include: {
            stages: {
              include: {
                test: true,
                progresses: true,
                personalityConfig: {
                  include: {
                    traitWeights: true
                  }
                }
              }
            }
          }
        },
        
        // Candidatos e suas respostas
        candidates: {
          include: {
            responses: true,
            progresses: true,
            testInvites: true
          }
        },
        
        // Testes e questões
        tests: true,
        
        // Questões da empresa
        questions: true,
        
        // Dados de treinamento
        trainingCourses: {
          include: {
            modules: {
              include: {
                lessons: true
              }
            },
            enrollments: true,
            sector: true
          }
        },
        trainingMaterials: true,
        trainingSectors: true,
        trainingTests: true,
        
        // Outros relacionamentos
        globalAccess: true,
        testInvitations: true,
        candidateProgress: true,
        responses: true,
        students: true,
        usedInviteCodes: true
      }
    });

    // Buscar testes com detalhes
    const tests = await prisma.test.findMany({
      where: { companyId },
      include: {
        stages: {
          include: {
            questions: {
              include: {
                options: true
              }
            }
          }
        }
      }
    });
    
    // Buscar questões com detalhes
    const questions = await prisma.question.findMany({
      where: { companyId },
      include: {
        options: true,
        categories: true
      }
    });
    
    // Buscar categorias relacionadas às questões da empresa
    // Primeiro, extrair os IDs das categorias das questões
    const categoryIds = new Set<string>();
    questions.forEach(question => {
      question.categories.forEach(category => {
        categoryIds.add(category.id);
      });
    });
    
    // Buscar apenas as categorias relacionadas
    const categories = await prisma.category.findMany({
      where: {
        id: {
          in: Array.from(categoryIds)
        }
      }
    });
    
    // Buscar respostas
    const responses = await prisma.response.findMany({
      where: {
        companyId
      },
      include: {
        question: true,
        candidate: true
      }
    });

    // Buscar estudantes com detalhes
    const students = await prisma.student.findMany({
      where: { companyId },
      include: {
        user: true,
      }
    });

    // Buscar convites de teste
    const testInvitations = await prisma.testInvitation.findMany({
      where: { companyId },
      include: {
        candidate: true,
        test: true
      }
    });

    // Relação entre opções e respostas
    const optionResponses = await prisma.response.findMany({
      where: {
        companyId
      },
      select: {
        id: true,
        questionId: true,
        candidateId: true,
        optionId: true,
        isCorrect: true
      }
    });

    // Combinar todos os dados em um único objeto para exportação
    return {
      company,
      additionalData: {
        tests,
        questions,
        categories,
        responses,
        students,
        testInvitations,
        optionResponses
      },
      exportDate: new Date(),
      exportVersion: '1.0'
    };
  } catch (error) {
    console.error('Erro ao exportar dados da empresa:', error);
    // Em caso de erro, retorna ao menos os dados básicos da empresa
    const basicCompany = await prisma.company.findUnique({
      where: { id: companyId }
    });
    return {
      company: basicCompany,
      exportDate: new Date(),
      exportVersion: '1.0',
      error: 'Exportação parcial devido a erro'
    };
  }
}

// PATCH - Atualizar parcialmente uma empresa (para desativação)
async function deactivateCompany(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Verifica se a empresa existe
    const existingCompany = await prisma.company.findUnique({
      where: { id }
    });

    if (!existingCompany) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // Desativa a empresa
    await prisma.company.update({
      where: { id },
      data: { isActive: false }
    });

    return res.status(200).json({ 
      message: 'Empresa desativada com sucesso',
    });
  } catch (error) {
    console.error('Error deactivating company:', error);
    return res.status(500).json({ message: 'Erro ao desativar empresa' });
  }
}
