const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
})

async function main() {
  // Obter o ID da etapa de Raciocínio Abstrato
  const stages = await prisma.stage.findMany({
    orderBy: {
      order: 'asc'
    }
  })

  if (stages.length < 5) {
    console.error('Não foram encontradas etapas suficientes no banco de dados')
    return
  }

  const raciocinio_abstrato_id = stages[4].id

  // Questões de Raciocínio Abstrato
  const raciocinio_abstrato_questions = [
    {
      text: 'Se A → B e B → C, qual das afirmações é verdadeira?',
      options: [
        { text: 'A sempre leva a C', isCorrect: true },
        { text: 'C leva a A', isCorrect: false },
        { text: 'A e C são independentes', isCorrect: false },
        { text: 'Nenhuma das alternativas', isCorrect: false }
      ]
    },
    {
      text: 'Se uma sequência de formas segue um padrão de repetição ABCABCABC, qual será a próxima forma?',
      options: [
        { text: 'A', isCorrect: true },
        { text: 'B', isCorrect: false },
        { text: 'C', isCorrect: false },
        { text: 'Nenhuma', isCorrect: false }
      ]
    },
    {
      text: 'Qual das opções abaixo é um exemplo de analogia?',
      options: [
        { text: 'Cão é para latido assim como gato é para miado', isCorrect: true },
        { text: 'Azul é para verde assim como quadrado é para círculo', isCorrect: false },
        { text: 'O sol é quente e a lua é grande', isCorrect: false },
        { text: 'Nenhuma das anteriores', isCorrect: false }
      ]
    },
    {
      text: 'Se um objeto muda de forma, mas mantém seu volume, qual dessas características permaneceu inalterada?',
      options: [
        { text: 'Cor', isCorrect: false },
        { text: 'Massa', isCorrect: true },
        { text: 'Tamanho', isCorrect: false },
        { text: 'Nenhuma', isCorrect: false }
      ]
    },
    {
      text: 'Se 2 → 4, 3 → 9, 4 → 16, então 5 → ?',
      options: [
        { text: '10', isCorrect: false },
        { text: '20', isCorrect: false },
        { text: '25', isCorrect: true },
        { text: '30', isCorrect: false }
      ]
    },
    {
      text: 'Se um padrão de crescimento segue 3, 6, 12, 24, qual é o próximo número?',
      options: [
        { text: '30', isCorrect: false },
        { text: '36', isCorrect: false },
        { text: '48', isCorrect: true },
        { text: '60', isCorrect: false }
      ]
    },
    {
      text: 'Se todas as maçãs são frutas e algumas frutas são vermelhas, podemos concluir que:',
      options: [
        { text: 'Todas as maçãs são vermelhas', isCorrect: false },
        { text: 'Nenhuma maçã é vermelha', isCorrect: false },
        { text: 'Algumas maçãs podem ser vermelhas', isCorrect: true },
        { text: 'Todas as frutas são maçãs', isCorrect: false }
      ]
    },
    {
      text: 'Se um código segue a lógica: A = 1, B = 2, C = 3, então qual é a soma de D e E?',
      options: [
        { text: '6', isCorrect: false },
        { text: '7', isCorrect: false },
        { text: '8', isCorrect: false },
        { text: '9', isCorrect: true }
      ]
    },
    {
      text: 'Se um quadrado tem quatro lados, um pentágono tem cinco, quantos lados tem um octógono?',
      options: [
        { text: '6', isCorrect: false },
        { text: '7', isCorrect: false },
        { text: '8', isCorrect: true },
        { text: '9', isCorrect: false }
      ]
    },
    {
      text: 'Se um padrão de formas segue △, ◻, ⬟, △, ◻, ⬟, qual será a próxima forma?',
      options: [
        { text: '△', isCorrect: true },
        { text: '◻', isCorrect: false },
        { text: '⬟', isCorrect: false },
        { text: 'Nenhuma', isCorrect: false }
      ]
    }
  ]

  // Adicionar questões de Raciocínio Abstrato
  console.log('Adicionando questões de Raciocínio Abstrato...')
  for (const question of raciocinio_abstrato_questions) {
    await prisma.question.create({
      data: {
        text: question.text,
        stageId: raciocinio_abstrato_id,
        options: {
          create: question.options
        }
      }
    })
  }

  console.log('Questões adicionadas com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
