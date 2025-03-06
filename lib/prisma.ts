import { PrismaClient } from '@prisma/client'

// Declarar a variável global para o PrismaClient
declare global {
  var prisma: PrismaClient | undefined
}

// Criar uma instância do PrismaClient que será reutilizada
export const prisma = global.prisma || new PrismaClient()

// Em desenvolvimento, anexar o cliente ao objeto global para evitar múltiplas instâncias
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}
