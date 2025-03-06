import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Novas perguntas de Matemática Básica com suas opções e respostas corretas
const basicMathQuestions = [
  {
    text: 'Qual é o resultado de 25 + 37?',
    options: [
      { text: '52', isCorrect: false },
      { text: '62', isCorrect: true },
      { text: '57', isCorrect: false },
      { text: '64', isCorrect: false },
    ]
  },
  {
    text: 'Se um produto custa R$ 120 e está com 25% de desconto, qual o valor final?',
    options: [
      { text: 'R$ 90', isCorrect: true },
      { text: 'R$ 95', isCorrect: false },
      { text: 'R$ 100', isCorrect: false },
      { text: 'R$ 85', isCorrect: false },
    ]
  },
  {
    text: 'Se um cliente pagou R$ 200 por uma consulta e o troco foi R$ 50, quanto custou a consulta?',
    options: [
      { text: 'R$ 200', isCorrect: false },
      { text: 'R$ 100', isCorrect: false },
      { text: 'R$ 150', isCorrect: true },
      { text: 'R$ 250', isCorrect: false },
    ]
  },
  {
    text: 'Um veterinário atende 8 animais por dia. Quantos ele atende em uma semana (7 dias)?',
    options: [
      { text: '56', isCorrect: true },
      { text: '64', isCorrect: false },
      { text: '48', isCorrect: false },
      { text: '72', isCorrect: false },
    ]
  },
  {
    text: 'Se um medicamento deve ser administrado a cada 6 horas, quantas doses são dadas em um dia?',
    options: [
      { text: '3', isCorrect: false },
      { text: '4', isCorrect: true },
      { text: '5', isCorrect: false },
      { text: '6', isCorrect: false },
    ]
  },
  {
    text: 'Se um cão pesa 20 kg e deve receber 2,5 mg de medicamento por quilo, qual a dose total?',
    options: [
      { text: '40 mg', isCorrect: false },
      { text: '50 mg', isCorrect: true },
      { text: '45 mg', isCorrect: false },
      { text: '55 mg', isCorrect: false },
    ]
  },
  {
    text: 'Se um estoque tem 250 unidades de um produto e são vendidos 40 por dia, em quantos dias ele acabará?',
    options: [
      { text: '5', isCorrect: false },
      { text: '6', isCorrect: false },
      { text: '7', isCorrect: true },
      { text: '8', isCorrect: false },
    ]
  },
  {
    text: 'Qual o valor de 15% de 200?',
    options: [
      { text: '25', isCorrect: false },
      { text: '30', isCorrect: true },
      { text: '35', isCorrect: false },
      { text: '40', isCorrect: false },
    ]
  },
  {
    text: 'Um cliente pagou R$ 78,00 por três produtos iguais. Qual o valor de cada um?',
    options: [
      { text: 'R$ 22,00', isCorrect: false },
      { text: 'R$ 25,00', isCorrect: false },
      { text: 'R$ 26,00', isCorrect: true },
      { text: 'R$ 30,00', isCorrect: false },
    ]
  },
  {
    text: 'Se um gato consome 300g de ração por dia, quantos kg ele consumirá em 10 dias?',
    options: [
      { text: '2 kg', isCorrect: false },
      { text: '3 kg', isCorrect: true },
      { text: '4 kg', isCorrect: false },
      { text: '5 kg', isCorrect: false },
    ]
  }
]

async function main() {
  try {
    // Encontrar a etapa de Matemática Básica (etapa 2)
    const basicMathStage = await prisma.stage.findFirst({
      where: {
        title: 'Matemática Básica e Resolução de Problemas',
      },
    })

    if (!basicMathStage) {
      console.error('Etapa de Matemática Básica não encontrada')
      return
    }

    console.log(`Encontrada etapa de Matemática Básica com ID: ${basicMathStage.id}`)

    // Remover todas as perguntas existentes para a etapa 2
    const existingQuestions = await prisma.question.findMany({
      where: {
        stageId: basicMathStage.id,
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
    for (const questionData of basicMathQuestions) {
      const newQuestion = await prisma.question.create({
        data: {
          text: questionData.text,
          stageId: basicMathStage.id,
          options: {
            create: questionData.options,
          },
        },
      })

      console.log(`Criada nova pergunta com ID: ${newQuestion.id}`)
    }

    console.log('Atualização das perguntas de Matemática Básica concluída com sucesso!')
  } catch (error) {
    console.error('Erro durante a atualização das perguntas:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
