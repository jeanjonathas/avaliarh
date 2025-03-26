import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * API para criar o primeiro superadmin do sistema
 * Esta API só pode ser chamada se não existir nenhum superadmin cadastrado
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('[CREATE-FIRST-ADMIN] Verificando se é primeiro acesso...');
    
    // Verificar se já existe algum usuário com papel SUPER_ADMIN
    const superAdminCount = await prisma.user.count({
      where: {
        role: 'SUPER_ADMIN'
      }
    });
    
    // Se já existir um superadmin, retornar erro
    if (superAdminCount > 0) {
      console.log('[CREATE-FIRST-ADMIN] Já existe superadmin cadastrado. Operação não permitida.');
      return res.status(403).json({ 
        error: 'Não é possível criar o primeiro superadmin pois já existe um cadastrado.' 
      });
    }
    
    // Extrair dados do corpo da requisição
    const { name, email, password } = req.body;
    
    // Validar os dados
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar o superadmin
    console.log(`[CREATE-FIRST-ADMIN] Criando superadmin com email: ${email}`);
    const superAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
      },
    });
    
    // Ocultar a senha no log
    const { password: _, ...superAdminWithoutPassword } = superAdmin;
    console.log('[CREATE-FIRST-ADMIN] Superadmin criado com sucesso:', superAdminWithoutPassword);
    
    return res.status(201).json({ 
      success: true,
      message: 'Superadmin criado com sucesso',
      user: superAdminWithoutPassword
    });
  } catch (error: any) {
    console.error('[CREATE-FIRST-ADMIN] Erro ao criar superadmin:', error);
    
    // Verificar se é um erro de email duplicado
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(400).json({ error: 'Este email já está sendo usado' });
    }
    
    return res.status(500).json({ 
      error: 'Erro ao criar superadmin',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
