import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

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
      const candidates = await prisma.$queryRaw`
        SELECT c.*, 
          CASE 
            WHEN c.completed = true THEN 
              (SELECT COUNT(*) FROM "Response" r 
               JOIN "Option" o ON r."optionId" = o.id 
               WHERE r."candidateId" = c.id AND o."isCorrect" = true)::float / 
              (SELECT COUNT(*) FROM "Response" WHERE "candidateId" = c.id)::float * 100 
            ELSE NULL 
          END as score
        FROM "Candidate" c
        ORDER BY c."testDate" DESC
      `;

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
                  s.id, 
                  s.title as name,
                  COUNT(CASE WHEN o."isCorrect" = true THEN 1 ELSE NULL END) as correct,
                  COUNT(r.id) as total,
                  (COUNT(CASE WHEN o."isCorrect" = true THEN 1 ELSE NULL END)::float / COUNT(r.id)::float * 100)::int as percentage
                FROM "Response" r
                JOIN "Question" q ON r."questionId" = q.id
                JOIN "Stage" s ON q."stageId" = s.id
                JOIN "Option" o ON r."optionId" = o.id
                WHERE r."candidateId" = ${candidate.id}
                GROUP BY s.id, s.title
                ORDER BY s.order
              `;
              
              return {
                ...candidate,
                score: Math.round(candidate.score) || 0,
                stageScores: Array.isArray(stageScores) ? stageScores : []
              };
            })
          )
        : [];

      return res.status(200).json(processedCandidates);
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
