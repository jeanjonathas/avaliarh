import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const userEmail = session.user?.email;
  if (!userEmail) {
    return res.status(401).json({ error: 'Usuário não identificado' });
  }

  await reconnectPrisma();
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado' });
  }

  if (!user.companyId) {
    return res.status(403).json({ error: 'Usuário não está associado a uma empresa' });
  }

  if (user.role !== Role.COMPANY_ADMIN && user.role !== Role.SUPER_ADMIN && user.role !== Role.INSTRUCTOR) {
    return res.status(403).json({ error: 'Sem permissão para acessar este recurso' });
  }

  const { id } = req.query;
  const { companyId } = user;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do certificado é obrigatório' });
  }

  switch (req.method) {
    case 'PATCH':
      return updateCertificate(req, res, id, companyId);
    case 'DELETE':
      return deleteCertificate(req, res, id, companyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

async function updateCertificate(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const updatedCertificate = await (prisma as any).trainingCertificate.update({
      where: { id, companyId },
      data: { status },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              }
            },
            convertedFrom: {
              select: {
                position: true
              }
            }
          }
        },
        course: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Formatar a resposta
    const formattedCertificate = {
      ...updatedCertificate,
      student: {
        name: updatedCertificate.student.user.name,
        email: updatedCertificate.student.user.email,
        department: updatedCertificate.student.convertedFrom?.position || 'Não especificado'
      }
    };

    return res.status(200).json(formattedCertificate);
  } catch (error) {
    console.error('Erro ao atualizar certificado:', error);
    return res.status(500).json({ error: 'Erro ao atualizar certificado' });
  }
}

async function deleteCertificate(req: NextApiRequest, res: NextApiResponse, id: string, companyId: string) {
  try {
    await (prisma as any).trainingCertificate.delete({
      where: { id, companyId }
    });

    return res.status(200).json({ message: 'Certificado excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir certificado:', error);
    return res.status(500).json({ error: 'Erro ao excluir certificado' });
  }
}
