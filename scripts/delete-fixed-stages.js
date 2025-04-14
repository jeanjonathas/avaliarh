const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  __internal: {
    enableTracing: false
  }
});

async function main() {
  console.log('Iniciando exclusão de etapas fixas...');

  try {
    // Excluir a etapa "Raciocínio Lógico"
    const deleteResult = await prisma.stage.deleteMany({
      where: {
        title: "Raciocínio Lógico"
      }
    });
    
    console.log(`Excluídas ${deleteResult.count} etapas fixas.`);
    
    // Verificar se ainda existem etapas com IDs personalizados
    const customStages = await prisma.stage.findMany({
      where: {
        id: {
          contains: 'stage-'
        }
      }
    });
    
    if (customStages.length > 0) {
      console.log(`Ainda existem ${customStages.length} etapas com IDs personalizados:`);
      customStages.forEach(stage => {
        console.log(`- ${stage.title} (${stage.id})`);
      });
    } else {
      console.log('Não existem mais etapas com IDs personalizados.');
    }
  } catch (error) {
    console.error('Erro ao excluir etapas fixas:', error);
  }

  console.log('Exclusão de etapas fixas concluída.');
}

main()
  .catch((e) => {
    console.error('Erro durante a exclusão:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
