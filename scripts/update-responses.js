const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando atualização de respostas com IDs personalizados...');

  // 1. Buscar todas as etapas existentes
  const stages = await prisma.stage.findMany();
  console.log(`Encontradas ${stages.length} etapas no banco de dados.`);

  // 2. Criar um mapa de nome da etapa para ID
  const stageNameToIdMap = {};
  stages.forEach(stage => {
    stageNameToIdMap[stage.title] = stage.id;
  });

  console.log('Mapa de nomes de etapas para IDs:', stageNameToIdMap);

  // 3. Buscar todas as respostas com stageName "Raciocínio Lógico"
  const responses = await prisma.response.findMany({
    where: {
      stageName: "Raciocínio Lógico"
    }
  });

  console.log(`Encontradas ${responses.length} respostas para atualizar.`);

  // 4. Excluir as respostas com IDs personalizados
  if (responses.length > 0) {
    const responseIds = responses.map(r => r.id);
    
    // Excluir as respostas
    const deleteResult = await prisma.response.deleteMany({
      where: {
        id: {
          in: responseIds
        }
      }
    });
    
    console.log(`Excluídas ${deleteResult.count} respostas com IDs personalizados.`);
  } else {
    console.log('Nenhuma resposta com ID personalizado encontrada.');
  }

  console.log('Atualização concluída.');
}

main()
  .catch((e) => {
    console.error('Erro durante a atualização:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
