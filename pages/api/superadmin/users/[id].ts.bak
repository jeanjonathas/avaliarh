import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  // Verifica se o usuário está autenticado e é um SUPER_ADMIN
  if (!session || (session.user?.role as string) !== 'SUPER_ADMIN') {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID de usuário inválido' });
  }

  // Manipula diferentes métodos HTTP
  switch (req.method) {
    case 'GET':
      return getUser(req, res, id);
    case 'PUT':
      return updateUser(req, res, id);
    case 'DELETE':
      return deleteUser(req, res, id);
    default:
      return res.status(405).json({ message: 'Método não permitido' });
  }
}

// GET - Obter um usuário específico
async function getUser(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Erro ao buscar usuário' });
  }
}

// PUT - Atualizar um usuário existente
async function updateUser(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const {
      name,
      email,
      password,
      role,
      companyId,
    } = req.body;

    // Validação básica
    if (!name || !email) {
      return res.status(400).json({ message: 'Nome e email são obrigatórios' });
    }

    // Verifica se o usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verifica se o email já está em uso por outro usuário
    if (email !== existingUser.email) {
      const userWithEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (userWithEmail) {
        return res.status(400).json({ message: 'Este email já está em uso' });
      }
    }

    // Se estiver mudando a empresa, verifica se a nova empresa existe e tem vagas
    if (companyId && companyId !== existingUser.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return res.status(400).json({ message: 'Empresa não encontrada' });
      }

      // Verifica se a empresa atingiu o limite de usuários
      const userCount = await prisma.user.count({
        where: { companyId },
      });

      if (userCount >= company.maxUsers) {
        return res.status(400).json({ message: 'A empresa atingiu o limite de usuários' });
      }
    }

    // Previne a remoção do último SUPER_ADMIN
    if (existingUser.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      const superAdminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN' },
      });

      if (superAdminCount <= 1) {
        return res.status(400).json({ message: 'Não é possível remover o último Super Admin' });
      }
    }

    // Prepara os dados para atualização
    const updateData: any = {
      name,
      email,
      role: role || existingUser.role,
      companyId: companyId === '' ? null : companyId || existingUser.companyId,
    };

    // Atualiza a senha apenas se uma nova senha for fornecida
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Atualiza o usuário
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
}

// DELETE - Excluir um usuário
async function deleteUser(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    console.log(`[API] Iniciando exclusão do usuário ${id}`);
    
    // Verifica se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true
      }
    });

    if (!user) {
      console.log(`[API] Usuário ${id} não encontrado`);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    console.log(`[API] Usuário ${id} encontrado, role: ${user.role}`);

    // Previne a exclusão do último SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN') {
      const superAdminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN' },
      });

      if (superAdminCount <= 1) {
        console.log(`[API] Tentativa de excluir o último Super Admin`);
        return res.status(400).json({ message: 'Não é possível excluir o último Super Admin' });
      }
    }

    // Usa uma transação para garantir que todas as operações sejam concluídas com sucesso
    await prisma.$transaction(async (tx) => {
      console.log(`[API] Iniciando transação para excluir usuário ${id} e seus relacionamentos`);
      
      // Exclui o perfil de estudante relacionado, se existir
      if (user.studentProfile) {
        const studentId = user.studentProfile.id;
        console.log(`[API] Encontrado perfil de estudante (ID: ${studentId}) relacionado ao usuário ${id}`);
        
        // 1. Exclui as matrículas em cursos
        const courseEnrollments = await tx.courseEnrollment.findMany({
          where: { studentId }
        });
        if (courseEnrollments.length > 0) {
          console.log(`[API] Excluindo ${courseEnrollments.length} matrículas em cursos do estudante ${studentId}`);
          await tx.courseEnrollment.deleteMany({
            where: { studentId }
          });
        }
        
        // 2. Exclui o progresso em lições
        const lessonProgress = await tx.lessonProgress.findMany({
          where: { studentId }
        });
        if (lessonProgress.length > 0) {
          console.log(`[API] Excluindo ${lessonProgress.length} registros de progresso em lições do estudante ${studentId}`);
          await tx.lessonProgress.deleteMany({
            where: { studentId }
          });
        }
        
        // 3. Exclui as tentativas de teste
        const testAttempts = await tx.testAttempt.findMany({
          where: { studentId }
        });
        if (testAttempts.length > 0) {
          console.log(`[API] Excluindo ${testAttempts.length} tentativas de teste do estudante ${studentId}`);
          await tx.testAttempt.deleteMany({
            where: { studentId }
          });
        }
        
        // 4. Exclui os logs de acesso
        const accessLogs = await tx.trainingAccessLog.findMany({
          where: { studentId }
        });
        if (accessLogs.length > 0) {
          console.log(`[API] Excluindo ${accessLogs.length} logs de acesso do estudante ${studentId}`);
          await tx.trainingAccessLog.deleteMany({
            where: { studentId }
          });
        }
        
        // 5. Finalmente, exclui o perfil de estudante
        console.log(`[API] Excluindo o perfil de estudante ${studentId}`);
        await tx.student.delete({
          where: { id: studentId }
        });
      }
      
      // Verifica CandidateProgress relacionados a este usuário
      const candidateProgresses = await tx.candidateProgress.findMany({
        where: { interviewerId: id }
      });
      
      if (candidateProgresses.length > 0) {
        console.log(`[API] Atualizando ${candidateProgresses.length} registros de CandidateProgress relacionados ao usuário ${id}`);
        await tx.candidateProgress.updateMany({
          where: { interviewerId: id },
          data: { interviewerId: null }
        });
      }
      
      // Por fim, exclui o usuário
      console.log(`[API] Excluindo o usuário ${id}`);
      await tx.user.delete({
        where: { id }
      });
    });

    console.log(`[API] Usuário ${id} excluído com sucesso`);
    return res.status(200).json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ 
      message: 'Erro ao excluir usuário',
      error: error.message
    });
  }
}
