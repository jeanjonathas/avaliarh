import { PrismaClient } from '@prisma/client'

// Usar uma variável para armazenar a instância do PrismaClient
let prisma: PrismaClient

// Verificar se já existe uma instância global do PrismaClient
if (process.env.NODE_ENV === 'production') {
  // Em produção, sempre criar uma nova instância
  prisma = new PrismaClient()
} else {
  // Em desenvolvimento, reutilizar a instância global para evitar múltiplas conexões
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient()
  }
  prisma = (global as any).prisma
}

export { prisma }
