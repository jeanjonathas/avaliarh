import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  // Verificar se o usuário tem uma empresa associada
  const companyId = session.user.companyId
  if (!companyId) {
    return res.status(400).json({ error: 'Usuário não está associado a uma empresa' })
  }

  // Verificar se a empresa está ativa
  if (!session.user.company?.isActive) {
    return res.status(403).json({ error: 'Empresa inativa' })
  }

  if (req.method === 'GET') {
    try {
      // Buscar dados da empresa
      const company = await prisma.company.findUnique({
        where: {
          id: companyId,
        },
        include: {
          subscription: true,
          paymentHistory: {
            orderBy: {
              paymentDate: 'desc',
            },
            take: 5,
          },
        },
      })

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' })
      }

      // Contar usuários e candidatos
      const userCount = await prisma.user.count({
        where: { companyId },
      })

      const candidateCount = await prisma.candidate.count({
        where: { companyId },
      })

      // Formatar dados da assinatura
      const subscriptionData = {
        planName: company.planType || 'Plano Padrão',
        status: company.isActive ? 'ACTIVE' : 'INACTIVE',
        startDate: company.subscription?.startDate || null,
        endDate: company.subscription?.endDate || null,
        lastPaymentDate: company.paymentHistory[0]?.paymentDate || null,
        nextPaymentDate: company.subscription?.nextBillingDate || null,
        usedCandidates: candidateCount,
        totalCandidates: company.maxCandidates || 100,
        usedUsers: userCount,
        totalUsers: company.maxUsers || 10,
        paymentHistory: company.paymentHistory.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          status: payment.status,
        })),
      }

      return res.status(200).json(subscriptionData)
    } catch (error) {
      console.error('Erro ao buscar dados da assinatura:', error)
      return res.status(500).json({ error: 'Erro ao buscar dados da assinatura' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
