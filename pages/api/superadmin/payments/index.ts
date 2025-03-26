import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma, reconnectPrisma } from '@/lib/prisma';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log(`[API] Recebida requisição ${req.method} para /api/superadmin/payments`);
    
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

    // Manipula diferentes métodos HTTP
    switch (req.method) {
      case 'GET':
        return getPayments(req, res);
      case 'POST':
        return createPayment(req, res);
      default:
        return res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return res.status(500).json({ message: 'Erro ao processar requisição' });
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
    
    console.log(`[PAYMENTHISTORY] Iniciando busca de histórico de pagamentos (${new Date().toISOString()})`);
    
    // Forçar desconexão e reconexão para garantir dados frescos
    await reconnectPrisma();
    
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

    
    // Desconectar Prisma após a consulta
    console.log(`[API] Finalizando requisição, desconectando Prisma (${new Date().toISOString()})`);
    await prisma.$disconnect();
    
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
