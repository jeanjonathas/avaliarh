// Script para testar a busca de traços de personalidade
async function testPersonalityTraits() {
  try {
    // Substitua pelo ID de um teste real do seu sistema
    const testId = 'test-id-aqui';
    
    console.log('Buscando questões opinativas do teste...');
    const response = await fetch(`/api/admin/questions?testId=${testId}&type=OPINION_MULTIPLE`);
    
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
    }
    
    const questions = await response.json();
    console.log(`Encontradas ${questions.length} questões opinativas`);
    
    // Extrair traços de personalidade únicos das opções
    const uniqueTraits = new Set();
    
    questions.forEach(question => {
      console.log(`\nQuestão: ${question.text}`);
      
      if (question.options && Array.isArray(question.options)) {
        console.log('Opções e traços de personalidade:');
        
        question.options.forEach(option => {
          console.log(`- ${option.text} => Traço: ${option.categoryName || 'Não definido'}`);
          
          if (option.categoryName) {
            uniqueTraits.add(option.categoryName);
          }
        });
      }
    });
    
    console.log('\nTraços de personalidade únicos encontrados:');
    Array.from(uniqueTraits).sort().forEach(trait => {
      console.log(`- ${trait}`);
    });
    
    return {
      questionsCount: questions.length,
      uniqueTraits: Array.from(uniqueTraits)
    };
  } catch (error) {
    console.error('Erro ao testar traços de personalidade:', error);
    return {
      error: error.message,
      questionsCount: 0,
      uniqueTraits: []
    };
  }
}

// Executar o teste quando o script for carregado
testPersonalityTraits().then(result => {
  console.log('\nResultado do teste:', result);
});
