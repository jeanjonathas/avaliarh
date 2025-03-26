import { PrismaClient } from '@prisma/client'
import { getConfig } from './db-config'
import * as fs from 'fs'

// Declarar variável global para o Prisma
declare global {
  var prisma: PrismaClient | undefined
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
    const { exec } = require('child_process')
    const util = require('util')
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
  
  // Substituir o host na URL pelo nome do serviço configurado
  const modifiedUrl = originalUrl.replace(/@([^:]+):/, `@${postgresServiceName}:`)
  console.log('[PRISMA] URL modificada com serviço correto:', modifiedUrl.replace(/:([^:@]+)@/, ':****@'))
  
  // Verificar se estamos em um contêiner Docker
  const isInDocker = fs.existsSync('/.dockerenv')
  
  if (isInDocker) {
    // Tentar resolver o IP do host para bloquear a conexão
    try {
      const containerId = await getContainerId()
      console.log('[DB-LOCK] ID do contêiner atual:', containerId)
      
      const { exec } = require('child_process')
      const util = require('util')
      const execPromise = util.promisify(exec)
      
      console.log('[DB-LOCK] Resolvendo IP para o host:', postgresServiceName)
      const { stdout: hostIp } = await execPromise(`getent hosts ${postgresServiceName}`)
      
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

// Configurações para evitar problemas de cache
const prismaClientSingleton = async () => {
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

// Inicialização do Prisma com padrão singleton
let prismaInstance: PrismaClient | undefined = undefined

// Função para inicializar o Prisma
async function initPrisma() {
  if (!globalThis.prisma) {
    console.log('[PRISMA] Inicializando instância do Prisma...')
    prismaInstance = await prismaClientSingleton()
    globalThis.prisma = prismaInstance
  } else {
    console.log('[PRISMA] Usando instância global existente do Prisma')
    prismaInstance = globalThis.prisma
  }
  return prismaInstance
}

// Inicializar o Prisma
initPrisma().catch(e => {
  console.error('[PRISMA] Erro na inicialização:', e)
})

// Exportar a instância do Prisma
export const prisma = globalThis.prisma || prismaInstance || new PrismaClient()

// Manter a instância global em qualquer ambiente
globalThis.prisma = prisma

// Função para forçar a reconexão do Prisma
export async function reconnectPrisma() {
  try {
    await prisma.$disconnect()
    console.log('[PRISMA] Prisma desconectado com sucesso')
    
    // Pequena pausa para garantir desconexão completa
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Testar a conexão
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('[PRISMA] Prisma reconectado com sucesso')
    
    return true
  } catch (error) {
    console.error('[PRISMA] Erro ao reconectar Prisma:', error)
    return false
  }
}

export default prisma
