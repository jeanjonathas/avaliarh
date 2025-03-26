import { PrismaClient } from '@prisma/client'

// Declarar variável global para o Prisma
declare global {
  var prisma: PrismaClient | undefined
}

// Importar o módulo de configuração do banco de dados
let dbConfig: any;
try {
  // Usar require para evitar problemas com importações dinâmicas
  dbConfig = require('./db-config');
} catch (error) {
  console.error('[PRISMA] Erro ao carregar módulo de configuração do banco de dados:', error);
  // Configuração padrão se não conseguir carregar
  dbConfig = {
    getConfig: () => ({ postgresServiceName: 'postgres' })
  };
}

// Importar o módulo de lock de banco de dados
let dbLock: any;
try {
  // Usar require para evitar problemas com importações dinâmicas
  dbLock = require('./db-lock');
} catch (error) {
  console.error('[PRISMA] Erro ao carregar módulo de lock do banco de dados:', error);
  // Configuração padrão se não conseguir carregar
  dbLock = {
    getDatabaseUrlWithLockedIP: async (url: string) => url
  };
}

// Função para obter a URL do banco de dados com o serviço correto
async function getDatabaseUrl() {
  const originalUrl = process.env.DATABASE_URL || '';
  console.log('[PRISMA] URL original do banco de dados: ' + originalUrl.replace(/:[^:@]+@/, ':****@'));
  
  try {
    // Obter a configuração atual
    const config = dbConfig.getConfig();
    const postgresServiceName = config.postgresServiceName || 'postgres';
    
    console.log(`[PRISMA] Nome do serviço PostgreSQL configurado: ${postgresServiceName}`);
    
    // Substituir o host na URL original
    const urlParts = originalUrl.split('@');
    if (urlParts.length !== 2) {
      console.log('[PRISMA] Formato de URL inválido, usando original');
      return originalUrl;
    }
    
    const credentials = urlParts[0]; // postgresql://usuario:senha
    const hostAndDb = urlParts[1];   // host:porta/banco
    
    // Extrair o host da URL
    const hostParts = hostAndDb.split('/');
    const hostPort = hostParts[0].split(':');
    const port = hostPort[1] || '5432';
    
    // Reconstruir a URL com o nome do serviço correto
    const dbName = hostParts.slice(1).join('/');
    const newUrl = `${credentials}@${postgresServiceName}:${port}/${dbName}`;
    
    // Log da URL (com senha ocultada)
    console.log('[PRISMA] URL modificada com serviço correto: ' + newUrl.replace(/:[^:@]+@/, ':****@'));
    
    // Em produção, vamos bloquear o IP do PostgreSQL
    if (process.env.NODE_ENV === 'production') {
      try {
        // Usar o módulo de lock para obter a URL com IP fixo
        const lockedUrl = await dbLock.getDatabaseUrlWithLockedIP(newUrl);
        return lockedUrl;
      } catch (error) {
        console.error('[PRISMA] Erro ao obter URL com IP fixo:', error);
        return newUrl;
      }
    }
    
    return newUrl;
  } catch (error) {
    console.error('[PRISMA] Erro ao processar URL do banco de dados:', error);
    return originalUrl;
  }
}

// Configurações para evitar problemas de cache
const prismaClientSingleton = async () => {
  const dbUrl = await getDatabaseUrl();
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

// Inicialização assíncrona do Prisma
let prismaInstance: PrismaClient;

async function initPrisma() {
  if (!globalThis.prisma) {
    console.log('[PRISMA] Inicializando instância do Prisma...');
    prismaInstance = await prismaClientSingleton();
    globalThis.prisma = prismaInstance;
  } else {
    console.log('[PRISMA] Usando instância global existente do Prisma');
    prismaInstance = globalThis.prisma;
  }
  return prismaInstance;
}

// Inicialização imediata
initPrisma().catch(e => {
  console.error('[PRISMA] Erro na inicialização:', e);
});

// Exportar a instância do Prisma
export const prisma = prismaInstance || globalThis.prisma || new PrismaClient();

// Manter a instância global em qualquer ambiente
globalThis.prisma = prisma;

// Função para forçar a reconexão do Prisma com IP fixo
export async function reconnectPrisma() {
  try {
    console.log('[PRISMA] Iniciando reconexão...');
    await prisma.$disconnect()
    console.log('[PRISMA] Desconectado com sucesso');
    
    // Pequena pausa para garantir desconexão completa
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Forçar a resolução do IP novamente
    if (process.env.NODE_ENV === 'production') {
      try {
        const originalUrl = process.env.DATABASE_URL || '';
        const hostName = originalUrl.split('@')[1]?.split('/')[0]?.split(':')[0] || 'postgres';
        await dbLock.resolveAndLockPostgresIP(hostName);
      } catch (error) {
        console.error('[PRISMA] Erro ao resolver IP do PostgreSQL:', error);
      }
    }
    
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
