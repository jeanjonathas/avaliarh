import { Candidate } from '../types'

interface CandidateAnswersTabProps {
  candidate: Candidate
}

export const CandidateAnswersTab = ({ candidate }: CandidateAnswersTabProps) => {
  if (!candidate.completed) {
    return (
      <p className="text-gray-500">O candidato ainda não completou o teste.</p>
    )
  }

  return (
    <div className="p-6">
              {activeTab === 'responses' ? (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Respostas do Candidato</h3>
                    
                    {!candidate.completed ? (
                      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <h4 className="font-medium text-blue-800">Aguardando Respostas</h4>
                        <p className="mt-2 text-blue-700">
                          Este candidato ainda não realizou o teste. As respostas serão exibidas após a conclusão da avaliação.
                        </p>
                      </div>
                    ) : (
                      <div>
                        {/* Adicionar logs para depuração */}
                        <div style={{ display: 'none' }} id="debug-info" data-has-responses={candidate.responses && candidate.responses.length > 0 ? 'true' : 'false'}></div>
                        {typeof window !== 'undefined' && (
                          <>
                            {console.log('Dados do candidato na renderização:', candidate)}
                            {console.log('Respostas disponíveis na renderização:', candidate.responses ? candidate.responses.length : 0)}
                            {console.log('Tipo de candidate.responses:', candidate.responses ? typeof candidate.responses : 'undefined')}
                            {console.log('É um array?', candidate.responses ? Array.isArray(candidate.responses) : 'N/A')}
                            {candidate.responses && candidate.responses.length > 0 && console.log('Primeira resposta:', candidate.responses[0])}
                          </>
                        )}
                        {candidate.responses && Array.isArray(candidate.responses) && candidate.responses.length > 0 ? (
                          <div className="space-y-6">
                            {/* Agrupar respostas por etapa */}
                            {(() => {
                              // Obter os IDs das etapas do teste atual do candidato
                              const testStageIds = candidate.test?.TestStage?.map(ts => ts.stageId) || [];
                              
                              // Filtrar apenas as respostas que pertencem às etapas do teste atual
                              const filteredResponses = candidate.test 
                                ? candidate.responses.filter(response => 
                                    response.stageId && testStageIds.includes(response.stageId)
                                  )
                                : candidate.responses;
                              
                              // Ordenar as respostas por ID de etapa para garantir que apareçam na ordem correta
                              const sortedResponses = [...filteredResponses].sort((a, b) => {
                                const stageA = a.question?.Stage?.id || '';
                                const stageB = b.question?.Stage?.id || '';
                                return stageA.localeCompare(stageB);
                              });
                              
                              // Agrupar respostas por etapa
                              const stageResponses: Record<string, Response[]> = {};
                              
                              sortedResponses.forEach(response => {
                                let stageName = 'Etapa não identificada';
                                
                                // Tentar obter o nome da etapa de várias fontes
                                if (response.stageName) {
                                  stageName = response.stageName;
                                } else if (response.question && response.question.Stage && response.question.Stage.title) {
                                  stageName = response.question.Stage.title;
                                } else if (response.questionSnapshot) {
                                  try {
                                    const snapshot = typeof response.questionSnapshot === 'string' 
                                      ? JSON.parse(response.questionSnapshot)
                                      : response.questionSnapshot;
                                    
                                    if (snapshot.stageName) {
                                      stageName = snapshot.stageName;
                                    }
                                  } catch (e) {
                                    console.error('Erro ao parsear questionSnapshot:', e);
                                  }
                                }
                                
                                if (!stageResponses[stageName]) {
                                  stageResponses[stageName] = [];
                                }
                                stageResponses[stageName].push(response);
                              });
                              
                              console.log('Respostas agrupadas por etapa:', Object.keys(stageResponses));
                              
                              return Object.entries(stageResponses).map(([stageName, responses]: [string, any[]]) => (
                                <div key={stageName} className="border border-secondary-200 rounded-lg overflow-hidden mb-6">
                                  <div className="bg-secondary-50 px-4 py-3 border-b border-secondary-200">
                                    <h4 className="font-medium text-secondary-800">{stageName}</h4>
                                  </div>
                                  <div className="divide-y divide-secondary-200">
                                    {responses.map((response, index) => {
                                      // Acessar o snapshot da questão e opções
                                      let questionSnapshot: {id?: string; text?: string; categoryId?: string; categoryName?: string} = {};
                                      let allOptionsSnapshot: {id: string; text: string; isCorrect: boolean}[] = [];
                                      let questionText = '';
                                      let selectedOptionText = '';
                                      let isCorrect = false;
                                      
                                      try {
                                        // Tentar obter o texto da questão de várias fontes
                                        if (response.questionText) {
                                          questionText = response.questionText;
                                        } else if (response.question && response.question.text) {
                                          questionText = response.question.text;
                                        }
                                        
                                        // Tentar obter o texto da opção selecionada
                                        if (response.optionText) {
                                          selectedOptionText = response.optionText;
                                        } else if (response.option && response.option.text) {
                                          selectedOptionText = response.option.text;
                                        }
                                        
                                        // Verificar se a resposta está correta
                                        if (response.isCorrectOption !== undefined) {
                                          isCorrect = response.isCorrectOption;
                                        } else if (response.option && response.option.isCorrect !== undefined) {
                                          isCorrect = response.option.isCorrect;
                                        }
                                        
                                        // Processar o snapshot da questão
                                        if (response.questionSnapshot) {
                                          // Verificar se já é um objeto ou se precisa ser parseado
                                          if (typeof response.questionSnapshot === 'string') {
                                            try {
                                              questionSnapshot = JSON.parse(response.questionSnapshot);
                                            } catch (e) {
                                              console.error('Erro ao parsear questionSnapshot como string:', e);
                                              questionSnapshot = response.questionSnapshot;
                                            }
                                          } else {
                                            questionSnapshot = response.questionSnapshot;
                                          }
                                          
                                          // Se ainda não temos o texto da questão, usar o do snapshot
                                          if (!questionText && questionSnapshot && questionSnapshot.text) {
                                            questionText = questionSnapshot.text;
                                          }
                                        }
                                        
                                        // Processar o snapshot das opções
                                        if (response.allOptionsSnapshot) {
                                          // Verificar se já é um array ou se precisa ser parseado
                                          if (typeof response.allOptionsSnapshot === 'string') {
                                            try {
                                              allOptionsSnapshot = JSON.parse(response.allOptionsSnapshot);
                                            } catch (e) {
                                              console.error('Erro ao parsear allOptionsSnapshot como string:', e);
                                              allOptionsSnapshot = [];
                                            }
                                          } else if (Array.isArray(response.allOptionsSnapshot)) {
                                            allOptionsSnapshot = response.allOptionsSnapshot;
                                          }
                                          
                                          // Se ainda não temos o texto da opção selecionada, procurar no snapshot
                                          if (!selectedOptionText && allOptionsSnapshot && allOptionsSnapshot.length > 0) {
                                            const selectedOption = allOptionsSnapshot.find(opt => opt.id === response.optionId);
                                            if (selectedOption) {
                                              selectedOptionText = selectedOption.text;
                                              if (isCorrect === false && selectedOption.isCorrect !== undefined) {
                                                isCorrect = selectedOption.isCorrect;
                                              }
                                            }
                                          }
                                        }
                                        
                                        // Se não temos opções do snapshot, tentar obter da relação question.options
                                        if ((!allOptionsSnapshot || allOptionsSnapshot.length === 0) && response.question && response.question.options && response.question.options.length > 0) {
                                          allOptionsSnapshot = response.question.options.map(opt => ({
                                            id: opt.id,
                                            text: opt.text,
                                            isCorrect: opt.isCorrect
                                          }));
                                          
                                          // Se ainda não temos o texto da opção selecionada, procurar nas opções da questão
                                          if (!selectedOptionText) {
                                            const selectedOption = response.question.options.find(opt => opt.id === response.optionId);
                                            if (selectedOption) {
                                              selectedOptionText = selectedOption.text;
                                              if (isCorrect === false && selectedOption.isCorrect !== undefined) {
                                                isCorrect = selectedOption.isCorrect;
                                              }
                                            }
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Erro ao processar resposta:', error);
                                      }
                                      
                                      return (
                                        <div key={response.id} className="p-4">
                                          <div className="mb-3">
                                            <p className="font-medium text-secondary-700">
                                              {index + 1}. {questionText || (questionSnapshot && questionSnapshot.text) || 'Pergunta não disponível'}
                                            </p>
                                            {(questionSnapshot && questionSnapshot.categoryName || response.categoryName) && (
                                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-secondary-100 text-secondary-600 rounded">
                                                {(questionSnapshot && questionSnapshot.categoryName) || response.categoryName}
                                              </span>
                                            )}
                                          </div>
                                          
                                          <div className="ml-4 space-y-2">
                                            {allOptionsSnapshot.length > 0 ? (
                                              allOptionsSnapshot.map(option => {
                                                // Verificar se esta opção foi a selecionada pelo candidato
                                                const isSelected = option.id === response.optionId;
                                                
                                                // Verificar se esta opção é a correta segundo o snapshot
                                                const optionIsCorrect = option.isCorrect === true;
                                                
                                                // Determinar se a resposta do candidato está correta
                                                // Usamos a informação de isCorrectOption da resposta, que já foi corrigida na API
                                                let responseIsCorrect = response.isCorrectOption === true;
                                                
                                                // Verificar se há inconsistência (resposta correta marcada como incorreta)
                                                if (!responseIsCorrect && isSelected && optionIsCorrect) {
                                                  // Se a opção selecionada é a correta, mas isCorrectOption é falso,
                                                  // isso indica um problema de inconsistência
                                                  responseIsCorrect = true;
                                                }
                                                
                                                // Lógica para determinar se esta opção deve ser destacada como selecionada
                                                const shouldHighlightAsSelected = isSelected;
                                                
                                                // Determinar se a opção selecionada deve ser marcada como correta
                                                // Se a opção selecionada é a correta, ou se a resposta foi marcada como correta na API,
                                                // consideramos que a opção selecionada está correta
                                                const shouldMarkAsCorrect = isSelected && (responseIsCorrect || optionIsCorrect);
                                                
                                                return (
                                                  <div 
                                                    key={option.id} 
                                                    className={`flex items-start p-2 rounded ${
                                                      shouldHighlightAsSelected 
                                                        ? (shouldMarkAsCorrect ? 'bg-green-50' : 'bg-red-50') 
                                                        : (optionIsCorrect ? 'bg-green-50/30 border border-green-100' : '')
                                                    }`}
                                                  >
                                                    <div className="flex-shrink-0 mt-0.5">
                                                      {shouldHighlightAsSelected ? (
                                                        <svg className={`h-5 w-5 ${shouldMarkAsCorrect ? 'text-green-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                      ) : (
                                                        <svg className={`h-5 w-5 ${optionIsCorrect ? 'text-green-300' : 'text-secondary-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                      )}
                                                    </div>
                                                    <div className="ml-2">
                                                      <p className={`text-sm ${
                                                        shouldHighlightAsSelected 
                                                          ? (shouldMarkAsCorrect ? 'text-green-700 font-medium' : 'text-red-700 font-medium') 
                                                          : (optionIsCorrect ? 'text-green-600/80 font-medium' : 'text-secondary-600')
                                                      }`}>
                                                        {option.text}
                                                      </p>
                                                      {shouldHighlightAsSelected && (
                                                        <p className="text-xs mt-1">
                                                          {shouldMarkAsCorrect ? (
                                                            <span className="text-green-600">Escolhida (Correta)</span>
                                                          ) : (
                                                            <span className="text-red-600">Escolhida (Incorreta)</span>
                                                          )}
                                                        </p>
                                                      )}
                                                      {!shouldHighlightAsSelected && optionIsCorrect && (
                                                        <p className="text-xs mt-1 text-green-600/80">Alternativa correta</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })
                                            ) : (
                                              <div className="p-2">
                                                <p className="text-sm text-secondary-600">
                                                  <strong>Resposta escolhida:</strong> {selectedOptionText || response.optionText || (response.option && response.option.text) || 'Não disponível'}
                                                </p>
                                                <p className="text-xs mt-1">
                                                  {isCorrect ? (
                                                    <span className="text-green-600">Resposta correta</span>
                                                  ) : (
                                                    <span className="text-red-600">Resposta incorreta</span>
                                                  )}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        ) : (
                          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                            <p className="text-yellow-700">
                              Não foram encontradas respostas para este candidato.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'performance' ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Cards de resumo de desempenho */}
                    <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-primary-500">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-secondary-500">Pontuação Geral</h4>
                          <div className="flex items-baseline">
                            <span className="text-2xl font-semibold text-secondary-900">
                              {typeof candidate.score === 'object' 
                                ? candidate.score.percentage 
                                : parseFloat((candidate.score || 0).toFixed(1))}%</span>
                            <span className="ml-2 text-sm text-secondary-500">
                              ({typeof candidate.score === 'object' 
                                ? `${candidate.score.correct}/${candidate.score.total}` 
                                : '0/0'})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-500">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-secondary-500">Status do Teste</h4>
                          <div className="flex items-baseline">
                            <span className="text-2xl font-semibold text-secondary-900">
                              {!candidate.completed ? 'Pendente' : (() => {
                                const totalCorrect = candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                                const totalQuestions = candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
                                const percentage = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
                                
                                if (percentage >= 80) return 'Aprovado';
                                if (percentage >= 60) return 'Consideração';
                                return 'Reprovado';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-amber-500">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-secondary-500">Tempo Gasto</h4>
                          <div className="flex items-baseline">
                            <span className="text-2xl font-semibold text-secondary-900">
                              {formatTime(candidate.timeSpent)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Gráfico de Radar - Desempenho por Habilidade */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho por Habilidade</h3>
                    {candidate.stageScores && candidate.stageScores.length > 0 ? (
                      <div className="h-80">
                        <Radar data={radarData} options={radarOptions} />
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="text-yellow-700">
                          Não há dados de desempenho disponíveis para este candidato.
                        </p>
                      </div>
                    )}
                    <div className="mt-4 text-sm text-gray-500">
                      <p>Este gráfico mostra o desempenho percentual do candidato em cada etapa de avaliação.</p>
                    </div>
                  </div>
                  
                  {/* Gráfico de Barras - Desempenho por Etapa */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho por Etapa</h3>
                    {candidate.stageScores && candidate.stageScores.length > 0 ? (
                      <div className="h-80">
                        <Bar data={barData} options={barOptions} />
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="text-yellow-700">
                          Não há dados de desempenho disponíveis para este candidato.
                        </p>
                      </div>
                    )}
                    <div className="mt-4 text-sm text-gray-500">
                      <p>Este gráfico mostra o número de respostas corretas em comparação com o total de questões em cada etapa.</p>
                    </div>
                  </div>
                  
                  {/* Tabela de Desempenho Detalhado */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho Detalhado</h3>
                    {!candidate.completed ? (
                      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <p className="text-blue-700">
                          O candidato ainda não realizou o teste. Os dados de desempenho estarão disponíveis após a conclusão da avaliação.
                        </p>
                      </div>
                    ) : !candidate.stageScores || candidate.stageScores.length === 0 ? (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="text-yellow-700">
                          Não há dados de desempenho disponíveis para este candidato, mesmo tendo completado o teste.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                          <thead className="bg-secondary-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Etapa
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Corretas
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Total
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Percentual
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-secondary-200">
                            {candidate.stageScores?.map((stage, index) => (
                              <tr key={stage.id} className={index % 2 === 0 ? 'bg-white' : 'bg-secondary-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                                  {stage.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                  {stage.correct}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                  {stage.total}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                  <div className="flex items-center">
                                    <span className="mr-2">{parseFloat(stage.percentage.toFixed(1))}%</span>
                                    <div className="w-24 bg-secondary-200 rounded-full h-2.5">
                                      <div 
                                        className={`h-2.5 rounded-full ${
                                          stage.percentage >= 80 ? 'bg-green-500' : 
                                          stage.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${stage.percentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {!candidate.completed ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                      Aguardando Respostas
                                    </span>
                                  ) : stage.percentage >= 80 ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                      Excelente
                                    </span>
                                  ) : stage.percentage >= 60 ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      Satisfatório
                                    </span>
                                  ) : (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                      Precisa Melhorar
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            
                            {/* Linha de pontuação geral */}
                            <tr className="bg-secondary-100">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                                <strong>Pontuação Geral</strong>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                {candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                {candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                <div className="flex items-center">
                                  {/* Calcular a porcentagem geral com base nos acertos e total de questões */}
                                  {(() => {
                                    const totalCorrect = candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                                    const totalQuestions = candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
                                    const percentage = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
                                    return (
                                      <>
                                        <span className="mr-2">{percentage}%</span>
                                        <div className="w-24 bg-secondary-200 rounded-full h-2.5">
                                          <div 
                                            className={`h-2.5 rounded-full ${
                                              percentage >= 80 ? 'bg-green-500' : 
                                              percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${percentage}%` }}
                                          ></div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {!candidate.completed ? (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Aguardando Respostas
                                  </span>
                                ) : (() => {
                                  const totalCorrect = candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                                  const totalQuestions = candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
                                  const percentage = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
                                  
                                  if (percentage >= 80) {
                                    return (
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Aprovado
                                      </span>
                                    );
                                  } else if (percentage >= 60) {
                                    return (
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                        Consideração
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                        Reprovado
                                      </span>
                                    );
                                  }
                                })()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  
                  {/* Recomendações baseadas no desempenho */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Recomendações</h3>
                    <div className="space-y-4">
                      {!candidate.completed ? (
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                          <h4 className="font-medium text-blue-800">Aguardando Respostas</h4>
                          <p className="mt-2 text-blue-700">
                            Este candidato ainda não realizou o teste. As recomendações serão geradas após a conclusão da avaliação.
                          </p>
                        </div>
                      ) : (() => {
                        // Calcular a porcentagem geral com base nos acertos e total de questões
                        const totalCorrect = candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                        const totalQuestions = candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
                        const percentage = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
                        
                        if (percentage >= 80) {
                          return (
                            <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                              <h4 className="font-medium text-green-800">Candidato Recomendado</h4>
                              <p className="mt-2 text-green-700">
                                Este candidato demonstrou excelente desempenho na avaliação. Recomendamos prosseguir com o processo de contratação.
                              </p>
                            </div>
                          );
                        } else if (percentage >= 60) {
                          return (
                            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                              <h4 className="font-medium text-yellow-800">Candidato para Consideração</h4>
                              <p className="mt-2 text-yellow-700">
                                Este candidato demonstrou desempenho satisfatório. Recomendamos avaliar outros aspectos como experiência e entrevista antes de tomar uma decisão.
                              </p>
                            </div>
                          );
                        } else {
                          return (
                            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                              <h4 className="font-medium text-red-800">Candidato Não Recomendado</h4>
                              <p className="mt-2 text-red-700">
                                Este candidato não atingiu a pontuação mínima necessária. Recomendamos considerar outros candidatos.
                              </p>
                            </div>
                          );
                        }
                      })()
                      }
                      
                      {/* Áreas para desenvolvimento */}
                      {candidate.completed && (
                        <div className="mt-4">
                          <h4 className="font-medium text-secondary-800">Áreas para Desenvolvimento:</h4>
                          <ul className="mt-2 space-y-1 list-disc list-inside text-secondary-600">
                            {candidate.stageScores?.filter(stage => stage.percentage < 60).map(stage => (
                              <li key={stage.id}>
                                {stage.name} ({stage.percentage}%) - Necessita aprimoramento
                              </li>
                            ))}
                            {candidate.stageScores?.filter(stage => stage.percentage < 60).length === 0 && (
                              <li>Não foram identificadas áreas críticas para desenvolvimento.</li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      {/* Pontos fortes */}
                      {candidate.completed && (
                        <div className="mt-4">
                          <h4 className="font-medium text-secondary-800">Pontos Fortes:</h4>
                          <ul className="mt-2 space-y-1 list-disc list-inside text-secondary-600">
                            {candidate.stageScores?.filter(stage => stage.percentage >= 80).map(stage => (
                              <li key={stage.id}>
                                {stage.name} ({stage.percentage}%) - Excelente desempenho
                              </li>
                            ))}
                            {candidate.stageScores?.filter(stage => stage.percentage >= 80).length === 0 && (
                              <li>Não foram identificados pontos de excelência.</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:space-x-8">
                    <div className="md:w-2/3 space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Nome Completo
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Cargo Pretendido
                        </label>
                        <input
                          type="text"
                          name="position"
                          value={formData.position}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Status
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        >
                          <option value="PENDING">Pendente</option>
                          <option value="APPROVED">Aprovado</option>
                          <option value="REJECTED">Rejeitado</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Observações
                        </label>
                        <textarea
                          name="observations"
                          value={formData.observations}
                          onChange={handleChange}
                          rows={5}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        ></textarea>
                      </div>
                    </div>
                    
                    <div className="md:w-1/3 space-y-6 mt-6 md:mt-0">
                      {/* Foto do Candidato */}
                      {candidate.photoUrl && (
                        <div className="bg-white border border-secondary-200 rounded-lg p-4 mb-4">
                          <h3 className="text-lg font-semibold text-secondary-800 mb-3">Foto do Candidato</h3>
                          <div className="flex flex-col items-center">
                            <div 
                              className="relative w-48 h-auto rounded-lg overflow-hidden border border-secondary-200 cursor-pointer"
                              onClick={() => setShowPhotoModal(true)}
                            >
                              <img 
                                src={candidate.photoUrl} 
                                alt={`Foto de ${candidate.name}`}
                                className="max-w-full w-full object-contain rounded-lg"
                              />
                            </div>
                            <p className="text-sm text-secondary-600 mt-2">Clique na foto para visualizar em tamanho completo</p>
                          </div>
                        </div>
                      )}
                      <div className="bg-white border border-secondary-200 rounded-lg p-4 mb-4">
                        <h3 className="text-lg font-semibold text-secondary-800 mb-3">Informações do Convite</h3>
                        <div className="space-y-3">
                          {/* Seleção de Teste */}
                          <div className="bg-white p-3 rounded-md border border-secondary-200">
                            <label className="block text-sm text-secondary-600 mb-1">
                              Selecione o Teste:
                            </label>
                            <div className="relative">
                              <select
                                name="testId"
                                value={formData.testId}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-secondary-300 rounded-md appearance-none"
                                disabled={isLoadingTests}
                              >
                                <option value="">Selecione um teste</option>
                                {availableTests.map(test => (
                                  <option key={test.id} value={test.id}>
                                    {test.title}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                {isLoadingTests ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-primary-500 rounded-full border-t-transparent"></div>
                                ) : (
                                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            {formData.testId && (
                              <div className="mt-2 text-xs text-green-600">
                                <div className="flex items-center">
                                  <svg className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Teste selecionado
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-white p-3 rounded-md border border-secondary-200">
                            <span className="text-sm text-secondary-600">Código do Convite:</span>
                            <div className="flex items-center justify-between mt-1">
                              <p className="font-medium text-lg text-primary-600">{candidate?.inviteCode}</p>
                              <button
                                onClick={generateNewInvite}
                                disabled={isGeneratingInvite}
                                className={`px-3 py-1 text-sm ${
                                  isGeneratingInvite 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                                } rounded`}
                              >
                                {isGeneratingInvite 
                                  ? 'Gerando...' 
                                  : candidate?.inviteCode 
                                    ? 'Gerar Novo' 
                                    : 'Gerar Código'
                                }
                              </button>
                            </div>
                            {candidate.inviteCode && (
                              <div className="mt-2">
                                <button
                                  onClick={handleShare}
                                  className="w-full px-3 py-1 text-sm bg-green-50 text-green-600 hover:bg-green-100 rounded flex items-center justify-center"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                                  </svg>
                                  Compartilhar
                                </button>
                              </div>
                            )}
                            {candidate.inviteExpires && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-secondary-500 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Expira em: {format(new Date(candidate.inviteExpires), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                                <p className="text-xs text-secondary-500 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Status: {candidate.inviteSent ? 'Enviado' : 'Não enviado'}
                                </p>
                                <p className="text-xs text-secondary-500 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                  </svg>
                                  Tentativas: {candidate.inviteAttempts} de 5
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <span className="text-sm text-secondary-600">Data do Teste:</span>
                            <p className="font-medium">{format(new Date(candidate.testDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                          </div>
                          
                          {candidate.interviewDate && (
                            <div>
                              <span className="text-sm text-secondary-600">Data da Entrevista:</span>
                              <p className="font-medium">{format(new Date(candidate.interviewDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                            </div>
                          )}
                          
                          <div>
                            <span className="text-sm text-secondary-600">Status do Teste:</span>
                            <p className="font-medium">{candidate.completed ? 'Completo' : 'Incompleto'}</p>
                          </div>
                          
                          {candidate.completed && candidate.stageScores && candidate.stageScores.length > 0 && (
                            <div>
                              <span className="text-sm text-secondary-600">Pontuação Geral:</span>
                              <p className="font-medium">
                                {typeof candidate.score === 'object' 
                                  ? candidate.score.percentage 
                                  : parseFloat((candidate.score || 0).toFixed(1))}%</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Avaliação
                        </label>
                        <div className="flex items-center">
                          <Rating
                            name="candidate-rating"
                            value={parseFloat(formData.rating) || 0}
                            precision={0.5}
                            onChange={(_, newValue) => {
                              setFormData(prev => ({ 
                                ...prev, 
                                rating: newValue ? newValue.toString() : '0' 
                              }));
                            }}
                            size="large"
                          />
                          <div className="ml-2 text-sm text-secondary-700">
                            {formData.rating === '0' ? 'Sem avaliação' : 
                             `${formData.rating} ${formData.rating === '1' ? 'estrela' : 'estrelas'}`}
                          </div>
                        </div>
                      </div>
                      
                      {candidate.infoJobsLink && (
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Perfil InfoJobs
                          </label>
                          <Link 
                            href={candidate.infoJobsLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            <span>Ver perfil</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            </svg>
                          </Link>
                        </div>
                      )}
                      
                      {candidate.resumeFile && (
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Currículo
                          </label>
                          <Link 
                            href={candidate.resumeFile} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            <span>Ver currículo</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-1H4a1 1 0 00-1 1v1H0a2 2 0 000 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2V7a1 1 0 10-2 0v3a1 1 0 10-2 0V7a1 1 0 10-2 0v3a2 2 0 002 2h3z" />
                            </svg>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-4 mt-6 justify-end">
                    <button
                      onClick={handleSave}
                      className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium shadow-sm"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              )}
            </div>
  )
}
