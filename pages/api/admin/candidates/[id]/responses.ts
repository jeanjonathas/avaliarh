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

// Função para gerar um peso baseado no ID da opção (entre 1 e 5)
function generateWeightFromId(id: string): number {
  // Extrair apenas os números do ID
  const numericPart = id.replace(/\D/g, '');
  // Se não houver números, usar um valor aleatório
  if (!numericPart) {
    return Math.floor(Math.random() * 5) + 1;
  }
  // Converter para número e pegar o módulo 5 + 1 (para ter valores entre 1 e 5)
  return (parseInt(numericPart) % 5) + 1;
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
      const processedResponses: ProcessedResponse[] = await Promise.all(candidate.responses.map(async (response: PrismaResponse) => {
        // Criar um snapshot da questão para cada resposta, incluindo informações de personalidade
        const questionOptions = await Promise.all((response.question?.options || []).map(async (opt) => {
          // Determinar o tipo de questão
          const questionType = 
            // Tentar obter o tipo da questão de várias maneiras
            (response.question as any)?.type || 
            // Se a questão tem uma característica de opção, provavelmente é opinativa
            (response.optionCharacteristic ? 'OPINION_MULTIPLE' : 'MULTIPLE_CHOICE');
          
          // Usar o peso real da opção se disponível, caso contrário usar um fallback
          let weight: number;
          
          if (opt.weight) {
            // Se a opção já tem um peso definido, usar esse valor
            weight = opt.weight;
          } else {
            // Gerar um peso baseado no ID da opção (entre 1 e 5)
            // Para opções com IDs terminados em 1, 2, 3, 4, 5 - usar esses valores como peso
            const optionNumber = parseInt(opt.id.slice(-1));
            if (!isNaN(optionNumber) && optionNumber >= 1 && optionNumber <= 5) {
              weight = optionNumber;
            } else {
              // Caso contrário, gerar um peso baseado no ID
              weight = generateWeightFromId(opt.id);
            }
            
            // Se for uma pergunta opinativa e o texto da opção contiver indicações de peso
            if (questionType === 'OPINION_MULTIPLE') {
              // Verificar se o texto da opção contém indicações de peso (ex: "Concordo totalmente (5)")
              const weightMatch = opt.text.match(/\((\d+)\)$/);
              if (weightMatch && weightMatch[1]) {
                const parsedWeight = parseInt(weightMatch[1]);
                if (!isNaN(parsedWeight) && parsedWeight >= 1 && parsedWeight <= 5) {
                  weight = parsedWeight;
                }
              }
            }
          }
          
          return {
            id: opt.id,
            text: opt.text,
            isCorrect: opt.isCorrect,
            categoryName: opt.categoryName || null, // Incluir o nome da categoria/personalidade
            weight: weight // Incluir o peso da alternativa
          };
        }));
        
        const questionSnapshot: QuestionSnapshot = {
          id: response.question?.id,
          text: response.question?.text,
          options: questionOptions
        };

        // Encontrar a opção selecionada para extrair a personalidade
        const selectedOption = response.question?.options.find(
          opt => opt.id === response.optionId || opt.text === response.optionText
        );

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
        };
      }));
      
      // Processar as respostas e analisar os traços de personalidade
      const opinionResponses = processedResponses.filter(r => 
        r.optionCharacteristic || 
        (r.question.options && r.question.options.some(o => o.categoryName))
      );
      
      const multipleChoiceResponses = processedResponses.filter(r => 
        r.isCorrect !== undefined && !opinionResponses.includes(r)
      );
      
      console.log(`Número de respostas opinativas: ${opinionResponses.length}`);
      console.log(`Número de respostas de múltipla escolha: ${multipleChoiceResponses.length}`);
      
      // Agrupar respostas por etapa
      const responsesByStage: Record<string, ProcessedResponse[]> = {};
      processedResponses.forEach(response => {
        const stageId = response.stageId || 'unknown';
        if (!responsesByStage[stageId]) {
          responsesByStage[stageId] = [];
        }
        responsesByStage[stageId].push(response);
      });
      
      // Calcular pontuação para perguntas de múltipla escolha por etapa
      const stageScores: Record<string, { total: number, correct: number, percentage: number, stageName: string }> = {};
      
      for (const [stageId, responses] of Object.entries(responsesByStage)) {
        const multipleChoiceInStage = responses.filter(r => 
          r.isCorrect !== undefined && !opinionResponses.includes(r)
        );
        
        if (multipleChoiceInStage.length === 0) {
          console.log(`Etapa ${responses[0]?.stageName || stageId} não tem perguntas de múltipla escolha - ignorando`);
          continue;
        }
        
        const correctCount = multipleChoiceInStage.filter(r => r.isCorrect).length;
        const percentage = multipleChoiceInStage.length > 0 
          ? (correctCount / multipleChoiceInStage.length) * 100 
          : 0;
        
        stageScores[stageId] = {
          total: multipleChoiceInStage.length,
          correct: correctCount,
          percentage,
          stageName: responses[0]?.stageName || 'Desconhecida'
        };
      }
      
      // Analisar respostas opinativas para traços de personalidade
      const personalityTraits: Record<string, { 
        count: number, 
        percentage: number,
        weight: number,
        weightedScore: number,
        categoryNameUuid?: string
      }> = {};
      
      // Verificar se temos respostas opinativas com pesos
      const opinionResponsesWithWeights = opinionResponses.filter(r => {
        const selectedOption = r.question.options?.find(
          o => o.id === r.optionId || o.text === r.optionText
        );
        return selectedOption && selectedOption.weight;
      });
      
      console.log(`Analisando respostas opinativas com pesos: ${opinionResponsesWithWeights.length}`);
      
      // Agrupar traços por UUID para calcular médias por grupo
      const traitsByUuid: Record<string, { 
        trait: string, 
        count: number, 
        totalWeight: number,
        categoryNameUuid: string
      }> = {};
      
      // Contar respostas por grupo para calcular porcentagens corretamente
      const responsesByGroup: Record<string, number> = {};
      
      let hasTraitWeights = false;
      
      opinionResponses.forEach(response => {
        const selectedOption = response.question.options?.find(
          o => o.id === response.optionId || o.text === response.optionText
        );
        
        if (selectedOption) {
          const trait = selectedOption.categoryName || response.optionCharacteristic || 'Desconhecido';
          const weight = selectedOption.weight || 1;
          const categoryNameUuid = response.stageId || 'default';
          
          // Incrementar contador de respostas para este grupo
          if (!responsesByGroup[categoryNameUuid]) {
            responsesByGroup[categoryNameUuid] = 0;
          }
          responsesByGroup[categoryNameUuid]++;
          
          if (weight > 1) {
            hasTraitWeights = true;
          }
          
          if (!traitsByUuid[`${trait}-${categoryNameUuid}`]) {
            traitsByUuid[`${trait}-${categoryNameUuid}`] = {
              trait,
              count: 0,
              totalWeight: 0,
              categoryNameUuid
            };
          }
          
          traitsByUuid[`${trait}-${categoryNameUuid}`].count++;
          traitsByUuid[`${trait}-${categoryNameUuid}`].totalWeight += weight;
          
          if (!personalityTraits[trait]) {
            personalityTraits[trait] = {
              count: 0,
              percentage: 0,
              weight: 0,
              weightedScore: 0,
              categoryNameUuid
            };
          }
          
          personalityTraits[trait].count++;
          personalityTraits[trait].weight = Math.max(personalityTraits[trait].weight, weight);
          personalityTraits[trait].categoryNameUuid = categoryNameUuid;
        }
      });
      
      // Calcular a pontuação ponderada para cada traço e por grupo
      const totalResponses = opinionResponses.length;
      let totalWeightedScore = 0;
      
      // Calcular a média de peso por grupo de traços
      const groupAverages: Record<string, number> = {};
      
      Object.entries(traitsByUuid).forEach(([key, data]) => {
        const { trait, count, totalWeight, categoryNameUuid } = data;
        
        // Calcular a média de peso para este traço neste grupo
        const averageWeight = totalWeight / count;
        
        // Adicionar à média do grupo
        if (!groupAverages[categoryNameUuid]) {
          groupAverages[categoryNameUuid] = 0;
          groupAverages[categoryNameUuid] = averageWeight;
        } else {
          // Acumular para calcular a média depois
          groupAverages[categoryNameUuid] += averageWeight;
        }
        
        // Atualizar a porcentagem e pontuação ponderada
        if (personalityTraits[trait]) {
          // Calcular a porcentagem com base no número de respostas do grupo específico
          const groupResponseCount = responsesByGroup[categoryNameUuid] || 1;
          personalityTraits[trait].percentage = Math.round((count / groupResponseCount) * 100);
          personalityTraits[trait].weightedScore = Math.min(100, Math.round((averageWeight / 5) * 100));
        }
      });
      
      // Calcular a média final por grupo
      const groupCounts: Record<string, number> = {};
      Object.entries(traitsByUuid).forEach(([key, data]) => {
        const { categoryNameUuid } = data;
        if (!groupCounts[categoryNameUuid]) {
          groupCounts[categoryNameUuid] = 0;
        }
        groupCounts[categoryNameUuid]++;
      });
      
      // Calcular a média final por grupo
      Object.entries(groupAverages).forEach(([uuid, total]) => {
        groupAverages[uuid] = total / (groupCounts[uuid] || 1);
      });
      
      // Calcular a pontuação ponderada total (média de todos os grupos)
      if (Object.keys(groupAverages).length > 0) {
        // Calcular a compatibilidade para cada grupo (máximo 100%)
        const groupCompatibilities: Record<string, number> = {};
        
        Object.entries(groupAverages).forEach(([uuid, avgWeight]) => {
          // Converter o peso médio (1-5) para porcentagem (0-100%)
          const groupCompatibility = Math.min(100, Math.round((avgWeight / 5) * 100));
          groupCompatibilities[uuid] = groupCompatibility;
          console.log(`Grupo ${uuid}: Peso médio = ${avgWeight}, Compatibilidade = ${groupCompatibility}%`);
        });
        
        // Calcular a média das compatibilidades de todos os grupos
        const totalGroupCompatibility = Object.values(groupCompatibilities).reduce((sum, comp) => sum + comp, 0);
        const overallCompatibility = totalGroupCompatibility / Object.keys(groupCompatibilities).length;
        
        // Garantir que o valor final esteja entre 0 e 100
        totalWeightedScore = Math.min(100, Math.round(overallCompatibility));
        
        console.log(`Compatibilidades dos grupos: ${JSON.stringify(groupCompatibilities)}`);
        console.log(`Média das compatibilidades: ${totalWeightedScore}%`);
      }
      
      // Ordenar os traços por contagem (do maior para o menor)
      const sortedTraits = Object.entries(personalityTraits)
        .map(([trait, data]) => ({
          trait,
          ...data
        }))
        .sort((a, b) => b.count - a.count);
      
      // Identificar o traço dominante
      const dominantPersonality = sortedTraits.length > 0 ? sortedTraits[0] : null;
      
      // Construir o objeto de análise de personalidade
      const personalityAnalysis = {
        dominantPersonality,
        allPersonalities: sortedTraits,
        totalResponses,
        hasTraitWeights,
        weightedScore: totalWeightedScore
      };
      
      console.log('Análise de Personalidade:', JSON.stringify(personalityAnalysis, null, 2));
      
      // Retornar as respostas processadas e a análise de personalidade
      return res.status(200).json({
        responses: processedResponses,
        personalityAnalysis,
        stageScores
      });
    }

    return res.status(405).json({ message: 'Método não permitido' })
  } catch (error) {
    console.error('Erro na API de respostas do candidato:', error)
    return res.status(500).json({ message: 'Erro interno do servidor', error })
  }
}
