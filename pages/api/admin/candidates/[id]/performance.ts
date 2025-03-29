import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

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
    await reconnectPrisma()
    const session = await getServerSession(req, res, authOptions)
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user?.role as string)) {
      console.log('[AUTH ERROR] Não autenticado na API de performance')
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

      // Garantir que temos respostas antes de calcular o tempo total
      const hasResponses = Array.isArray(candidate.responses) && candidate.responses.length > 0;
      
      // Calcular o tempo total em segundos
      const responseTotalTimeSeconds = hasResponses 
        ? candidate.responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) 
        : 0;
      
      console.log('Tempo total calculado em segundos:', responseTotalTimeSeconds);
      
      // Calcular o tempo médio por questão em segundos
      const avgTimePerQuestionSeconds = hasResponses && candidate.responses.length > 0
        ? responseTotalTimeSeconds / candidate.responses.length
        : 0;
      
      console.log('Tempo médio por questão em segundos:', avgTimePerQuestionSeconds);
      
      // Converter de segundos para minutos para manter a compatibilidade com a interface
      // Garantir que sempre temos um valor, mesmo que seja zero
      const totalTimeMinutes = Math.max(0, responseTotalTimeSeconds / 60);
      
      console.log('Tempo total em minutos:', totalTimeMinutes);

      const multipleChoiceScore = accuracy;
      const opinionScore = personalityAnalysis.weightedScore || 0;
      
      // Calcular a pontuação geral com base nos pesos definidos no processo seletivo
      let overallScore = 0;
      
      // Verificar se temos configurações de peso para o processo
      let multipleChoiceWeight = 0.5; // Peso padrão para questões de múltipla escolha
      let opinionWeight = 0.5; // Peso padrão para questões opinativas
      
      // Tentar obter os pesos definidos no processo seletivo
      if (candidate.process?.stages && candidate.process.stages.length > 0) {
        // Procurar por configurações de peso nas etapas do processo
        const processConfig = candidate.process.stages.find(
          (stage: any) => stage.personalityConfig && stage.personalityConfig.multipleChoiceWeight !== undefined
        );
        
        if (processConfig) {
          console.log('Configuração de pesos encontrada no processo seletivo');
          multipleChoiceWeight = processConfig.personalityConfig.multipleChoiceWeight || 0.5;
          opinionWeight = processConfig.personalityConfig.opinionWeight || 0.5;
          
          // Garantir que os pesos somam 1
          const totalWeight = multipleChoiceWeight + opinionWeight;
          if (totalWeight !== 0) {
            multipleChoiceWeight = multipleChoiceWeight / totalWeight;
            opinionWeight = opinionWeight / totalWeight;
          }
          
          console.log(`Pesos ajustados: Múltipla escolha=${multipleChoiceWeight}, Opinativa=${opinionWeight}`);
        }
      }
      
      // Calcular a pontuação geral com base nos pesos e na presença de cada tipo de questão
      if (totalQuestions > 0 && opinionResponses.length > 0) {
        // Se temos ambos os tipos de questões, usar os pesos
        overallScore = (multipleChoiceScore * multipleChoiceWeight) + (opinionScore * opinionWeight);
        console.log(`Pontuação geral: (${multipleChoiceScore} * ${multipleChoiceWeight}) + (${opinionScore} * ${opinionWeight}) = ${overallScore}`);
      } else if (totalQuestions > 0) {
        // Se só temos questões de múltipla escolha
        overallScore = multipleChoiceScore;
        console.log(`Pontuação geral (apenas múltipla escolha): ${overallScore}`);
      } else if (opinionResponses.length > 0) {
        // Se só temos questões opinativas
        overallScore = opinionScore;
        console.log(`Pontuação geral (apenas opinativas): ${overallScore}`);
      }

      // Calcular a data de término com base na data de início e no tempo real gasto
      // Usamos o tempo em segundos (responseTotalTimeSeconds) para maior precisão
      const testEndTime = candidate.completed && candidate.testDate 
        ? new Date(candidate.testDate.getTime() + (responseTotalTimeSeconds * 1000))
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
        avgTimePerQuestion: avgTimePerQuestionSeconds, // Tempo médio em segundos
        totalTime: responseTotalTimeSeconds, // Tempo total em segundos
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
  // Mapa para contar traços de personalidade
  const personalityCount: Record<string, number> = {};
  // Mapa para armazenar UUIDs dos traços
  const personalityUuids: Record<string, string> = {};
  // Mapa para agrupar traços por grupo de personalidade
  const personalityByGroup: Record<string, Record<string, number>> = {};
  // Mapa para contar respostas por grupo
  const responseCountByGroup: Record<string, number> = {};
  
  let totalPersonalityResponses = 0;

  console.log('Analisando respostas opinativas com pesos:', opinionResponses.length);
  
  // Processar cada resposta opinativa
  opinionResponses.forEach(response => {
    const selectedOption = response.question?.options.find(
      (opt: any) => opt.id === response.optionId || opt.text === response.optionText
    );
    
    if (selectedOption) {
      let personality = selectedOption.categoryName;
      // Usar o UUID do grupo ou gerar um ID único se não existir
      const groupId = selectedOption.emotionGroupId || selectedOption.categoryNameUuid || 'default';
      const categoryNameUuid = selectedOption.categoryNameUuid || selectedOption.id;
      
      // Extrair o nome do traço de personalidade se não estiver explícito
      if (!personality) {
        const match = selectedOption.text.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          personality = match[1].trim();
        } else {
          personality = selectedOption.text.split(' ').slice(0, 2).join(' ');
        }
      }
      
      if (personality) {
        // Incrementar contagem global
        personalityCount[personality] = (personalityCount[personality] || 0) + 1;
        
        // Armazenar o UUID associado a este traço de personalidade
        if (categoryNameUuid && !personalityUuids[personality]) {
          personalityUuids[personality] = categoryNameUuid;
        }
        
        // Agrupar por grupo de personalidade
        if (!personalityByGroup[groupId]) {
          personalityByGroup[groupId] = {};
          responseCountByGroup[groupId] = 0;
        }
        
        personalityByGroup[groupId][personality] = (personalityByGroup[groupId][personality] || 0) + 1;
        responseCountByGroup[groupId]++;
        
        totalPersonalityResponses++;
      }
    }
  });

  // Obter pesos dos traços do processo seletivo
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

  // Calcular percentuais e pontuações para todos os traços (para manter compatibilidade)
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
      categoryNameUuid: personalityUuids[trait] || null
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // Calcular pontuações por grupo
  const groupScores: Record<string, number> = {};
  const groupDetails: Record<string, any[]> = {};
  
  // Para cada grupo de personalidade
  Object.entries(personalityByGroup).forEach(([groupId, traitCounts]) => {
    const groupResponseCount = responseCountByGroup[groupId];
    
    // Calcular percentuais e pontuações para este grupo
    const groupTraits = Object.entries(traitCounts).map(([trait, count]) => {
      const percentage = groupResponseCount > 0 
        ? Number(((count / groupResponseCount) * 100).toFixed(1)) 
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
        groupId,
        categoryNameUuid: personalityUuids[trait] || null
      };
    }).sort((a, b) => b.percentage - a.percentage);
    
    // Calcular pontuação ponderada para este grupo
    const totalWeightedScore = groupTraits.reduce((sum, p) => sum + p.weightedScore, 0);
    const maxPossibleScore = groupTraits.reduce((sum, p) => sum + (p.percentage * 5), 0);
    
    const groupWeightedScore = maxPossibleScore > 0 
      ? (totalWeightedScore / maxPossibleScore) * 100 
      : 0;
    
    groupScores[groupId] = Number(groupWeightedScore.toFixed(1));
    groupDetails[groupId] = groupTraits;
    
    console.log(`Grupo ${groupId}: pontuação ${groupScores[groupId]}%, ${groupTraits.length} traços`);
  });
  
  // Calcular a média das pontuações de todos os grupos
  const groupIds = Object.keys(groupScores);
  const averageGroupScore = groupIds.length > 0
    ? groupIds.reduce((sum, groupId) => sum + groupScores[groupId], 0) / groupIds.length
    : 0;
  
  console.log(`Média das pontuações dos grupos (${groupIds.length} grupos): ${averageGroupScore.toFixed(1)}%`);

  // Determinar o traço dominante (para manter compatibilidade)
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

  // Usar a média das pontuações dos grupos como pontuação final
  // Se não houver grupos identificados, usar o cálculo antigo
  const weightedScore = groupIds.length > 0
    ? Number(averageGroupScore.toFixed(1))
    : Number((personalityPercentages.reduce((sum, p) => sum + p.weightedScore, 0) / 
             Math.max(1, personalityPercentages.reduce((sum, p) => sum + (p.percentage * 5), 0)) * 100).toFixed(1));

  return {
    dominantPersonality,
    allPersonalities: personalityPercentages,
    totalResponses: totalPersonalityResponses,
    hasTraitWeights,
    weightedScore,
    groupScores,
    groupDetails,
    groupCount: groupIds.length
  };
}
