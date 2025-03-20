import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verificar a sessão do usuário (comentado para testes)
    // const session = await getServerSession(req, res, authOptions);
    // if (!session) {
    //   return res.status(401).json({ error: 'Não autorizado' });
    // }

    // Obter o ID do processo da URL
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID do processo é obrigatório' });
    }

    // Buscar o processo com suas etapas e configurações
    const process = await prisma.selectionProcess.findUnique({
      where: { id },
      include: {
        stages: {
          include: {
            personalityConfig: {
              include: {
                traitWeights: true
              }
            },
            test: true
          }
        }
      }
    });

    if (!process) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    // Buscar as etapas (stages) associadas aos testes dos processos
    const testIds = process.stages
      .filter(stage => stage.test)
      .map(stage => stage.test.id);

    // Buscar as questões opinativas de todos os testes
    const stagesWithQuestions = await prisma.stage.findMany({
      where: {
        testId: {
          in: testIds
        }
      },
      include: {
        questions: {
          where: {
            type: 'OPINION_MULTIPLE'
          },
          include: {
            options: true
          }
        }
      }
    });

    // Criar um mapa para armazenar os traços e seus pesos
    const traitsMap = new Map<string, { name: string, weight: number, categoryNameUuid: string }>();
    
    // Criar um mapa para armazenar os perfis esperados
    const expectedProfileMap = new Map<string, number>();
    
    // Flag para verificar se temos dados reais ou precisamos usar dados padrão
    let hasRealData = false;

    // Verificar se o processo tem um perfil esperado definido
    let expectedProfileFromProcess = null;
    if (process.expectedProfile) {
      try {
        expectedProfileFromProcess = typeof process.expectedProfile === 'string'
          ? JSON.parse(process.expectedProfile)
          : process.expectedProfile;
        
        // Adicionar os valores do perfil esperado ao mapa
        if (expectedProfileFromProcess && typeof expectedProfileFromProcess === 'object') {
          Object.entries(expectedProfileFromProcess).forEach(([trait, value]) => {
            if (typeof value === 'number') {
              expectedProfileMap.set(trait, value);
              hasRealData = true;
            }
          });
        }
      } catch (error) {
        console.error('Erro ao converter perfil esperado:', error);
      }
    }

    // Percorrer todas as etapas do processo
    const stages = process.stages || [];
    stages.forEach(stage => {
      // Verificar se a etapa tem configuração de personalidade
      const personalityConfig = stage.personalityConfig;
      if (personalityConfig && personalityConfig.traitWeights) {
        // Percorrer todos os pesos de traços
        personalityConfig.traitWeights.forEach(traitWeight => {
          // Se o traço já existe no mapa, manter o maior peso
          if (traitsMap.has(traitWeight.traitName)) {
            const existingTrait = traitsMap.get(traitWeight.traitName);
            if (traitWeight.weight > existingTrait.weight) {
              traitsMap.set(traitWeight.traitName, {
                name: traitWeight.traitName,
                weight: traitWeight.weight,
                categoryNameUuid: traitWeight.id // Usar o ID do traitWeight como categoryNameUuid
              });
            }
          } else {
            // Se o traço não existe, adicionar ao mapa
            traitsMap.set(traitWeight.traitName, {
              name: traitWeight.traitName,
              weight: traitWeight.weight,
              categoryNameUuid: traitWeight.id // Usar o ID do traitWeight como categoryNameUuid
            });
          }
          hasRealData = true;
        });
      }

      // Verificar se a etapa tem um teste associado
      if (stage.test && stage.test.expectedProfile) {
        try {
          const testExpectedProfile = typeof stage.test.expectedProfile === 'string'
            ? JSON.parse(stage.test.expectedProfile)
            : stage.test.expectedProfile;
          
          // Adicionar os valores do perfil esperado ao mapa
          if (testExpectedProfile && typeof testExpectedProfile === 'object') {
            Object.entries(testExpectedProfile).forEach(([trait, value]) => {
              if (typeof value === 'number') {
                // Se o traço já existe no mapa, manter o maior valor
                if (expectedProfileMap.has(trait)) {
                  const existingValue = expectedProfileMap.get(trait);
                  if (value > existingValue) {
                    expectedProfileMap.set(trait, value);
                  }
                } else {
                  // Se o traço não existe, adicionar ao mapa
                  expectedProfileMap.set(trait, value);
                }
                hasRealData = true;
              }
            });
          }
        } catch (error) {
          console.error('Erro ao converter perfil esperado do teste:', error);
        }
      }
    });

    // Processar as questões opinativas encontradas
    stagesWithQuestions.forEach(stage => {
      if (stage.questions && stage.questions.length > 0) {
        // Percorrer todas as perguntas opinativas
        stage.questions.forEach(question => {
          // Verificar se a pergunta tem opções
          if (question.options && question.options.length > 0) {
            // Extrair categorias únicas das opções
            const categories = new Set<string>();
            question.options.forEach(option => {
              if (option.categoryName) {
                categories.add(option.categoryName);
              }
            });
            
            // Adicionar cada categoria como um traço
            categories.forEach(category => {
              // Se o traço não existe no mapa, adicionar com peso padrão
              if (!traitsMap.has(category)) {
                // Encontrar o UUID da categoria
                let categoryUuid = '';
                for (const option of question.options) {
                  if (option.categoryName === category && option.categoryNameUuid) {
                    categoryUuid = option.categoryNameUuid;
                    break;
                  }
                }
                
                traitsMap.set(category, {
                  name: category,
                  weight: 1, // Peso padrão
                  categoryNameUuid: categoryUuid
                });
                hasRealData = true;
              }
            });
          }
        });
      }
    });

    // Converter os mapas para arrays
    const traits = Array.from(traitsMap.values());
    const expectedProfile = Object.fromEntries(expectedProfileMap.entries());

    // Se não temos dados reais, usar dados padrão
    if (!hasRealData) {
      // Dados padrão para demonstração
      const defaultTraits = [
        { name: 'Comunicação', weight: 3, categoryNameUuid: 'comm-uuid' },
        { name: 'Liderança', weight: 2, categoryNameUuid: 'lead-uuid' },
        { name: 'Criatividade', weight: 1, categoryNameUuid: 'creat-uuid' },
        { name: 'Trabalho em Equipe', weight: 3, categoryNameUuid: 'team-uuid' },
        { name: 'Resolução de Problemas', weight: 2, categoryNameUuid: 'prob-uuid' }
      ];
      
      const defaultExpectedProfile = {
        'Comunicação': 80,
        'Liderança': 70,
        'Criatividade': 60,
        'Trabalho em Equipe': 90,
        'Resolução de Problemas': 75
      };
      
      return res.status(200).json({
        traits: defaultTraits,
        expectedProfile: defaultExpectedProfile,
        isDefaultData: true
      });
    }

    // Retornar os traços e o perfil esperado
    return res.status(200).json({
      traits,
      expectedProfile: Object.keys(expectedProfile).length > 0 ? expectedProfile : null
    });
  } catch (error) {
    console.error('Erro ao buscar traços de personalidade:', error);
    return res.status(500).json({ message: `Erro ao buscar traços de personalidade: ${error.message}` });
  }
}
