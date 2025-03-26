import { PrismaClient } from '@prisma/client'

// Declarar variável global para o Prisma
declare global {
  var prisma: PrismaClient | undefined
}

// Função para obter a URL do banco de dados correta
function getDatabaseUrl() {
  const originalUrl = process.env.DATABASE_URL || '';
  
  // Em produção, precisamos especificar o contêiner correto
  if (process.env.NODE_ENV === 'production') {
    // Vamos modificar apenas o host, mantendo as credenciais originais
    // Formato típico: postgresql://usuario:senha@host:porta/banco
    const urlParts = originalUrl.split('@');
    if (urlParts.length === 2) {
      const credentials = urlParts[0]; // postgresql://usuario:senha
      const hostAndDb = urlParts[1];   // host:porta/banco
      
      // Substituir apenas o host pelo nome específico do contêiner
      const hostParts = hostAndDb.split('/');
      if (hostParts.length >= 1) {
        // Substituir 'postgres' por 'avaliarh_postgres.1' apenas no host
        const newHost = 'avaliarh_postgres.1:5432';
        const dbName = hostParts.slice(1).join('/');
        return `${credentials}@${newHost}/${dbName}`;
      }
    }
  }
  
  return originalUrl;
}

// Configurações para evitar problemas de cache
const prismaClientSingleton = () => {
  const dbUrl = getDatabaseUrl();
  console.log('[PRISMA] Inicializando com URL: ' + dbUrl.replace(/:[^:@]+@/, ':****@'));
  
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
