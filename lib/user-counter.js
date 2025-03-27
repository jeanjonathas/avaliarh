// lib/user-counter.js
const { prisma, reconnectPrisma } = require('./prisma');

/**
 * Conta o número de usuários para uma empresa específica
 * com limpeza de cache garantida
 * 
 * @param {string} companyId - ID da empresa
 * @returns {Promise<number>} - Número de usuários
 */
async function countUsersForCompany(companyId) {
  console.log(`[USER-COUNTER] Iniciando contagem de usuários para empresa ${companyId}`);
  console.log(`[USER-COUNTER] Tipo do companyId: ${typeof companyId}, Valor: ${companyId}`);
  
  try {
    // Forçar reconexão para limpar o cache
    await reconnectPrisma();
    console.log(`[USER-COUNTER] Prisma reconectado para contagem de usuários`);
    
    // Verificar se o companyId é válido
    if (!companyId) {
      console.log(`[USER-COUNTER] ID da empresa inválido: ${companyId}`);
      return 0;
    }
    
    // Tentar buscar todos os usuários para depuração
    console.log(`[USER-COUNTER] Buscando todos os usuários para depuração...`);
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        companyId: true
      }
    });
    console.log(`[USER-COUNTER] Total de usuários no sistema: ${allUsers.length}`);
    console.log(`[USER-COUNTER] Usuários encontrados:`, JSON.stringify(allUsers, null, 2));
    
    // Verificar quais usuários têm o companyId específico
    const usersWithCompany = allUsers.filter(user => user.companyId === companyId);
    console.log(`[USER-COUNTER] Usuários com companyId ${companyId}: ${usersWithCompany.length}`);
    
    // Usar o método do Prisma diretamente
    const count = await prisma.user.count({
      where: { 
        companyId: companyId
      }
    });
    
    console.log(`[USER-COUNTER] Resultado da contagem do Prisma: ${count}`);
    
    return count;
  } catch (error) {
    console.error(`[USER-COUNTER] Erro ao contar usuários:`, error);
    return 0; // Valor padrão em caso de erro
  } finally {
    // Desconectar para liberar recursos
    try {
      await prisma.$disconnect();
      console.log(`[USER-COUNTER] Prisma desconectado após contagem`);
    } catch (disconnectError) {
      console.error(`[USER-COUNTER] Erro ao desconectar:`, disconnectError);
    }
  }
}

module.exports = {
  countUsersForCompany
};
