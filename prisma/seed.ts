import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Verificar se já existe um usuário administrador
  const adminCount = await prisma.user.count()
  
  if (adminCount === 0) {
    // Criar usuário administrador padrão
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@empresa.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    })
    
    console.log('Usuário administrador criado com sucesso!')
    console.log('Email: admin@empresa.com')
    console.log('Senha: admin123')
  } else {
    console.log('Usuário administrador já existe, pulando criação.')
  }
  
  // Verificar se já existe um administrador no novo modelo Admin
  const newAdminCount = await prisma.admin.count()
  
  if (newAdminCount === 0) {
    // Criar administrador padrão no novo modelo
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    await prisma.admin.create({
      data: {
        name: 'Administrador',
        email: 'admin@empresa.com',
        password: hashedPassword,
        company: 'AvaliaRH',
        position: 'Gerente de RH',
        phone: '(11) 99999-9999',
      },
    })
    
    console.log('Administrador criado no novo modelo com sucesso!')
  } else {
    console.log('Administrador no novo modelo já existe, pulando criação.')
  }
  
  // Verificar se já existem etapas
  const stageCount = await prisma.stage.count()
  
  if (stageCount === 0) {
    // Criar as 6 etapas do sistema de avaliação
    const stages = [
      { id: '1', title: 'Raciocínio Lógico', description: 'Testes de padrões, sequências e dedução lógica', order: 1, updatedAt: new Date() },
      { id: '2', title: 'Matemática Básica e Resolução de Problemas', description: 'Cálculo mental, proporções e análise de dados', order: 2, updatedAt: new Date() },
      { id: '3', title: 'Compreensão Verbal', description: 'Interpretação de texto, sinônimos, analogias', order: 3, updatedAt: new Date() },
      { id: '4', title: 'Aptidão Espacial', description: 'Questões envolvendo rotação mental e padrões visuais', order: 4, updatedAt: new Date() },
      { id: '5', title: 'Raciocínio Abstrato', description: 'Questões que exigem encontrar relações não óbvias', order: 5, updatedAt: new Date() },
      { id: '6', title: 'Tomada de Decisão e Solução de Problemas', description: 'Situações hipotéticas e a melhor resposta', order: 6, updatedAt: new Date() },
    ]
    
    for (const stage of stages) {
      await prisma.stage.create({
        data: stage,
      })
    }
    
    console.log('Etapas padrão criadas com sucesso!')
  } else {
    console.log('Etapas já existem, pulando criação.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
