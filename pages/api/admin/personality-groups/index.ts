import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    // Verificar autenticação
    if (!session) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Lidar com diferentes métodos HTTP
    if (req.method === 'GET') {
      try {
        console.log('Buscando grupos de personalidade...');
        
        // Obter o ID do processo, se fornecido
        const processId = req.query.processId as string;
        
        if (processId) {
          // Se temos um ID de processo, buscar grupos específicos desse processo
          console.log(`Buscando grupos de personalidade para o processo ${processId}`);
          
          const process = await prisma.selectionProcess.findUnique({
            where: { id: processId },
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
          });
          
          if (!process) {
            return res.status(404).json({ message: 'Processo não encontrado' });
          }
          
          // Extrair grupos de personalidade das etapas do processo
          const personalityGroups = [];
          const traitsByGroup = {};
          
          // Primeiro, identificar todos os traços e seus pesos
          const allTraits = [];
          
          process.stages.forEach(stage => {
            if (stage.personalityConfig) {
              if (Array.isArray(stage.personalityConfig.traitWeights)) {
                stage.personalityConfig.traitWeights.forEach(trait => {
                  allTraits.push({
                    name: trait.traitName,
                    weight: trait.weight,
                    order: trait.order,
                    groupId: 'default-group' // Usando um grupo padrão já que groupId não existe no modelo
                  });
                });
              }
            }
          });
          
          // Agrupar traços por groupId
          allTraits.forEach(trait => {
            if (!traitsByGroup[trait.groupId]) {
              traitsByGroup[trait.groupId] = [];
            }
            traitsByGroup[trait.groupId].push(trait);
          });
          
          // Criar grupos a partir dos traços agrupados
          Object.entries(traitsByGroup).forEach(([groupId, traits]) => {
            // Tentar encontrar o nome do grupo nas etapas do processo
            let groupName = 'Grupo de Personalidade';
            
            // Procurar o nome do grupo nas configurações de personalidade
            process.stages.forEach(stage => {
              if (stage.personalityConfig) {
                // Como traitGroups não existe no modelo, vamos usar uma abordagem alternativa
                // para determinar o nome do grupo
                if (groupId === 'technical-group') {
                  groupName = 'Competências Técnicas';
                } else if (groupId === 'behavioral-group') {
                  groupName = 'Competências Comportamentais';
                }
              }
            });
            
            // Adicionar o grupo com seus traços
            personalityGroups.push({
              id: groupId,
              name: groupName,
              traits: traits
            });
          });
          
          // Se não encontramos grupos, criar grupos padrão baseados em categorias comuns
          if (personalityGroups.length === 0 && allTraits.length > 0) {
            // Criar dois grupos padrão: Técnico e Comportamental
            const technicalGroup = {
              id: 'technical-group',
              name: 'Competências Técnicas',
              traits: []
            };
            
            const behavioralGroup = {
              id: 'behavioral-group',
              name: 'Competências Comportamentais',
              traits: []
            };
            
            // Distribuir os traços entre os grupos
            allTraits.forEach(trait => {
              // Palavras-chave para identificar traços técnicos
              const technicalKeywords = [
                'técnic', 'conhecimento', 'habilidade', 'resolução', 'agilidade', 
                'organização', 'atenção', 'detalhe', 'análise', 'planejamento'
              ];
              
              // Verificar se o nome do traço contém alguma palavra-chave técnica
              const isTechnical = technicalKeywords.some(keyword => 
                trait.name.toLowerCase().includes(keyword)
              );
              
              if (isTechnical) {
                technicalGroup.traits.push(trait);
              } else {
                behavioralGroup.traits.push(trait);
              }
            });
            
            // Adicionar apenas grupos que têm traços
            if (technicalGroup.traits.length > 0) {
              personalityGroups.push(technicalGroup);
            }
            
            if (behavioralGroup.traits.length > 0) {
              personalityGroups.push(behavioralGroup);
            }
          }
          
          console.log(`Encontrados ${personalityGroups.length} grupos de personalidade para o processo ${processId}`);
          
          return res.status(200).json(personalityGroups);
        } else {
          // Caso contrário, buscar todos os grupos de personalidade do sistema
          console.log('Buscando todos os grupos de personalidade do sistema');
          
          // Buscar todas as perguntas do tipo opinião múltipla com suas opções
          const questions = await prisma.question.findMany({
            where: {
              type: 'OPINION_MULTIPLE'
            },
            include: {
              options: true
            }
          });
          
          console.log(`Encontradas ${questions.length} perguntas opinativas`);
          
          // Extrair grupos de personalidade das opções
          const groupsMap = {};
          
          questions.forEach(question => {
            if (question.options && question.options.length > 0) {
              question.options.forEach(option => {
                if (option.emotionGroupId && option.categoryName) {
                  const groupId = option.emotionGroupId;
                  
                  if (!groupsMap[groupId]) {
                    groupsMap[groupId] = {
                      id: groupId,
                      name: option.emotionGroupId || `Grupo ${groupId.substring(0, 6)}`,
                      traits: []
                    };
                  }
                  
                  // Verificar se o traço já existe no grupo
                  const traitExists = groupsMap[groupId].traits.some(
                    t => t.name === option.categoryName
                  );
                  
                  if (!traitExists) {
                    groupsMap[groupId].traits.push({
                      name: option.categoryName,
                      weight: 1, // Peso padrão
                      order: groupsMap[groupId].traits.length + 1
                    });
                  }
                }
              });
            }
          });
          
          // Converter o mapa em array
          const personalityGroups = Object.values(groupsMap);
          
          // Se não encontramos grupos, criar grupos padrão
          if (personalityGroups.length === 0) {
            // Criar dois grupos padrão
            personalityGroups.push({
              id: 'technical-group',
              name: 'Competências Técnicas',
              traits: []
            });
            
            personalityGroups.push({
              id: 'behavioral-group',
              name: 'Competências Comportamentais',
              traits: []
            });
          }
          
          console.log(`Encontrados ${personalityGroups.length} grupos de personalidade no sistema`);
          
          return res.status(200).json(personalityGroups);
        }
      } catch (error) {
        console.error('Erro ao buscar grupos de personalidade:', error);
        return res.status(500).json({ message: 'Erro ao buscar grupos de personalidade', error: error.message });
      }
    } else {
      // Método não permitido
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ message: `Método ${req.method} não permitido` });
    }
  } catch (error) {
    console.error('Erro no handler de grupos de personalidade:', error);
    return res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
}
