import { PrismaClient } from '@prisma/client'

// Declarar variável global para o Prisma
declare global {
  var prisma: PrismaClient | undefined
}

// Função para obter a URL do banco de dados correta
function getDatabaseUrl() {
  const originalUrl = process.env.DATABASE_URL || '';
  
  // Em produção, precisamos garantir que a conexão seja feita com o contêiner correto
  if (process.env.NODE_ENV === 'production') {
    // Vamos usar o nome 'postgres' que é o nome do serviço definido no docker-compose
    // O Docker resolve esse nome para o IP correto dentro da rede interna
    console.log('[PRISMA] Ambiente de produção detectado');
  }
  
  console.log('[PRISMA] URL original do banco de dados: ' + originalUrl.replace(/:[^:@]+@/, ':****@'));
  return originalUrl;
}

// Configurações para evitar problemas de cache
const prismaClientSingleton = () => {
  const dbUrl = getDatabaseUrl();
  console.log('[PRISMA] Inicializando com URL: ' + dbUrl.replace(/:[^:@]+@/, ':****@'));
  
  return new PrismaClient({
    log: ['error', 'query'],
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
    console.log('[PRISMA] Iniciando reconexão...');
    await prisma.$disconnect()
    console.log('[PRISMA] Desconectado com sucesso');
    
    // Pequena pausa para garantir desconexão completa
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Testar a conexão
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('[PRISMA] Reconectado com sucesso');
    
    return true
  } catch (error) {
    console.error('[PRISMA] Erro ao reconectar:', error)
    return false
  }
}

export default prisma
