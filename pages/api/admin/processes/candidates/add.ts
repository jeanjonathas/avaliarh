import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { Status } from '@prisma/client';
import { authOptions } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

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
    const { name, email, phone, position, instagram, resumeUrl, requestPhoto, showResults, processId } = req.body;
    
    if (!name || !email || !processId) {
      console.error('Erro: Nome, email e ID do processo são obrigatórios');
      return res.status(400).json({ error: 'Nome, email e ID do processo são obrigatórios' });
    }

    // Buscar o processo seletivo para verificar se existe
    const process = await prisma.selectionProcess.findUnique({
      where: { id: processId },
      include: { stages: true }
    });

    if (!process) {
      return res.status(404).json({ error: 'Processo seletivo não encontrado' });
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
      companyId: process.companyId, // Usar a mesma empresa do processo seletivo
      observations: JSON.stringify({
        requestPhoto: requestPhoto !== undefined ? requestPhoto : true,
        showResults: showResults !== undefined ? showResults : true
      })
    };
    
    console.log('Criando candidato com os dados:', candidateData);
    
    // Criar o candidato
    const candidate = await prisma.candidate.create({
      data: candidateData,
    });

    // Criar os progressos do candidato para cada etapa do processo
    const progressPromises = process.stages.map(stage => 
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
