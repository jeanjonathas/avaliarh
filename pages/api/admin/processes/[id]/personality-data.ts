import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verificar a sessão do usuário
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

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
    });

    if (!process) {
      return res.status(404).json({ error: 'Processo não encontrado' });
    }

    // Encontrar todas as configurações de personalidade nas etapas
    const personalityConfigs = process.stages
      .filter(stage => stage.personalityConfig)
      .map(stage => stage.personalityConfig);

    // Se não houver configurações de personalidade, retornar dados vazios
    if (personalityConfigs.length === 0) {
      return res.status(200).json({
        traits: [],
        expectedProfile: null
      });
    }

    // Extrair todos os pesos de traços de personalidade
    const allTraitWeights = personalityConfigs.flatMap(config => 
      config?.traitWeights || []
    );

    // Agrupar e calcular pesos médios para cada traço
    const traitWeightMap = new Map();
    
    allTraitWeights.forEach(weight => {
      // Usar traitName em vez de trait
      const traitName = weight.traitName;
      if (!traitName) return;
      
      if (!traitWeightMap.has(traitName)) {
        traitWeightMap.set(traitName, {
          totalWeight: weight.weight || 1,
          count: 1
        });
      } else {
        const current = traitWeightMap.get(traitName);
        traitWeightMap.set(traitName, {
          totalWeight: current.totalWeight + (weight.weight || 1),
          count: current.count + 1
        });
      }
    });

    // Converter o mapa em um array de traços com seus pesos médios
    const traits = Array.from(traitWeightMap.entries()).map(([traitName, data]) => ({
      name: traitName,
      weight: data.totalWeight / data.count
    }));

    // Construir o perfil esperado (se houver)
    const expectedProfile = {};
    
    // Ordenar os traços por peso (do maior para o menor)
    traits.sort((a, b) => b.weight - a.weight);
    
    // Atribuir valores esperados com base no peso relativo
    const totalTraits = traits.length;
    traits.forEach((trait, index) => {
      // Valor esperado baseado na posição: traços mais importantes têm valores mais altos
      const expectedValue = ((totalTraits - index) / totalTraits) * 100;
      expectedProfile[trait.name] = Math.round(expectedValue);
    });

    return res.status(200).json({
      traits,
      expectedProfile: Object.keys(expectedProfile).length > 0 ? expectedProfile : null
    });
  } catch (error) {
    console.error('Erro ao processar dados de personalidade:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar dados de personalidade',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
