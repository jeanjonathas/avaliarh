import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

  try {
    if (req.method === 'GET') {
      const { status, search, testId, activeOnly } = req.query

      // Construir o filtro base
      let whereClause: any = {}

      // Adicionar filtro por status, se fornecido
      if (status && status !== 'all') {
        whereClause.status = status
      }

      // Adicionar filtro por testId, se fornecido
      if (testId) {
        whereClause.testId = testId
      }

      // Filtrar apenas candidatos de testes ativos, se solicitado
      if (activeOnly === 'true') {
        whereClause.test = {
          active: true
        }
      }

      // Adicionar filtro de busca, se fornecido
      if (search) {
        const searchTerm = String(search).trim()
        if (searchTerm) {
          whereClause.OR = [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { position: { contains: searchTerm, mode: 'insensitive' } }
          ]
        }
      }

      // Buscar candidatos com filtros
      const candidates = await prisma.candidate.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          responses: true,
          test: {
            select: {
              id: true,
              title: true
            }
          }
        }
      })

      // Processar os candidatos para incluir estatísticas
      const processedCandidates = candidates.map(candidate => {
        // Calcular estatísticas
        const totalResponses = candidate.responses.length
        const correctResponses = candidate.responses.filter(r => r.isCorrect).length
        const calculatedScore = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0

        // Agrupar respostas por etapa para calcular pontuação por etapa
        const stageMap: Record<string, { id: string; name: string; correct: number; total: number }> = {}
        
        candidate.responses.forEach(response => {
          if (response.stageId && response.stageName) {
            if (!stageMap[response.stageId]) {
              stageMap[response.stageId] = {
                id: response.stageId,
                name: response.stageName,
                correct: 0,
                total: 0
              }
            }
            
            stageMap[response.stageId].total++
            if (response.isCorrect) {
              stageMap[response.stageId].correct++
            }
          }
        })
        
        // Calcular porcentagem para cada etapa
        const stageScores = Object.values(stageMap).map(stage => {
          return {
            ...stage,
            percentage: stage.total > 0 ? Math.round((stage.correct / stage.total) * 100) : 0
          }
        })

        // Formatar datas para evitar problemas de serialização
        return {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          position: candidate.position,
          status: candidate.status,
          rating: candidate.rating,
          observations: candidate.observations,
          completed: candidate.completed,
          testDate: candidate.testDate ? candidate.testDate.toISOString() : null,
          interviewDate: candidate.interviewDate ? candidate.interviewDate.toISOString() : null,
          createdAt: candidate.createdAt.toISOString(),
          updatedAt: candidate.updatedAt.toISOString(),
          inviteCode: candidate.inviteCode,
          inviteSent: candidate.inviteSent,
          inviteAttempts: Number(candidate.inviteAttempts),
          inviteExpires: candidate.inviteExpires ? candidate.inviteExpires.toISOString() : null,
          instagram: candidate.instagram,
          timeSpent: candidate.timeSpent,
          photoUrl: candidate.photoUrl,
          score: typeof candidate.score === 'number' ? candidate.score : calculatedScore,
          test: candidate.test,
          totalResponses,
          correctResponses,
          calculatedScore,
          stageScores
        }
      })

      return res.status(200).json(processedCandidates)
    } else if (req.method === 'POST') {
      const { name, email, phone, position, testId, instagram } = req.body

      if (!name || !email || !testId) {
        return res.status(400).json({ error: 'Nome, email e ID do teste são obrigatórios' })
      }

      // Criar novo candidato
      const newCandidate = await prisma.candidate.create({
        data: {
          name,
          email,
          phone: phone || null,
          position: position || null,
          instagram: instagram || null,
          company: {
            connect: { id: session.user.companyId }
          },
          test: {
            connect: { id: testId }
          }
        }
      })

      return res.status(201).json(newCandidate)
    } else {
      return res.status(405).json({ error: 'Método não permitido' })
    }
  } catch (error) {
    console.error('Erro:', error)
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message })
  } finally {
    await prisma.$disconnect()
  }
}
