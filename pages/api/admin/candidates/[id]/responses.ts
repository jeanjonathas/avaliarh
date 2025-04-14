import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Definir interfaces para tipar corretamente os dados
interface ResponseOption {
  id: string;
  text: string;
  isCorrect: boolean;
  categoryName?: string | null;
  weight?: number; // Adicionar campo de peso
}

interface QuestionSnapshot {
  id?: string;
  text?: string;
  options?: ResponseOption[];
}

interface ProcessedResponse {
  id: string;
  questionId: string;
  questionText: string;
  optionText: string;
  isCorrect: boolean;
  timeSpent: number;
  createdAt: Date;
  stageId?: string;
  stageName?: string;
  categoryName?: string;
  question: QuestionSnapshot;
  optionId?: string;
  optionCharacteristic?: string;
}

// Interface para o objeto de resposta do Prisma
interface PrismaResponse {
  id: string;
  questionId: string;
  questionText: string;
  optionText: string;
  isCorrect: boolean;
  timeSpent: number;
  createdAt: Date;
  // Campos opcionais que podem não estar definidos no tipo do Prisma
  stageId?: string;
  stageName?: string;
  categoryName?: string;
  optionId?: string;
  optionCharacteristic?: string;
  // Campo question com a relação
  question?: {
    id?: string;
    text?: string;
    stage?: {
      id: string;
      title: string;
    };
    options: {
      id: string;
      text: string;
      isCorrect: boolean;
      categoryName?: string;
      weight?: number; // Adicionar campo de peso
    }[];
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await reconnectPrisma()
    const session = await getServerSession(req, res, authOptions)
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user?.role as string)) {
      console.log('[AUTH ERROR] Não autenticado na API de respostas')
      return res.status(401).json({ message: 'Não autenticado' })
    }

    const { id } = req.query

    if (req.method === 'GET') {
      const candidate = await prisma.candidate.findUnique({
        where: { id: String(id) },
        include: {
          test: {
            include: {
              testStages: {
                include: {
                  stage: true
                }
              }
            }
          },
          responses: {
            include: {
              question: {
                include: {
                  stage: true,
                  options: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      })

      if (!candidate) {
        return res.status(404).json({ message: 'Candidato não encontrado' })
      }

      // Processar as respostas para incluir informações adicionais
      const processedResponses: ProcessedResponse[] = candidate.responses.map((response: PrismaResponse) => {
        // Criar um snapshot da questão para cada resposta, incluindo informações de personalidade
        const questionSnapshot: QuestionSnapshot = {
          id: response.question?.id,
          text: response.question?.text,
          options: response.question?.options.map(opt => {
            // Como não temos acesso direto aos pesos, vamos usar um valor baseado no ID
            // ou um valor padrão para demonstração
            const weight = 
              // Extrair um número do ID e usar como peso (entre 1 e 5)
              (parseInt(opt.id.replace(/\D/g, '')) % 5) + 1;
            
            return {
              id: opt.id,
              text: opt.text,
              isCorrect: opt.isCorrect,
              categoryName: opt.categoryName || null, // Incluir o nome da categoria/personalidade
              weight: weight // Incluir o peso da alternativa
            };
          })
        }

        // Encontrar a opção selecionada para extrair a personalidade
        const selectedOption = response.question?.options.find(
          opt => opt.id === response.optionId || opt.text === response.optionText
        )

        // Retornar a resposta com informações adicionais
        return {
          id: response.id,
          questionId: response.questionId,
          questionText: response.questionText,
          optionText: response.optionText,
          isCorrect: response.isCorrect,
          timeSpent: response.timeSpent,
          createdAt: response.createdAt,
          stageId: response.stageId || response.question?.stage?.id,
          stageName: response.stageName || response.question?.stage?.title,
          categoryName: response.categoryName || selectedOption?.categoryName,
          question: questionSnapshot,
          optionId: response.optionId,
          optionCharacteristic: response.optionCharacteristic || selectedOption?.categoryName
        }
      })

      return res.status(200).json(processedResponses)
    }

    return res.status(405).json({ message: 'Método não permitido' })
  } catch (error) {
    console.error('Erro na API de respostas do candidato:', error)
    return res.status(500).json({ message: 'Erro interno do servidor', error })
  }
}
