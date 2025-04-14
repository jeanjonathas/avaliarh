const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
})

async function main() {
  // Obter o ID da etapa de Raciocínio Lógico
  const stages = await prisma.stage.findMany({
    orderBy: {
      order: 'asc'
    }
  })

  if (stages.length < 1) {
    console.error('Não foram encontradas etapas no banco de dados')
    return
  }

  const raciocinio_logico_id = stages[0].id

  // Questões adicionais de Raciocínio Lógico
  const raciocinio_logico_questions = [
    {
      text: 'Se A → B e B → C, então:',
      options: [
        { text: 'A sempre implica C', isCorrect: true },
        { text: 'C sempre implica A', isCorrect: false },
        { text: 'A e C não têm relação', isCorrect: false },
        { text: 'Nenhuma das alternativas', isCorrect: false }
      ]
    },
    {
      text: 'Quantos quadrados há em um tabuleiro de xadrez 3x3?',
      options: [
        { text: '9', isCorrect: false },
        { text: '14', isCorrect: false },
        { text: '15', isCorrect: true },
        { text: '13', isCorrect: false }
      ]
    },
    {
      text: 'Se todos os cachorros latem e Rex é um cachorro, então:',
      options: [
        { text: 'Rex não late', isCorrect: false },
        { text: 'Rex pode latir', isCorrect: false },
        { text: 'Rex late', isCorrect: true },
        { text: 'Nenhuma das alternativas', isCorrect: false }
      ]
    },
    {
      text: 'Se 5x + 10 = 30, qual o valor de x?',
      options: [
        { text: '2', isCorrect: false },
        { text: '4', isCorrect: true },
        { text: '5', isCorrect: false },
        { text: '6', isCorrect: false }
      ]
    },
    {
      text: 'Se um número é múltiplo de 3 e de 4, ele também é múltiplo de:',
      options: [
        { text: '6', isCorrect: false },
        { text: '9', isCorrect: false },
        { text: '12', isCorrect: true },
        { text: '8', isCorrect: false }
      ]
    }
  ]

  // Adicionar questões adicionais de Raciocínio Lógico
  console.log('Adicionando questões adicionais de Raciocínio Lógico...')
  for (const question of raciocinio_logico_questions) {
    await prisma.question.create({
      data: {
        text: question.text,
        stageId: raciocinio_logico_id,
        options: {
          create: question.options
        }
      }
    })
  }

  console.log('Questões adicionais adicionadas com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
