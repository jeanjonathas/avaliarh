import { NextApiRequest, NextApiResponse } from 'next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Prisma } from '@prisma/client';

// Definir tipos para os dados de personalidade
interface TraitData {
  name: string;
  weight: number;
  categoryNameUuid?: string;
}

interface GroupData {
  id: string;
  name: string;
  traits: TraitData[];
}

// Definir tipo para o processo com suas etapas
interface ProcessWithStages {
  id: string;
  name: string;
  stages: Array<{
    id: string;
    name: string;
    personalityConfig?: {
      id: string;
      traitWeights: Array<{
        id: string;
        traitName: string;
        weight: number;
      }>;
    };
    test?: {
      id: string;
      name?: string;
    };
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verificar a sessão do usuário
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Reconectar o Prisma para garantir uma conexão fresca
    await reconnectPrisma();

    // Obter o ID do processo da URL
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID do processo é obrigatório' });
    }

    // Buscar o processo com suas etapas e configurações de personalidade
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
    }) as unknown as ProcessWithStages;

    if (!process) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    // Verificar se o processo tem etapas e configurações de personalidade
    if (!process.stages || process.stages.length === 0) {
      return res.status(200).json({
        groups: []
      });
    }

    // Extrair todos os traços de personalidade
    const allTraits: {
      id: string;
      traitName: string;
      weight: number;
      stageId: string;
      stageName: string;
      testName?: string;
    }[] = [];

    // Flag para verificar se encontramos pesos personalizados
    let hasCustomWeights = false;

    // Coletar todos os traços de todas as etapas
    process.stages.forEach(stage => {
      if (stage.personalityConfig && stage.personalityConfig.traitWeights && stage.personalityConfig.traitWeights.length > 0) {
        hasCustomWeights = true;
        stage.personalityConfig.traitWeights.forEach(trait => {
          if (trait.traitName) {
            allTraits.push({
              id: trait.id,
              traitName: trait.traitName,
              weight: trait.weight,
              stageId: stage.id,
              stageName: stage.name,
              testName: stage.test?.name
            });
          }
        });
      }
    });

    // Se não encontramos pesos personalizados, buscar os pesos padrão das questões
    if (!hasCustomWeights || allTraits.length === 0) {
      // Coletar os IDs dos testes associados ao processo
      const testIds = process.stages
        .filter(stage => stage.test)
        .map(stage => stage.test?.id)
        .filter(Boolean) as string[];

      if (testIds.length > 0) {
        // Buscar as etapas (stages) dos testes com suas questões opinativas
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

        // Extrair os traços e pesos das opções das questões
        stagesWithQuestions.forEach(stage => {
          stage.questions.forEach(question => {
            question.options.forEach(option => {
              if (option.categoryName && option.weight) {
                allTraits.push({
                  id: option.id,
                  traitName: option.categoryName,
                  weight: option.weight,
                  stageId: stage.id,
                  stageName: stage.title || 'Etapa sem nome',
                  testName: 'Teste padrão'
                });
              }
            });
          });
        });
      }
    }

    // Se ainda não temos traços, retornar array vazio
    if (allTraits.length === 0) {
      return res.status(200).json({
        groups: []
      });
    }

    // Agrupar os traços baseado em padrões no nome
    // Esta abordagem tenta identificar grupos baseados em prefixos comuns nos nomes dos traços
    const traitNamePatterns: Record<string, string[]> = {};
    
    // Primeiro passo: identificar padrões nos nomes dos traços
    allTraits.forEach(trait => {
      // Extrair possíveis prefixos (por exemplo, "cate" em "cate1", "cate2", etc.)
      const nameParts = trait.traitName.match(/^([a-zA-Z]+)(\d+|.+)$/);
      if (nameParts && nameParts.length >= 2) {
        const prefix = nameParts[1].toLowerCase();
        if (!traitNamePatterns[prefix]) {
          traitNamePatterns[prefix] = [];
        }
        if (!traitNamePatterns[prefix].includes(trait.traitName)) {
          traitNamePatterns[prefix].push(trait.traitName);
        }
      }
    });
    
    // Identificar grupos com base nos padrões encontrados
    const groups: GroupData[] = [];
    
    // Primeiro grupo: traços com prefixo "cate"
    if (traitNamePatterns['cate'] && traitNamePatterns['cate'].length > 0) {
      const cateTraits: TraitData[] = [];
      
      allTraits.forEach(trait => {
        if (trait.traitName.toLowerCase().startsWith('cate')) {
          cateTraits.push({
            name: trait.traitName,
            weight: trait.weight,
            categoryNameUuid: trait.id
          });
        }
      });
      
      if (cateTraits.length > 0) {
        // Ordenar por peso (do maior para o menor)
        cateTraits.sort((a, b) => b.weight - a.weight);
        
        groups.push({
          id: 'group-cate',
          name: 'Categorias',
          traits: cateTraits
        });
      }
    }
    
    // Segundo grupo: traços com "nome do traço"
    const nomeTraits: TraitData[] = [];
    
    allTraits.forEach(trait => {
      if (trait.traitName.toLowerCase().includes('nome do traço')) {
        nomeTraits.push({
          name: trait.traitName,
          weight: trait.weight,
          categoryNameUuid: trait.id
        });
      }
    });
    
    if (nomeTraits.length > 0) {
      // Ordenar por peso (do maior para o menor)
      nomeTraits.sort((a, b) => b.weight - a.weight);
      
      groups.push({
        id: 'group-nome',
        name: 'Traços Nomeados',
        traits: nomeTraits
      });
    }
    
    // Se não encontramos grupos específicos, criar um grupo com todos os traços
    if (groups.length === 0) {
      const allTraitsData: TraitData[] = allTraits.map(trait => ({
        name: trait.traitName,
        weight: trait.weight,
        categoryNameUuid: trait.id
      }));
      
      // Ordenar por peso (do maior para o menor)
      allTraitsData.sort((a, b) => b.weight - a.weight);
      
      groups.push({
        id: 'group-all',
        name: 'Todos os Traços',
        traits: allTraitsData
      });
    }
    
    // Calcular o perfil esperado para cada grupo
    const groupsWithExpectedProfile = groups.map(group => {
      const expectedProfile: Record<string, number> = {};
      const maxWeight = Math.max(...group.traits.map(trait => trait.weight));
      
      group.traits.forEach(trait => {
        const expectedValue = (trait.weight / maxWeight) * 100;
        expectedProfile[trait.name] = expectedValue;
      });
      
      return {
        ...group,
        expectedProfile
      };
    });

    return res.status(200).json({
      groups: groupsWithExpectedProfile
    });
  } catch (error) {
    console.error('Erro ao processar dados de personalidade:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar dados de personalidade',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    // Desconectar o Prisma para evitar conexões pendentes
    await prisma.$disconnect();
  }
}
