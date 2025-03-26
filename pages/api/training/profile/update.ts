import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@/lib/prisma';;
import { hash } from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se o método é PUT
  if (req.method !== 'PUT') {
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

    // Obter dados do corpo da requisição
    const { email, currentPassword, newPassword } = req.body;

    // Buscar usuário atual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    // Objeto para armazenar atualizações
    const updates: any = {};

    // Verificar se está atualizando o email
    if (email && email !== user.email) {
      // Verificar se o email já está em uso
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Este email já está em uso' });
      }

      updates.email = email;
    }

    // Verificar se está atualizando a senha
    if (currentPassword && newPassword) {
      // Verificar se a senha atual está correta
      const isPasswordValid = await bcryptCompare(currentPassword, user.password);

      if (!isPasswordValid) {
        return res.status(400).json({ success: false, message: 'Senha atual incorreta' });
      }

      // Hash da nova senha
      const hashedPassword = await hash(newPassword, 10);
      updates.password = hashedPassword;
    }

    // Se não houver atualizações, retornar erro
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhuma alteração solicitada' });
    }

    // Atualizar usuário
    await prisma.user.update({
      where: { id: userId },
      data: updates
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Perfil atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar perfil',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Função auxiliar para comparar senhas
async function bcryptCompare(plainPassword: string, hashedPassword: string): Promise<boolean> {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(plainPassword, hashedPassword);
}
