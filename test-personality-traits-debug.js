// Script para depurar a extração de traços de personalidade
async function debugPersonalityTraits() {
  try {
    // Substitua pelo ID de um teste real do seu sistema
    const testId = '4ec4599f-772d-454e-b3de-945c4848d34b'; // ID do teste que você mencionou
    
    console.log('Buscando questões opinativas do teste...');
    const response = await fetch(`/api/admin/questions?testId=${testId}&type=OPINION_MULTIPLE`);
    
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
    }
    
    const questions = await response.json();
    console.log(`Encontradas ${questions.length} questões opinativas`);
    
    // Extrair traços de personalidade únicos das opções
    const uniqueTraits = new Set();
    const traitSources = [];
    
    questions.forEach(question => {
      console.log(`\nQuestão: ${question.text}`);
      console.log(`Tipo: ${question.type}`);
      
      if (question.options && Array.isArray(question.options)) {
        console.log('Detalhes das opções:');
        
        question.options.forEach(option => {
          console.log(`- Texto: ${option.text}`);
          console.log(`  ID: ${option.id}`);
          console.log(`  categoryName: ${option.categoryName || 'null'}`);
          console.log(`  categoryId: ${option.categoryId || 'null'}`);
          
          // Verificar tanto categoryName quanto extrair do texto da opção (entre parênteses)
          let traitName = null;
          let source = null;
          
          if (option.categoryName) {
            traitName = option.categoryName;
            source = 'categoryName';
          } else {
            // Tentar extrair do texto da opção (formato: "Texto da opção (Nome da personalidade)")
            const match = option.text.match(/\(([^)]+)\)/);
            if (match && match[1]) {
              traitName = match[1].trim();
              source = 'texto entre parênteses';
            }
          }
          
          if (traitName) {
            console.log(`  Traço de personalidade: ${traitName} (fonte: ${source})`);
            uniqueTraits.add(traitName);
            traitSources.push({ trait: traitName, source, optionText: option.text });
          } else {
            console.log(`  Nenhum traço de personalidade encontrado`);
          }
          
          console.log('---');
        });
      }
    });
    
    console.log('\nTraços de personalidade únicos encontrados:');
    Array.from(uniqueTraits).sort().forEach(trait => {
      console.log(`- ${trait}`);
    });
    
    console.log('\nDetalhes de onde os traços foram extraídos:');
    traitSources.forEach(({ trait, source, optionText }) => {
      console.log(`- Traço: ${trait}`);
      console.log(`  Fonte: ${source}`);
      console.log(`  Texto da opção: ${optionText}`);
      console.log('---');
    });
    
    return {
      questionsCount: questions.length,
      uniqueTraits: Array.from(uniqueTraits),
      traitSources
    };
  } catch (error) {
    console.error('Erro ao depurar traços de personalidade:', error);
    return {
      error: error.message,
      questionsCount: 0,
      uniqueTraits: [],
      traitSources: []
    };
  }
}

// Executar o teste quando o script for carregado
debugPersonalityTraits().then(result => {
  console.log('\nResultado da depuração:', result);
});
