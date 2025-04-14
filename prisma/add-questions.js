const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
})

async function main() {
  // Obter os IDs das etapas
  const stages = await prisma.stage.findMany({
    orderBy: {
      order: 'asc'
    }
  })

  if (stages.length < 3) {
    console.error('Não foram encontradas etapas suficientes no banco de dados')
    return
  }

  const raciocinio_logico_id = stages[0].id
  const matematica_basica_id = stages[1].id
  const compreensao_verbal_id = stages[2].id

  // Questões de Raciocínio Lógico
  const raciocinio_logico_questions = [
    {
      text: 'Se todos os cães são mamíferos e alguns mamíferos são aquáticos, podemos concluir que:',
      options: [
        { text: 'Todos os cães são aquáticos', isCorrect: false },
        { text: 'Nenhum cão é aquático', isCorrect: false },
        { text: 'Alguns cães podem ser aquáticos', isCorrect: true },
        { text: 'Todos os mamíferos são cães', isCorrect: false }
      ]
    },
    {
      text: 'Complete a sequência: 2, 6, 12, 20, ?',
      options: [
        { text: '24', isCorrect: false },
        { text: '30', isCorrect: false },
        { text: '28', isCorrect: true },
        { text: '36', isCorrect: false }
      ]
    },
    {
      text: 'Ana tem o dobro da idade de Bruno. Daqui a 5 anos, Ana terá 30 anos. Qual a idade de Bruno hoje?',
      options: [
        { text: '15', isCorrect: false },
        { text: '10', isCorrect: true },
        { text: '20', isCorrect: false },
        { text: '12', isCorrect: false }
      ]
    },
    {
      text: 'Se Maria é mais alta que João e João é mais alto que Carlos, então:',
      options: [
        { text: 'Maria é mais baixa que Carlos', isCorrect: false },
        { text: 'João é mais alto que Maria', isCorrect: false },
        { text: 'Carlos é o mais baixo', isCorrect: true },
        { text: 'Nenhuma das alternativas', isCorrect: false }
      ]
    },
    {
      text: 'Qual dos seguintes números não pertence à sequência? 3, 6, 9, 12, 14, 15, 18',
      options: [
        { text: '12', isCorrect: false },
        { text: '14', isCorrect: true },
        { text: '15', isCorrect: false },
        { text: '18', isCorrect: false }
      ]
    }
  ]

  // Questões de Matemática Básica
  const matematica_basica_questions = [
    {
      text: 'Qual é o resultado de 25 + 37?',
      options: [
        { text: '52', isCorrect: false },
        { text: '62', isCorrect: true },
        { text: '57', isCorrect: false },
        { text: '64', isCorrect: false }
      ]
    },
    {
      text: 'Se um produto custa R$ 120 e está com 25% de desconto, qual o valor final?',
      options: [
        { text: 'R$ 90', isCorrect: true },
        { text: 'R$ 95', isCorrect: false },
        { text: 'R$ 100', isCorrect: false },
        { text: 'R$ 85', isCorrect: false }
      ]
    },
    {
      text: 'Se um cliente pagou R$ 200 por uma consulta e o troco foi R$ 50, quanto custou a consulta?',
      options: [
        { text: 'R$ 200', isCorrect: false },
        { text: 'R$ 100', isCorrect: false },
        { text: 'R$ 150', isCorrect: true },
        { text: 'R$ 250', isCorrect: false }
      ]
    },
    {
      text: 'Um veterinário atende 8 animais por dia. Quantos ele atende em uma semana (7 dias)?',
      options: [
        { text: '56', isCorrect: true },
        { text: '64', isCorrect: false },
        { text: '48', isCorrect: false },
        { text: '72', isCorrect: false }
      ]
    },
    {
      text: 'Se um medicamento deve ser administrado a cada 6 horas, quantas doses são dadas em um dia?',
      options: [
        { text: '3', isCorrect: false },
        { text: '4', isCorrect: true },
        { text: '5', isCorrect: false },
        { text: '6', isCorrect: false }
      ]
    }
  ]

  // Questões de Compreensão Verbal
  const compreensao_verbal_questions = [
    {
      text: 'Qual das palavras abaixo é sinônimo de \'ágil\'?',
      options: [
        { text: 'Lento', isCorrect: false },
        { text: 'Rápido', isCorrect: true },
        { text: 'Pesado', isCorrect: false },
        { text: 'Difícil', isCorrect: false }
      ]
    },
    {
      text: 'Qual é o antônimo de \'transparente\'?',
      options: [
        { text: 'Claro', isCorrect: false },
        { text: 'Lúcido', isCorrect: false },
        { text: 'Opaco', isCorrect: true },
        { text: 'Brilhante', isCorrect: false }
      ]
    },
    {
      text: 'Qual opção apresenta um erro gramatical?',
      options: [
        { text: 'Eu vou ao veterinário.', isCorrect: false },
        { text: 'O cachorro está brincando.', isCorrect: false },
        { text: 'Nós vai sair mais tarde.', isCorrect: true },
        { text: 'O gato dorme na cama.', isCorrect: false }
      ]
    },
    {
      text: 'Complete a frase corretamente: \'Os clientes _____ satisfeitos com o atendimento.\'',
      options: [
        { text: 'Está', isCorrect: false },
        { text: 'Estão', isCorrect: true },
        { text: 'Estarão', isCorrect: false },
        { text: 'Esteve', isCorrect: false }
      ]
    },
    {
      text: 'Qual das palavras abaixo tem o mesmo significado de \'veterinário\'?',
      options: [
        { text: 'Médico de animais', isCorrect: true },
        { text: 'Enfermeiro', isCorrect: false },
        { text: 'Zoólogo', isCorrect: false },
        { text: 'Psicólogo', isCorrect: false }
      ]
    }
  ]

  // Adicionar questões de Raciocínio Lógico
  console.log('Adicionando questões de Raciocínio Lógico...')
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

  // Adicionar questões de Matemática Básica
  console.log('Adicionando questões de Matemática Básica...')
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

  // Adicionar questões de Compreensão Verbal
  console.log('Adicionando questões de Compreensão Verbal...')
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
