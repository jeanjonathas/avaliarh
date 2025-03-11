const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando atualização de etapas com IDs personalizados...');

  // 1. Buscar todas as etapas existentes
  const stages = await prisma.stage.findMany();
  console.log(`Encontradas ${stages.length} etapas no banco de dados.`);

  // 2. Identificar etapas com IDs personalizados
  const customIdStages = stages.filter(stage => 
    stage.id.includes('stage-') || 
    !stage.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  );

  console.log(`Encontradas ${customIdStages.length} etapas com IDs personalizados.`);

  // 3. Atualizar etapas com IDs personalizados
  for (const stage of customIdStages) {
    const oldId = stage.id;
    const newId = uuidv4();
    
    console.log(`Atualizando etapa "${stage.title}" de ID ${oldId} para ${newId}...`);
    
    try {
      // Criar nova etapa com UUID padrão
      await prisma.stage.create({
        data: {
          id: newId,
          title: stage.title,
          description: stage.description,
          order: stage.order,
          updatedAt: stage.updatedAt,
          createdAt: stage.createdAt
        }
      });
      
      console.log(`Nova etapa criada com ID ${newId}`);
      
      // Atualizar questões associadas à etapa antiga
      const questions = await prisma.question.findMany({
        where: { stageId: oldId }
      });
      
      console.log(`Encontradas ${questions.length} questões associadas à etapa ${oldId}`);
      
      for (const question of questions) {
        await prisma.question.update({
          where: { id: question.id },
          data: { stageId: newId }
        });
      }
      
      console.log(`Atualizadas ${questions.length} questões para a nova etapa ${newId}`);
      
      // Excluir a etapa antiga
      await prisma.stage.delete({
        where: { id: oldId }
      });
      
      console.log(`Etapa antiga ${oldId} excluída com sucesso`);
    } catch (error) {
      console.error(`Erro ao atualizar etapa ${oldId}:`, error);
    }
  }

  console.log('Atualização de etapas concluída.');
}

main()
  .catch((e) => {
    console.error('Erro durante a atualização:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
