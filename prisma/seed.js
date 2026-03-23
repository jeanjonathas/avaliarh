const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding do banco de dados...');

  // 1. Criar ou buscar a empresa Dr. Animal
  const drAnimal = await prisma.company.upsert({
    where: { cnpj: '37256198000189' },
    update: {},
    create: {
      name: 'Dr. Animal',
      cnpj: '37256198000189',
      isActive: true,
      maxUsers: 50,
      maxCandidates: 500,
      planType: 'Premium',
    },
  });

  console.log(`✅ Empresa: ${drAnimal.name} (${drAnimal.id})`);

  const hashedPassword = await bcrypt.hash('Je@nfree16', 10);

  // 2. Criar ou atualizar SuperAdmin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'jeanjonathasfb@gmail.com' },
    update: {
      companyId: drAnimal.id,
      role: 'SUPER_ADMIN',
    },
    create: {
      name: 'Jean Jonathas',
      email: 'jeanjonathasfb@gmail.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      companyId: drAnimal.id,
    },
  });

  console.log(`✅ SuperAdmin: ${superAdmin.email} vinculado à ${drAnimal.name}`);

  // 3. Criar ou atualizar CompanyAdmin
  const companyAdmin = await prisma.user.upsert({
    where: { email: 'jean@dranimal.com.br' },
    update: {
      companyId: drAnimal.id,
      role: 'COMPANY_ADMIN',
    },
    create: {
      name: 'Jean Administrador',
      email: 'jean@dranimal.com.br',
      password: hashedPassword,
      role: 'COMPANY_ADMIN',
      companyId: drAnimal.id,
    },
  });

  console.log(`✅ CompanyAdmin: ${companyAdmin.email} vinculado à ${drAnimal.name}`);

  console.log('🌱 Seeding finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
