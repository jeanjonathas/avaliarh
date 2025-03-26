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
  
  try {
    // Forçar reconexão para limpar o cache
    await reconnectPrisma();
    console.log(`[USER-COUNTER] Prisma reconectado para contagem de usuários`);
    
    // Contar usuários diretamente com uma query raw para evitar cache
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "User" 
      WHERE "companyId" = ${companyId}::uuid
    `;
    
    const count = parseInt(result[0].count, 10);
    console.log(`[USER-COUNTER] Encontrados ${count} usuários para empresa ${companyId}`);
    
    return count;
  } catch (error) {
    console.error(`[USER-COUNTER] Erro ao contar usuários:`, error);
    // Em caso de erro, tentar novamente com método padrão
    try {
      const count = await prisma.user.count({
        where: { companyId }
      });
      console.log(`[USER-COUNTER] Método alternativo encontrou ${count} usuários`);
      return count;
    } catch (fallbackError) {
      console.error(`[USER-COUNTER] Erro no método alternativo:`, fallbackError);
      return 0; // Valor padrão em caso de erro
    }
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
