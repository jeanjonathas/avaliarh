import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { PrismaClient, Candidate, Response, Test, Stage, Question, Status } from '@prisma/client'

// Função auxiliar para converter BigInt para Number
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = convertBigIntToNumber(obj[key]);
    }
    return result;
  }

  return obj;
}

// Tipos para as relações
type CandidateWithRelations = Candidate & {
  responses: (Response & {
    question?: Question & {
      stage?: Stage;
      categories?: {
        id: string;
        name: string;
      }[];
    };
  })[];
  test?: Test & {
    testStages: {
      stage: Stage;
      order: number;
    }[];
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const prisma = new PrismaClient();
  
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID do candidato é obrigatório' });
    }

    // GET - Buscar candidato por ID
    if (req.method === 'GET') {
      const candidate = await prisma.candidate.findUnique({
        where: { id },
        include: {
          test: {
            include: {
              testStages: {
                include: {
                  stage: true
                },
                orderBy: {
                  order: 'asc'
                }
              }
            }
          },
          responses: {
            include: {
              question: {
                include: {
                  stage: true,
                  categories: true
                }
              }
            }
          }
        }
      }) as CandidateWithRelations | null;
      
      if (!candidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' });
      }

      // Processar e retornar o candidato como antes...
      const formattedCandidate = {
        ...candidate,
        testDate: candidate.testDate?.toISOString() || null,
        interviewDate: candidate.interviewDate?.toISOString() || null,
        inviteExpires: candidate.inviteExpires?.toISOString() || null,
        createdAt: candidate.createdAt.toISOString(),
        updatedAt: candidate.updatedAt.toISOString(),
      };

      return res.status(200).json(formattedCandidate);
    }

    // PUT - Atualizar candidato
    if (req.method === 'PUT') {
      const {
        name,
        email,
        position,
        status,
        observations,
        testId,
      } = req.body;

      // Validar campos obrigatórios
      if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios' });
      }

      // Validar status
      if (status && !Object.values(Status).includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      // Atualizar candidato
      const updatedCandidate = await prisma.candidate.update({
        where: { id },
        data: {
          name,
          email,
          position,
          status: status as Status,
          observations,
          testId,
          updatedAt: new Date(),
        },
      });

      return res.status(200).json(updatedCandidate);
    }

    // POST - Gerar novo código de convite
    if (req.method === 'POST' && req.body.action === 'generateInvite') {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const inviteExpires = new Date();
      inviteExpires.setDate(inviteExpires.getDate() + 7); // Expira em 7 dias

      const updatedCandidate = await prisma.candidate.update({
        where: { id },
        data: {
          inviteCode,
          inviteExpires,
          updatedAt: new Date(),
        },
      });

      return res.status(200).json({
        inviteCode: updatedCandidate.inviteCode,
        inviteExpires: updatedCandidate.inviteExpires,
      });
    }

    // Método não permitido
    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}