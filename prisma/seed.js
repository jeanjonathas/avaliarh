const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Criar o cliente Prisma com configuração explícita para evitar o erro de enableTracing
const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
});

async function main() {
  // Verificar se já existe um superadmin
  const superAdminCount = await prisma.user.count({
    where: {
      role: 'SUPER_ADMIN'
    }
  });
  
  if (superAdminCount === 0) {
    // Criar superadmin com as credenciais fornecidas
    const hashedPassword = await bcrypt.hash('Je@nfree16', 10);
    
    // Criar usuário no modelo User com o papel de SUPER_ADMIN
    await prisma.user.create({
      data: {
        name: 'Jean Jonathas',
        email: 'jeanjonathasfb@gmail.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
      },
    });
    
    console.log('Superadmin criado com sucesso:');
    console.log('Email: jeanjonathasfb@gmail.com');
    console.log('Senha: Je@nfree16');
  } else {
    console.log('Superadmin já existe, pulando criação.');
  }

  // Verificar se já existe a empresa Dr. Animal
  const drAnimalCount = await prisma.company.count({
    where: {
      cnpj: '37256198000189'
    }
  });

  if (drAnimalCount === 0) {
    // Criar a empresa Dr. Animal
    const drAnimal = await prisma.company.create({
      data: {
        name: 'Dr. Animal',
        cnpj: '37256198000189',
        isActive: true,
        maxUsers: 50,
        maxCandidates: 500,
        planType: 'Premium',
      }
    });

    console.log('Empresa Dr. Animal criada com sucesso:', drAnimal.id);

    // Verificar se já existe o usuário COMPANY_ADMIN para Dr. Animal
    const companyAdminCount = await prisma.user.count({
      where: {
        email: 'jean@dranimal.com.br'
      }
    });

    if (companyAdminCount === 0) {
      // Criar usuário COMPANY_ADMIN
      const hashedPassword = await bcrypt.hash('Je@nfree16', 10);
      
      const companyAdmin = await prisma.user.create({
        data: {
          name: 'Jean Administrador',
          email: 'jean@dranimal.com.br',
          password: hashedPassword,
          role: 'COMPANY_ADMIN',
          companyId: drAnimal.id,
        }
      });
      
      console.log('Administrador da empresa criado com sucesso:');
      console.log('Email: jean@dranimal.com.br');
      console.log('Senha: Je@nfree16');
      console.log('Empresa: Dr. Animal');
    } else {
      console.log('Administrador da empresa já existe, pulando criação.');
    }
  } else {
    console.log('Empresa Dr. Animal já existe, pulando criação.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
