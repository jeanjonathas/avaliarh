import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { Status } from '@prisma/client';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o usuário está autenticado
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    console.log('Recebendo requisição para adicionar candidato ao processo:', req.body);
    const { name, email, phone, position, instagram, resumeUrl, requestPhoto, showResults, processId, candidateId } = req.body;
    
    if (!processId) {
      console.error('Erro: ID do processo é obrigatório');
      return res.status(400).json({ error: 'ID do processo é obrigatório' });
    }

    // Garantir que a conexão com o banco de dados esteja ativa
    await reconnectPrisma();

    // Buscar o processo seletivo para verificar se existe
    const process = await prisma.selectionProcess.findUnique({
      where: { id: processId },
      include: { 
        stages: {
          include: {
            test: true
          }
        } 
      }
    });

    if (!process) {
      return res.status(404).json({ error: 'Processo seletivo não encontrado' });
    }
    
    // Verificar se o processo tem uma etapa de teste e obter o testId
    let testId = null;
    if (process.stages && process.stages.length > 0) {
      // Encontrar a primeira etapa que tem um teste associado
      const testStage = process.stages.find(stage => stage.testId);
      if (testStage) {
        testId = testStage.testId;
        console.log(`Processo tem teste associado: ${testId}`);
      }
    }
    
    let candidate;
    
    // Verificar se estamos adicionando um candidato existente ou criando um novo
    if (candidateId) {
      // Adicionar candidato existente ao processo
      const existingCandidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        select: { id: true, processId: true, companyId: true }
      });
      
      if (!existingCandidate) {
        return res.status(404).json({ error: 'Candidato não encontrado' });
      }
      
      if (existingCandidate.processId === processId) {
        return res.status(400).json({ error: 'Candidato já está associado a este processo' });
      }
      
      if (existingCandidate.companyId !== process.companyId) {
        return res.status(403).json({ error: 'Candidato não pertence à mesma empresa do processo' });
      }
      
      // Atualizar o candidato para associá-lo ao processo
      candidate = await prisma.candidate.update({
        where: { id: candidateId },
        data: { 
          processId,
          testId: testId // Associar o testId se disponível
        }
      });
    } else {
      // Criar um novo candidato
      if (!name || !email) {
        console.error('Erro: Nome e email são obrigatórios para criar um novo candidato');
        return res.status(400).json({ error: 'Nome e email são obrigatórios para criar um novo candidato' });
      }
      
      // Preparar os dados do candidato
      const candidateData = {
        name,
        email,
        phone: phone || null,
        position: position || process.jobPosition, // Usar o cargo do processo seletivo se não for especificado
        status: Status.PENDING,
        completed: false,
        inviteAttempts: 0,
        inviteSent: false,
        testDate: new Date(),
        instagram: instagram || null,
        resumeUrl: resumeUrl || null,
        requestPhoto: requestPhoto !== undefined ? requestPhoto : true,
        showResults: showResults !== undefined ? showResults : true,
        processId, // Vincular ao processo seletivo
        testId: testId, // Associar o testId se disponível
        companyId: process.companyId, // Usar a mesma empresa do processo seletivo
        observations: JSON.stringify({
          requestPhoto: requestPhoto !== undefined ? requestPhoto : true,
          showResults: showResults !== undefined ? showResults : true
        })
      };
      
      console.log('Criando candidato com os dados:', candidateData);
      
      // Criar o candidato
      candidate = await prisma.candidate.create({
        data: candidateData,
      });
    }

    // Criar os progressos do candidato para cada etapa do processo (apenas se não existirem)
    const existingProgresses = await prisma.candidateProgress.findMany({
      where: {
        candidateId: candidate.id,
        stage: {
          processId
        }
      }
    });
    
    // Criar progressos apenas para as etapas que o candidato ainda não tem
    const existingStageIds = existingProgresses.map(p => p.stageId);
    const stagesToCreate = process.stages.filter(stage => !existingStageIds.includes(stage.id));
    
    if (stagesToCreate.length > 0) {
      const progressPromises = stagesToCreate.map(stage => 
        prisma.candidateProgress.create({
          data: {
            candidateId: candidate.id,
            stageId: stage.id,
            status: 'PENDING',
            companyId: process.companyId,
          }
        })
      );
  
      await Promise.all(progressPromises);
    }
    
    console.log('Candidato adicionado com sucesso ao processo:', candidate);
    
    return res.status(201).json(candidate);
  } catch (error) {
    console.error('Erro ao adicionar candidato ao processo:', error);
    return res.status(500).json({ 
      error: 'Erro ao adicionar candidato ao processo', 
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : null
    });
  }
}
