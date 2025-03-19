import { prisma } from '../prisma';

/**
 * Função utilitária para registrar ou atualizar o progresso de um candidato em uma etapa
 * Resolve o problema de foreign key ao buscar o ProcessStage correspondente ao Stage
 */
export async function registerCandidateProgress(
  candidateId: string,
  stageId: string,
  stageName: string
) {
  try {
    // Buscar o candidato para obter o companyId
    const candidateDetails = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { companyId: true }
    });
    
    if (!candidateDetails?.companyId) {
      console.error(`Não foi possível encontrar o companyId para o candidato ${candidateId}`);
      return {
        success: false,
        message: 'Candidato não encontrado ou sem companyId'
      };
    }
    
    // Buscar o ProcessStage correspondente ao Stage
    console.log(`Buscando ProcessStage correspondente para o Stage ${stageId} (nome: ${stageName})`);
    
    const processStage = await prisma.processStage.findFirst({
      where: {
        OR: [
          // Buscar pelo nome da etapa
          {
            name: {
              contains: stageName,
              mode: 'insensitive'
            }
          },
          // Ou buscar pelo processo associado ao candidato
          {
            process: {
              candidates: {
                some: {
                  id: candidateId
                }
              }
            }
          }
        ]
      }
    });
    
    console.log(`ProcessStage encontrado: ${processStage ? processStage.id : 'Nenhum'}`);
    
    if (!processStage) {
      console.warn(`Não foi encontrado um ProcessStage correspondente para o Stage ${stageId}. Marcando apenas o Stage como concluído.`);
      
      // Não podemos criar um CandidateProgress sem um ProcessStage válido,
      // mas podemos marcar o TestStage como concluído
      await prisma.testStage.updateMany({
        where: {
          stageId: stageId,
          test: {
            candidates: {
              some: {
                id: candidateId
              }
            }
          }
        },
        data: {
          updatedAt: new Date()
        }
      });
      
      return {
        success: true,
        message: 'Etapa marcada como concluída no TestStage',
        warning: 'Não foi possível criar um registro em CandidateProgress'
      };
    }
    
    // Verificar se já existe um registro de progresso para esta etapa
    const existingProgress = await prisma.candidateProgress.findFirst({
      where: {
        candidateId,
        stageId: processStage.id // Usar o ID do ProcessStage, não do Stage
      }
    });
    
    if (!existingProgress) {
      // Criar um novo registro de progresso usando o ID do ProcessStage
      await prisma.candidateProgress.create({
        data: {
          candidateId,
          stageId: processStage.id, // Usar o ID do ProcessStage, não do Stage
          status: 'COMPLETED',
          completed: true,
          completedAt: new Date(),
          companyId: candidateDetails.companyId
        }
      });
      console.log(`Progresso registrado para o candidato ${candidateId} na etapa ${processStage.id} (ProcessStage)`);
    } else {
      // Atualizar o registro existente
      await prisma.candidateProgress.update({
        where: { id: existingProgress.id },
        data: {
          status: 'COMPLETED',
          completed: true,
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`Progresso atualizado para o candidato ${candidateId} na etapa ${existingProgress.id}`);
    }
    
    return {
      success: true,
      message: 'Progresso registrado com sucesso'
    };
  } catch (error) {
    console.error('Erro ao registrar progresso:', error);
    return {
      success: false,
      message: 'Erro ao registrar progresso',
      error
    };
  }
}
