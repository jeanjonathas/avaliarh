import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
})

// Novas perguntas de Raciocínio Lógico com suas opções e respostas corretas
const logicalReasoningQuestions = [
  {
    text: 'Se todos os cães são mamíferos e alguns mamíferos são aquáticos, podemos concluir que:',
    options: [
      { text: 'Todos os cães são aquáticos', isCorrect: false },
      { text: 'Nenhum cão é aquático', isCorrect: false },
      { text: 'Alguns cães podem ser aquáticos', isCorrect: true },
      { text: 'Todos os mamíferos são cães', isCorrect: false },
    ]
  },
  {
    text: 'Complete a sequência: 2, 6, 12, 20, ?',
    options: [
      { text: '24', isCorrect: false },
      { text: '30', isCorrect: false },
      { text: '28', isCorrect: true },
      { text: '36', isCorrect: false },
    ]
  },
  {
    text: 'Ana tem o dobro da idade de Bruno. Daqui a 5 anos, Ana terá 30 anos. Qual a idade de Bruno hoje?',
    options: [
      { text: '15', isCorrect: false },
      { text: '10', isCorrect: true },
      { text: '20', isCorrect: false },
      { text: '12', isCorrect: false },
    ]
  },
  {
    text: 'Se Maria é mais alta que João e João é mais alto que Carlos, então:',
    options: [
      { text: 'Maria é mais baixa que Carlos', isCorrect: false },
      { text: 'João é mais alto que Maria', isCorrect: false },
      { text: 'Carlos é o mais baixo', isCorrect: true },
      { text: 'Nenhuma das alternativas', isCorrect: false },
    ]
  },
  {
    text: 'Qual dos seguintes números não pertence à sequência? 3, 6, 9, 12, 14, 15, 18',
    options: [
      { text: '12', isCorrect: false },
      { text: '14', isCorrect: true },
      { text: '15', isCorrect: false },
      { text: '18', isCorrect: false },
    ]
  },
  {
    text: 'Se A → B e B → C, então:',
    options: [
      { text: 'A sempre implica C', isCorrect: true },
      { text: 'C sempre implica A', isCorrect: false },
      { text: 'A e C não têm relação', isCorrect: false },
      { text: 'Nenhuma das alternativas', isCorrect: false },
    ]
  },
  {
    text: 'Quantos quadrados há em um tabuleiro de xadrez 3x3?',
    options: [
      { text: '9', isCorrect: false },
      { text: '14', isCorrect: false },
      { text: '15', isCorrect: true },
      { text: '13', isCorrect: false },
    ]
  },
  {
    text: 'Se todos os cachorros latem e Rex é um cachorro, então:',
    options: [
      { text: 'Rex não late', isCorrect: false },
      { text: 'Rex pode latir', isCorrect: false },
      { text: 'Rex late', isCorrect: true },
      { text: 'Nenhuma das alternativas', isCorrect: false },
    ]
  },
  {
    text: 'Se 5x + 10 = 30, qual o valor de x?',
    options: [
      { text: '2', isCorrect: false },
      { text: '4', isCorrect: true },
      { text: '5', isCorrect: false },
      { text: '6', isCorrect: false },
    ]
  },
  {
    text: 'Se um número é múltiplo de 3 e de 4, ele também é múltiplo de:',
    options: [
      { text: '6', isCorrect: false },
      { text: '9', isCorrect: false },
      { text: '12', isCorrect: true },
      { text: '8', isCorrect: false },
    ]
  }
]

async function main() {
  try {
    // Encontrar a etapa de Raciocínio Lógico (etapa 1)
    const logicalReasoningStage = await prisma.stage.findFirst({
      where: {
        title: 'Raciocínio Lógico',
      },
    })

    if (!logicalReasoningStage) {
      console.error('Etapa de Raciocínio Lógico não encontrada')
      return
    }

    console.log(`Encontrada etapa de Raciocínio Lógico com ID: ${logicalReasoningStage.id}`)

    // Remover todas as perguntas existentes para a etapa 1
    const existingQuestions = await prisma.question.findMany({
      where: {
        stageId: logicalReasoningStage.id,
      },
      include: {
        options: true,
      },
    })

    console.log(`Encontradas ${existingQuestions.length} perguntas existentes para remover`)

    // Deletar todas as perguntas existentes e suas opções
    for (const question of existingQuestions) {
      // As opções serão excluídas automaticamente devido à relação onDelete: Cascade
      await prisma.question.delete({
        where: {
          id: question.id,
        },
      })
    }

    console.log('Perguntas existentes removidas com sucesso')

    // Adicionar as novas perguntas
    for (const questionData of logicalReasoningQuestions) {
      const newQuestion = await prisma.question.create({
        data: {
          text: questionData.text,
          stageId: logicalReasoningStage.id,
          options: {
            create: questionData.options,
          },
        },
      })

      console.log(`Criada nova pergunta com ID: ${newQuestion.id}`)
    }

    console.log('Atualização das perguntas de Raciocínio Lógico concluída com sucesso!')
  } catch (error) {
    console.error('Erro durante a atualização das perguntas:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
