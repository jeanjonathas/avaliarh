import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { Status } from '@prisma/client';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';

// Usar a instância global do Prisma para evitar múltiplas conexões

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o usuário está autenticado como administrador
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    console.log('Erro de autenticação: Sessão não encontrada');
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    // Garantir uma conexão fresca com o banco de dados
    await reconnectPrisma();
    
    console.log('Recebendo requisição para criar candidato:', req.body);
    const { name, email, phone, position, birthDate, instagram, resumeUrl, requestPhoto, showResults, processId, testId } = req.body;
    
    if (!name || !email) {
      console.error('Erro: Nome e email são obrigatórios');
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }
    
    // Obter o ID da empresa do usuário da sessão
    const userEmail = session.user?.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'Email do usuário não encontrado na sessão' });
    }
    
    // Buscar o usuário para obter o ID da empresa
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { companyId: true }
    });
    
    if (!user || !user.companyId) {
      return res.status(400).json({ error: 'Usuário não está associado a uma empresa' });
    }
    
    // Preparar os dados do candidato
    const candidateData = {
      name,
      email,
      phone: phone || null,
      position: position || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      status: Status.PENDING, // Usar o enum Status do Prisma
      completed: false,
      inviteAttempts: 0,
      inviteSent: false,
      testDate: new Date(), // Garantir que testDate seja definido
      instagram: instagram || null,
      resumeUrl: resumeUrl || null,
      requestPhoto: requestPhoto !== undefined ? requestPhoto : true,
      showResults: showResults !== undefined ? showResults : true,
      // Não armazenar as preferências como observações, pois já temos campos específicos
      observations: null,
      // Adicionar o ID da empresa do usuário
      companyId: user.companyId,
      // Adicionar processId e testId se fornecidos
      processId: processId || null,
      testId: testId || null
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
