import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o método é GET
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    // Verificar autenticação usando getServerSession
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user || !session.user.id) {
      console.error('Erro de autenticação: Sessão inválida ou usuário não identificado');
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

    // Obter parâmetros de paginação
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Buscar histórico de acesso
    const accessLogs = await prisma.trainingAccessLog.findMany({
      where: {
        studentId: student.id
      },
      include: {
        course: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        accessDate: 'desc'
      },
      skip,
      take: limit
    });

    // Contar total de registros para paginação
    const totalCount = await prisma.trainingAccessLog.count({
      where: {
        studentId: student.id
      }
    });

    // Formatar os resultados
    const formattedLogs = accessLogs.map(log => ({
      id: log.id,
      courseId: log.courseId,
      courseName: log.course.name,
      accessDate: log.accessDate,
      timeSpent: log.timeSpent,
      createdAt: log.createdAt
    }));

    return res.status(200).json({
      success: true,
      data: formattedLogs,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar histórico de acesso:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar histórico de acesso',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
