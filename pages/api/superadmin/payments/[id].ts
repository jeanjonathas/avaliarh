import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/payments/${req.query.id}`);
    
    const session = await getServerSession(req, res, authOptions);

    // Verificar autenticação e permissão de superadmin
    if (!session) {
      console.log('[API] Erro: Usuário não autenticado');
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    if ((session.user.role as string) !== 'SUPER_ADMIN') {
      console.log(`[API] Erro: Usuário não é SUPER_ADMIN (role: ${session.user.role})`);
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID do pagamento é obrigatório' });
    }

    // Manipula diferentes métodos HTTP
    switch (req.method) {
      case 'GET':
        return getPayment(req, res, id);
      case 'PUT':
        return updatePayment(req, res, id);
      case 'DELETE':
        return deletePayment(req, res, id);
      default:
        return res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return res.status(500).json({ message: 'Erro ao processar requisição' });
  }
}

// GET - Obter um pagamento específico
async function getPayment(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Usar métodos nativos do Prisma
    const payment = await prisma.paymentHistory.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        subscription: {
          select: {
            id: true,
            status: true,
            plan: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    // Formatar a resposta para manter compatibilidade com o frontend
    return res.status(200).json({
      id: payment.id,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      transactionId: payment.transactionId,
      invoiceUrl: payment.invoiceUrl,
      notes: payment.notes,
      company: {
        id: payment.company?.id,
        name: payment.company?.name
      },
      subscription: {
        id: payment.subscription?.id,
        status: payment.subscription?.status,
        plan: {
          id: payment.subscription?.plan?.id,
          name: payment.subscription?.plan?.name,
          price: payment.subscription?.plan?.price
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return res.status(500).json({ message: 'Erro ao buscar pagamento' });
  }
}

// PUT - Atualizar um pagamento
async function updatePayment(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const {
      amount,
      paymentDate,
      paymentMethod,
      status,
      transactionId,
      invoiceUrl,
      notes,
    } = req.body;

    // Verificar se o pagamento existe
    const existingPayment = await prisma.paymentHistory.findUnique({
      where: { id },
      include: {
        subscription: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    if (!existingPayment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    // Atualizar o pagamento usando métodos nativos do Prisma
    const updatedPayment = await prisma.paymentHistory.update({
      where: { id },
      data: {
        amount,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        status,
        transactionId,
        invoiceUrl,
        notes
      }
    });

    // Atualizar a assinatura se o status do pagamento for alterado para PAID
    if (status === 'PAID' && existingPayment.status !== 'PAID' && existingPayment.subscription) {
      const nextPaymentDate = new Date(new Date(paymentDate).setDate(new Date(paymentDate).getDate() + 30));
      
      await prisma.subscription.update({
        where: { id: existingPayment.subscription.id },
        data: {
          status: 'ACTIVE',
          lastPaymentDate: new Date(paymentDate),
          nextPaymentDate: nextPaymentDate
        }
      });
    }

    // Se o pagamento for alterado de PAID para outro status, verificar se é necessário atualizar a assinatura
    if (status !== 'PAID' && existingPayment.status === 'PAID' && existingPayment.subscription) {
      // Verificar se há outros pagamentos confirmados para esta assinatura
      const confirmedPaymentsCount = await prisma.paymentHistory.count({
        where: {
          subscriptionId: existingPayment.subscription.id,
          status: 'PAID',
          id: { not: id }
        }
      });
      
      // Se não houver outros pagamentos confirmados, atualizar o status da assinatura
      if (confirmedPaymentsCount === 0) {
        await prisma.subscription.update({
          where: { id: existingPayment.subscription.id },
          data: { status: 'PENDING' }
        });
      }
    }

    return res.status(200).json(updatedPayment);
  } catch (error) {
    console.error('Error updating payment:', error);
    return res.status(500).json({ message: 'Erro ao atualizar pagamento' });
  }
}

// DELETE - Excluir um pagamento
async function deletePayment(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Verificar se o pagamento existe
    const existingPayment = await prisma.paymentHistory.findUnique({
      where: { id },
      include: {
        subscription: {
          select: {
            id: true
          }
        }
      }
    });

    if (!existingPayment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    // Excluir o pagamento
    await prisma.paymentHistory.delete({
      where: { id }
    });

    // Se o pagamento era confirmado, verificar se há outros pagamentos confirmados para esta assinatura
    if (existingPayment.status === 'PAID' && existingPayment.subscription) {
      const confirmedPaymentsCount = await prisma.paymentHistory.count({
        where: {
          subscriptionId: existingPayment.subscription.id,
          status: 'PAID'
        }
      });
      
      // Se não houver outros pagamentos confirmados, atualizar o status da assinatura
      if (confirmedPaymentsCount === 0) {
        await prisma.subscription.update({
          where: { id: existingPayment.subscription.id },
          data: { status: 'PENDING' }
        });
      }
    }

    return res.status(200).json({ message: 'Pagamento excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return res.status(500).json({ message: 'Erro ao excluir pagamento' });
  }
}
