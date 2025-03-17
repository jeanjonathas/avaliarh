const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
