import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Schema para validação do corpo da requisição
const credentialsSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Obter usuário do banco de dados
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }

  // Verificar se o usuário é um administrador ou pertence à empresa
  const isAdmin = user.role === Role.SUPER_ADMIN || user.role === Role.COMPANY_ADMIN;
  const companyId = user.companyId;

  if (!isAdmin && !companyId) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  // Obter ID do estudante da URL
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID do estudante inválido' });
  }

  // Processar apenas requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Validar corpo da requisição
    const { userId, password } = credentialsSchema.parse(req.body);

    // Verificar se o estudante existe
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ message: 'Estudante não encontrado' });
    }

    // Verificar se o usuário tem acesso a este estudante
    if (!isAdmin && student.user.companyId !== companyId) {
      return res.status(403).json({ message: 'Acesso negado a este estudante' });
    }

    // Verificar se o userId fornecido corresponde ao userId do estudante
    if (student.userId !== userId) {
      return res.status(400).json({ message: 'ID de usuário não corresponde ao estudante' });
    }

    // Gerar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Atualizar a senha do usuário
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      message: 'Senha definida com sucesso',
    });
  } catch (error) {
    console.error('Erro ao definir senha do estudante:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: error.errors 
      });
    }
    
    return res.status(500).json({ 
      message: 'Erro ao definir senha do estudante', 
      error: error.message 
    });
  }
}
