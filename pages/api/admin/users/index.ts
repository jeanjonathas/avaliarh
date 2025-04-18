import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma, reconnectPrisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação usando o middleware centralizado
  const session = await getServerSession(req, res, authOptions)
  
  // Log para depuração
  console.log('[PRISMA] Verificando sessão em users:', session ? 'Autenticado' : 'Não autenticado');
  
  if (!session) {
    console.log('[PRISMA] Erro de autenticação: Sessão não encontrada');
    return res.status(401).json({ error: 'Não autenticado' })
  }

  // Verificar se o usuário tem permissão (COMPANY_ADMIN ou SUPER_ADMIN)
  const userRole = session.user.role as string
  if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
    console.log(`[PRISMA] Permissão negada: Papel do usuário ${userRole} não tem acesso`);
    return res.status(403).json({ error: 'Sem permissão para acessar este recurso' })
  }

  // Garantir que temos uma conexão fresca com o banco de dados
  console.log('[PRISMA] Forçando reconexão do Prisma antes de buscar usuários');
  await reconnectPrisma();

  // Obter o ID da empresa da sessão
  const companyId = session.user.companyId as string
  // Como a sessão pode não ter o companyId, vamos buscar o usuário no banco para obter o companyId
  let effectiveCompanyId = companyId
  
  if (!effectiveCompanyId && session.user.email) {
    try {
      console.log(`[PRISMA] CompanyId não encontrado na sessão, buscando pelo email: ${session.user.email}`);
      const user = await prisma.user.findUnique({
        where: { email: session.user.email as string },
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

  if (req.method === 'GET') {
    try {
      // Buscar todos os usuários da empresa
      const users = await prisma.user.findMany({
        where: {
          companyId: effectiveCompanyId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          // Não incluir campos sensíveis como senha
        },
        orderBy: {
          name: 'asc',
        },
      })

      // Adicionar campos adicionais para compatibilidade com o frontend
      const enhancedUsers = users.map(user => ({
        ...user,
        image: null // Adicionar campo image para compatibilidade
      }))

      return res.status(200).json(enhancedUsers)
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
      return res.status(500).json({ error: 'Erro ao buscar usuários' })
    }
  } else if (req.method === 'POST') {
    try {
      const { name, email, role, password } = req.body

      // Validar dados
      if (!name || !email || !role || !password) {
        return res.status(400).json({ error: 'Dados incompletos' })
      }

      // Verificar se o email já está em uso
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return res.status(400).json({ error: 'Email já está em uso' })
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10)

      // Criar novo usuário
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          role,
          password: hashedPassword,
          companyId: effectiveCompanyId,
        },
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
        ...newUser,
        image: null // Adicionar campo image para compatibilidade
      }

      return res.status(201).json(enhancedUser)
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      return res.status(500).json({ error: 'Erro ao criar usuário' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, name, email, role } = req.body

      if (!id) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório' })
      }

      // Verificar se o usuário pertence à empresa
      const existingUser = await prisma.user.findFirst({
        where: {
          id,
          companyId: effectiveCompanyId,
        },
      })

      if (!existingUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }

      // Atualizar usuário
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          name: name || undefined,
          email: email || undefined,
          role: role || undefined,
        },
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
        ...updatedUser,
        image: null // Adicionar campo image para compatibilidade
      }

      return res.status(200).json(enhancedUser)
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      return res.status(500).json({ error: 'Erro ao atualizar usuário' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
