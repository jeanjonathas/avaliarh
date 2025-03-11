import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { sendInviteEmail } from '../../../../lib/email';

const prisma = new PrismaClient();

// Função para gerar código de 4 dígitos aleatórios
async function generateUniqueInviteCode(): Promise<string> {
  let isUnique = false;
  let inviteCode = '';
  
  while (!isUnique) {
    // Gerar um novo código
    inviteCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Verificar se o código já está em uso por algum candidato
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        inviteCode: inviteCode
      }
    });
    
    // Verificar se o código já foi usado anteriormente (histórico)
    const usedInviteCode = await prisma.usedInviteCode.findUnique({
      where: {
        code: inviteCode
      }
    });
    
    // O código é único se não existir nenhum candidato com ele e não estiver no histórico
    if (!existingCandidate && !usedInviteCode) {
      isUnique = true;
    }
  }
  
  return inviteCode;
}

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
    const { candidateId, expirationDays = 7, sendEmail = false, forceNew = false, testId } = req.body;
    
    if (!candidateId) {
      return res.status(400).json({ 
        success: false,
        error: 'ID do candidato é obrigatório' 
      });
    }
    
    if (!testId) {
      return res.status(400).json({ 
        success: false,
        error: 'ID do teste é obrigatório. Selecione um teste para gerar o convite.' 
      });
    }
    
    // Verificar se o teste existe
    const testExists = await prisma.tests.findUnique({
      where: { id: testId }
    });
    
    if (!testExists) {
      return res.status(400).json({ 
        success: false,
        error: 'O teste selecionado não existe. Por favor, selecione um teste válido.' 
      });
    }
    
    // Buscar o candidato
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidato não encontrado' });
    }
    
    // Calcular a data de expiração (padrão: 7 dias a partir de agora)
    const inviteExpires = new Date();
    inviteExpires.setDate(inviteExpires.getDate() + expirationDays);
    
    let inviteCode: string;
    let message: string;
    
    // Se o candidato já tem um código válido e não expirado, reutilizá-lo
    // Mas sempre atualizamos o testId, mesmo se o código for reutilizado
    if (candidate.inviteCode && 
        candidate.inviteExpires && 
        new Date(candidate.inviteExpires) > new Date() && 
        !forceNew) {
      inviteCode = candidate.inviteCode;
      message = 'Código de convite existente recuperado com sucesso! O teste associado foi atualizado.';
    } else {
      // Se o candidato já tinha um código, salvar no histórico antes de gerar um novo
      if (candidate.inviteCode) {
        try {
          await prisma.usedInviteCode.create({
            data: {
              code: candidate.inviteCode,
              usedAt: new Date(),
              expiresAt: candidate.inviteExpires || new Date(new Date().setDate(new Date().getDate() + 7))
            }
          });
          console.log(`Código anterior ${candidate.inviteCode} salvo no histórico`);
        } catch (error) {
          // Se o código já estiver no histórico, apenas ignorar o erro
          console.log(`Código ${candidate.inviteCode} já existe no histórico ou erro ao salvar`);
        }
      }
      
      // Gerar um novo código único
      inviteCode = await generateUniqueInviteCode();
      message = 'Novo código de convite gerado com sucesso!';
    }
    
    // Verificar se o testId atual do candidato é diferente do novo testId
    if (candidate.testId !== testId) {
      console.log(`Atualizando testId do candidato de ${candidate.testId} para ${testId}`);
    }
    
    // Atualizar o candidato com o novo código de convite e teste
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        inviteCode: inviteCode,
        inviteExpires: inviteExpires,
        inviteAttempts: 0,
        inviteSent: false,
        testId: testId,
        // Limpar qualquer progresso anterior se o teste for alterado
        ...(candidate.testId !== testId ? { completed: false } : {})
      }
    });
    
    // Buscar o candidato atualizado para retornar na resposta
    const refreshedCandidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    

    
    // Inicializar variáveis para o resultado do email
    let emailSent = false;
    let emailPreviewUrl = null;
    
    // Enviar e-mail com o código de convite apenas se solicitado
    if (sendEmail) {
      const emailResult = await sendInviteEmail(
        candidate.email,
        candidate.name,
        inviteCode,
        inviteExpires
      );
      
      emailSent = emailResult.success;
      emailPreviewUrl = emailResult.previewUrl;
      
      // Atualizar o status de envio do convite
      if (emailSent) {
        await prisma.candidate.update({
          where: { id: candidateId },
          data: { inviteSent: true }
        });
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message,
      inviteCode,
      inviteExpires,
      emailSent,
      emailPreviewUrl,
      candidate: refreshedCandidate
    });
    
  } catch (error) {
    console.error('Erro ao gerar convite:', error);
    return res.status(500).json({ error: 'Erro ao gerar convite' });
  } finally {
    await prisma.$disconnect();
  }
}
