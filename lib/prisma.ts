import { PrismaClient } from '@prisma/client'

// Declarar variável global para o Prisma
declare global {
  var prisma: PrismaClient | undefined
}

// Configurações para evitar problemas de cache
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
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
