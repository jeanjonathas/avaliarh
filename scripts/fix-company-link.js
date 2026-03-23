const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Correção de Vínculo de Empresa ---');
  
  // 1. Buscar a empresa Dr. Animal (ou a primeira disponível)
  const company = await prisma.company.findFirst({
    where: {
      cnpj: '37256198000189'
    }
  }) || await prisma.company.findFirst();

  if (!company) {
    console.error('❌ Erro: Nenhuma empresa encontrada no banco!');
    return;
  }

  console.log(`✅ Empresa encontrada: ${company.name} (${company.id})`);

  // 2. Atualizar o SuperAdmin para ter esse companyId
  const result = await prisma.user.updateMany({
    where: {
      role: 'SUPER_ADMIN',
      companyId: null
    },
    data: {
      companyId: company.id
    }
  });

  console.log(`✅ Usuários SuperAdmin atualizados: ${result.count}`);
  
  // 3. Garantir que outros administradores também estejam vinculados (se houver)
  const result2 = await prisma.user.updateMany({
    where: {
      email: 'jean@dranimal.com.br',
      companyId: null
    },
    data: {
      companyId: company.id
    }
  });
  
  if (result2.count > 0) {
    console.log(`✅ Usuário jean@dranimal.com.br vinculado à empresa.`);
  }

  console.log('--- Correção Concluída ---');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a correção:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
