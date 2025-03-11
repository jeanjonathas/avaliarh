const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando migração de IDs personalizados para UUIDs...');

  // 1. Buscar todas as etapas existentes
  const stages = await prisma.stage.findMany();
  console.log(`Encontradas ${stages.length} etapas no banco de dados.`);

  // 2. Criar um mapa de nome da etapa para ID
  const stageNameToIdMap = {};
  stages.forEach(stage => {
    stageNameToIdMap[stage.title] = stage.id;
  });

  console.log('Mapa de nomes de etapas para IDs:', stageNameToIdMap);

  // 3. Buscar todas as respostas
  const responses = await prisma.response.findMany({
    include: {
      question: {
        include: {
          Stage: true
        }
      }
    }
  });

  console.log(`Encontradas ${responses.length} respostas para atualizar.`);

  // 4. Atualizar as respostas com IDs personalizados
  let updatedCount = 0;
  for (const response of responses) {
    // Se a resposta já tem o stageName definido
    if (response.stageName) {
      const stageId = stageNameToIdMap[response.stageName];
      
      if (stageId) {
        // Atualizar a questão para usar o ID correto da etapa
        try {
          await prisma.question.update({
            where: { id: response.questionId },
            data: { stageId }
          });
          
          console.log(`Atualizada questão ${response.questionId} para usar etapa ${stageId} (${response.stageName})`);
          updatedCount++;
        } catch (error) {
          console.error(`Erro ao atualizar questão ${response.questionId}:`, error);
        }
      } else {
        console.log(`Não foi encontrado ID para a etapa: ${response.stageName}`);
      }
    }
  }

  console.log(`Migração concluída. Atualizadas ${updatedCount} questões.`);
}

main()
  .catch((e) => {
    console.error('Erro durante a migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
