import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma } from '../../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  // Verificar método
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { candidateId, processId } = req.body;

    // Validar parâmetros
    if (!candidateId || !processId) {
      return res.status(400).json({ message: 'ID do candidato e ID do processo são obrigatórios' });
    }

    // Verificar se o candidato está no processo
    const candidate = await prisma.candidate.findFirst({
      where: {
        id: candidateId,
        processId,
      },
    });

    if (!candidate) {
      return res.status(404).json({ message: 'Candidato não encontrado no processo seletivo' });
    }

    // Remover o candidato do processo (atualizando o processId para null)
    await prisma.candidate.update({
      where: {
        id: candidateId,
      },
      data: {
        processId: null,
      },
    });

    // Remover progresso do candidato nas etapas do processo
    await prisma.candidateProgress.deleteMany({
      where: {
        candidateId,
        stage: {
          processId,
        },
      },
    });

    console.log(`Candidato ${candidateId} removido do processo ${processId}`);
    
    return res.status(200).json({ message: 'Candidato removido do processo com sucesso' });
  } catch (error) {
    console.error('Erro ao remover candidato do processo:', error);
    return res.status(500).json({ message: 'Erro ao remover candidato do processo' });
  }
}
