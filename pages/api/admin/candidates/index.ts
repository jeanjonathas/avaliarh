import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

// Definindo a interface para o tipo Response com os campos adicionais
interface ResponseWithSnapshot {
  id: string;
  candidateId: string;
  questionId: string;
  optionId: string;
  questionText: string;
  optionText: string;
  isCorrectOption: boolean;
  allOptionsSnapshot?: any;
  questionSnapshot?: any;
  categoryName?: string | null;
  stageName?: string | null;
  stageId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  if (req.method === 'GET') {
    try {
      // Buscar todos os candidatos
      // Usando Prisma Client em vez de SQL raw para melhor tipagem e segurança
      console.log('Buscando candidatos...');
      
      const allCandidates = await prisma.candidate.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          responses: true
        }
      });
      
      console.log(`Encontrados ${allCandidates.length} candidatos no banco de dados.`);
      
      // Processar os candidatos para calcular a pontuação
      const candidates = allCandidates.map(candidate => {
        // Calcular pontuação apenas se o candidato tiver respostas
        let score = null;
        if (candidate.completed && candidate.responses.length > 0) {
          // Converter as respostas para o tipo personalizado
          const typedResponses = candidate.responses as unknown as ResponseWithSnapshot[];
          
          // Usar o campo isCorrectOption que está armazenado diretamente na resposta
          const correctResponses = typedResponses.filter(response => response.isCorrectOption).length;
          score = (correctResponses / typedResponses.length) * 100;
        }
        
        // Converter datas para strings para evitar problemas de serialização
        const serializedCandidate = {
          ...candidate,
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          position: candidate.position,
          testDate: candidate.testDate ? candidate.testDate.toISOString() : null,
          interviewDate: candidate.interviewDate ? candidate.interviewDate.toISOString() : null,
          completed: candidate.completed,
          createdAt: candidate.createdAt.toISOString(),
          updatedAt: candidate.updatedAt.toISOString(),
          inviteExpires: candidate.inviteExpires ? candidate.inviteExpires.toISOString() : null,
          status: candidate.status,
          inviteCode: candidate.inviteCode,
          inviteSent: candidate.inviteSent,
          inviteAttempts: Number(candidate.inviteAttempts), // Converter possível BigInt
          score,
          // Remover campos que não podem ser serializados para JSON
          responses: undefined
        };
        
        return serializedCandidate;
      });
      
      console.log(`Processados ${candidates.length} candidatos para exibição.`);

      // Processar os candidatos
      const processedCandidates = Array.isArray(candidates) 
        ? await Promise.all(
            candidates.map(async (candidate: any) => {
              // Se não completou o teste, retornar candidato simples
              if (!candidate.completed) {
                return {
                  ...candidate,
                  score: undefined,
                  stageScores: []
                };
              }

              // Buscar pontuações por etapa
              const stageScores = await prisma.$queryRaw`
                SELECT 
                  "stageId" as id, 
                  "stageName" as name,
                  COUNT(CASE WHEN "isCorrectOption" = true THEN 1 ELSE NULL END) as correct,
                  COUNT(id) as total,
                  (COUNT(CASE WHEN "isCorrectOption" = true THEN 1 ELSE NULL END)::float / COUNT(id)::float * 100)::int as percentage
                FROM "Response" 
                WHERE "candidateId" = ${candidate.id}
                  AND "stageId" IS NOT NULL
                GROUP BY "stageId", "stageName"
                ORDER BY "stageName"
              `;
              
              // Converter BigInt para Number nos resultados de stageScores
              const convertedStageScores = Array.isArray(stageScores) 
                ? convertBigIntToNumber(stageScores) 
                : [];
              
              return {
                ...candidate,
                score: Math.round(candidate.score) || 0,
                stageScores: convertedStageScores
              };
            })
          )
        : [];

      // Garantir que todos os valores BigInt sejam convertidos para Number
      const serializedCandidates = convertBigIntToNumber(processedCandidates);
      console.log('Candidatos serializados com sucesso.');
      
      return res.status(200).json(serializedCandidates);
    } catch (error) {
      console.error('Erro ao carregar candidatos:', error);
      // Retornar array vazio em vez de erro para não quebrar a UI
      return res.status(200).json([]);
    }
  } else if (req.method === 'POST') {
    try {
      const { name, email, position, inviteExpires, inviteCode } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios' });
      }
      
      // Verificar se já existe um candidato com este email
      const existingCandidates = await prisma.$queryRaw`
        SELECT id FROM "Candidate" WHERE email = ${email} LIMIT 1
      `;
      
      if (Array.isArray(existingCandidates) && existingCandidates.length > 0) {
        return res.status(400).json({ error: 'Já existe um candidato com este email' });
      }
      
      // Criar o candidato
      await prisma.$executeRaw`
        INSERT INTO "Candidate" (
          id,
          name,
          email,
          position,
          "inviteCode",
          "inviteExpires",
          "createdAt",
          "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          ${name},
          ${email},
          ${position || null},
          ${inviteCode || null},
          ${inviteExpires ? new Date(inviteExpires) : null},
          NOW(),
          NOW()
        )
      `;
      
      // Buscar o candidato recém-criado
      const newCandidates = await prisma.$queryRaw`
        SELECT * FROM "Candidate"
        WHERE email = ${email}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;
      
      const newCandidate = Array.isArray(newCandidates) && newCandidates.length > 0
        ? newCandidates[0]
        : { name, email, position };
      
      return res.status(201).json(newCandidate);
    } catch (error) {
      console.error('Erro ao criar candidato:', error);
      return res.status(500).json({ error: 'Erro ao criar candidato' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
