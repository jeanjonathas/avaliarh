import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.user?.role as string)) {
      console.log('[AUTH ERROR] Não autenticado na API de pesos de opções');
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { testId } = req.query;

    if (!testId || typeof testId !== 'string') {
      return res.status(400).json({ message: 'ID do teste é obrigatório' });
    }

    if (req.method === 'GET') {
      // Buscar o teste e seu processo associado
      const test = await prisma.test.findUnique({
        where: { id: testId },
        include: {
          processStages: {
            include: {
              process: true,
              personalityConfig: {
                include: {
                  traitWeights: true
                }
              }
            }
          }
        }
      });

      if (!test) {
        return res.status(404).json({ message: 'Teste não encontrado' });
      }

      // Buscar todas as perguntas opinativas do teste
      const questions = await prisma.question.findMany({
        where: {
          stage: {
            testId: testId
          },
          type: 'OPINION_MULTIPLE'
        },
        include: {
          options: true
        }
      });

      // Mapear os pesos das opções
      const optionWeights: Record<string, number> = {};

      // Buscar os pesos configurados no processo seletivo
      const processStage = test.processStages[0]; // Assumindo que o teste está associado a um processo
      
      if (processStage?.personalityConfig?.traitWeights) {
        const traitWeights = processStage.personalityConfig.traitWeights;
        
        // Mapear os pesos dos traços de personalidade
        const traitWeightMap = new Map<string, number>();
        traitWeights.forEach(tw => {
          traitWeightMap.set(tw.traitName, tw.weight);
        });
        
        // Associar os pesos às opções com base nos traços de personalidade
        questions.forEach(question => {
          question.options.forEach(option => {
            if (option.categoryName && traitWeightMap.has(option.categoryName)) {
              // Se a opção tem uma categoria que corresponde a um traço configurado, usar o peso do traço
              optionWeights[option.id] = traitWeightMap.get(option.categoryName) || 1;
            } else {
              // Caso contrário, tentar determinar o peso pelo ID ou posição
              const lastChar = option.id.slice(-1);
              const optionNumber = parseInt(lastChar);
              if (!isNaN(optionNumber) && optionNumber >= 1 && optionNumber <= 5) {
                optionWeights[option.id] = optionNumber;
              } else {
                // Usar um valor padrão baseado na posição da opção na lista
                const index = question.options.findIndex(o => o.id === option.id);
                if (index !== -1) {
                  // Inverter o índice para que as últimas opções tenham peso maior
                  optionWeights[option.id] = Math.min(5, Math.max(1, question.options.length - index));
                } else {
                  // Último recurso: peso padrão
                  optionWeights[option.id] = 3;
                }
              }
            }
          });
        });
      } else {
        // Se não houver configuração de personalidade, usar uma heurística simples
        questions.forEach(question => {
          question.options.forEach(option => {
            // Tentar determinar o peso pelo ID ou posição
            const lastChar = option.id.slice(-1);
            const optionNumber = parseInt(lastChar);
            if (!isNaN(optionNumber) && optionNumber >= 1 && optionNumber <= 5) {
              optionWeights[option.id] = optionNumber;
            } else {
              // Usar um valor padrão baseado na posição da opção na lista
              const index = question.options.findIndex(o => o.id === option.id);
              if (index !== -1) {
                // Inverter o índice para que as últimas opções tenham peso maior
                optionWeights[option.id] = Math.min(5, Math.max(1, question.options.length - index));
              } else {
                // Último recurso: peso padrão
                optionWeights[option.id] = 3;
              }
            }
          });
        });
      }

      // Retornar os pesos das opções
      return res.status(200).json({ optionWeights });
    }

    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de pesos de opções:', error);
    return res.status(500).json({ message: 'Erro interno do servidor', error });
  }
}
