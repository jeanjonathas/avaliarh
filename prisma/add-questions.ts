import { PrismaClient, DifficultyLevel, QuestionType } from '@prisma/client'

const prisma = new PrismaClient()

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
      difficulty: DifficultyLevel.MEDIUM,
      type: QuestionType.MULTIPLE_CHOICE,
      questionType: 'selection',
      showResults: true,
      options: [
        { 
          text: 'A sempre leva a C',
          isCorrect: true,
          weight: 1,
          position: 0
        },
        { 
          text: 'C leva a A',
          isCorrect: false,
          weight: 0,
          position: 1
        },
        { 
          text: 'A e C são independentes',
          isCorrect: false,
          weight: 0,
          position: 2
        },
        { 
          text: 'Nenhuma das alternativas',
          isCorrect: false,
          weight: 0,
          position: 3
        }
      ]
    }
    // Adicione mais questões aqui...
  ]

  // Adicionar questões
  console.log('Adicionando questões...')
  for (const question of raciocinio_abstrato_questions) {
    await prisma.question.create({
      data: {
        text: question.text,
        stageId: raciocinio_abstrato_id,
        difficulty: question.difficulty,
        type: question.type,
        questionType: question.questionType,
        showResults: question.showResults,
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
