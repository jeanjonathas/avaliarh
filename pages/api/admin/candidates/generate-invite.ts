import { NextApiRequest, NextApiResponse } from 'next';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { sendInviteEmail } from '../../../../lib/email';
import { generateUniqueInviteCode, saveUsedInviteCode } from '../../../../lib/invites';



// Função para gerar código único alfanumérico (obsoleta, usar generateUniqueInviteCode do lib/invites.ts)
// async function generateUniqueInviteCode(): Promise<string> {
//   let isUnique = false;
//   let inviteCode = '';
  
//   while (!isUnique) {
//     // Gerar um código alfanumérico de 6 caracteres (mais seguro e com mais combinações possíveis)
//     // Usando caracteres que são fáceis de ler e digitar (sem caracteres ambíguos como 0/O, 1/I/l)
//     const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
//     let code = '';
    
//     // Gerar 6 caracteres aleatórios
//     for (let i = 0; i < 6; i++) {
//       const randomIndex = Math.floor(Math.random() * chars.length);
//       code += chars[randomIndex];
//     }
    
//     // Adicionar um timestamp hash para garantir unicidade global
//     const timestamp = Date.now().toString();
//     const hash = crypto.createHash('md5').update(timestamp).digest('hex').substring(0, 2);
    
//     // Combinar para formar o código final (6 caracteres alfanuméricos + 2 caracteres de hash)
//     inviteCode = `${code}${hash}`;
    
//     // Verificar se o código já está em uso por algum candidato (em qualquer empresa)
//     // Garantir que a conexão com o banco de dados esteja ativa
//     // await reconnectPrisma();
//     const existingCandidate = await prisma.candidate.findFirst({
//       where: {
//         inviteCode: inviteCode
//       }
//     });
    
//     // Verificar se o código já foi usado anteriormente (histórico global)
//     const usedInviteCode = await prisma.usedInviteCode.findUnique({
//       where: {
//         code: inviteCode
//       }
//     });
    
//     // O código é único se não existir nenhum candidato com ele e não estiver no histórico
//     if (!existingCandidate && !usedInviteCode) {
//       isUnique = true;
//     }
//   }
  
//   return inviteCode;
// }

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
    const testExists = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        stages: {
          include: {
            questions: true // Incluir todas as perguntas para verificação
          }
        }
      }
    });
    
    if (!testExists) {
      return res.status(400).json({ 
        success: false,
        error: 'O teste selecionado não existe. Por favor, selecione um teste válido.' 
      });
    }
    
    // Verificar se o teste possui perguntas excluídas
    console.log('Verificando perguntas excluídas no teste:', testId);
    
    // Depurar a estrutura das perguntas para verificar o campo deleted
    let deletedQuestionsFound = 0;
    testExists.stages.forEach((stage, stageIndex) => {
      console.log(`Estágio ${stageIndex + 1} (${stage.id}): ${stage.questions.length} perguntas`);
      stage.questions.forEach((question: any, questionIndex) => {
        console.log(`  Pergunta ${questionIndex + 1} (${question.id}): deleted=${question.deleted}, showResults=${question.showResults}, text="${question.text?.substring(0, 30)}..."`);
      });
    });
    
    const hasDeletedQuestions = testExists.stages.some(stage => 
      stage.questions.some(question => {
        // Usar type casting para acessar o campo deleted
        const questionWithDeleted = question as any;
        
        // Uma pergunta é considerada excluída se:
        // 1. O campo deleted é true, OU
        // 2. O campo showResults é false, OU
        // 3. O texto da pergunta começa com "[EXCLUÍDA]"
        const isDeleted = 
          questionWithDeleted.deleted === true || 
          questionWithDeleted.showResults === false ||
          (typeof questionWithDeleted.text === 'string' && questionWithDeleted.text.startsWith('[EXCLUÍDA]'));
        
        if (isDeleted) {
          deletedQuestionsFound++;
          console.log(`Pergunta excluída encontrada: ID=${questionWithDeleted.id}, deleted=${questionWithDeleted.deleted}, showResults=${questionWithDeleted.showResults}, text="${questionWithDeleted.text?.substring(0, 30)}..."`);
        }
        
        return isDeleted;
      })
    );
    
    console.log(`Total de perguntas excluídas encontradas: ${deletedQuestionsFound}`);
    
    if (hasDeletedQuestions) {
      return res.status(400).json({
        success: false,
        error: 'O teste selecionado contém perguntas que foram marcadas como excluídas. Por favor, substitua essas perguntas por outras antes de gerar um convite.'
      });
    }
    
    // Verificar se o teste possui perguntas
    const hasQuestions = testExists.stages.some(stage => stage.questions.length > 0);
    
    if (!hasQuestions) {
      return res.status(400).json({
        success: false,
        error: 'O teste selecionado não possui perguntas. Por favor, adicione perguntas ao teste antes de gerar um convite.'
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
        await saveUsedInviteCode(
          candidate.inviteCode,
          candidate.id,
          candidate.companyId,
          candidate.testId || testId
        );
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
