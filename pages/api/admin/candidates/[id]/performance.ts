import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { prisma } from '../../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req })
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user?.role as string)) {
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
                  options: true // Incluir as opções para analisar personalidades
                }
              }
            }
          }
        }
      })

      if (!candidate) {
        return res.status(404).json({ message: 'Candidato não encontrado' })
      }

      // Separar perguntas de múltipla escolha e perguntas opinativas
      const multipleChoiceResponses = candidate.responses.filter(r => {
        // Verificar se a pergunta tem opções corretas/incorretas
        const hasCorrectOptions = r.question?.options.some(opt => opt.isCorrect === true);
        return hasCorrectOptions;
      });
      
      const opinionResponses = candidate.responses.filter(r => {
        // Verificar se a pergunta não tem opções corretas/incorretas (todas as opções são válidas)
        const hasCorrectOptions = r.question?.options.some(opt => opt.isCorrect === true);
        return !hasCorrectOptions;
      });

      // Calcular estatísticas de desempenho para perguntas de múltipla escolha
      const totalQuestions = multipleChoiceResponses.length
      const correctAnswers = multipleChoiceResponses.filter(r => r.isCorrect).length
      const incorrectAnswers = totalQuestions - correctAnswers
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

      // Agrupar desempenho por etapa (apenas para perguntas de múltipla escolha)
      const stagePerformance = candidate.test?.testStages.map(testStage => {
        const stageResponses = multipleChoiceResponses.filter(
          r => r.question?.stageId === testStage.stage.id
        )
        
        const stageQuestions = stageResponses.length
        const stageCorrect = stageResponses.filter(r => r.isCorrect).length
        const stageAccuracy = stageQuestions > 0 ? (stageCorrect / stageQuestions) * 100 : 0
        
        return {
          stageId: testStage.stage.id,
          stageName: testStage.stage.title,
          totalQuestions: stageQuestions,
          correctAnswers: stageCorrect,
          incorrectAnswers: stageQuestions - stageCorrect,
          accuracy: stageAccuracy,
          weight: 1 // Valor padrão se não existir
        }
      }).filter(stage => stage.totalQuestions > 0) || [] // Filtrar apenas etapas com perguntas

      // Analisar personalidades/opiniões das perguntas opinativas
      const personalityAnalysis = analyzePersonalities(opinionResponses);

      // Calcular tempo médio por questão
      const avgTimePerQuestion = candidate.responses.length > 0 
        ? candidate.responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / candidate.responses.length 
        : 0

      // Calcular tempo total do teste
      const totalTime = candidate.timeSpent || 0

      return res.status(200).json({
        summary: {
          totalQuestions: candidate.responses.length,
          correctAnswers,
          incorrectAnswers,
          accuracy
        },
        stagePerformance,
        personalityAnalysis,
        opinionQuestionsCount: opinionResponses.length,
        multipleChoiceQuestionsCount: multipleChoiceResponses.length,
        avgTimePerQuestion,
        totalTime,
        testStartTime: candidate.testDate,
        testEndTime: candidate.completed ? new Date(candidate.testDate?.getTime() + (totalTime * 1000)) : null,
        showResults: true
      })
    }

    return res.status(405).json({ message: 'Método não permitido' })
  } catch (error) {
    console.error('Erro ao buscar desempenho do candidato:', error)
    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
}

// Função para analisar personalidades/opiniões das respostas
function analyzePersonalities(opinionResponses: any[]) {
  // Mapa para contar ocorrências de cada personalidade
  const personalityCount: Record<string, number> = {};
  let totalPersonalityResponses = 0;

  // Processar cada resposta opinativa
  opinionResponses.forEach(response => {
    // Encontrar a opção selecionada
    const selectedOption = response.question?.options.find(
      (opt: any) => opt.id === response.optionId || opt.text === response.optionText
    );
    
    if (selectedOption) {
      // Tentar extrair a personalidade da opção selecionada
      let personality = selectedOption.categoryName;
      
      // Se não houver categoryName, tentar extrair do texto da opção (entre parênteses)
      if (!personality) {
        const match = selectedOption.text.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          personality = match[1].trim();
        }
      }
      
      // Se encontrou uma personalidade, incrementar o contador
      if (personality) {
        personalityCount[personality] = (personalityCount[personality] || 0) + 1;
        totalPersonalityResponses++;
      }
    }
  });

  // Converter contagens em porcentagens e ordenar do maior para o menor
  const personalityPercentages = Object.entries(personalityCount).map(([trait, count]) => ({
    trait,
    count,
    percentage: totalPersonalityResponses > 0 
      ? Number(((count / totalPersonalityResponses) * 100).toFixed(1)) 
      : 0
  })).sort((a, b) => b.percentage - a.percentage);

  // Identificar a personalidade dominante
  const dominantPersonality = personalityPercentages.length > 0 
    ? personalityPercentages[0] 
    : { trait: 'Não identificado', count: 0, percentage: 0 };

  return {
    dominantPersonality,
    allPersonalities: personalityPercentages,
    totalResponses: totalPersonalityResponses
  };
}
