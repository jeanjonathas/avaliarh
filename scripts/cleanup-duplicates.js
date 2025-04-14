/**
 * Script para limpar empresas duplicadas no banco de dados
 * Este script identifica empresas com o mesmo CNPJ e mantém apenas a mais antiga
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
});

async function cleanupDuplicateCompanies() {
  console.log('=== LIMPEZA DE EMPRESAS DUPLICADAS ===');
  
  try {
    // 1. Encontrar todos os CNPJs duplicados
    console.log('Buscando CNPJs duplicados...');
    const duplicateCnpjs = await prisma.$queryRaw`
      SELECT cnpj, COUNT(*) as count
      FROM "Company"
      GROUP BY cnpj
      HAVING COUNT(*) > 1
    `;
    
    if (duplicateCnpjs.length === 0) {
      console.log('Nenhum CNPJ duplicado encontrado.');
      return;
    }
    
    console.log(`Encontrados ${duplicateCnpjs.length} CNPJs duplicados.`);
    
    // 2. Para cada CNPJ duplicado, manter apenas a empresa mais antiga
    for (const duplicate of duplicateCnpjs) {
      const cnpj = duplicate.cnpj;
      console.log(`\nProcessando CNPJ duplicado: ${cnpj}`);
      
      // Encontrar todas as empresas com este CNPJ
      const companies = await prisma.company.findMany({
        where: { cnpj },
        orderBy: { createdAt: 'asc' } // Ordenar pela mais antiga primeiro
      });
      
      console.log(`Encontradas ${companies.length} empresas com CNPJ ${cnpj}`);
      
      // Manter a primeira empresa (mais antiga) e excluir as demais
      const companyToKeep = companies[0];
      const companiesToDelete = companies.slice(1);
      
      console.log(`Mantendo empresa: ${companyToKeep.id} (${companyToKeep.name})`);
      
      // Para cada empresa que será excluída
      for (const company of companiesToDelete) {
        console.log(`Processando empresa para exclusão: ${company.id} (${company.name})`);
        
        // 1. Encontrar todos os usuários associados a esta empresa
        const users = await prisma.user.findMany({
          where: { companyId: company.id }
        });
        
        console.log(`Encontrados ${users.length} usuários associados à empresa ${company.id}`);
        
        // 2. Atualizar os usuários para apontar para a empresa que será mantida
        if (users.length > 0) {
          console.log(`Migrando usuários para a empresa ${companyToKeep.id}...`);
          
          for (const user of users) {
            await prisma.user.update({
              where: { id: user.id },
              data: { companyId: companyToKeep.id }
            });
          }
          
          console.log('Usuários migrados com sucesso.');
        }
        
        // 3. Migrar outros dados relacionados (se existirem)
        // ... Adicionar aqui outras migrações necessárias ...
        
        // 4. Excluir a empresa duplicada
        try {
          await prisma.company.delete({
            where: { id: company.id }
          });
          console.log(`Empresa ${company.id} excluída com sucesso.`);
        } catch (error) {
          console.error(`Erro ao excluir empresa ${company.id}:`, error);
          console.log('Tentando desativar a empresa em vez de excluir...');
          
          // Se não conseguir excluir, apenas desativar
          await prisma.company.update({
            where: { id: company.id },
            data: { 
              isActive: false,
              name: `[DUPLICADA] ${company.name}` 
            }
          });
          console.log(`Empresa ${company.id} desativada.`);
        }
      }
    }
    
    console.log('\nLimpeza de empresas duplicadas concluída com sucesso!');
    
  } catch (error) {
    console.error('Erro durante a limpeza de empresas duplicadas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a limpeza
cleanupDuplicateCompanies().catch(console.error);
