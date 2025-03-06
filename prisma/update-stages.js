const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Novas etapas com descrições detalhadas
  const stages = [
    { 
      title: 'Raciocínio Lógico', 
      description: 'Testes de padrões, sequências e dedução lógica.', 
      order: 1 
    },
    { 
      title: 'Matemática Básica e Resolução de Problemas', 
      description: 'Cálculo mental, proporções e análise de dados.', 
      order: 2 
    },
    { 
      title: 'Compreensão Verbal', 
      description: 'Interpretação de texto, sinônimos, analogias.', 
      order: 3 
    },
    { 
      title: 'Aptidão Espacial', 
      description: 'Questões envolvendo rotação mental e padrões visuais.', 
      order: 4 
    },
    { 
      title: 'Raciocínio Abstrato', 
      description: 'Questões que exigem encontrar relações não óbvias.', 
      order: 5 
    },
    { 
      title: 'Tomada de Decisão e Solução de Problemas', 
      description: 'Situações hipotéticas e a melhor resposta.', 
      order: 6 
    },
  ]
  
  // Limpar todas as etapas existentes
  await prisma.stage.deleteMany({})
  
  // Criar as novas etapas
  for (const stage of stages) {
    await prisma.stage.create({
      data: stage,
    })
  }
  
  console.log('Etapas atualizadas com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
