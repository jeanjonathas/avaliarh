const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
})

async function main() {
  // Obter o ID da etapa de Matemática Básica
  const stages = await prisma.stage.findMany({
    orderBy: {
      order: 'asc'
    }
  })

  if (stages.length < 2) {
    console.error('Não foram encontradas etapas suficientes no banco de dados')
    return
  }

  const matematica_basica_id = stages[1].id

  // Questões adicionais de Matemática Básica
  const matematica_basica_questions = [
    {
      text: 'Se um cão pesa 20 kg e deve receber 2,5 mg de medicamento por quilo, qual a dose total?',
      options: [
        { text: '40 mg', isCorrect: false },
        { text: '50 mg', isCorrect: true },
        { text: '45 mg', isCorrect: false },
        { text: '55 mg', isCorrect: false }
      ]
    },
    {
      text: 'Se um estoque tem 250 unidades de um produto e são vendidos 40 por dia, em quantos dias ele acabará?',
      options: [
        { text: '5', isCorrect: false },
        { text: '6', isCorrect: false },
        { text: '7', isCorrect: true },
        { text: '8', isCorrect: false }
      ]
    },
    {
      text: 'Qual o valor de 15% de 200?',
      options: [
        { text: '25', isCorrect: false },
        { text: '30', isCorrect: true },
        { text: '35', isCorrect: false },
        { text: '40', isCorrect: false }
      ]
    },
    {
      text: 'Um cliente pagou R$ 78,00 por três produtos iguais. Qual o valor de cada um?',
      options: [
        { text: 'R$ 22,00', isCorrect: false },
        { text: 'R$ 25,00', isCorrect: false },
        { text: 'R$ 26,00', isCorrect: true },
        { text: 'R$ 30,00', isCorrect: false }
      ]
    },
    {
      text: 'Se um gato consome 300g de ração por dia, quantos kg ele consumirá em 10 dias?',
      options: [
        { text: '2 kg', isCorrect: false },
        { text: '3 kg', isCorrect: true },
        { text: '4 kg', isCorrect: false },
        { text: '5 kg', isCorrect: false }
      ]
    }
  ]

  // Adicionar questões adicionais de Matemática Básica
  console.log('Adicionando questões adicionais de Matemática Básica...')
  for (const question of matematica_basica_questions) {
    await prisma.question.create({
      data: {
        text: question.text,
        stageId: matematica_basica_id,
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
