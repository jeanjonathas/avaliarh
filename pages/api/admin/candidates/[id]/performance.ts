import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import fetch from 'node-fetch';
import { 
  analyzePersonalitiesWithProcessData, 
  analyzePersonalitiesWithWeights,
  ProcessPersonalityData
} from '@/lib/personality-analysis';

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

      // Buscar dados de personalidade do processo, se o candidato estiver vinculado a um processo
      let processPersonalityData: ProcessPersonalityData | null = null;
      if (candidate.process?.id) {
        try {
          // Construir a URL para o endpoint de dados de personalidade do processo
          const processId = candidate.process.id;
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const url = `${baseUrl}/api/admin/processes/${processId}/personality-data`;
          
          console.log(`Buscando dados de personalidade do processo: ${url}`);
          
          const response = await fetch(url, {
            headers: {
              'Cookie': req.headers.cookie || '',
              'Authorization': req.headers.authorization || ''
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            processPersonalityData = data as ProcessPersonalityData;
            console.log('Dados de personalidade do processo obtidos com sucesso');
          } else {
            console.error(`Erro ao buscar dados de personalidade do processo: ${response.status}`);
          }
        } catch (error) {
          console.error('Erro ao buscar dados de personalidade do processo:', error);
        }
      }

      // Analisar personalidades usando os dados do processo, se disponíveis
      const personalityAnalysis = processPersonalityData 
        ? analyzePersonalitiesWithProcessData(opinionResponses, processPersonalityData)
        : analyzePersonalitiesWithWeights(opinionResponses, candidate.process?.stages);
      
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
        showResults: candidate.showResults,
        processPersonalityData // Incluir os dados de personalidade do processo na resposta
      })
    }

    return res.status(405).json({ message: 'Método não permitido' })
  } catch (error) {
    console.error('Erro ao buscar desempenho do candidato:', error)
    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
}
