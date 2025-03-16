import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  // Verifica se o usuário está autenticado e é um SUPER_ADMIN
  if (!session || (session.user.role as string) !== 'SUPER_ADMIN') {
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
}

// GET - Obter um pagamento específico
async function getPayment(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Usar o modelo correto do Prisma
    const payment = await prisma.$queryRaw`
      SELECT ph.*, c.id as company_id, c.name as company_name, 
             s.id as subscription_id, s.status as subscription_status,
             p.id as plan_id, p.name as plan_name, p.price as plan_price
      FROM "PaymentHistory" ph
      LEFT JOIN "Company" c ON ph."companyId" = c.id
      LEFT JOIN "Subscription" s ON ph."subscriptionId" = s.id
      LEFT JOIN "Plan" p ON s."planId" = p.id
      WHERE ph.id = ${id}
    `;

    if (!payment || (Array.isArray(payment) && payment.length === 0)) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    const formattedPayment = Array.isArray(payment) ? payment[0] : payment;

    return res.status(200).json({
      id: formattedPayment.id,
      amount: formattedPayment.amount,
      paymentDate: formattedPayment.paymentDate,
      paymentMethod: formattedPayment.paymentMethod,
      status: formattedPayment.status,
      transactionId: formattedPayment.transactionId,
      invoiceUrl: formattedPayment.invoiceUrl,
      notes: formattedPayment.notes,
      company: {
        id: formattedPayment.company_id,
        name: formattedPayment.company_name
      },
      subscription: {
        id: formattedPayment.subscription_id,
        status: formattedPayment.subscription_status,
        plan: {
          id: formattedPayment.plan_id,
          name: formattedPayment.plan_name,
          price: formattedPayment.plan_price
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
    const existingPayment = await prisma.$queryRaw`
      SELECT ph.*, s.id as subscription_id, s.status as subscription_status
      FROM "PaymentHistory" ph
      LEFT JOIN "Subscription" s ON ph."subscriptionId" = s.id
      WHERE ph.id = ${id}
    `;

    if (!existingPayment || (Array.isArray(existingPayment) && existingPayment.length === 0)) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    const payment = Array.isArray(existingPayment) ? existingPayment[0] : existingPayment;

    // Atualizar o pagamento usando SQL bruto
    await prisma.$executeRaw`
      UPDATE "PaymentHistory"
      SET amount = ${amount},
          "paymentDate" = ${new Date(paymentDate)},
          "paymentMethod" = ${paymentMethod},
          status = ${status},
          "transactionId" = ${transactionId},
          "invoiceUrl" = ${invoiceUrl},
          notes = ${notes}
      WHERE id = ${id}
    `;

    // Atualizar a assinatura se o status do pagamento for alterado para PAID
    if (status === 'PAID' && payment.status !== 'PAID') {
      const nextPaymentDate = new Date(new Date(paymentDate).setDate(new Date(paymentDate).getDate() + 30));
      
      await prisma.$executeRaw`
        UPDATE "Subscription"
        SET status = 'ACTIVE',
            "lastPaymentDate" = ${new Date(paymentDate)},
            "nextPaymentDate" = ${nextPaymentDate}
        WHERE id = ${payment.subscription_id}
      `;
    }

    // Se o pagamento for alterado de PAID para outro status, verificar se é necessário atualizar a assinatura
    if (status !== 'PAID' && payment.status === 'PAID') {
      // Verificar se há outros pagamentos confirmados para esta assinatura
      const confirmedPayments = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "PaymentHistory"
        WHERE "subscriptionId" = ${payment.subscription_id}
          AND status = 'PAID'
          AND id != ${id}
      `;
      
      const count = parseInt(confirmedPayments[0].count, 10);

      // Se não houver outros pagamentos confirmados, atualizar o status da assinatura
      if (count === 0) {
        await prisma.$executeRaw`
          UPDATE "Subscription"
          SET status = 'PENDING'
          WHERE id = ${payment.subscription_id}
        `;
      }
    }

    // Buscar o pagamento atualizado
    const updatedPayment = await prisma.$queryRaw`
      SELECT * FROM "PaymentHistory" WHERE id = ${id}
    `;

    return res.status(200).json(Array.isArray(updatedPayment) ? updatedPayment[0] : updatedPayment);
  } catch (error) {
    console.error('Error updating payment:', error);
    return res.status(500).json({ message: 'Erro ao atualizar pagamento' });
  }
}

// DELETE - Excluir um pagamento
async function deletePayment(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Verificar se o pagamento existe
    const existingPayment = await prisma.$queryRaw`
      SELECT ph.*, s.id as subscription_id
      FROM "PaymentHistory" ph
      LEFT JOIN "Subscription" s ON ph."subscriptionId" = s.id
      WHERE ph.id = ${id}
    `;

    if (!existingPayment || (Array.isArray(existingPayment) && existingPayment.length === 0)) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    const payment = Array.isArray(existingPayment) ? existingPayment[0] : existingPayment;

    // Excluir o pagamento
    await prisma.$executeRaw`
      DELETE FROM "PaymentHistory"
      WHERE id = ${id}
    `;

    // Se o pagamento era confirmado, verificar se há outros pagamentos confirmados para esta assinatura
    if (payment.status === 'PAID') {
      const confirmedPayments = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "PaymentHistory"
        WHERE "subscriptionId" = ${payment.subscription_id}
          AND status = 'PAID'
      `;
      
      const count = parseInt(confirmedPayments[0].count, 10);

      // Se não houver outros pagamentos confirmados, atualizar o status da assinatura
      if (count === 0) {
        await prisma.$executeRaw`
          UPDATE "Subscription"
          SET status = 'PENDING'
          WHERE id = ${payment.subscription_id}
        `;
      }
    }

    return res.status(200).json({ message: 'Pagamento excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return res.status(500).json({ message: 'Erro ao excluir pagamento' });
  }
}
