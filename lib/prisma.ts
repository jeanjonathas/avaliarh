import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import { exec } from 'child_process'
import { getConfig } from './db-config'
import * as util from 'util'

// Declarar variável global para o Prisma
declare global {
  var prisma: PrismaClient | undefined
}

// Função para verificar se estamos rodando dentro do Docker
async function isRunningInsideDocker() {
  try {
    // Verificar se estamos em um contêiner Docker
    const isInDocker = fs.existsSync('/.dockerenv')
    return isInDocker
  } catch (error) {
    console.error('[PRISMA] Erro ao verificar se estamos dentro do Docker:', error)
    return false
  }
}

// Função para obter o ID do contêiner
async function getContainerId() {
  try {
    // Verificar se estamos em um contêiner Docker
    const isInDocker = fs.existsSync('/.dockerenv')
    if (!isInDocker) {
      return 'não-docker'
    }

    // Tentar obter o ID do contêiner usando o arquivo /proc/self/cgroup
    if (fs.existsSync('/proc/self/cgroup')) {
      const cgroupContent = fs.readFileSync('/proc/self/cgroup', 'utf8')
      const lines = cgroupContent.split('\n')
      
      for (const line of lines) {
        if (line.includes('docker')) {
          const match = line.match(/[0-9a-f]{12,}/)
          if (match) {
            return match[0]
          }
        }
      }
    }
    
    // Método alternativo usando o hostname
    const execPromise = util.promisify(exec)
    const { stdout: hostname } = await execPromise('hostname')
    return hostname.trim()
  } catch (error) {
    console.error('[DB-LOCK] Erro ao obter ID do contêiner:', error)
    return 'desconhecido'
  }
}

// Função para obter a URL do banco de dados com o serviço correto
async function getDatabaseUrl() {
  // Obter a URL original do banco de dados
  const originalUrl = process.env.DATABASE_URL || ''
  console.log('[PRISMA] URL original do banco de dados:', originalUrl.replace(/:([^:@]+)@/, ':****@'))
  
  // Obter o nome do serviço PostgreSQL configurado
  const config = getConfig()
  const postgresServiceName = config.postgresServiceName
  console.log('[PRISMA] Nome do serviço PostgreSQL configurado:', postgresServiceName)
  
  // Verificar se estamos em ambiente de desenvolvimento
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Verificar se estamos rodando dentro do Docker ou diretamente no host
  const isRunningInDocker = await isRunningInsideDocker()
  console.log('[PRISMA] Rodando dentro do Docker:', isRunningInDocker ? 'Sim' : 'Não')
  
  // Substituir o host na URL pelo nome do serviço configurado
  let modifiedUrl = originalUrl
  
  if (isDevelopment) {
    if (isRunningInDocker) {
      // Em desenvolvimento dentro do Docker, usar o nome do serviço
      modifiedUrl = originalUrl.replace(/@([^:]+):/, `@${postgresServiceName}:`)
      console.log('[PRISMA] Ambiente de desenvolvimento dentro do Docker, usando serviço:', postgresServiceName)
    } else {
      // Em desenvolvimento fora do Docker, usar localhost
      modifiedUrl = originalUrl.replace(/@([^:]+):/, `@localhost:`)
      console.log('[PRISMA] Ambiente de desenvolvimento fora do Docker, usando localhost')
    }
  } else {
    // Em produção, usar o nome do serviço fixo
    modifiedUrl = originalUrl.replace(/@([^:]+):/, `@avaliarh_postgres:`)
    console.log('[PRISMA] Ambiente de produção detectado, usando serviço: avaliarh_postgres')
  }
  
  console.log('[PRISMA] URL modificada com serviço correto:', modifiedUrl.replace(/:([^:@]+)@/, ':****@'))
  
  // Verificar se estamos em um contêiner Docker
  const isInDocker = fs.existsSync('/.dockerenv')
  
  if (isInDocker) {
    // Tentar resolver o IP do host para bloquear a conexão
    try {
      const containerId = await getContainerId()
      console.log('[DB-LOCK] ID do contêiner atual:', containerId)
      
      const execPromise = util.promisify(exec)
      
      // Usar o nome do serviço correto baseado no ambiente
      const serviceNameToResolve = isDevelopment ? postgresServiceName : 'avaliarh_postgres'
      console.log('[DB-LOCK] Resolvendo IP para o host:', serviceNameToResolve)
      
      const { stdout: hostIp } = await execPromise(`getent hosts ${serviceNameToResolve}`)
      
      if (hostIp && hostIp.trim()) {
        const ip = hostIp.trim().split(/\s+/)[0]
        console.log('[DB-LOCK] IP resolvido:', ip)
        
        // Criar URL com IP bloqueado
        const ipUrl = modifiedUrl.replace(/@([^:]+):/, `@${ip}:`)
        console.log('[DB-LOCK] URL com IP bloqueado:', ipUrl.replace(/:([^:@]+)@/, ':****@'))
        return ipUrl
      }
    } catch (error) {
      console.error('[DB-LOCK] Erro ao resolver e bloquear IP:', error)
      console.log('[DB-LOCK] Não foi possível obter IP bloqueado, usando URL original')
    }
  }
  
  console.log('[PRISMA] Inicializando com URL:', modifiedUrl.replace(/:([^:@]+)@/, ':****@'))
  return modifiedUrl
}

/**
 * Versão melhorada do singleton do Prisma Client
 * - Evita múltiplas instâncias
 * - Controle mais preciso do ciclo de vida
 * - Melhor manipulação do cache
 */
const createPrismaClient = async (): Promise<PrismaClient> => {
  console.log('[PRISMA] Criando nova instância do Prisma Client')
  const dbUrl = await getDatabaseUrl()
  
  return new PrismaClient({
    log: ['error', 'query'],
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })
}

// Variável local para o singleton
let prismaInstance: PrismaClient | undefined

/**
 * Obtém a instância atual do Prisma ou cria uma nova se necessário
 * Esta função não deve ser chamada diretamente - use a exportação 'prisma'
 */
export const getPrismaClient = async (): Promise<PrismaClient> => {
  // Se já temos uma instância local, retorná-la
  if (prismaInstance) {
    return prismaInstance
  }
  
  // Se existe uma instância global, usá-la
  if (globalThis.prisma) {
    console.log('[PRISMA] Usando instância global existente')
    prismaInstance = globalThis.prisma
    return prismaInstance
  }
  
  // Criar nova instância
  const newInstance = await createPrismaClient()
  
  // Armazenar localmente e globalmente
  prismaInstance = newInstance
  globalThis.prisma = newInstance
  
  return newInstance
}

// Inicializar o Prisma de forma assíncrona
const prismaClientPromise = getPrismaClient()

// Exportar o cliente na forma que pode ser importado sem async/await
export const prisma = globalThis.prisma || 
  // Fallback para uma instância nova se necessário, embora isso não deva acontecer
  // se o código estiver sendo executado corretamente
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.NODE_ENV === 'development' 
          ? `postgresql://postgres:postgres@localhost:5432/avaliarh`
          : process.env.DATABASE_URL,
      },
    },
  })

// Garantir que a variável global seja sempre atualizada
globalThis.prisma = prisma

/**
 * Força a reconexão do Prisma Client, limpando o cache
 * Use esta função quando precisar de dados frescos do banco
 */
export async function reconnectPrisma() {
  try {
    console.log('[PRISMA] Iniciando reconexão para limpar cache...')
    
    // Desconectar o cliente Prisma
    await prisma.$disconnect()
    console.log('[PRISMA] Desconectado com sucesso')
    
    // Pequena pausa para garantir desconexão completa
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Forçar a conexão com uma consulta simples
    // Usar localhost em ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      // Criar uma nova instância do Prisma com a URL correta
      const tempPrisma = new PrismaClient({
        datasources: {
          db: {
            url: `postgresql://postgres:postgres@localhost:5432/avaliarh`
          }
        }
      })
      
      // Testar a conexão
      const result = await tempPrisma.$queryRaw`SELECT 1 as test`
      console.log('[PRISMA] Reconectado com sucesso usando localhost')
      
      // Desconectar a instância temporária
      await tempPrisma.$disconnect()
      
      return true
    } else {
      // Em produção, usar a instância global
      const result = await prisma.$queryRaw`SELECT 1 as test`
      console.log('[PRISMA] Reconectado com sucesso')
      
      return true
    }
  } catch (error) {
    console.error('[PRISMA] Erro ao reconectar Prisma:', error)
    return false
  }
}

/**
 * Função utilitária para executar uma operação com cache limpo
 * Use quando precisar garantir dados frescos do banco
 */
export async function withFreshCache<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> {
  try {
    // Forçar reconexão para limpar cache
    await reconnectPrisma()
    
    // Executar a operação
    return await operation(prisma)
  } catch (error) {
    console.error('[PRISMA] Erro em operação com cache limpo:', error)
    throw error
  }
}

/**
 * Executa uma consulta SQL direta, evitando o cache do Prisma
 * Ideal para operações de contagem e outras consultas propensas a problemas de cache
 */
export async function directQuery<T>(sql: string, ...params: any[]): Promise<T> {
  return withFreshCache(async (client) => {
    return client.$queryRawUnsafe(sql, ...params) as Promise<T>
  })
}

// Exportar singleton como default
export default prisma
