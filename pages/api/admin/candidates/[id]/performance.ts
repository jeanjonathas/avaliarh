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

      const personalityAnalysis = await analyzePersonalitiesWithWeights(opinionResponses, candidate.process?.stages);
      
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
      
      console.log(`Pontuação de múltipla escolha: ${multipleChoiceScore.toFixed(2)}%`);
      console.log(`Pontuação de perfil de personalidade: ${opinionScore.toFixed(2)}%`);
      
      // Verificar se a pontuação de personalidade está zerada quando deveria ter valor
      if (opinionResponses.length > 0 && opinionScore === 0) {
        console.log('ATENÇÃO: Pontuação de personalidade está zerada mesmo com respostas opinativas!');
        console.log('Detalhes da análise de personalidade:', JSON.stringify({
          traitsCount: personalityAnalysis.totalTraits,
          groupsCount: personalityAnalysis.groupCount,
          weightedScore: personalityAnalysis.weightedScore,
          groupScores: personalityAnalysis.groupScores
        }, null, 2));
      }
      
      // Calcular a pontuação geral com base nos pesos e na presença de cada tipo de questão
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
        console.log(`Pontuação geral: (${multipleChoiceScore.toFixed(2)} * ${multipleChoiceWeight}) + (${opinionScore.toFixed(2)} * ${opinionWeight}) = ${overallScore.toFixed(2)}`);
        
        // Verificar se a pontuação geral é consistente com as pontuações individuais
        const expectedMinScore = Math.min(multipleChoiceScore, opinionScore);
        const expectedMaxScore = Math.max(multipleChoiceScore, opinionScore);
        
        // Se a pontuação geral estiver fora do intervalo esperado, ajustar para a média simples
        if (overallScore < expectedMinScore * 0.9 || overallScore > expectedMaxScore * 1.1) {
          console.log(`Pontuação geral inconsistente (${overallScore.toFixed(2)}). Ajustando para média ponderada fixa.`);
          
          // Usar uma média ponderada fixa (60% múltipla escolha, 40% perfil de personalidade)
          // Isso garante que a pontuação geral fique entre as pontuações individuais
          overallScore = (multipleChoiceScore * 0.6) + (opinionScore * 0.4);
          
          console.log(`Nova pontuação geral: (${multipleChoiceScore.toFixed(2)} * 0.6) + (${opinionScore.toFixed(2)} * 0.4) = ${overallScore.toFixed(2)}`);
        }
      } else if (totalQuestions > 0) {
        // Se só temos questões de múltipla escolha
        overallScore = multipleChoiceScore;
        console.log(`Pontuação geral (apenas múltipla escolha): ${overallScore.toFixed(2)}`);
      } else if (opinionResponses.length > 0) {
        // Se só temos questões opinativas
        overallScore = opinionScore;
        console.log(`Pontuação geral (apenas opinativas): ${overallScore.toFixed(2)}`);
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

async function analyzePersonalitiesWithWeights(opinionResponses: any[], processStages?: any[]) {
  // Mapa para contar traços de personalidade
  const personalityCount: Record<string, number> = {};
  // Mapa para armazenar UUIDs dos traços
  const personalityUuids: Record<string, string> = {};
  // Mapa para armazenar IDs de grupo dos traços
  const personalityGroupIds: Record<string, string> = {};
  // Mapa para agrupar traços por grupo de personalidade
  const personalityByGroup: Record<string, Record<string, number>> = {};
  // Mapa para contar respostas por grupo
  const responseCountByGroup: Record<string, number> = {};
  // Mapa para armazenar informações sobre as alternativas de cada pergunta
  const questionOptions: Record<string, {totalOptions: number, weights: Record<string, number>}> = {};
  
  let totalPersonalityResponses = 0;

  console.log('Analisando respostas opinativas com pesos:', opinionResponses.length);
  
  // Obter pesos dos traços do processo seletivo
  const traitWeights: Record<string, number> = {};
  let hasTraitWeights = false;
  
  if (processStages && processStages.length > 0) {
    for (let i = 0; i < processStages.length; i++) {
      const stage = processStages[i];
      if (stage.personalityConfig && stage.personalityConfig.traitWeights) {
        // Adicionar log para depuração
        console.log(`Encontrados pesos de traços configurados na etapa "${stage.name}":`);
        
        for (let j = 0; j < stage.personalityConfig.traitWeights.length; j++) {
          const trait = stage.personalityConfig.traitWeights[j];
          traitWeights[trait.traitName.toLowerCase()] = trait.weight;
          hasTraitWeights = true;
          
          console.log(`  - Traço "${trait.traitName}": peso ${trait.weight}`);
        }
      }
    }
  }
  
  if (hasTraitWeights) {
    console.log('Usando pesos de traços configurados no processo seletivo');
  } else {
    console.log('Nenhum peso de traço configurado encontrado, usando pesos padrão');
  }

  // Obter informações sobre os grupos de personalidade do processo seletivo
  const personalityGroups: Record<string, {id: string, name: string, traits: string[]}> = {};
  
  // Tente identificar os grupos a partir da configuração do processo
  if (processStages && processStages.length > 0) {
    let processId = '';
    
    // Tentar obter o ID do processo a partir das etapas
    for (let i = 0; i < processStages.length; i++) {
      if (processStages[i].processId) {
        processId = processStages[i].processId;
        break;
      }
    }
    
    if (processId) {
      try {
        // Buscar grupos de personalidade da API
        console.log(`Buscando grupos de personalidade para o processo ${processId}`);
        
        // Fazer uma chamada para o endpoint de grupos de personalidade
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/personality-groups?processId=${processId}`);
        
        if (response.ok) {
          const groups = await response.json();
          console.log(`Recebidos ${groups.length} grupos de personalidade da API`);
          
          // Processar os grupos recebidos
          groups.forEach((group: any) => {
            personalityGroups[group.id] = {
              id: group.id,
              name: group.name,
              traits: group.traits.map((t: any) => t.name)
            };
            
            // Adicionar os pesos dos traços, se não estiverem definidos
            group.traits.forEach((trait: any) => {
              const traitNameLower = trait.name.toLowerCase();
              if (!traitWeights[traitNameLower] && trait.weight) {
                traitWeights[traitNameLower] = trait.weight;
                hasTraitWeights = true;
              }
            });
          });
        } else {
          console.error(`Erro ao buscar grupos de personalidade: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Erro ao buscar grupos de personalidade:', error);
      }
    }
    
    // Se não conseguimos obter os grupos da API, tentar extrair da configuração do processo
    if (Object.keys(personalityGroups).length === 0) {
      for (let i = 0; i < processStages.length; i++) {
        const stage = processStages[i];
        if (stage.personalityConfig && stage.personalityConfig.traitGroups) {
          // Se o processo tem grupos de traços definidos, use-os
          for (let j = 0; j < stage.personalityConfig.traitGroups.length; j++) {
            const group = stage.personalityConfig.traitGroups[j];
            if (group.id && group.name) {
              personalityGroups[group.id] = {
                id: group.id,
                name: group.name,
                traits: group.traits || []
              };
            }
          }
        } else if (stage.personalityConfig && stage.personalityConfig.traitWeights) {
          // Tente criar grupos a partir dos pesos de traços
          // Separar os traços em grupos técnicos e comportamentais
          const technicalTraits: string[] = [];
          const behavioralTraits: string[] = [];
          
          // Palavras-chave para identificar traços técnicos
          const technicalKeywords = [
            'técnic', 'conhecimento', 'habilidade', 'resolução', 'agilidade', 
            'organização', 'atenção', 'detalhe', 'análise', 'planejamento'
          ];
          
          stage.personalityConfig.traitWeights.forEach((trait: any) => {
            const traitName = trait.traitName;
            // Verificar se o nome do traço contém alguma palavra-chave técnica
            const isTechnical = technicalKeywords.some(keyword => 
              traitName.toLowerCase().includes(keyword)
            );
            
            if (isTechnical) {
              technicalTraits.push(traitName);
            } else {
              behavioralTraits.push(traitName);
            }
          });
          
          // Criar grupos técnicos e comportamentais
          if (technicalTraits.length > 0) {
            personalityGroups['technical-group'] = {
              id: 'technical-group',
              name: 'Competências Técnicas',
              traits: technicalTraits
            };
          }
          
          if (behavioralTraits.length > 0) {
            personalityGroups['behavioral-group'] = {
              id: 'behavioral-group',
              name: 'Competências Comportamentais',
              traits: behavioralTraits
            };
          }
        }
      }
    }
  }
  
  console.log('Grupos de personalidade encontrados no processo:', Object.keys(personalityGroups).length);
  for (const id in personalityGroups) {
    const group = personalityGroups[id];
    console.log(`Grupo ${id}: "${group.name}" - ${group.traits.length} traços`);
    if (group.traits.length > 0) {
      console.log(`  Traços: ${group.traits.join(', ')}`);
    }
  }
  
  // Se não encontramos grupos, criar um grupo padrão
  if (Object.keys(personalityGroups).length === 0) {
    personalityGroups['default-group'] = {
      id: 'default-group',
      name: 'Perfil de Personalidade',
      traits: []
    };
    console.log('Nenhum grupo encontrado, criando grupo padrão');
  }
  
  // Mapear traços para seus grupos
  const traitToGroupMap: Record<string, string> = {};
  
  // Preencher o mapa de traços para grupos
  for (const groupId in personalityGroups) {
    const group = personalityGroups[groupId];
    for (let i = 0; i < group.traits.length; i++) {
      const trait = group.traits[i];
      traitToGroupMap[trait.toLowerCase()] = groupId;
    }
  }

  // Primeiro passo: analisar todas as perguntas para determinar o número de alternativas
  for (let i = 0; i < opinionResponses.length; i++) {
    const response = opinionResponses[i];
    if (response.question?.options && Array.isArray(response.question.options)) {
      const questionId = response.question.id;
      
      if (!questionOptions[questionId]) {
        const options = response.question.options;
        const totalOptions = options.length;
        
        // Calcular os pesos ajustados para cada alternativa
        const weights: Record<string, number> = {};
        
        // Verificar se há pesos configurados para as opções
        let optionsWithConfiguredWeights = [];
        
        try {
          // Verificar cada opção individualmente para evitar erros
          for (let j = 0; j < options.length; j++) {
            const option = options[j];
            if (option && option.categoryName && typeof option.categoryName === 'string') {
              const categoryNameLower = option.categoryName.toLowerCase();
              if (traitWeights[categoryNameLower] !== undefined) {
                optionsWithConfiguredWeights.push(option);
              }
            }
          }
        } catch (error) {
          console.error('Erro ao verificar opções com pesos configurados:', error);
          optionsWithConfiguredWeights = [];
        }
        
        if (optionsWithConfiguredWeights.length > 0) {
          // Usar os pesos configurados no processo seletivo
          console.log(`Pergunta ${questionId}: Usando pesos configurados para as alternativas`);
          
          try {
            for (let j = 0; j < options.length; j++) {
              const option = options[j];
              if (option && option.id) {
                if (option.categoryName && typeof option.categoryName === 'string') {
                  const categoryNameLower = option.categoryName.toLowerCase();
                  const configuredWeight = traitWeights[categoryNameLower];
                  if (configuredWeight !== undefined) {
                    weights[option.id] = configuredWeight;
                  } else {
                    // Para opções sem peso configurado, usar o peso padrão baseado na posição
                    const position = j + 1;
                    weights[option.id] = calculateWeight(position, totalOptions);
                  }
                } else {
                  // Para opções sem categoria, usar o peso padrão baseado na posição
                  const position = j + 1;
                  weights[option.id] = calculateWeight(position, totalOptions);
                }
              }
            }
          } catch (error) {
            console.error('Erro ao atribuir pesos configurados:', error);
            // Fallback para cálculo baseado na posição
            for (let j = 0; j < options.length; j++) {
              const option = options[j];
              if (option && option.id) {
                const position = j + 1;
                weights[option.id] = calculateWeight(position, totalOptions);
              }
            }
          }
        } else {
          // Usar a fórmula para calcular os pesos baseados na posição
          try {
            for (let j = 0; j < options.length; j++) {
              const option = options[j];
              if (option && option.id) {
                const position = j + 1;
                const adjustedWeight = calculateWeight(position, totalOptions);
                weights[option.id] = adjustedWeight;
              }
            }
          } catch (error) {
            console.error('Erro ao calcular pesos baseados na posição:', error);
          }
        }
        
        questionOptions[questionId] = {
          totalOptions,
          weights
        };
        
        console.log(`Pergunta ${questionId}: ${totalOptions} alternativas, pesos ajustados:`, 
          Object.entries(weights).map(([id, weight]) => `${id.substring(0, 6)}: ${weight.toFixed(2)}`).join(', '));
      }
    }
  }

  // Processar cada resposta opinativa
  for (let i = 0; i < opinionResponses.length; i++) {
    const response = opinionResponses[i];
    const selectedOption = response.question?.options.find(
      (opt: any) => opt.id === response.optionId || opt.text === response.optionText
    );
    
    if (selectedOption) {
      let personality = selectedOption.categoryName;
      
      // Verificar se o traço de personalidade está definido
      if (!personality) {
        const match = selectedOption.text.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          personality = match[1].trim();
        } else {
          personality = selectedOption.text.split(' ').slice(0, 2).join(' ');
        }
      }
      
      if (personality) {
        // Determinar a qual grupo este traço pertence
        // 1. Verificar no mapa de traços para grupos
        let groupId = null;
        
        try {
          if (personality && typeof personality === 'string') {
            const personalityLower = personality.toLowerCase();
            groupId = traitToGroupMap[personalityLower];
          }
        } catch (error) {
          console.error(`Erro ao verificar grupo para o traço "${personality}":`, error);
        }
        
        // 2. Se não encontrar, verificar se a opção ou questão tem um grupo definido
        if (!groupId) {
          const emotionGroupId = selectedOption.emotionGroupId;
          const questionGroup = response.question?.group;
          
          if (emotionGroupId && personalityGroups[emotionGroupId]) {
            groupId = emotionGroupId;
          } else if (questionGroup && personalityGroups[questionGroup]) {
            groupId = questionGroup;
          } else {
            // 3. Se ainda não encontrou, usar o grupo padrão
            groupId = 'default-group';
          }
        }
        
        // Adicionar log para depuração
        console.log(`Questão ${response.question?.number || 'N/A'}: Traço "${personality}" atribuído ao grupo "${groupId}"`);
        
        const categoryNameUuid = selectedOption.categoryNameUuid || selectedOption.id;
        
        // Obter o peso ajustado da alternativa, se disponível
        let adjustedWeight = 1;
        const questionId = response.question?.id;
        
        if (questionId && questionOptions[questionId] && selectedOption.id) {
          adjustedWeight = questionOptions[questionId].weights[selectedOption.id] || 1;
        }
        
        // Incrementar contagem global, considerando o peso ajustado
        const traitLower = personality.toLowerCase();
        personalityCount[traitLower] = (personalityCount[traitLower] || 0) + 1; // Contagem sem peso
        
        // Armazenar o UUID associado a este traço de personalidade
        if (categoryNameUuid && !personalityUuids[traitLower]) {
          personalityUuids[traitLower] = categoryNameUuid;
        }
        
        // Armazenar o ID do grupo associado a este traço
        if (groupId && !personalityGroupIds[traitLower]) {
          personalityGroupIds[traitLower] = groupId;
        }
        
        // Agrupar por grupo de personalidade, sem considerar o peso ajustado para contagem
        if (!personalityByGroup[groupId]) {
          personalityByGroup[groupId] = {};
          responseCountByGroup[groupId] = 0;
        }
        
        personalityByGroup[groupId][traitLower] = (personalityByGroup[groupId][traitLower] || 0) + 1; // Contagem sem peso
        responseCountByGroup[groupId] += 1; // Contagem sem peso
        
        totalPersonalityResponses += 1; // Contagem sem peso
      }
    }
  }

  // Agrupar traços por grupo de personalidade (categoryNameUuid)
  const traitsByGroup: Record<string, PersonalityTrait[]> = {};
  const groupDetails: Record<string, any[]> = {};
  
  // Primeiro, agrupar todos os traços pelo ID do grupo
  for (const trait in personalityCount) {
    // Obter o ID do grupo para este traço
    const groupId = personalityGroupIds[trait] || 'default';
    
    // Inicializar o array de traços para este grupo se não existir
    if (!groupDetails[groupId]) {
      groupDetails[groupId] = [];
    }
    
    // Adicionar este traço ao grupo correspondente
    const weight = traitWeights[trait] || 1;
    groupDetails[groupId].push({
      trait,
      count: personalityCount[trait],
      score: (personalityCount[trait] / totalPersonalityResponses) * 100,
      weight
    });
  }
  
  console.log('Grupos de personalidade encontrados:', Object.keys(groupDetails).length);
  
  // Para cada grupo, calcular a pontuação com base nos pesos ajustados
  const groupScores: Record<string, number> = {};
  for (const groupId in groupDetails) {
    // Verificar se o grupo tem apenas um traço
    if (groupDetails[groupId].length === 1) {
      // Se o grupo tem apenas um traço, considerar o peso ajustado desse traço
      const trait = groupDetails[groupId][0];
      
      // Calcular a compatibilidade como uma porcentagem do peso máximo (5)
      // Compatibilidade (%) = (Peso / 5) × 100
      const compatibility = (trait.count / totalPersonalityResponses) * 100;
      groupScores[groupId] = Math.min(100, compatibility);
      
      console.log(`Grupo ${groupId}: ${groupDetails[groupId].length} traço(s) - "${groupDetails[groupId].map(t => t.trait).join(', ')}"`);
      console.log(`  Pontuação: ${compatibility.toFixed(1)}% (peso médio: ${(trait.count / totalPersonalityResponses * 5).toFixed(2)})`);
    } else {
      // Se o grupo tem múltiplos traços, calcular a média ponderada das compatibilidades
      let totalWeightedCompatibility = 0;
      let totalTraitResponses = 0;
      
      console.log(`Grupo ${groupId}: ${groupDetails[groupId].length} traço(s) - "${groupDetails[groupId].map(t => t.trait).join(', ')}"`);
      
      for (let i = 0; i < groupDetails[groupId].length; i++) {
        const trait = groupDetails[groupId][i];
        // Calcular a compatibilidade para este traço
        const traitCompatibility = (trait.count / totalPersonalityResponses) * 100;
        
        // Obter o peso correto do traço
        const traitLower = trait.trait.toLowerCase();
        const traitWeight = traitWeights[traitLower] || 1;
        
        console.log(`  - Traço "${trait.trait}": ${traitCompatibility.toFixed(1)}% (${trait.count} respostas, peso ${traitWeight})`);
        
        // Ponderar a compatibilidade pelo peso do traço e pelo número de respostas
        totalWeightedCompatibility += traitCompatibility * trait.count * traitWeight;
        totalTraitResponses += trait.count * traitWeight;
      }
      
      // Calcular a compatibilidade média ponderada para este grupo
      const groupCompatibility = totalTraitResponses > 0 
        ? totalWeightedCompatibility / totalTraitResponses 
        : 0;
      
      groupScores[groupId] = Math.min(100, groupCompatibility);
      
      console.log(`  Pontuação final: ${groupCompatibility.toFixed(1)}% (${totalTraitResponses.toFixed(1)} respostas ponderadas)`);
    }
  }
  
  // Calcular a média das pontuações de todos os grupos
  const groupIds = Object.keys(groupDetails);
  
  // Adicionar logs detalhados para depuração
  console.log('Resumo das pontuações por grupo:');
  for (let i = 0; i < groupIds.length; i++) {
    const groupId = groupIds[i];
    const traitsCount = groupDetails[groupId].length;
    console.log(`- Grupo ${groupId}: ${groupScores[groupId].toFixed(1)}% (${traitsCount} traços)`);
  }
  
  const averageGroupScore = groupIds.length > 0
    ? groupIds.reduce((sum, groupId) => sum + groupScores[groupId], 0) / groupIds.length
    : 0;
  
  console.log(`Média das pontuações dos grupos (${groupIds.length} grupos): ${averageGroupScore.toFixed(1)}%`);
  
  // Usar a média das pontuações dos grupos como pontuação final de personalidade
  const personalityScore = averageGroupScore;
  
  // Calcular percentuais e pontuações para todos os traços (para manter compatibilidade)
  const personalityPercentages = Object.entries(personalityCount).map(([trait, count]) => {
    const percentage = totalPersonalityResponses > 0 
      ? Number(((count / totalPersonalityResponses) * 100).toFixed(1)) 
      : 0;
    
    const traitLower = trait.toLowerCase();
    const weight = traitWeights[traitLower] || 1;
    
    const weightedScore = percentage * weight;
    
    return {
      trait,
      count,
      percentage,
      weight,
      weightedScore,
      categoryNameUuid: personalityUuids[traitLower] || null,
      groupId: personalityGroupIds[traitLower] || null // Adicionar o ID do grupo
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // Determinar o traço dominante (para manter compatibilidade)
  const dominantPersonality = personalityPercentages.length > 0 
    ? personalityPercentages[0] 
    : { 
        trait: 'Não identificado', 
        count: 0, 
        percentage: 0, 
        weight: 1, 
        weightedScore: 0,
        categoryNameUuid: null,
        groupId: null // Adicionar o ID do grupo
      };

  // Incluir o mapa de IDs de grupo na resposta
  return {
    dominantPersonality,
    allPersonalities: personalityPercentages,
    totalTraits: personalityPercentages.length,
    hasTraitWeights,
    weightedScore: personalityScore,
    groupScores,
    groupDetails,
    groupCount: groupIds.length,
    personalityGroupIds // Incluir o mapa de IDs de grupo
  };
}

interface PersonalityTrait {
  trait: string;
  count: number;
  score: number;
  weight: number;
}

function calculateWeight(position: number, totalOptions: number): number {
  const W_max = 5;
  const W_min = 1;
  
  if (totalOptions === 1) return W_max; // Se houver apenas uma opção, ela tem o peso máximo
  
  // Aplicar a fórmula de normalização: Peso = 5 - ((posição - 1) / (n_alternativas - 1)) × (5 - 1)
  const weight = W_max - ((position - 1) * (W_max - W_min)) / (totalOptions - 1);
  
  // Arredondar para 2 casas decimais para evitar problemas de precisão
  const roundedWeight = Math.round(weight * 100) / 100;
  
  // Garantir que o peso esteja dentro dos limites
  return Math.max(W_min, Math.min(W_max, roundedWeight));
}
