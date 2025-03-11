import React, { useEffect, useState } from 'react';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Response {
  id: string;
  questionId: string;
  optionId: string;
  questionText: string;
  optionText: string;
  isCorrectOption: boolean;
  stageName?: string;
  stageId?: string;
  categoryName?: string;
  questionSnapshot?: string | any;
  allOptionsSnapshot?: string | any;
}

interface Candidate {
  id: string;
  name: string;
  completed: boolean;
  testId?: string;
  responses?: Response[];
  test?: {
    title: string;
    TestStage: {
      stage: {
        id: string;
        title: string;
      };
      order: number;
    }[];
  };
  testStages?: {
    id: string;
    name: string;
    order: number;
    hasResponses: boolean;
    responsesCount: number;
  }[];
}

interface ResponsesTabProps {
  candidate: Candidate;
}

const ResponsesTab: React.FC<ResponsesTabProps> = ({ candidate }) => {
  const [stageResponses, setStageResponses] = useState<Record<string, Response[]>>({});
  const [emptyStages, setEmptyStages] = useState<string[]>([]);
  const [stageOrderMap, setStageOrderMap] = useState<Record<string, number>>({});

  // Processar as respostas para agrupar por etapa
  useEffect(() => {
    if (candidate) {
      console.log('Processando respostas para exibição');
      
      // Inicializar o mapa de respostas agrupadas
      const groupedResponses: Record<string, Response[]> = {};
      const stageOrder: Record<string, number> = {};
      const emptyStagesList: string[] = [];
      
      // Mapear os IDs e nomes das etapas do teste atual
      const testStageIds: Record<string, string> = {};
      const testStageNames: Record<string, string> = {};
      
      // Verificar se o candidato tem informações de etapas do teste
      if (candidate.testStages && candidate.testStages.length > 0) {
        console.log(`Candidato possui ${candidate.testStages.length} etapas de teste`);
        
        // Adicionar todas as etapas do teste ao mapa, mesmo as sem respostas
        candidate.testStages.forEach(stage => {
          const stageName = stage.name;
          const stageId = stage.id;
          
          // Mapear o ID da etapa para o nome
          testStageIds[stageId] = stageName;
          testStageNames[stageName] = stageId;
          
          // Inicializar o array de respostas para esta etapa
          groupedResponses[stageId] = [];
          
          // Guardar a ordem da etapa para ordenação posterior
          stageOrder[stageId] = stage.order || 0;
          
          // Se a etapa não tem respostas, adicionar à lista de etapas vazias
          if (!stage.hasResponses) {
            emptyStagesList.push(stageId);
          }
          
          console.log(`Mapeando etapa: ${stageName} (${stageId})`);
        });
      } 
      // Fallback para o método anterior se não tiver testStages
      else if (candidate.test && candidate.test.TestStage && candidate.test.TestStage.length > 0) {
        console.log(`Candidato associado ao teste: ${candidate.test.title}`);
        console.log(`O teste possui ${candidate.test.TestStage.length} etapas`);
        
        // Adicionar todas as etapas do teste ao mapa, mesmo as sem respostas
        candidate.test.TestStage.forEach(testStage => {
          const stageName = testStage.stage.title;
          const stageId = testStage.stage.id || `stage-${testStage.order}-${stageName}`;
          
          // Mapear o ID da etapa para o nome
          testStageIds[stageId] = stageName;
          testStageNames[stageName] = stageId;
          
          // Inicializar o array de respostas para esta etapa
          groupedResponses[stageId] = [];
          
          // Guardar a ordem da etapa para ordenação posterior
          stageOrder[stageId] = testStage.order || 0;
          
          // Adicionar à lista de etapas vazias inicialmente
          emptyStagesList.push(stageId);
          
          console.log(`Mapeando etapa: ${stageName} (${stageId})`);
        });
      }
      
      // Processar as respostas, se houver
      if (candidate.responses && candidate.responses.length > 0) {
        console.log(`Processando ${candidate.responses.length} respostas`);
        
        // Agrupar respostas por etapa
        candidate.responses.forEach(response => {
          let stageId = response.stageId;
          let stageName = response.stageName;
          let foundStage = false;
          
          console.log(`Processando resposta para etapa: ${stageName} (${stageId})`);
          
          // Verificar se a etapa pertence ao teste atual
          if (stageId && testStageIds[stageId]) {
            stageName = testStageIds[stageId];
            foundStage = true;
            console.log(`Etapa pertence ao teste atual: ${stageName}`);
          } 
          // Se não encontrou pelo ID, tentar pelo nome
          else if (stageName && testStageNames[stageName]) {
            stageId = testStageNames[stageName];
            foundStage = true;
            console.log(`Etapa pertence ao teste atual: ${stageName}`);
          } 
          // Se ainda não encontrou, tentar pelo questionSnapshot
          else {
            console.log(`Etapa não pertence ao teste atual: ${stageName}. Verificando outras fontes...`);
            
            // Tentar pelo nome da etapa
            if (stageName && Object.values(testStageIds).includes(stageName)) {
              foundStage = true;
              stageId = Object.keys(testStageIds).find(id => testStageIds[id] === stageName) || '';
              console.log(`Etapa encontrada pelo nome: ${stageName} (${stageId})`);
            } else {
              console.log(`Etapa pelo nome não pertence ao teste atual: ${stageName}. Verificando outras fontes...`);
            }
            
            // Se ainda não encontrou, tentar pelo questionSnapshot
            if (!foundStage && response.questionSnapshot) {
              try {
                const snapshot = typeof response.questionSnapshot === 'string' 
                  ? JSON.parse(response.questionSnapshot)
                  : response.questionSnapshot;
                
                if (snapshot.stageId && testStageIds[snapshot.stageId]) {
                  stageId = snapshot.stageId;
                  stageName = testStageIds[stageId];
                  foundStage = true;
                  console.log(`Etapa encontrada via questionSnapshot stageId: ${stageName} (${stageId})`);
                } else if (snapshot.stageName && testStageNames[snapshot.stageName]) {
                  stageName = snapshot.stageName;
                  stageId = testStageNames[stageName];
                  foundStage = true;
                  console.log(`Etapa encontrada via questionSnapshot stageName: ${stageName} (${stageId})`);
                } else {
                  console.log(`Etapa via questionSnapshot não pertence ao teste atual: ${snapshot.stageName}`);
                }
              } catch (e) {
                console.error('Erro ao parsear questionSnapshot:', e);
              }
            }
            
            // Se ainda não encontrou, usar a primeira etapa do teste como fallback
            if (!foundStage) {
              const firstStageId = Object.keys(testStageIds)[0];
              if (firstStageId) {
                stageId = firstStageId;
                stageName = testStageIds[firstStageId];
                console.log(`Usando primeira etapa do teste como fallback: ${stageName} (${stageId})`);
              } else {
                stageId = 'unknown-stage';
                stageName = 'Etapa não identificada';
                console.log(`Não foi possível identificar a etapa para esta resposta`);
              }
            }
          }
          
          // Se a etapa não existe no mapa, criar uma nova entrada
          if (!groupedResponses[stageId]) {
            console.log(`Criando nova entrada para etapa não mapeada: ${stageName} (${stageId})`);
            groupedResponses[stageId] = [];
            // Se encontrarmos uma etapa que não estava no teste, atribuir uma ordem alta
            stageOrder[stageId] = 999;
          }
          
          // Adicionar a resposta ao grupo da etapa
          console.log(`Adicionando resposta à etapa: ${stageName} (${stageId})`);
          groupedResponses[stageId].push(response);
          
          // Remover esta etapa da lista de etapas vazias
          const emptyIndex = emptyStagesList.indexOf(stageId);
          if (emptyIndex > -1) {
            emptyStagesList.splice(emptyIndex, 1);
          }
        });
      }
      
      console.log('Etapas sem respostas:', emptyStagesList);
      console.log('Respostas agrupadas por etapa:', Object.keys(groupedResponses));
      
      setStageResponses(groupedResponses);
      setEmptyStages(emptyStagesList);
      setStageOrderMap(stageOrder);
    }
  }, [candidate]);

  // Renderizar as respostas de uma etapa
  const renderResponses = (responses: any[]) => {
    return (
      <div className="divide-y divide-gray-100">
        {responses.map((response, index) => {
          // Tentar obter as opções do snapshot, se disponível
          let options: Option[] = [];
          if (response.allOptionsSnapshot) {
            try {
              // Verificar se o snapshot já é um objeto ou se precisa ser parseado
              if (typeof response.allOptionsSnapshot === 'string') {
                options = JSON.parse(response.allOptionsSnapshot);
              } else {
                options = response.allOptionsSnapshot;
              }
            } catch (e) {
              console.error('Erro ao processar allOptionsSnapshot:', e);
            }
          }
          
          return (
            <div key={response.id || index} className="p-4">
              <div className="mb-2">
                <h4 className="font-medium text-gray-900">{response.questionText || 'Pergunta sem texto'}</h4>
                {response.categoryName && (
                  <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    {response.categoryName}
                  </span>
                )}
              </div>
              
              {/* Exibir a resposta do candidato */}
              <div className="mt-3">
                <p className="text-sm text-gray-500 mb-1">Resposta do candidato:</p>
                <div className={`p-2 rounded ${response.isCorrectOption ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                  <p className={`text-sm ${response.isCorrectOption ? 'text-green-700' : 'text-red-700'}`}>
                    {response.optionText || 'Sem resposta'}
                  </p>
                </div>
              </div>
              
              {/* Exibir todas as opções disponíveis */}
              {options.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 mb-1">Todas as opções:</p>
                  <ul className="space-y-1">
                    {options.map((option, optIndex) => (
                      <li 
                        key={option.id || optIndex} 
                        className={`text-sm p-1 rounded ${
                          option.isCorrect ? 'text-green-700 bg-green-50' : 
                          (option.id === response.optionId && !response.isCorrectOption) ? 'text-red-700 bg-red-50' : ''
                        }`}
                      >
                        {option.text}
                        {option.isCorrect && <span className="ml-2 text-xs text-green-600">(Correta)</span>}
                        {option.id === response.optionId && !option.isCorrect && <span className="ml-2 text-xs text-red-600">(Selecionada)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {Object.keys(stageResponses).length === 0 ? (
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Este candidato ainda não possui respostas registradas.</p>
        </div>
      ) : (
        Object.entries(stageResponses)
          .sort(([stageIdA], [stageIdB]) => stageOrderMap[stageIdA] - stageOrderMap[stageIdB])
          .map(([stageId, responses]) => {
            // Obter o nome da etapa a partir do ID
            let stageName = 'Etapa não identificada';
            if (candidate.test && candidate.test.TestStage) {
              const testStage = candidate.test.TestStage.find(ts => ts.stage.id === stageId);
              if (testStage) {
                stageName = testStage.stage.title;
              }
            } else if (candidate.testStages) {
              const testStage = candidate.testStages.find(ts => ts.id === stageId);
              if (testStage) {
                stageName = testStage.name;
              }
            }
            
            return (
              <div key={stageId} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                  <h3 className="text-lg font-medium text-blue-800">{stageName}</h3>
                  {responses.length === 0 ? (
                    <p className="text-sm text-blue-600">O candidato não respondeu a esta etapa</p>
                  ) : (
                    <p className="text-sm text-blue-600">{responses.length} questões respondidas</p>
                  )}
                </div>
                
                {responses.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p>Não há respostas registradas para esta etapa.</p>
                  </div>
                ) : (
                  renderResponses(responses)
                )}
              </div>
            );
          })
      )}
    </div>
  );
};

export default ResponsesTab;
