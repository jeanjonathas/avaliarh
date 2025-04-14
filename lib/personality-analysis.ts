// Interface para os dados de personalidade do processo
export interface ProcessPersonalityData {
  groups: Array<{
    id: string;
    name: string;
    traits: Array<{
      name: string;
      weight: number;
      categoryNameUuid?: string;
    }>;
    expectedProfile: Record<string, number>;
  }>;
}

// Função para analisar personalidades usando os dados do processo
export function analyzePersonalitiesWithProcessData(opinionResponses: any[], processData: ProcessPersonalityData) {
  const personalityCount: Record<string, number> = {};
  const personalityUuids: Record<string, string> = {}; // Para armazenar UUIDs dos traços
  let totalPersonalityResponses = 0;

  console.log('Analisando respostas opinativas com dados do processo:', opinionResponses.length);
  
  // Extrair todos os traços de personalidade do processo
  const allTraits: Record<string, { 
    weight: number, 
    categoryNameUuid?: string,
    groupId?: string,
    groupName?: string
  }> = {};
  
  // Mapear traços por grupo para calcular porcentagens dentro de cada grupo
  const groupTraits: Record<string, string[]> = {};
  
  processData.groups.forEach(group => {
    if (!groupTraits[group.id]) {
      groupTraits[group.id] = [];
    }
    
    group.traits.forEach(trait => {
      allTraits[trait.name] = {
        weight: trait.weight,
        categoryNameUuid: trait.categoryNameUuid,
        groupId: group.id,
        groupName: group.name
      };
      
      groupTraits[group.id].push(trait.name);
    });
  });
  
  // Contar as respostas por traço de personalidade
  opinionResponses.forEach(response => {
    const selectedOption = response.question?.options.find(
      (opt: any) => opt.id === response.optionId || opt.text === response.optionText
    );
    
    if (selectedOption) {
      let personality = selectedOption.categoryName;
      
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
        
        // Usar o UUID do traço do processo, se disponível
        if (allTraits[personality] && allTraits[personality].categoryNameUuid) {
          personalityUuids[personality] = allTraits[personality].categoryNameUuid!;
        } else if (selectedOption.categoryNameUuid) {
          personalityUuids[personality] = selectedOption.categoryNameUuid;
        }
        
        totalPersonalityResponses++;
      }
    }
  });

  // Contar respostas por grupo
  const groupResponseCounts: Record<string, number> = {};
  
  Object.entries(personalityCount).forEach(([trait, count]) => {
    const groupId = allTraits[trait]?.groupId;
    if (groupId) {
      groupResponseCounts[groupId] = (groupResponseCounts[groupId] || 0) + count;
    }
  });

  // Calcular percentagens e pontuações ponderadas
  const personalityPercentages = Object.entries(personalityCount).map(([trait, count]) => {
    // Calcular a porcentagem global (em relação a todas as respostas)
    const globalPercentage = totalPersonalityResponses > 0 
      ? Number(((count / totalPersonalityResponses) * 100).toFixed(1)) 
      : 0;
    
    // Calcular a porcentagem dentro do grupo (se o traço pertencer a um grupo)
    const groupId = allTraits[trait]?.groupId;
    const groupResponseCount = groupId ? groupResponseCounts[groupId] || 0 : 0;
    const groupPercentage = groupResponseCount > 0
      ? Number(((count / groupResponseCount) * 100).toFixed(1))
      : 0;
    
    // Usar o peso do traço do processo, se disponível
    const weight = allTraits[trait] ? allTraits[trait].weight : 1;
    
    // Calcular a pontuação ponderada com base no peso e no perfil esperado
    // Se o traço tem peso máximo (5), sua pontuação deve ser 100%
    const maxWeight = groupId 
      ? Math.max(...processData.groups.find(g => g.id === groupId)?.traits.map(t => t.weight) || [1])
      : 5;
    
    const weightScore = maxWeight > 0 ? (weight / maxWeight) * 100 : 0;
    
    return {
      trait,
      count,
      percentage: groupPercentage, // Usar a porcentagem do grupo como a principal
      globalPercentage, // Manter a porcentagem global como referência
      weight,
      // A pontuação ponderada agora representa a porcentagem do peso máximo
      weightedScore: Number(weightScore.toFixed(1)),
      categoryNameUuid: personalityUuids[trait] || null,
      groupId: allTraits[trait]?.groupId || null,
      groupName: allTraits[trait]?.groupName || null
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // Obter todos os traços dominantes em caso de empate
  const dominantPersonalities = personalityPercentages.length > 0
    ? personalityPercentages.filter(p => p.percentage === personalityPercentages[0].percentage)
    : [];

  // Calcular traços dominantes por grupo
  const dominantPersonalitiesByGroup: Record<string, any> = {};
  
  // Primeiro, agrupar os traços por grupo
  const traitsByGroup: Record<string, any[]> = {};
  
  personalityPercentages.forEach(trait => {
    if (trait.groupId) {
      if (!traitsByGroup[trait.groupId]) {
        traitsByGroup[trait.groupId] = [];
      }
      traitsByGroup[trait.groupId].push(trait);
    }
  });
  
  // Depois, encontrar o traço dominante em cada grupo
  Object.entries(traitsByGroup).forEach(([groupId, traits]) => {
    if (traits.length > 0) {
      // Ordenar por porcentagem dentro do grupo (maior para menor)
      const sortedTraits = [...traits].sort((a, b) => b.percentage - a.percentage);
      dominantPersonalitiesByGroup[groupId] = sortedTraits[0];
    }
  });

  // Calcular a pontuação ponderada geral
  // Agora baseada na média das pontuações ponderadas dos traços
  let weightedScore = 0;
  
  if (personalityPercentages.length > 0) {
    weightedScore = personalityPercentages.reduce((sum, p) => sum + p.weightedScore, 0) / personalityPercentages.length;
  }

  return {
    dominantPersonalities,
    dominantPersonalitiesByGroup,
    allPersonalities: personalityPercentages,
    totalResponses: totalPersonalityResponses,
    hasTraitWeights: Object.keys(allTraits).length > 0,
    weightedScore: Number(weightedScore.toFixed(1))
  };
}

// Função original mantida para compatibilidade
export function analyzePersonalitiesWithWeights(opinionResponses: any[], processStages?: any[]) {
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
    
    // Calcular a pontuação ponderada corretamente
    // Se o traço tem peso máximo (5), sua pontuação deve ser 100%
    const maxWeight = 5; // Peso máximo padrão
    const weightScore = (weight / maxWeight) * 100;
    
    return {
      trait,
      count,
      percentage,
      weight,
      weightedScore: Number(weightScore.toFixed(1)),
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

  // Calcular a pontuação ponderada geral
  // Agora baseada na média das pontuações ponderadas dos traços
  let weightedScore = 0;
  
  if (personalityPercentages.length > 0) {
    weightedScore = personalityPercentages.reduce((sum, p) => sum + p.weightedScore, 0) / personalityPercentages.length;
  }

  return {
    dominantPersonality,
    allPersonalities: personalityPercentages,
    totalResponses: totalPersonalityResponses,
    hasTraitWeights,
    weightedScore: Number(weightedScore.toFixed(1))
  };
}
