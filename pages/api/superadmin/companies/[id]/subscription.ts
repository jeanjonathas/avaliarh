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
    // Verificar se a empresa existe
    const companyResult = await prisma.$queryRaw`
      SELECT c.*, 
             s.id as subscription_id, s.status as subscription_status, 
             s."startDate" as subscription_start_date, s."endDate" as subscription_end_date,
             s."lastPaymentDate" as subscription_last_payment_date, s."nextPaymentDate" as subscription_next_payment_date,
             s."planId" as subscription_plan_id,
             p.id as plan_id, p.name as plan_name, p.price as plan_price
      FROM "Company" c
      LEFT JOIN "Subscription" s ON c.id = s."companyId"
      LEFT JOIN "Plan" p ON s."planId" = p.id OR c."planId" = p.id
      WHERE c.id = ${id}
    `;

    if (!companyResult || (Array.isArray(companyResult) && companyResult.length === 0)) {
      return res.status(404).json({ message: 'Empresa não encontrada' });
    }

    const company = Array.isArray(companyResult) ? companyResult[0] : companyResult;

    // GET - Obter detalhes da assinatura de uma empresa
    if (req.method === 'GET') {
      // Buscar os pagamentos recentes
      const recentPayments = await prisma.$queryRaw`
        SELECT * FROM "PaymentHistory"
        WHERE "subscriptionId" = ${company.subscription_id}
        ORDER BY "paymentDate" DESC
        LIMIT 5
      `;
      
      return res.status(200).json({
        id: company.subscription_id,
        companyId: company.id,
        companyName: company.name,
        planId: company.subscription_plan_id || company.planId,
        plan: {
          id: company.plan_id,
          name: company.plan_name,
          price: company.plan_price
        },
        status: company.subscription_status || 'PENDING',
        startDate: company.subscription_start_date || null,
        endDate: company.subscription_end_date || null,
        lastPaymentDate: company.subscription_last_payment_date || null,
        nextPaymentDate: company.subscription_next_payment_date || null,
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
        const planResult = await prisma.$queryRaw`
          SELECT * FROM "Plan" WHERE id = ${planId}
        `;
        
        if (!planResult || (Array.isArray(planResult) && planResult.length === 0)) {
          return res.status(404).json({ message: 'Plano não encontrado' });
        }
        
        plan = Array.isArray(planResult) ? planResult[0] : planResult;
      }

      // Verificar se a empresa já tem uma assinatura
      if (company.subscription_id) {
        // Atualizar assinatura existente
        await prisma.$executeRaw`
          UPDATE "Subscription"
          SET "planId" = ${planId || company.subscription_plan_id},
              status = ${status},
              "startDate" = ${startDate ? new Date(startDate) : company.subscription_start_date},
              "endDate" = ${endDate ? new Date(endDate) : (status === 'EXPIRED' ? null : company.subscription_end_date)},
              "lastPaymentDate" = ${lastPaymentDate ? new Date(lastPaymentDate) : company.subscription_last_payment_date},
              "nextPaymentDate" = ${nextPaymentDate ? new Date(nextPaymentDate) : company.subscription_next_payment_date}
          WHERE id = ${company.subscription_id}
        `;

        // Registrar o histórico de pagamento se necessário
        if (lastPaymentDate && paymentAmount) {
          await prisma.$executeRaw`
            INSERT INTO "PaymentHistory" (
              id, "companyId", "subscriptionId", amount, "paymentDate", "paymentMethod", status, notes, "createdAt", "updatedAt"
            ) VALUES (
              uuid_generate_v4(), ${company.id}, ${company.subscription_id}, 
              ${parseFloat(paymentAmount) || plan?.price || 0}, 
              ${new Date(lastPaymentDate)}, 
              ${paymentMethod || 'MANUAL'}, 
              ${paymentStatus || 'PAID'}, 
              ${paymentNotes || `Pagamento registrado via API - ${new Date().toISOString()}`},
              NOW(), NOW()
            )
          `;
        }

        // Atualizar a empresa com o novo plano, se fornecido
        if (planId) {
          await prisma.$executeRaw`
            UPDATE "Company"
            SET "planId" = ${planId},
                "planType" = ${plan?.name || company.planType},
                "isActive" = ${status === 'ACTIVE'},
                "lastPaymentDate" = ${lastPaymentDate ? new Date(lastPaymentDate) : company.lastPaymentDate}
            WHERE id = ${id}
          `;
        } else {
          // Atualizar apenas o status da empresa
          await prisma.$executeRaw`
            UPDATE "Company"
            SET "isActive" = ${status === 'ACTIVE'},
                "lastPaymentDate" = ${lastPaymentDate ? new Date(lastPaymentDate) : company.lastPaymentDate}
            WHERE id = ${id}
          `;
        }

        // Buscar a empresa atualizada
        const updatedCompanyResult = await prisma.$queryRaw`
          SELECT c.*, 
                 s.id as subscription_id, s.status as subscription_status, 
                 s."startDate" as subscription_start_date, s."endDate" as subscription_end_date,
                 s."lastPaymentDate" as subscription_last_payment_date, s."nextPaymentDate" as subscription_next_payment_date,
                 p.id as plan_id, p.name as plan_name, p.price as plan_price
          FROM "Company" c
          LEFT JOIN "Subscription" s ON c.id = s."companyId"
          LEFT JOIN "Plan" p ON s."planId" = p.id OR c."planId" = p.id
          WHERE c.id = ${id}
        `;

        const updatedCompany = Array.isArray(updatedCompanyResult) ? updatedCompanyResult[0] : updatedCompanyResult;
        
        // Buscar os pagamentos recentes
        const recentPayments = await prisma.$queryRaw`
          SELECT * FROM "PaymentHistory"
          WHERE "subscriptionId" = ${updatedCompany.subscription_id}
          ORDER BY "paymentDate" DESC
          LIMIT 5
        `;

        return res.status(200).json({
          id: updatedCompany.id,
          name: updatedCompany.name,
          planType: updatedCompany.planType,
          planId: updatedCompany.planId,
          plan: {
            id: updatedCompany.plan_id,
            name: updatedCompany.plan_name,
            price: updatedCompany.plan_price
          },
          isActive: updatedCompany.isActive,
          subscription: {
            id: updatedCompany.subscription_id,
            status: updatedCompany.subscription_status,
            startDate: updatedCompany.subscription_start_date,
            endDate: updatedCompany.subscription_end_date,
            lastPaymentDate: updatedCompany.subscription_last_payment_date,
            nextPaymentDate: updatedCompany.subscription_next_payment_date,
            paymentHistory: recentPayments
          },
        });
      } else {
        // Verificar se o planId foi fornecido para criar uma nova assinatura
        if (!planId) {
          return res.status(400).json({ message: 'ID do plano é obrigatório para criar uma nova assinatura' });
        }

        // Criar nova assinatura
        await prisma.$executeRaw`
          INSERT INTO "Subscription" (
            id, "companyId", "planId", status, "startDate", "endDate", "lastPaymentDate", "nextPaymentDate", "createdAt", "updatedAt"
          ) VALUES (
            uuid_generate_v4(), ${id}, ${planId}, 
            ${status}, 
            ${startDate ? new Date(startDate) : new Date()}, 
            ${endDate ? new Date(endDate) : null}, 
            ${lastPaymentDate ? new Date(lastPaymentDate) : null}, 
            ${nextPaymentDate ? new Date(nextPaymentDate) : null},
            NOW(), NOW()
          )
        `;

        // Obter o ID da nova assinatura
        const newSubscriptionIdResult = await prisma.$queryRaw`
          SELECT id FROM "Subscription" 
          WHERE "companyId" = ${id} 
          ORDER BY "createdAt" DESC 
          LIMIT 1
        `;
        
        const newSubscriptionId = Array.isArray(newSubscriptionIdResult) && newSubscriptionIdResult.length > 0 
          ? newSubscriptionIdResult[0].id 
          : null;

        // Registrar o histórico de pagamento se necessário
        if (lastPaymentDate && paymentAmount && newSubscriptionId) {
          await prisma.$executeRaw`
            INSERT INTO "PaymentHistory" (
              id, "companyId", "subscriptionId", amount, "paymentDate", "paymentMethod", status, notes, "createdAt", "updatedAt"
            ) VALUES (
              uuid_generate_v4(), ${id}, ${newSubscriptionId}, 
              ${parseFloat(paymentAmount) || plan?.price || 0}, 
              ${new Date(lastPaymentDate)}, 
              ${paymentMethod || 'MANUAL'}, 
              ${paymentStatus || 'PAID'}, 
              ${paymentNotes || `Pagamento inicial registrado via API - ${new Date().toISOString()}`},
              NOW(), NOW()
            )
          `;
        }

        // Atualizar a empresa com o novo plano
        await prisma.$executeRaw`
          UPDATE "Company"
          SET "planId" = ${planId},
              "planType" = ${plan?.name || company.planType},
              "isActive" = ${status === 'ACTIVE'},
              "lastPaymentDate" = ${lastPaymentDate ? new Date(lastPaymentDate) : company.lastPaymentDate}
          WHERE id = ${id}
        `;

        // Buscar a empresa atualizada
        const updatedCompanyResult = await prisma.$queryRaw`
          SELECT c.*, 
                 s.id as subscription_id, s.status as subscription_status, 
                 s."startDate" as subscription_start_date, s."endDate" as subscription_end_date,
                 s."lastPaymentDate" as subscription_last_payment_date, s."nextPaymentDate" as subscription_next_payment_date,
                 p.id as plan_id, p.name as plan_name, p.price as plan_price
          FROM "Company" c
          LEFT JOIN "Subscription" s ON c.id = s."companyId"
          LEFT JOIN "Plan" p ON s."planId" = p.id OR c."planId" = p.id
          WHERE c.id = ${id}
        `;

        const updatedCompany = Array.isArray(updatedCompanyResult) ? updatedCompanyResult[0] : updatedCompanyResult;
        
        // Buscar os pagamentos recentes
        const recentPayments = await prisma.$queryRaw`
          SELECT * FROM "PaymentHistory"
          WHERE "subscriptionId" = ${updatedCompany.subscription_id}
          ORDER BY "paymentDate" DESC
          LIMIT 5
        `;

        return res.status(200).json({
          id: updatedCompany.id,
          name: updatedCompany.name,
          planType: updatedCompany.planType,
          planId: updatedCompany.planId,
          plan: {
            id: updatedCompany.plan_id,
            name: updatedCompany.plan_name,
            price: updatedCompany.plan_price
          },
          isActive: updatedCompany.isActive,
          subscription: {
            id: updatedCompany.subscription_id,
            status: updatedCompany.subscription_status,
            startDate: updatedCompany.subscription_start_date,
            endDate: updatedCompany.subscription_end_date,
            lastPaymentDate: updatedCompany.subscription_last_payment_date,
            nextPaymentDate: updatedCompany.subscription_next_payment_date,
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
