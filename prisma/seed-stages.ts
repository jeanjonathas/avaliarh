import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  // Criar as 6 etapas básicas
  const stages = [
    {
      title: 'Raciocínio Lógico',
      description: 'Avaliação de habilidades de raciocínio lógico e resolução de problemas',
      order: 1,
      questions: [
        {
          text: 'Se todos os gatos são felinos e todos os felinos são mamíferos, então:',
          options: [
            { text: 'Todos os gatos são mamíferos', isCorrect: true },
            { text: 'Alguns mamíferos são gatos', isCorrect: false },
            { text: 'Todos os mamíferos são gatos', isCorrect: false },
            { text: 'Nenhum gato é mamífero', isCorrect: false },
          ]
        },
        {
          text: 'Em uma sequência, cada número é a soma dos dois anteriores: 1, 1, 2, 3, 5, 8. Qual é o próximo número?',
          options: [
            { text: '11', isCorrect: false },
            { text: '13', isCorrect: true },
            { text: '15', isCorrect: false },
            { text: '21', isCorrect: false },
          ]
        },
        // Adicione mais questões aqui
      ]
    },
    {
      title: 'Conhecimentos Gerais',
      description: 'Avaliação de conhecimentos gerais e atualidades',
      order: 2,
      questions: [
        {
          text: 'Qual é o maior oceano do mundo?',
          options: [
            { text: 'Oceano Atlântico', isCorrect: false },
            { text: 'Oceano Índico', isCorrect: false },
            { text: 'Oceano Pacífico', isCorrect: true },
            { text: 'Oceano Ártico', isCorrect: false },
          ]
        },
        {
          text: 'Quem pintou a Mona Lisa?',
          options: [
            { text: 'Vincent van Gogh', isCorrect: false },
            { text: 'Leonardo da Vinci', isCorrect: true },
            { text: 'Pablo Picasso', isCorrect: false },
            { text: 'Michelangelo', isCorrect: false },
          ]
        },
        // Adicione mais questões aqui
      ]
    },
    {
      title: 'Comunicação',
      description: 'Avaliação de habilidades de comunicação e expressão',
      order: 3,
      questions: [
        {
          text: 'Qual alternativa apresenta o uso correto da vírgula?',
          options: [
            { text: 'João, foi ao mercado', isCorrect: false },
            { text: 'Maria, que é médica, atendeu o paciente', isCorrect: true },
            { text: 'Pedro chegou, e saiu', isCorrect: false },
            { text: 'Ana, comprou, pão', isCorrect: false },
          ]
        },
        // Adicione mais questões aqui
      ]
    },
    {
      title: 'Resolução de Problemas',
      description: 'Avaliação da capacidade de resolver problemas complexos',
      order: 4,
      questions: [
        {
          text: 'Em uma empresa, um problema foi identificado. Qual deve ser o primeiro passo?',
          options: [
            { text: 'Implementar a primeira solução que vier à mente', isCorrect: false },
            { text: 'Analisar a causa raiz do problema', isCorrect: true },
            { text: 'Ignorar o problema', isCorrect: false },
            { text: 'Culpar alguém pelo problema', isCorrect: false },
          ]
        },
        // Adicione mais questões aqui
      ]
    },
    {
      title: 'Trabalho em Equipe',
      description: 'Avaliação de habilidades de colaboração e trabalho em equipe',
      order: 5,
      questions: [
        {
          text: 'Em um projeto em equipe, um colega está tendo dificuldades. O que você faz?',
          options: [
            { text: 'Ignora a situação', isCorrect: false },
            { text: 'Oferece ajuda e suporte', isCorrect: true },
            { text: 'Reclama com o supervisor', isCorrect: false },
            { text: 'Assume o trabalho dele', isCorrect: false },
          ]
        },
        // Adicione mais questões aqui
      ]
    },
    {
      title: 'Ética Profissional',
      description: 'Avaliação de conhecimentos sobre ética e conduta profissional',
      order: 6,
      questions: [
        {
          text: 'Você descobre que um colega está compartilhando informações confidenciais. O que fazer?',
          options: [
            { text: 'Ignorar a situação', isCorrect: false },
            { text: 'Reportar ao superior imediato', isCorrect: true },
            { text: 'Confrontar o colega publicamente', isCorrect: false },
            { text: 'Compartilhar com outros colegas', isCorrect: false },
          ]
        },
        // Adicione mais questões aqui
      ]
    }
  ]

  console.log('Iniciando seed das etapas e questões...')

  for (const stage of stages) {
    console.log(`Criando etapa: ${stage.title}`)
    
    const createdStage = await prisma.stage.create({
      data: {
        id: crypto.randomBytes(16).toString('hex'), // Adiciona um ID único
        title: stage.title,
        description: stage.description,
        order: stage.order,
        updatedAt: new Date(), // Adiciona a data de atualização
      },
    })

    for (const question of stage.questions) {
      console.log(`Criando questão: ${question.text.substring(0, 30)}...`)
      
      const createdQuestion = await prisma.question.create({
        data: {
          text: question.text,
          stageId: createdStage.id,
          options: {
            create: question.options,
          },
        },
      })
    }
  }

  console.log('Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
