import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { prisma } from '../../../../../lib/prisma'
import { Prisma } from '@prisma/client'

// Tipo estendido para o candidato com as propriedades necessárias
interface ExtendedCandidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  testDate: Date;
  completed: boolean;
  timeSpent?: number;
  showResults?: boolean;
  test?: any;
  process?: any;
  responses: any[];
  [key: string]: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req })
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user?.role as string)) {
      return res.status(401).json({ message: 'Não autenticado' })
    }

    const { id } = req.query

    if (req.method === 'GET') {
      // Definir include com tipagem estendida
      const include: any = {
        test: {
          include: {
            testStages: {
              include: {
                stage: true
              }
            }
          }
        },
        process: {
          include: {
            stages: {
              include: {
                personalityConfig: {
                  include: {
                    traitWeights: true
                  }
                }
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
          }
        }
      }

      const candidateData = await prisma.candidate.findUnique({
        where: { id: String(id) },
        include
      })

      if (!candidateData) {
        return res.status(404).json({ message: 'Candidato não encontrado' })
      }
      
      // Converter para o tipo estendido
      const candidate = candidateData as unknown as ExtendedCandidate;

      const opinionResponses = candidate.responses?.filter(
        r => r.question?.type === 'OPINION_MULTIPLE'
      ) || [];
      
      const multipleChoiceResponses = candidate.responses?.filter(
        r => r.question?.type === 'MULTIPLE_CHOICE'
      ) || [];
      
      console.log('Número de respostas opinativas:', opinionResponses.length)
      console.log('Número de respostas de múltipla escolha:', multipleChoiceResponses.length)

      const totalQuestions = multipleChoiceResponses.length
      const correctAnswers = multipleChoiceResponses.filter(r => r.isCorrect).length
      const incorrectAnswers = totalQuestions - correctAnswers
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

      const stagePerformance = candidate.test?.testStages.map(testStage => {
        const stageMultipleChoiceResponses = multipleChoiceResponses.filter(
          r => r.question?.stageId === testStage.stage.id
        );
        
        if (stageMultipleChoiceResponses.length === 0) {
          console.log(`Etapa ${testStage.stage.title} não tem perguntas de múltipla escolha - ignorando`);
          return null; 
        }
        
        console.log(`Etapa ${testStage.stage.title} tem ${stageMultipleChoiceResponses.length} perguntas de múltipla escolha - incluindo`);
        
        const stageQuestions = stageMultipleChoiceResponses.length;
        const stageCorrect = stageMultipleChoiceResponses.filter(r => r.isCorrect).length;
        const stageAccuracy = stageQuestions > 0 ? (stageCorrect / stageQuestions) * 100 : 0;
        
        const stageTotalTime = stageMultipleChoiceResponses.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
        const stageAvgTime = stageQuestions > 0 ? stageTotalTime / stageQuestions : 0;
        
        return {
          stageId: testStage.stage.id,
          stageName: testStage.stage.title,
          totalQuestions: stageQuestions,
          correctAnswers: stageCorrect,
          incorrectAnswers: stageQuestions - stageCorrect,
          accuracy: stageAccuracy,
          weight: 1, 
          stageType: 'MULTIPLE_CHOICE', 
          avgTimePerQuestion: stageAvgTime,
          totalTime: stageTotalTime
        }
      }).filter(stage => stage !== null) || [] 

      const personalityAnalysis = analyzePersonalitiesWithWeights(opinionResponses, candidate.process?.stages);
      
      console.log('Análise de Personalidade:', JSON.stringify(personalityAnalysis, null, 2));
      console.log('Número de perguntas opinativas:', opinionResponses.length);
      console.log('Número de perguntas de múltipla escolha:', multipleChoiceResponses.length);

      const avgTimePerQuestion = candidate.responses?.length > 0 
        ? candidate.responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / candidate.responses.length 
        : 0

      // Calcular o tempo total com base nas respostas reais
      // Em vez de usar candidate.timeSpent, vamos calcular com base nas respostas
      console.log('Calculando tempo total com base nas respostas individuais:');
      
      // Ordenar respostas por data para análise
      const sortedResponses = [...(candidate.responses || [])].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
      
      // Registrar informações detalhadas sobre cada resposta
      sortedResponses.forEach((r, index) => {
        console.log(`Resposta ${index + 1}:`, {
          pergunta: r.question?.text?.substring(0, 30) + '...',
          tipo: r.question?.type,
          tempoGasto: r.timeSpent || 0,
          tempoGastoFormatado: `${Math.floor((r.timeSpent || 0) / 60)}min ${(r.timeSpent || 0) % 60}s`,
          dataHora: r.createdAt ? new Date(r.createdAt).toISOString() : 'N/A'
        });
      });
      
      const responseTotalTime = candidate.responses?.reduce((sum, r) => sum + (r.timeSpent || 0), 0) || 0;
      
      // Converter de segundos para minutos para manter a compatibilidade com a interface
      const totalTime = Math.round(responseTotalTime / 60);
      
      console.log('Tempo total calculado a partir das respostas (segundos):', responseTotalTime);
      console.log('Tempo total calculado a partir das respostas (minutos):', totalTime);
      console.log('Tempo total armazenado no candidato (minutos):', candidate.timeSpent || 0);
      
      // Verificar se há uma grande discrepância
      if (Math.abs(totalTime - (candidate.timeSpent || 0)) > 5) {
        console.log('ALERTA: Grande discrepância detectada entre o tempo calculado e o tempo armazenado!');
      }

      const multipleChoiceScore = accuracy;
      const opinionScore = personalityAnalysis.weightedScore || 0;
      
      let overallScore = 0;
      if (totalQuestions > 0 && opinionResponses.length > 0) {
        overallScore = (multipleChoiceScore * 0.5) + (opinionScore * 0.5);
      } else if (totalQuestions > 0) {
        overallScore = multipleChoiceScore;
      } else if (opinionResponses.length > 0) {
        overallScore = opinionScore;
      }

      // Calcular a data de término com base na data de início e no tempo real gasto
      // Usamos o tempo em segundos (responseTotalTime) para maior precisão
      const testEndTime = candidate.completed && candidate.testDate 
        ? new Date(candidate.testDate.getTime() + (responseTotalTime * 1000))
        : null;

      return res.status(200).json({
        summary: {
          totalQuestions: candidate.responses?.length || 0,
          correctAnswers,
          incorrectAnswers,
          accuracy,
          multipleChoiceScore,
          opinionScore,
          overallScore
        },
        stagePerformance,
        personalityAnalysis,
        opinionQuestionsCount: opinionResponses.length,
        multipleChoiceQuestionsCount: multipleChoiceResponses.length,
        avgTimePerQuestion,
        totalTime,
        testStartTime: candidate.testDate,
        testEndTime,
        showResults: candidate.showResults
      })
    }

    return res.status(405).json({ message: 'Método não permitido' })
  } catch (error) {
    console.error('Erro ao buscar desempenho do candidato:', error)
    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
}

function analyzePersonalitiesWithWeights(opinionResponses: any[], processStages?: any[]) {
  const personalityCount: Record<string, number> = {};
  const personalityUuids: Record<string, string> = {}; // Para armazenar UUIDs dos traços
  let totalPersonalityResponses = 0;

  console.log('Analisando respostas opinativas com pesos:', opinionResponses.length);
  
  opinionResponses.forEach(response => {
    const selectedOption = response.question?.options.find(
      (opt: any) => opt.id === response.optionId || opt.text === response.optionText
    );
    
    if (selectedOption) {
      let personality = selectedOption.categoryName;
      const categoryNameUuid = selectedOption.categoryNameUuid || selectedOption.id;
      
      if (!personality) {
        const match = selectedOption.text.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          personality = match[1].trim();
        } else {
          personality = selectedOption.text.split(' ').slice(0, 2).join(' ');
        }
      }
      
      if (personality) {
        personalityCount[personality] = (personalityCount[personality] || 0) + 1;
        // Armazenar o UUID associado a este traço de personalidade
        if (categoryNameUuid && !personalityUuids[personality]) {
          personalityUuids[personality] = categoryNameUuid;
        }
        totalPersonalityResponses++;
      }
    }
  });

  const traitWeights: Record<string, number> = {};
  let hasTraitWeights = false;
  
  if (processStages && processStages.length > 0) {
    processStages.forEach(stage => {
      if (stage.personalityConfig && stage.personalityConfig.traitWeights) {
        stage.personalityConfig.traitWeights.forEach((trait: any) => {
          traitWeights[trait.traitName.toLowerCase()] = trait.weight;
          hasTraitWeights = true;
        });
      }
    });
  }

  const personalityPercentages = Object.entries(personalityCount).map(([trait, count]) => {
    const percentage = totalPersonalityResponses > 0 
      ? Number(((count / totalPersonalityResponses) * 100).toFixed(1)) 
      : 0;
    
    const traitLower = trait.toLowerCase();
    const weight = hasTraitWeights ? (traitWeights[traitLower] || 1) : 1;
    
    const weightedScore = percentage * weight;
    
    return {
      trait,
      count,
      percentage,
      weight,
      weightedScore,
      categoryNameUuid: personalityUuids[trait] || null // Incluir o UUID do traço
    };
  }).sort((a, b) => b.percentage - a.percentage);

  const dominantPersonality = personalityPercentages.length > 0 
    ? personalityPercentages[0] 
    : { 
        trait: 'Não identificado', 
        count: 0, 
        percentage: 0, 
        weight: 1, 
        weightedScore: 0,
        categoryNameUuid: null 
      };

  const totalWeightedScore = personalityPercentages.reduce((sum, p) => sum + p.weightedScore, 0);
  const maxPossibleScore = personalityPercentages.reduce((sum, p) => sum + (p.percentage * 5), 0); 
  
  const weightedScore = maxPossibleScore > 0 ? (totalWeightedScore / maxPossibleScore) * 100 : 0;

  return {
    dominantPersonality,
    allPersonalities: personalityPercentages,
    totalResponses: totalPersonalityResponses,
    hasTraitWeights,
    weightedScore: Number(weightedScore.toFixed(1))
  };
}
