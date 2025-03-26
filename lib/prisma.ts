import { PrismaClient } from '@prisma/client'

// Declarar variável global para o Prisma
declare global {
  var prisma: PrismaClient | undefined
}

// Função para obter a URL do banco de dados correta
function getDatabaseUrl() {
  const originalUrl = process.env.DATABASE_URL || '';
  
  // Em produção, substituir 'postgres' pelo nome específico do contêiner
  if (process.env.NODE_ENV === 'production') {
    // Usar o nome específico do contêiner PostgreSQL do AvaliaRH
    return originalUrl.replace('postgres:', 'avaliarh_postgres.1:');
  }
  
  return originalUrl;
}

// Configurações para evitar problemas de cache
const prismaClientSingleton = () => {
  const dbUrl = getDatabaseUrl();
  console.log(`[PRISMA] Inicializando com URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);
  
  return new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })
}

// Usar variável global para garantir uma única instância
// Funciona tanto em desenvolvimento quanto em produção
export const prisma = globalThis.prisma || prismaClientSingleton()

// Manter a instância global em qualquer ambiente
globalThis.prisma = prisma

// Função para forçar a reconexão do Prisma
export async function reconnectPrisma() {
  try {
    await prisma.$disconnect()
    console.log('Prisma desconectado com sucesso')
    
    // Pequena pausa para garantir desconexão completa
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Testar a conexão
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('Prisma reconectado com sucesso')
    
    return true
  } catch (error) {
    console.error('Erro ao reconectar Prisma:', error)
    return false
  }
}

export default prisma
