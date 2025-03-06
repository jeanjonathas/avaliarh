const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Obter o ID da etapa de Compreensão Verbal
  const stages = await prisma.stage.findMany({
    orderBy: {
      order: 'asc'
    }
  })

  if (stages.length < 3) {
    console.error('Não foram encontradas etapas suficientes no banco de dados')
    return
  }

  const compreensao_verbal_id = stages[2].id

  // Questões adicionais de Compreensão Verbal
  const compreensao_verbal_questions = [
    {
      text: 'Qual é a forma correta?',
      options: [
        { text: 'Fazem dois anos que trabalho aqui.', isCorrect: false },
        { text: 'Faz dois anos que trabalho aqui.', isCorrect: true },
        { text: 'Fazem dois anos que trabalhamos aqui.', isCorrect: false },
        { text: 'Faz dois anos que trabalhamos aqui.', isCorrect: false }
      ]
    },
    {
      text: 'Qual das frases a seguir está correta?',
      options: [
        { text: 'Os cachorros latiam alto.', isCorrect: true },
        { text: 'Os cachorro latia alto.', isCorrect: false },
        { text: 'O cães latia alto.', isCorrect: false },
        { text: 'O cachorro latiam alto.', isCorrect: false }
      ]
    },
    {
      text: 'Em qual alternativa todas as palavras estão corretamente escritas?',
      options: [
        { text: 'Recepção, veterinário, agendamento', isCorrect: true },
        { text: 'Recepção, veterinario, agendamento', isCorrect: false },
        { text: 'Recepsão, veterinário, ajendamento', isCorrect: false },
        { text: 'Recepção, veterínario, agendamento', isCorrect: false }
      ]
    },
    {
      text: 'Qual é o significado da palavra \'empático\'?',
      options: [
        { text: 'Pessoa que sente e entende as emoções dos outros', isCorrect: true },
        { text: 'Pessoa distraída', isCorrect: false },
        { text: 'Pessoa rude', isCorrect: false },
        { text: 'Pessoa insegura', isCorrect: false }
      ]
    },
    {
      text: 'Qual das frases abaixo está escrita corretamente?',
      options: [
        { text: 'Ele assistiu o filme.', isCorrect: false },
        { text: 'Ele assistiu ao filme.', isCorrect: true },
        { text: 'Ele assistiu no filme.', isCorrect: false },
        { text: 'Ele assistiu de filme.', isCorrect: false }
      ]
    }
  ]

  // Adicionar questões adicionais de Compreensão Verbal
  console.log('Adicionando questões adicionais de Compreensão Verbal...')
  for (const question of compreensao_verbal_questions) {
    await prisma.question.create({
      data: {
        text: question.text,
        stageId: compreensao_verbal_id,
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
