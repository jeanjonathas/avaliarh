import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/prisma';
import { Prisma, Status } from '@prisma/client';

// Tipo personalizado para o status de exibição na UI
type DisplayStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const { method } = req;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID do processo seletivo é obrigatório' });
  }

  // Verificar se o usuário pertence à empresa do processo
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email as string },
    select: { companyId: true, role: true },
  });

  if (!user || !user.companyId) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  // Verificar se o processo pertence à empresa do usuário
  const process = await prisma.selectionProcess.findUnique({
    where: { id },
    select: { companyId: true },
  });

  if (!process || process.companyId !== user.companyId) {
    return res.status(404).json({ message: 'Processo seletivo não encontrado' });
  }

  switch (method) {
    case 'GET':
      try {
        const processDetails = await prisma.selectionProcess.findUnique({
          where: { id },
          include: {
            stages: {
              orderBy: { order: 'asc' }
            },
            candidates: {
              include: {
                progresses: {
                  include: {
                    stage: true,
                  },
                },
              },
            },
          },
        });

        if (!processDetails) {
          return res.status(404).json({ message: 'Processo seletivo não encontrado' });
        }

        // Verificar se o processo tem um teste associado
        const processTest = await prisma.test.findFirst({
          where: {
            processStages: {
              some: {
                processId: id
              }
            }
          },
          select: {
            id: true,
            title: true
          }
        });

        // Transformar os dados dos candidatos para incluir o status geral
        const candidatesWithOverallStatus = processDetails.candidates.map(candidate => {
          // Calcular o status geral com base nos progressos
          const completedStages = candidate.progresses.filter(p => p.status === 'COMPLETED').length;
          const totalStages = processDetails.stages.length;
          
          // Criar um status personalizado para a UI
          let overallStatus = candidate.status;
          let displayStatus: DisplayStatus = candidate.status;
          
          // Se o candidato não tiver um status definido, determinar com base no progresso
          if (overallStatus === Status.PENDING && completedStages > 0) {
            // Mantemos o status original no banco de dados, mas exibimos um status personalizado na UI
            displayStatus = 'IN_PROGRESS';
          }
          
          return {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            status: candidate.status,
            createdAt: candidate.createdAt,
            inviteCode: candidate.inviteCode,
            testId: candidate.testId,
            overallStatus: displayStatus,
            progresses: candidate.progresses
          };
        });

        // Retornar o processo com os candidatos atualizados e o teste associado
        return res.status(200).json({
          ...processDetails,
          candidates: candidatesWithOverallStatus,
          test: processTest
        });
      } catch (error) {
        console.error('Erro ao buscar detalhes do processo seletivo:', error);
        return res.status(500).json({ message: 'Erro ao buscar detalhes do processo seletivo' });
      }

    case 'PUT':
      try {
        if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
          return res.status(403).json({ message: 'Acesso negado' });
        }

        const { name, description, cutoffScore, evaluationType, jobPosition, stages } = req.body;

        if (!name) {
          return res.status(400).json({ message: 'Nome do processo seletivo é obrigatório' });
        }

        if (!stages || !Array.isArray(stages) || stages.length === 0) {
          return res.status(400).json({ message: 'Pelo menos uma etapa é obrigatória' });
        }

        // Atualizar o processo seletivo
        const updatedProcess = await prisma.$transaction(async (tx) => {
          // Buscar as etapas existentes
          const existingStages = await tx.processStage.findMany({
            where: { processId: id },
            select: { id: true, order: true, name: true }
          });
          
          // Mapeamento de ordem para ID da etapa existente
          const existingStageMap = new Map();
          existingStages.forEach(stage => {
            existingStageMap.set(stage.order, stage.id);
          });
          
          // Atualizar o processo básico primeiro
          const updatedProcessData = await tx.selectionProcess.update({
            where: { id },
            data: {
              name,
              description,
              cutoffScore,
              evaluationType,
              jobPosition,
            },
          });
          
          // Para cada etapa no payload
          for (const stage of stages) {
            const existingStageId = existingStageMap.get(stage.order);
            
            if (existingStageId) {
              // Se existe uma etapa com essa ordem, atualizar
              await tx.processStage.update({
                where: { id: existingStageId },
                data: {
                  name: stage.name,
                  description: stage.description,
                  type: stage.type,
                  testId: stage.testId || null,
                  requestCandidatePhoto: typeof stage.requestCandidatePhoto === 'boolean' ? stage.requestCandidatePhoto : false,
                  showResultsToCandidate: typeof stage.showResultsToCandidate === 'boolean' ? stage.showResultsToCandidate : false
                }
              });
              
              // Remover da lista de etapas existentes que foram processadas
              existingStageMap.delete(stage.order);
            } else {
              // Se não existe, criar nova etapa
              await tx.processStage.create({
                data: {
                  processId: id,
                  name: stage.name,
                  description: stage.description,
                  order: stage.order,
                  type: stage.type,
                  testId: stage.testId || null,
                  requestCandidatePhoto: typeof stage.requestCandidatePhoto === 'boolean' ? stage.requestCandidatePhoto : false,
                  showResultsToCandidate: typeof stage.showResultsToCandidate === 'boolean' ? stage.showResultsToCandidate : false
                }
              });
            }
          }
          
          // Se sobraram etapas no mapa que não foram atualizadas, significa que foram removidas
          // Verificar se alguma dessas etapas tem progresso de candidato
          if (existingStageMap.size > 0) {
            const stageIdsToRemove = Array.from(existingStageMap.values());
            
            // Verificar se há progresso de candidato para essas etapas
            const progressCount = await tx.candidateProgress.count({
              where: {
                stageId: {
                  in: stageIdsToRemove
                }
              }
            });
            
            if (progressCount > 0) {
              // Se houver progresso, não excluir as etapas
              console.log(`Não é possível excluir ${stageIdsToRemove.length} etapas pois há ${progressCount} registros de progresso associados`);
            } else {
              // Se não houver progresso, excluir as etapas
              await tx.processStage.deleteMany({
                where: {
                  id: {
                    in: stageIdsToRemove
                  }
                }
              });
            }
          }
          
          // Retornar o processo atualizado com as etapas
          return tx.selectionProcess.findUnique({
            where: { id },
            include: {
              stages: {
                orderBy: { order: 'asc' },
              },
              candidates: {
                include: {
                  progresses: {
                    include: {
                      stage: true,
                    },
                  },
                },
              },
            },
          });
        });
        
        return res.status(200).json(updatedProcess);
      } catch (error) {
        console.error('Erro ao atualizar processo seletivo:', error);
        return res.status(500).json({ message: 'Erro ao atualizar processo seletivo' });
      }

    case 'DELETE':
      try {
        if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
          return res.status(403).json({ message: 'Acesso negado' });
        }

        // Executar todas as operações em uma transação
        await prisma.$transaction(async (tx) => {
          // Buscar as etapas do processo
          const existingStages = await tx.processStage.findMany({
            where: { processId: id },
            select: { id: true }
          });
          
          const stageIds = existingStages.map(stage => stage.id);
          
          // Buscar candidatos associados ao processo
          const candidates = await tx.candidate.findMany({
            where: { processId: id },
            select: { id: true }
          });
          
          const candidateIds = candidates.map(candidate => candidate.id);
          
          // 1. Excluir os registros de progresso dos candidatos relacionados às etapas
          if (stageIds.length > 0) {
            await tx.candidateProgress.deleteMany({
              where: { 
                stageId: { 
                  in: stageIds 
                } 
              }
            });
          }
          
          // 2. Excluir as respostas dos candidatos relacionadas ao processo
          if (candidateIds.length > 0 && stageIds.length > 0) {
            // Buscar respostas que pertencem aos candidatos deste processo
            await tx.response.deleteMany({
              where: {
                candidateId: {
                  in: candidateIds
                }
              }
            });
          }
          
          // 3. Atualizar candidatos para remover a associação com o processo
          if (candidateIds.length > 0) {
            await tx.candidate.updateMany({
              where: { 
                id: {
                  in: candidateIds
                }
              },
              data: { 
                processId: null,
                // Resetar outros campos relacionados ao processo se necessário
                score: null,
                timeSpent: null
              },
            });
          }
          
          // 4. Excluir as etapas do processo
          await tx.processStage.deleteMany({
            where: { processId: id },
          });
          
          // 5. Finalmente, excluir o processo seletivo
          await tx.selectionProcess.delete({
            where: { id },
          });
        });

        return res.status(200).json({ message: 'Processo seletivo excluído com sucesso' });
      } catch (error) {
        console.error('Erro ao excluir processo seletivo:', error);
        return res.status(500).json({ message: 'Erro ao excluir processo seletivo' });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ message: `Método ${method} não permitido` });
  }
}
