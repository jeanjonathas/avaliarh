import type { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar o token JWT
  const token = await getToken({ req })
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' })
  }

  // Verificar se o usuário tem permissão (COMPANY_ADMIN ou SUPER_ADMIN)
  const userRole = token.role as string
  if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
    return res.status(403).json({ error: 'Sem permissão para acessar este recurso' })
  }

  // Obter o ID da empresa do token
  const companyId = token.companyId as string
  // Como o token pode não ter o companyId, vamos buscar o usuário no banco para obter o companyId
  let effectiveCompanyId = companyId
  
  if (!effectiveCompanyId && token.email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: token.email as string },
        select: { companyId: true }
      })
      
      if (user && user.companyId) {
        effectiveCompanyId = user.companyId
      }
    } catch (error) {
      console.error('Erro ao buscar companyId do usuário:', error)
    }
  }

  if (!effectiveCompanyId) {
    return res.status(400).json({ error: 'ID da empresa não encontrado' })
  }

  // Obter o ID do usuário da URL
  const userId = req.query.id as string

  // Verificar se o usuário existe e pertence à empresa
  const userExists = await prisma.user.findFirst({
    where: {
      id: userId,
      companyId: effectiveCompanyId,
    },
  })

  if (!userExists) {
    return res.status(404).json({ error: 'Usuário não encontrado' })
  }

  // Processar diferentes métodos HTTP
  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      // Adicionar campos adicionais para compatibilidade com o frontend
      const enhancedUser = {
        ...user,
        image: null, // Adicionar campo image para compatibilidade
        isActive: true // Adicionar campo isActive para compatibilidade
      }

      return res.status(200).json(enhancedUser)
    } catch (error) {
      console.error('Erro ao buscar usuário:', error)
      return res.status(500).json({ error: 'Erro ao buscar usuário' })
    }
  } else if (req.method === 'PATCH') {
    try {
      const { isActive, role, name, email } = req.body

      // Atualizar apenas os campos fornecidos
      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (email !== undefined) updateData.email = email
      if (role !== undefined) updateData.role = role

      // Atualizar o usuário
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      // Adicionar campos adicionais para compatibilidade com o frontend
      const enhancedUser = {
        ...user,
        image: null, // Adicionar campo image para compatibilidade
        isActive: isActive !== undefined ? isActive : true // Usar o valor fornecido ou padrão
      }

      return res.status(200).json(enhancedUser)
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      return res.status(500).json({ error: 'Erro ao atualizar usuário' })
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar se o usuário não é o próprio usuário logado
      if (userExists.email === token.email) {
        return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' })
      }

      // Excluir o usuário
      await prisma.user.delete({
        where: { id: userId },
      })

      return res.status(200).json({ message: 'Usuário excluído com sucesso' })
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      return res.status(500).json({ error: 'Erro ao excluir usuário' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
