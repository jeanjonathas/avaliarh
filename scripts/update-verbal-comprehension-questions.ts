const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Novas perguntas de Compreensão Verbal com suas opções e respostas corretas
const verbalComprehensionQuestions = [
  {
    text: "Qual das palavras abaixo é sinônimo de 'ágil'?",
    options: [
      { text: 'Lento', isCorrect: false },
      { text: 'Rápido', isCorrect: true },
      { text: 'Pesado', isCorrect: false },
      { text: 'Difícil', isCorrect: false },
    ]
  },
  {
    text: "Qual é o antônimo de 'transparente'?",
    options: [
      { text: 'Claro', isCorrect: false },
      { text: 'Lúcido', isCorrect: false },
      { text: 'Opaco', isCorrect: true },
      { text: 'Brilhante', isCorrect: false },
    ]
  },
  {
    text: "Qual opção apresenta um erro gramatical?",
    options: [
      { text: 'Eu vou ao veterinário.', isCorrect: false },
      { text: 'O cachorro está brincando.', isCorrect: false },
      { text: 'Nós vai sair mais tarde.', isCorrect: true },
      { text: 'O gato dorme na cama.', isCorrect: false },
    ]
  },
  {
    text: "Complete a frase corretamente: 'Os clientes _____ satisfeitos com o atendimento.'",
    options: [
      { text: 'Está', isCorrect: false },
      { text: 'Estão', isCorrect: true },
      { text: 'Estarão', isCorrect: false },
      { text: 'Esteve', isCorrect: false },
    ]
  },
  {
    text: "Qual das palavras abaixo tem o mesmo significado de 'veterinário'?",
    options: [
      { text: 'Médico de animais', isCorrect: true },
      { text: 'Enfermeiro', isCorrect: false },
      { text: 'Zoólogo', isCorrect: false },
      { text: 'Psicólogo', isCorrect: false },
    ]
  },
  {
    text: "Qual é a forma correta?",
    options: [
      { text: 'Fazem dois anos que trabalho aqui.', isCorrect: false },
      { text: 'Faz dois anos que trabalho aqui.', isCorrect: true },
      { text: 'Fazem dois anos que trabalhamos aqui.', isCorrect: false },
      { text: 'Faz dois anos que trabalhamos aqui.', isCorrect: false },
    ]
  },
  {
    text: "Qual das frases a seguir está correta?",
    options: [
      { text: 'Os cachorros latiam alto.', isCorrect: true },
      { text: 'Os cachorro latia alto.', isCorrect: false },
      { text: 'O cães latia alto.', isCorrect: false },
      { text: 'O cachorro latiam alto.', isCorrect: false },
    ]
  },
  {
    text: "Em qual alternativa todas as palavras estão corretamente escritas?",
    options: [
      { text: 'Recepção, veterinário, agendamento', isCorrect: true },
      { text: 'Recepção, veterinario, agendamento', isCorrect: false },
      { text: 'Recepsão, veterinário, ajendamento', isCorrect: false },
      { text: 'Recepção, veterínario, agendamento', isCorrect: false },
    ]
  },
  {
    text: "Qual é o significado da palavra 'empático'?",
    options: [
      { text: 'Pessoa que sente e entende as emoções dos outros', isCorrect: true },
      { text: 'Pessoa distraída', isCorrect: false },
      { text: 'Pessoa rude', isCorrect: false },
      { text: 'Pessoa insegura', isCorrect: false },
    ]
  },
  {
    text: "Qual das frases abaixo está escrita corretamente?",
    options: [
      { text: 'Ele assistiu o filme.', isCorrect: false },
      { text: 'Ele assistiu ao filme.', isCorrect: true },
      { text: 'Ele assistiu no filme.', isCorrect: false },
      { text: 'Ele assistiu de filme.', isCorrect: false },
    ]
  }
]

async function main() {
  try {
    // Encontrar a etapa de Compreensão Verbal (etapa 3)
    const verbalComprehensionStage = await prisma.stage.findFirst({
      where: {
        title: 'Compreensão Verbal',
      },
    })

    if (!verbalComprehensionStage) {
      console.error('Etapa de Compreensão Verbal não encontrada')
      return
    }

    console.log(`Encontrada etapa de Compreensão Verbal com ID: ${verbalComprehensionStage.id}`)

    // Remover todas as perguntas existentes para a etapa 3
    const existingQuestions = await prisma.question.findMany({
      where: {
        stageId: verbalComprehensionStage.id,
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
    for (const questionData of verbalComprehensionQuestions) {
      const newQuestion = await prisma.question.create({
        data: {
          text: questionData.text,
          stageId: verbalComprehensionStage.id,
          options: {
            create: questionData.options,
          },
        },
      })

      console.log(`Criada nova pergunta com ID: ${newQuestion.id}`)
    }

    console.log('Atualização das perguntas de Compreensão Verbal concluída com sucesso!')
  } catch (error) {
    console.error('Erro durante a atualização das perguntas:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
