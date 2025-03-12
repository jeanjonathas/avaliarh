import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { Status } from '@prisma/client';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

// Usar a instância global do Prisma para evitar múltiplas conexões

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o usuário está autenticado como administrador
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    console.log('Recebendo requisição para criar candidato:', req.body);
    const { name, email, phone, position, instagram, resumeUrl, requestPhoto, showResults } = req.body;
    
    if (!name || !email) {
      console.error('Erro: Nome e email são obrigatórios');
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }
    
    // Preparar os dados do candidato
    const candidateData = {
      name,
      email,
      phone: phone || null,
      position: position || null,
      status: Status.PENDING, // Usar o enum Status do Prisma
      completed: false,
      inviteAttempts: 0,
      inviteSent: false,
      testDate: new Date(), // Garantir que testDate seja definido
      instagram: instagram || null,
      resumeUrl: resumeUrl || null,
      requestPhoto: requestPhoto !== undefined ? requestPhoto : true,
      showResults: showResults !== undefined ? showResults : true,
      // Armazenar as preferências como observações em formato JSON
      observations: JSON.stringify({
        requestPhoto: requestPhoto !== undefined ? requestPhoto : true,
        showResults: showResults !== undefined ? showResults : true
      })
    };
    
    console.log('Criando candidato com os dados:', candidateData);
    
    // Criar o candidato sem código de convite
    // O código de convite será gerado posteriormente quando o usuário solicitar
    const candidate = await prisma.candidate.create({
      data: candidateData,
    });
    
    console.log('Candidato criado com sucesso:', candidate);
    
    // Verificar se o candidato foi criado corretamente
    const createdCandidate = await prisma.candidate.findUnique({
      where: { id: candidate.id },
    });
    
    if (!createdCandidate) {
      throw new Error('Candidato não encontrado após criação');
    }
    
    console.log('Candidato verificado após criação:', createdCandidate);
    
    return res.status(201).json(candidate);
  } catch (error) {
    console.error('Erro ao criar candidato:', error);
    return res.status(500).json({ 
      error: 'Erro ao criar candidato', 
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : null
    });
  }
}
