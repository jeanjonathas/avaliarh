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

  // Manipula diferentes métodos HTTP
  switch (req.method) {
    case 'GET':
      return getPayments(req, res);
    case 'POST':
      return createPayment(req, res);
    default:
      return res.status(405).json({ message: 'Método não permitido' });
  }
}

// GET - Listar todos os pagamentos
async function getPayments(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { companyId, subscriptionId } = req.query;
    
    // Construir a consulta com filtros opcionais
    const where: any = {};
    
    if (companyId) {
      where.companyId = companyId as string;
    }
    
    if (subscriptionId) {
      where.subscriptionId = subscriptionId as string;
    }
    
    const payments = await prisma.paymentHistory.findMany({
      where,
      orderBy: {
        paymentDate: 'desc',
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        subscription: {
          select: {
            id: true,
            status: true,
            plan: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({ message: 'Erro ao buscar pagamentos' });
  }
}

// POST - Criar um novo pagamento
async function createPayment(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      companyId,
      subscriptionId,
      amount,
      paymentDate,
      paymentMethod,
      status,
      transactionId,
      invoiceUrl,
      notes,
    } = req.body;

    // Verificar se a empresa e a assinatura existem
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Assinatura não encontrada' });
    }

    // Criar o pagamento
    const payment = await prisma.paymentHistory.create({
      data: {
        companyId,
        subscriptionId,
        amount,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        status,
        transactionId,
        invoiceUrl,
        notes,
      },
    });

    // Atualizar a assinatura se o pagamento for confirmado
    if (status === 'PAID') {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          lastPaymentDate: new Date(paymentDate),
          // Definir a próxima data de pagamento para 30 dias após o pagamento atual
          nextPaymentDate: new Date(new Date(paymentDate).setDate(new Date(paymentDate).getDate() + 30)),
        },
      });
    }

    return res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    return res.status(500).json({ message: 'Erro ao criar pagamento' });
  }
}
