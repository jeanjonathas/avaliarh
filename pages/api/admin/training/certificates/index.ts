import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import crypto from 'crypto';

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

  const { companyId } = user;

  switch (req.method) {
    case 'GET':
      return getCertificates(req, res, companyId);
    case 'POST':
      return createCertificate(req, res, companyId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

async function getCertificates(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const certificates = await (prisma as any).trainingCertificate.findMany({
      where: { companyId },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formatar a resposta para o formato esperado pelo frontend
    const formattedCertificates = certificates.map(cert => ({
      ...cert,
      student: {
        name: cert.student.user.name,
        email: cert.student.user.email,
        department: cert.student.convertedFrom?.position || 'Não especificado'
      }
    }));

    return res.status(200).json(formattedCertificates);
  } catch (error) {
    console.error('Erro ao buscar certificados:', error);
    return res.status(500).json({ error: 'Erro ao buscar certificados' });
  }
}

async function createCertificate(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'Aluno e curso são obrigatórios' });
    }

    // Verificar se o aluno e curso existem e pertencem à empresa
    const student = await prisma.student.findUnique({
      where: { id: studentId, companyId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const course = await prisma.trainingCourse.findFirst({
      where: { id: courseId, companyId }
    });

    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Gerar um número de certificado único
    const certificateNumber = `CERT-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${new Date().getFullYear()}`;

    const newCertificate = await (prisma as any).trainingCertificate.create({
      data: {
        studentId,
        courseId,
        companyId,
        certificateNumber,
        issueDate: new Date(),
        status: 'valid',
        downloadUrl: `/api/admin/training/certificates/download/${certificateNumber}`, // URL placeholder
      },
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
      ...newCertificate,
      student: {
        name: newCertificate.student.user.name,
        email: newCertificate.student.user.email,
        department: newCertificate.student.convertedFrom?.position || 'Não especificado'
      }
    };

    return res.status(201).json(formattedCertificate);
  } catch (error) {
    console.error('Erro ao criar certificado:', error);
    return res.status(500).json({ error: 'Erro ao criar certificado' });
  }
}
