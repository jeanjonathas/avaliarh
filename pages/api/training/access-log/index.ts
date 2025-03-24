import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o método é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }

    // Obter ID do usuário da sessão
    const userId = session.user.id;

    // Verificar se o usuário é um estudante
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return res.status(403).json({ 
        success: false, 
        message: 'Usuário não é um estudante' 
      });
    }

    // Obter dados do corpo da requisição
    const { courseId, timeSpent } = req.body;
    
    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({ success: false, message: 'ID do curso não fornecido' });
    }

    // Verificar se o estudante está matriculado no curso
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        studentId: student.id,
        courseId
      }
    });

    if (!enrollment) {
      return res.status(403).json({ 
        success: false, 
        message: 'Estudante não está matriculado neste curso' 
      });
    }

    // Registrar acesso
    const accessLog = await prisma.trainingAccessLog.create({
      data: {
        studentId: student.id,
        courseId,
        timeSpent: timeSpent || 0
      }
    });

    return res.status(201).json({ 
      success: true, 
      message: 'Acesso registrado com sucesso',
      accessLog
    });
  } catch (error) {
    console.error('Erro ao registrar acesso:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao registrar acesso',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
