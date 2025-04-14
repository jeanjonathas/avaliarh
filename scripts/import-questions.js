const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Função para extrair as perguntas do arquivo testes.md
function extractQuestionsFromMd(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Dividir o conteúdo por seções (categorias)
  const sections = content.split('---').filter(section => section.trim() !== '');
  
  const categories = [
    { name: 'Raciocínio Lógico', description: 'Questões de raciocínio lógico e dedutivo' },
    { name: 'Matemática Básica', description: 'Questões de matemática básica e cálculos' },
    { name: 'Compreensão Verbal', description: 'Questões de compreensão e uso da língua portuguesa' },
    { name: 'Aptidão Espacial', description: 'Questões de visualização e raciocínio espacial' },
    { name: 'Raciocínio Abstrato', description: 'Questões de raciocínio abstrato e padrões' },
    { name: 'Tomada de Decisão', description: 'Questões sobre tomada de decisão em ambiente profissional' }
  ];
  
  const allQuestions = [];
  
  // Processar cada seção
  sections.forEach(section => {
    // Ignorar a primeira seção (introdução)
    if (!section.includes('##')) {
      return;
    }
    
    // Extrair o nome da categoria
    const categoryMatch = section.match(/## ([^\n]+)/);
    if (!categoryMatch) return;
    
    const categoryName = categoryMatch[1].trim();
    const categoryObj = categories.find(c => categoryName.includes(c.name));
    
    if (!categoryObj) {
      console.log(`Categoria não encontrada: ${categoryName}`);
      return;
    }
    
    // Extrair as perguntas
    const questionBlocks = section.split(/\d+\.\s\*\*/).slice(1);
    
    questionBlocks.forEach(block => {
      // Extrair o texto da pergunta
      const questionMatch = block.match(/([^\*]+)\*\*/);
      if (!questionMatch) return;
      
      const questionText = questionMatch[1].trim();
      
      // Extrair as opções
      const options = [];
      const optionMatches = block.matchAll(/- ([a-d])\) ([^\n]+)/g);
      
      for (const match of optionMatches) {
        options.push({
          letter: match[1],
          text: match[2].trim()
        });
      }
      
      // Extrair a resposta correta
      const correctMatch = block.match(/\*\*Resposta correta:\*\* ([a-d])/);
      if (!correctMatch) return;
      
      const correctLetter = correctMatch[1];
      
      allQuestions.push({
        text: questionText,
        category: categoryObj.name,
        options: options.map(opt => ({
          text: opt.text,
          isCorrect: opt.letter === correctLetter
        }))
      });
    });
  });
  
  return { categories, questions: allQuestions };
}

// Função principal para importar as perguntas
async function importQuestions() {
  try {
    const filePath = path.join(__dirname, '..', 'testes.md');
    const { categories, questions } = extractQuestionsFromMd(filePath);
    
    console.log(`Extraídas ${questions.length} perguntas de ${categories.length} categorias`);
    
    // Verificar se já existem etapas (stages) no banco de dados
    const existingStages = await prisma.stage.findMany();
    
    if (existingStages.length === 0) {
      console.log('Nenhuma etapa encontrada no banco de dados. Criando etapas...');
      
      // Criar etapas para cada categoria
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        await prisma.stage.create({
          data: {
            id: `stage_${i + 1}`,
            title: category.name,
            description: category.description,
            order: i + 1
          }
        });
      }
      
      console.log('Etapas criadas com sucesso!');
    }
    
    // Obter as etapas atualizadas
    const stages = await prisma.stage.findMany({
      orderBy: { order: 'asc' }
    });
    
    // Criar categorias
    const dbCategories = [];
    for (const category of categories) {
      const existingCategory = await prisma.category.findFirst({
        where: { name: category.name }
      });
      
      if (existingCategory) {
        dbCategories.push(existingCategory);
      } else {
        const newCategory = await prisma.category.create({
          data: {
            name: category.name,
            description: category.description
          }
        });
        dbCategories.push(newCategory);
      }
    }
    
    // Importar perguntas
    let importedCount = 0;
    
    for (const question of questions) {
      // Encontrar a etapa e categoria correspondentes
      const stage = stages.find(s => s.title.includes(question.category));
      const category = dbCategories.find(c => c.name === question.category);
      
      if (!stage || !category) {
        console.log(`Etapa ou categoria não encontrada para: ${question.text}`);
        continue;
      }
      
      // Verificar se a pergunta já existe
      const existingQuestion = await prisma.question.findFirst({
        where: {
          text: question.text,
          stageId: stage.id
        }
      });
      
      if (existingQuestion) {
        console.log(`Pergunta já existe: ${question.text.substring(0, 30)}...`);
        continue;
      }
      
      // Criar a pergunta e suas opções
      const createdQuestion = await prisma.question.create({
        data: {
          text: question.text,
          stageId: stage.id,
          categoryId: category.id,
          options: {
            create: question.options.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect
            }))
          }
        }
      });
      
      // Criar a relação StageQuestion
      await prisma.stageQuestion.create({
        data: {
          stageId: stage.id,
          questionId: createdQuestion.id,
          order: importedCount % 10 // Ordem dentro da etapa
        }
      });
      
      importedCount++;
    }
    
    console.log(`Importação concluída! ${importedCount} perguntas importadas.`);
    
  } catch (error) {
    console.error('Erro durante a importação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função principal
importQuestions()
  .then(() => console.log('Processo finalizado!'))
  .catch(error => console.error('Erro fatal:', error));
