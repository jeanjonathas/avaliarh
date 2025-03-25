import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 1. Criar o plano premium
  const premiumPlan = await prisma.plan.create({
    data: {
      name: 'Premium',
      description: 'Plano Premium com todas as funcionalidades',
      price: 299.90,
      isActive: true,
    },
  })

  // 2. Criar a empresa Dr. Animal
  const company = await prisma.company.create({
    data: {
      name: 'Dr. Animal',
      cnpj: '37256198000189',
      isActive: true,
      maxUsers: 999999, // Ilimitado
      maxCandidates: 999999, // Ilimitado
      planId: premiumPlan.id,
      planType: 'Premium',
    },
  })

  // 3. Criar o usuário COMPANY_ADMIN
  const hashedPassword = await bcrypt.hash('Je@nfree16', 10)
  
  await prisma.user.create({
    data: {
      name: 'Jean',
      email: 'jean@dranimal.com.br',
      password: hashedPassword,
      role: Role.COMPANY_ADMIN,
      companyId: company.id,
    },
  })

  console.log('Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
