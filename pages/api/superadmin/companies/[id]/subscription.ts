import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  // Verificar autenticação e permissão de superadmin
  if (!session || (session.user.role as string) !== 'SUPER_ADMIN') {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'ID da empresa é obrigatório' });
  }

  try {
    // Verificar se a empresa existe usando métodos nativos do Prisma
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            plan: true
          }
        },
        plan: true
      }
    });

    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    // GET - Obter detalhes da assinatura de uma empresa
    if (req.method === 'GET') {
      // Buscar os pagamentos recentes usando métodos nativos do Prisma
      const recentPayments = await prisma.paymentHistory.findMany({
        where: {
          subscriptionId: company.subscription?.id
        },
        orderBy: {
          paymentDate: 'desc'
        },
        take: 5
      });
      
      // Formatar a resposta para manter compatibilidade com o frontend
      return res.status(200).json({
        id: company.subscription?.id,
        companyId: company.id,
        companyName: company.name,
        planId: company.subscription?.planId || company.planId,
        plan: {
          id: company.subscription?.plan?.id || company.plan?.id,
          name: company.subscription?.plan?.name || company.plan?.name,
          price: company.subscription?.plan?.price || company.plan?.price
        },
        status: company.subscription?.status || 'PENDING',
        startDate: company.subscription?.startDate || null,
        endDate: company.subscription?.endDate || null,
        lastPaymentDate: company.subscription?.lastPaymentDate || null,
        nextPaymentDate: company.subscription?.nextPaymentDate || null,
        recentPayments: recentPayments || [],
      });
    }

    // PUT - Atualizar assinatura de uma empresa
    if (req.method === 'PUT') {
      const { 
        planId, 
        status, 
        startDate, 
        endDate, 
        lastPaymentDate, 
        nextPaymentDate,
        paymentAmount,
        paymentMethod,
        paymentStatus,
        paymentNotes
      } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status da assinatura é obrigatório' });
      }

      // Verificar se o plano existe, se fornecido
      let plan = null;
      if (planId) {
        plan = await prisma.plan.findUnique({
          where: { id: planId }
        });
        
        if (!plan) {
          return res.status(404).json({ message: 'Plano não encontrado' });
        }
      }

      // Verificar se a empresa já tem uma assinatura
      if (company.subscription) {
        // Atualizar assinatura existente usando métodos nativos do Prisma
        await prisma.subscription.update({
          where: { id: company.subscription.id },
          data: {
            planId: planId || company.subscription.planId,
            status: status,
            startDate: startDate ? new Date(startDate) : company.subscription.startDate,
            endDate: endDate ? new Date(endDate) : (status === 'EXPIRED' ? null : company.subscription.endDate),
            lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate) : company.subscription.lastPaymentDate,
            nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : company.subscription.nextPaymentDate
          }
        });

        // Registrar o histórico de pagamento se necessário
        if (lastPaymentDate && paymentAmount) {
          await prisma.paymentHistory.create({
            data: {
              companyId: company.id,
              subscriptionId: company.subscription.id,
              amount: parseFloat(paymentAmount) || plan?.price || 0,
              paymentDate: new Date(lastPaymentDate),
              paymentMethod: paymentMethod || 'MANUAL',
              status: paymentStatus || 'PAID',
              notes: paymentNotes || `Pagamento registrado via API - ${new Date().toISOString()}`
            }
          });
        }

        // Atualizar a empresa com o novo plano, se fornecido
        await prisma.company.update({
          where: { id },
          data: {
            planId: planId || company.planId,
            planType: plan?.name || company.planType,
            isActive: status === 'ACTIVE',
            lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate) : company.lastPaymentDate
          }
        });

        // Buscar a empresa atualizada
        const updatedCompany = await prisma.company.findUnique({
          where: { id },
          include: {
            subscription: {
              include: {
                plan: true
              }
            },
            plan: true
          }
        });

        // Buscar os pagamentos recentes
        const recentPayments = await prisma.paymentHistory.findMany({
          where: {
            subscriptionId: updatedCompany.subscription?.id
          },
          orderBy: {
            paymentDate: 'desc'
          },
          take: 5
        });

        return res.status(200).json({
          id: updatedCompany.id,
          name: updatedCompany.name,
          planType: updatedCompany.planType,
          planId: updatedCompany.planId,
          plan: {
            id: updatedCompany.subscription?.plan?.id || updatedCompany.plan?.id,
            name: updatedCompany.subscription?.plan?.name || updatedCompany.plan?.name,
            price: updatedCompany.subscription?.plan?.price || updatedCompany.plan?.price
          },
          isActive: updatedCompany.isActive,
          subscription: {
            id: updatedCompany.subscription?.id,
            status: updatedCompany.subscription?.status,
            startDate: updatedCompany.subscription?.startDate,
            endDate: updatedCompany.subscription?.endDate,
            lastPaymentDate: updatedCompany.subscription?.lastPaymentDate,
            nextPaymentDate: updatedCompany.subscription?.nextPaymentDate,
            paymentHistory: recentPayments
          },
        });
      } else {
        // Verificar se o planId foi fornecido para criar uma nova assinatura
        if (!planId) {
          return res.status(400).json({ message: 'ID do plano é obrigatório para criar uma nova assinatura' });
        }

        // Criar nova assinatura usando métodos nativos do Prisma
        const newSubscription = await prisma.subscription.create({
          data: {
            companyId: id,
            planId: planId,
            status: status,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : null,
            lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate) : null,
            nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : null
          }
        });

        // Registrar o histórico de pagamento se necessário
        if (lastPaymentDate && paymentAmount && newSubscription.id) {
          await prisma.paymentHistory.create({
            data: {
              companyId: id,
              subscriptionId: newSubscription.id,
              amount: parseFloat(paymentAmount) || plan?.price || 0,
              paymentDate: new Date(lastPaymentDate),
              paymentMethod: paymentMethod || 'MANUAL',
              status: paymentStatus || 'PAID',
              notes: paymentNotes || `Pagamento inicial registrado via API - ${new Date().toISOString()}`
            }
          });
        }

        // Atualizar a empresa com o novo plano
        await prisma.company.update({
          where: { id },
          data: {
            planId: planId,
            planType: plan?.name || company.planType,
            isActive: status === 'ACTIVE',
            lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate) : company.lastPaymentDate
          }
        });

        // Buscar a empresa atualizada
        const updatedCompany = await prisma.company.findUnique({
          where: { id },
          include: {
            subscription: {
              include: {
                plan: true
              }
            },
            plan: true
          }
        });

        // Buscar os pagamentos recentes
        const recentPayments = await prisma.paymentHistory.findMany({
          where: {
            subscriptionId: updatedCompany.subscription?.id
          },
          orderBy: {
            paymentDate: 'desc'
          },
          take: 5
        });

        return res.status(200).json({
          id: updatedCompany.id,
          name: updatedCompany.name,
          planType: updatedCompany.planType,
          planId: updatedCompany.planId,
          plan: {
            id: updatedCompany.subscription?.plan?.id || updatedCompany.plan?.id,
            name: updatedCompany.subscription?.plan?.name || updatedCompany.plan?.name,
            price: updatedCompany.subscription?.plan?.price || updatedCompany.plan?.price
          },
          isActive: updatedCompany.isActive,
          subscription: {
            id: updatedCompany.subscription?.id,
            status: updatedCompany.subscription?.status,
            startDate: updatedCompany.subscription?.startDate,
            endDate: updatedCompany.subscription?.endDate,
            lastPaymentDate: updatedCompany.subscription?.lastPaymentDate,
            nextPaymentDate: updatedCompany.subscription?.nextPaymentDate,
            paymentHistory: recentPayments
          },
        });
      }
    }

    // Método não permitido
    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API de assinatura:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  } finally {
    await prisma.$disconnect();
  }
}
