import { Candidate } from '../types'
import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'

interface CandidateAnswersTabProps {
  candidate: Candidate
}

export const CandidateAnswersTab = ({ candidate }: CandidateAnswersTabProps) => {
  const [responses, setResponses] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (candidate.id) {
      loadCandidateData()
    }
  }, [candidate.id])

  const loadCandidateData = async () => {
    setLoading(true)

    try {
      // Carregar respostas
      const responsesPromise = toast.promise(
        fetch(`/api/admin/candidates/${candidate.id}/responses`, {
          credentials: 'include'
        }).then(res => {
          if (!res.ok) throw new Error('Erro ao carregar respostas')
          return res.json()
        }),
        {
          pending: 'Carregando respostas...',
          success: 'Respostas carregadas com sucesso',
          error: 'Erro ao carregar respostas'
        }
      )

      const responsesData = await responsesPromise
      console.log('Dados de respostas recebidos:', JSON.stringify(responsesData, null, 2))
      setResponses(responsesData)
    } catch (error) {
      console.error('Erro ao carregar dados do candidato:', error)
    } finally {
      setLoading(false)
    }
  }

  // Função para verificar se a pergunta é opinativa
  const isOpinionQuestion = (response: any) => {
    // Verificar se todas as opções são marcadas como corretas
    if (!response.question?.options || response.question.options.length === 0) {
      return false
    }
    
    // Se todas as opções são corretas, consideramos como uma pergunta opinativa
    return response.question.options.every((option: any) => option.isCorrect === true)
  }

  // Função para extrair a personalidade da opção
  const extractPersonality = (option: any, response: any) => {
    // Primeiro, verificar se temos a personalidade diretamente no objeto da opção
    if (option.categoryName) {
      return option.categoryName
    }
    
    // Verificar se temos a personalidade no snapshot da resposta
    if (response.optionCharacteristic && option.id === response.optionId) {
      return response.optionCharacteristic
    }
    
    // Verificar se a personalidade está no texto da opção (entre parênteses)
    if (option.text) {
      const match = option.text.match(/\(([^)]+)\)/)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    
    return "Não especificado"
  }

  // Função para formatar o texto da opção removendo a personalidade entre parênteses
  const formatOptionText = (optionText: string) => {
    if (!optionText) return ""
    return optionText.replace(/\s*\([^)]*\)\s*/, '')
  }

  // Função para encontrar o ID da opção selecionada pelo candidato
  const findSelectedOptionId = (response: any) => {
    if (!response.question?.options || !response.optionText) return null
    
    // Se já temos o optionId, retorná-lo
    if (response.optionId) return response.optionId
    
    // Procurar a opção que corresponde ao texto da resposta
    const selectedOption = response.question.options.find(
      (option: any) => option.text === response.optionText
    )
    
    return selectedOption?.id || null
  }

  return (
    <div className="mt-4">
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4">
            {responses && responses.length > 0 ? (
              <div className="space-y-6">
                {(() => {
                  // Agrupar respostas por etapa
                  const stageGroups: Record<string, any> = {}
                  
                  responses.forEach((response: any) => {
                    const stageId = response.stageId || 'sem-etapa'
                    const stageName = response.stageName || 'Sem Etapa'
                    
                    if (!stageGroups[stageId]) {
                      stageGroups[stageId] = {
                        id: stageId,
                        name: stageName,
                        responses: []
                      }
                    }
                    
                    stageGroups[stageId].responses.push(response)
                  })
                  
                  return Object.values(stageGroups).map((stage: any) => (
                    <div key={stage.id} className="mb-8">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
                        {stage.name}
                      </h3>
                      <div className="space-y-6">
                        {stage.responses.map((response: any) => {
                          console.log('Processando resposta:', response)
                          
                          // Encontrar o ID da opção selecionada
                          const selectedOptionId = findSelectedOptionId(response)
                          console.log('ID da opção selecionada:', selectedOptionId)
                          
                          return (
                          <div key={response.id} className="bg-gray-50 p-4 rounded-lg">
                            <div className="mb-3">
                              <h4 className="font-medium text-gray-900">
                                {/* Renderizar o texto da pergunta como HTML */}
                                <div dangerouslySetInnerHTML={{ __html: response.questionText }} />
                              </h4>
                              
                              {/* Renderização diferente para perguntas opinativas e normais */}
                              {response.question?.options && (
                                <div className="mt-2">
                                  {isOpinionQuestion(response) ? (
                                    // Exibição para perguntas opinativas em formato de tabela
                                    <div className="mt-2">
                                      <p className="text-xs mb-2 text-gray-500 italic">
                                        Esta é uma pergunta opinativa sem resposta certa ou errada.
                                      </p>
                                      <div className="overflow-hidden border border-gray-200 rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-200">
                                          <thead className="bg-gray-50">
                                            <tr>
                                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Personalidade
                                              </th>
                                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Alternativa
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white divide-y divide-gray-200">
                                            {response.question.options.map((option: any) => {
                                              console.log('Opção:', option, 'ID da opção selecionada:', selectedOptionId)
                                              
                                              // Extrair a personalidade usando a função melhorada
                                              const personality = extractPersonality(option, response);
                                              const formattedText = formatOptionText(option.text);
                                              
                                              // Verificar se esta é a opção selecionada
                                              const isSelected = 
                                                option.id === selectedOptionId || 
                                                option.text === response.optionText;
                                              
                                              return (
                                                <tr 
                                                  key={option.id} 
                                                  className={`${isSelected ? 'bg-blue-50' : ''} hover:bg-gray-50`}
                                                >
                                                  <td className="px-4 py-2 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isSelected ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                      {personality}
                                                    </span>
                                                  </td>
                                                  <td className="px-4 py-2">
                                                    <div className="flex items-center">
                                                      <span className={isSelected ? 'font-medium' : ''}>
                                                        {formattedText}
                                                      </span>
                                                      {isSelected && (
                                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white">
                                                          Escolhida
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  ) : (
                                    // Exibição para perguntas normais - mostrar todas as opções
                                    <div className="space-y-1">
                                      {response.question.options.map((option: any) => {
                                        const isSelected = 
                                          option.id === selectedOptionId || 
                                          option.text === response.optionText;
                                        
                                        return (
                                          <div
                                            key={option.id}
                                            className={`p-2 rounded ${
                                              isSelected
                                                ? option.isCorrect
                                                  ? 'bg-green-100 border-l-4 border-green-500'
                                                  : 'bg-red-100 border-l-4 border-red-500'
                                                : option.isCorrect
                                                ? 'bg-green-50 border-l-4 border-green-300'
                                                : 'bg-gray-100'
                                            }`}
                                          >
                                            {option.text}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Não mostrar o resumo da resposta para perguntas opinativas */}
                            {!isOpinionQuestion(response) && (
                              <div className="ml-4">
                                <div className={`p-2 rounded ${
                                  response.isCorrect 
                                    ? 'bg-green-50 text-green-700' 
                                    : 'bg-red-50 text-red-700'
                                }`}>
                                  <p className="text-sm">
                                    <strong>Resposta escolhida:</strong> {response.optionText}
                                  </p>
                                  <p className="text-xs mt-1">
                                    {response.isCorrect ? (
                                      <span className="text-green-600">Resposta correta</span>
                                    ) : (
                                      <span className="text-red-600">Resposta incorreta</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    </div>
                  ))
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
        </div>
      )}
    </div>
  )
}
