import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req })
  
  // Verificar autenticação
  if (!session) {
    return res.status(401).json({ message: 'Não autorizado' })
  }
  
  // Obter o email do usuário da sessão
  const userEmail = session.user?.email
  
  if (!userEmail) {
    return res.status(400).json({ message: 'Email do usuário não encontrado na sessão' })
  }
  
  // GET - Buscar dados do perfil
  if (req.method === 'GET') {
    try {
      let profileData;
      
      // Buscar no modelo User
      profileData = await prisma.user.findUnique({
        where: { email: userEmail },
        select: {
          id: true,
          name: true,
          email: true,
          companyId: true,
          company: true,
          role: true,
          createdAt: true,
          updatedAt: true
        },
      })
      
      if (!profileData) {
        return res.status(404).json({ message: 'Usuário não encontrado' })
      }
      
      return res.status(200).json(profileData)
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      return res.status(500).json({ message: 'Erro ao buscar dados do perfil' })
    }
  }
  
  // PUT - Atualizar dados do perfil
  if (req.method === 'PUT') {
    try {
      const { name, email, companyId, role, currentPassword, newPassword } = req.body
      
      let existingUser;
      
      // Buscar no modelo User
      existingUser = await prisma.user.findUnique({
        where: { email: userEmail },
      })
      
      if (!existingUser) {
        return res.status(404).json({ message: 'Usuário não encontrado' })
      }
      
      // Preparar dados para atualização
      const updateData: any = {
        name,
        email,
        companyId,
        role,
      }
      
      // Se estiver tentando alterar a senha
      if (newPassword) {
        // Verificar se a senha atual está correta
        if (!currentPassword) {
          return res.status(400).json({ message: 'Senha atual é obrigatória para alterar a senha' })
        }
        
        const isPasswordValid = await bcrypt.compare(currentPassword, existingUser.password)
        
        if (!isPasswordValid) {
          return res.status(400).json({ message: 'Senha atual incorreta' })
        }
        
        // Hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        updateData.password = hashedPassword
      }
      
      let updatedUser;
      
      // Atualizar no modelo User
      updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          companyId: true,
          company: true,
          role: true,
          createdAt: true,
          updatedAt: true
        },
      })
      
      return res.status(200).json(updatedUser)
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      
      // Verificar se é um erro de email duplicado
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return res.status(400).json({ message: 'Este email já está em uso por outro usuário' })
      }
      
      return res.status(500).json({ message: 'Erro ao atualizar perfil' })
    }
  }
  
  // Método não permitido
  return res.status(405).json({ message: 'Método não permitido' })
}
