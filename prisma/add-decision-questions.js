const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Obter o ID da etapa de Tomada de Decisão
  const stages = await prisma.stage.findMany({
    orderBy: {
      order: 'asc'
    }
  })

  if (stages.length < 6) {
    console.error('Não foram encontradas etapas suficientes no banco de dados')
    return
  }

  const tomada_decisao_id = stages[5].id

  // Questões de Tomada de Decisão
  const tomada_decisao_questions = [
    {
      text: 'Um cliente chega irritado porque o atendimento atrasou. O que você faz?',
      options: [
        { text: 'Ignoro, pois não é minha culpa', isCorrect: false },
        { text: 'Explico a situação e tento resolver com cortesia', isCorrect: true },
        { text: 'Peço para ele esperar mais', isCorrect: false },
        { text: 'Respondo de forma irritada também', isCorrect: false }
      ]
    },
    {
      text: 'Um colega de trabalho comete um erro no cadastro de um cliente. O que você faz?',
      options: [
        { text: 'Aponto o erro para todos', isCorrect: false },
        { text: 'Corrijo discretamente e explico ao colega', isCorrect: true },
        { text: 'Deixo o erro como está', isCorrect: false },
        { text: 'Reclamo para o chefe', isCorrect: false }
      ]
    },
    {
      text: 'Se houver dois clientes esperando ao mesmo tempo, qual deve ser sua atitude?',
      options: [
        { text: 'Atender quem chegou primeiro', isCorrect: true },
        { text: 'Atender quem parecer mais apressado', isCorrect: false },
        { text: 'Ignorar um dos clientes', isCorrect: false },
        { text: 'Atender quem for mais simpático', isCorrect: false }
      ]
    },
    {
      text: 'Um cliente liga pedindo informações sobre uma consulta, mas você não sabe a resposta. O que fazer?',
      options: [
        { text: 'Dizer que não sabe e desligar', isCorrect: false },
        { text: 'Inventar uma resposta para não parecer desinformado', isCorrect: false },
        { text: 'Informar que irá verificar e retornará com a resposta correta', isCorrect: true },
        { text: 'Pedir para ele procurar a informação sozinho', isCorrect: false }
      ]
    },
    {
      text: 'O telefone toca enquanto você está atendendo um cliente na recepção. Como agir?',
      options: [
        { text: 'Ignoro o telefone', isCorrect: false },
        { text: 'Peço licença ao cliente e atendo brevemente', isCorrect: true },
        { text: 'Desligo o telefone', isCorrect: false },
        { text: 'Peço ao cliente para esperar enquanto atendo a ligação longa', isCorrect: false }
      ]
    },
    {
      text: 'Se um cliente traz um animal ferido e a clínica está cheia, o que fazer?',
      options: [
        { text: 'Explicar a situação e tentar encaixar o atendimento urgente', isCorrect: true },
        { text: 'Dizer que não pode atender', isCorrect: false },
        { text: 'Mandar ele voltar outro dia', isCorrect: false },
        { text: 'Ignorar a situação', isCorrect: false }
      ]
    },
    {
      text: 'Um cliente quer marcar uma consulta, mas não há horários disponíveis. Como agir?',
      options: [
        { text: 'Explico a falta de horários e ofereço a primeira vaga possível', isCorrect: true },
        { text: 'Digo apenas que não há vagas e desligo', isCorrect: false },
        { text: 'Peço para ele insistir outro dia', isCorrect: false },
        { text: 'Marco sem permissão e tento encaixar depois', isCorrect: false }
      ]
    },
    {
      text: 'Se um cliente confunde valores na hora do pagamento, você:',
      options: [
        { text: 'Cobra o valor correto educadamente', isCorrect: true },
        { text: 'Aproveita o erro para cobrar mais', isCorrect: false },
        { text: 'Diz que não é sua responsabilidade', isCorrect: false },
        { text: 'Ignora e deixa como está', isCorrect: false }
      ]
    },
    {
      text: 'Se um colega de trabalho está sobrecarregado e você tem tempo livre, qual é a melhor atitude?',
      options: [
        { text: 'Ignorar e continuar no seu ritmo', isCorrect: false },
        { text: 'Perguntar se pode ajudar', isCorrect: true },
        { text: 'Sair mais cedo do trabalho', isCorrect: false },
        { text: 'Dizer que também está ocupado mesmo sem estar', isCorrect: false }
      ]
    },
    {
      text: 'Um cliente elogia o atendimento na clínica. O que você faz?',
      options: [
        { text: 'Agradece e repassa o elogio à equipe', isCorrect: true },
        { text: 'Ignora', isCorrect: false },
        { text: 'Diz que foi sorte', isCorrect: false },
        { text: 'Fala que sempre deveria ser assim', isCorrect: false }
      ]
    }
  ]

  // Adicionar questões de Tomada de Decisão
  console.log('Adicionando questões de Tomada de Decisão...')
  for (const question of tomada_decisao_questions) {
    await prisma.question.create({
      data: {
        text: question.text,
        stageId: tomada_decisao_id,
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
