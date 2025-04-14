const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Obter o ID da etapa de Aptidão Espacial
  const stages = await prisma.stage.findMany({
    orderBy: {
      order: 'asc'
    }
  })

  if (stages.length < 4) {
    console.error('Não foram encontradas etapas suficientes no banco de dados')
    return
  }

  const aptidao_espacial_id = stages[3].id

  // Questões de Aptidão Espacial
  const aptidao_espacial_questions = [
    {
      text: 'Se um cubo é rotacionado 90° para a direita, qual das opções representa sua nova posição?',
      options: [
        { text: 'Igual', isCorrect: false },
        { text: 'Invertido', isCorrect: false },
        { text: 'Rotacionado', isCorrect: true },
        { text: 'Não muda', isCorrect: false }
      ]
    },
    {
      text: 'Se uma folha de papel quadrada é dobrada ao meio duas vezes e depois um furo é feito no centro, quantos furos aparecem quando a folha é aberta?',
      options: [
        { text: '1', isCorrect: false },
        { text: '2', isCorrect: false },
        { text: '4', isCorrect: true },
        { text: '8', isCorrect: false }
      ]
    },
    {
      text: 'Qual figura pode ser formada ao desdobrar um cubo?',
      options: [
        { text: 'Um retângulo', isCorrect: false },
        { text: 'Seis quadrados', isCorrect: true },
        { text: 'Três triângulos', isCorrect: false },
        { text: 'Dois círculos', isCorrect: false }
      ]
    },
    {
      text: 'Se uma bola é vista de frente e de lado, sua forma permanece:',
      options: [
        { text: 'Igual', isCorrect: true },
        { text: 'Diferente', isCorrect: false },
        { text: 'Oval', isCorrect: false },
        { text: 'Quadrada', isCorrect: false }
      ]
    },
    {
      text: 'Se um objeto 3D tem 6 faces quadradas idênticas, ele é um:',
      options: [
        { text: 'Prisma', isCorrect: false },
        { text: 'Pirâmide', isCorrect: false },
        { text: 'Cubo', isCorrect: true },
        { text: 'Cilindro', isCorrect: false }
      ]
    },
    {
      text: 'Qual das formas seguintes não pode ser dobrada para formar um cubo?',
      options: [
        { text: 'Seis quadrados', isCorrect: false },
        { text: 'Quatro quadrados e dois retângulos', isCorrect: false },
        { text: 'Dois triângulos e quatro quadrados', isCorrect: true },
        { text: 'Cinco quadrados', isCorrect: false }
      ]
    },
    {
      text: 'Se um prédio é visto de cima, a forma que mais se aproxima de sua projeção é:',
      options: [
        { text: 'Triângulo', isCorrect: false },
        { text: 'Círculo', isCorrect: false },
        { text: 'Quadrado', isCorrect: false },
        { text: 'Depende do formato do prédio', isCorrect: true }
      ]
    },
    {
      text: 'Se você observar um cilindro de diferentes ângulos, ele pode parecer:',
      options: [
        { text: 'Um círculo ou um retângulo', isCorrect: true },
        { text: 'Apenas um círculo', isCorrect: false },
        { text: 'Apenas um retângulo', isCorrect: false },
        { text: 'Um triângulo', isCorrect: false }
      ]
    },
    {
      text: 'Se um cubo tem 8 vértices, quantas arestas ele possui?',
      options: [
        { text: '12', isCorrect: true },
        { text: '8', isCorrect: false },
        { text: '6', isCorrect: false },
        { text: '10', isCorrect: false }
      ]
    },
    {
      text: 'Se um objeto visto de frente parece um quadrado e de lado parece um triângulo, ele pode ser:',
      options: [
        { text: 'Um cilindro', isCorrect: false },
        { text: 'Uma pirâmide', isCorrect: true },
        { text: 'Um cubo', isCorrect: false },
        { text: 'Um cone', isCorrect: false }
      ]
    }
  ]

  // Adicionar questões de Aptidão Espacial
  console.log('Adicionando questões de Aptidão Espacial...')
  for (const question of aptidao_espacial_questions) {
    await prisma.question.create({
      data: {
        text: question.text,
        stageId: aptidao_espacial_id,
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
