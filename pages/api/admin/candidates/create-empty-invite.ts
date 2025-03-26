import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { generateRandomCode } from '../../../../utils/codeGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação usando getServerSession
    const session = await getServerSession(req, res, authOptions);
    
    // Log para depuração
    console.log('[PRISMA] Verificando sessão em create-empty-invite:', session ? 'Autenticado' : 'Não autenticado');
    
    if (!session) {
      console.log('[PRISMA] Erro de autenticação: Sessão não encontrada');
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Garantir que temos uma conexão fresca com o banco de dados
    console.log('[PRISMA] Forçando reconexão do Prisma antes de criar convite');
    await reconnectPrisma();

    const { testId, processId } = req.body;

    // Validar que pelo menos um dos campos foi fornecido
    if (!testId && !processId) {
      return res.status(400).json({ error: 'É necessário fornecer um teste ou um processo seletivo' });
    }

    // Gerar código de convite único
    const inviteCode = generateRandomCode(6);
    console.log('[API] Código de convite gerado:', inviteCode);

    // Verificar se o código já existe
    const existingCandidate = await prisma.candidate.findFirst({
      where: { inviteCode }
    });

    if (existingCandidate) {
      return res.status(400).json({ error: 'Erro ao gerar código de convite. Por favor, tente novamente.' });
    }

    console.log('[API] Criando candidato vazio com código:', inviteCode);
    
    // Criar candidato vazio com o código de convite
    const newCandidate = await prisma.candidate.create({
      data: {
        name: '',
        email: '',
        inviteCode,
        testId: testId || null,
        processId: processId || null,
        requiresProfileCompletion: true, 
        inviteAttempts: 0,
        inviteSent: true,
        showResults: true, 
        status: 'PENDING',
        companyId: session.user.companyId
      }
    });

    console.log('[API] Candidato criado com sucesso, ID:', newCandidate.id);
    
    return res.status(200).json({
      success: true,
      inviteCode,
      candidateId: newCandidate.id
    });
  } catch (error) {
    console.error('[API] Erro ao criar convite vazio:', error);
    return res.status(500).json({ error: 'Erro ao criar convite vazio' });
  }
}
