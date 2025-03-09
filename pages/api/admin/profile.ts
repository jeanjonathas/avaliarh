import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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
  
  // Verificar se está usando o novo modelo Admin
  const isNewModel = session.user?.isNewModel === true
  
  // GET - Buscar dados do perfil
  if (req.method === 'GET') {
    try {
      let profileData;
      
      if (isNewModel) {
        // Buscar no modelo Admin
        profileData = await prisma.admin.findUnique({
          where: { email: userEmail },
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            position: true,
            phone: true,
          },
        })
      } else {
        // Buscar no modelo User legado
        const userData = await prisma.user.findUnique({
          where: { email: userEmail },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        })
        
        // Converter para o formato esperado pela interface
        profileData = userData ? {
          ...userData,
          company: '',
          position: '',
          phone: '',
        } : null
      }
      
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
      const { name, email, company, position, phone, currentPassword, newPassword } = req.body
      
      let existingUser;
      
      if (isNewModel) {
        // Buscar no modelo Admin
        existingUser = await prisma.admin.findUnique({
          where: { email: userEmail },
        })
      } else {
        // Buscar no modelo User legado
        existingUser = await prisma.user.findUnique({
          where: { email: userEmail },
        })
      }
      
      if (!existingUser) {
        return res.status(404).json({ message: 'Usuário não encontrado' })
      }
      
      // Preparar dados para atualização
      const updateData: any = {
        name,
        email,
      }
      
      // Adicionar campos específicos do modelo Admin
      if (isNewModel) {
        updateData.company = company
        updateData.position = position
        updateData.phone = phone
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
      
      if (isNewModel) {
        // Atualizar no modelo Admin
        updatedUser = await prisma.admin.update({
          where: { id: existingUser.id },
          data: updateData,
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            position: true,
            phone: true,
          },
        })
      } else {
        // Atualizar no modelo User legado
        const updatedUserData = await prisma.user.update({
          where: { id: existingUser.id },
          data: updateData,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        })
        
        // Converter para o formato esperado pela interface
        updatedUser = {
          ...updatedUserData,
          company: '',
          position: '',
          phone: '',
        }
        
        // Se estamos atualizando um usuário legado, também criar/atualizar no novo modelo Admin
        // para facilitar a migração futura
        try {
          const existingAdmin = await prisma.admin.findUnique({
            where: { email: updatedUserData.email },
          })
          
          if (existingAdmin) {
            // Atualizar admin existente
            await prisma.admin.update({
              where: { id: existingAdmin.id },
              data: {
                name: updatedUserData.name,
                email: updatedUserData.email,
                ...(updateData.password ? { password: updateData.password } : {}),
              },
            })
          } else {
            // Criar novo admin baseado no usuário legado
            await prisma.admin.create({
              data: {
                name: updatedUserData.name,
                email: updatedUserData.email,
                password: existingUser.password, // Usar a senha atual (ou atualizada)
                company: company || '',
                position: position || '',
                phone: phone || '',
              },
            })
          }
        } catch (adminError) {
          console.error('Erro ao sincronizar com modelo Admin:', adminError)
          // Não falhar a operação principal se a sincronização falhar
        }
      }
      
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
