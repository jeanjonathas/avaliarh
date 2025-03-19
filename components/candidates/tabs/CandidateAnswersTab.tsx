import { Candidate } from '../types'
import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Tab } from '@headlessui/react'

interface CandidateAnswersTabProps {
  candidate: Candidate
}

export const CandidateAnswersTab = ({ candidate }: CandidateAnswersTabProps) => {
  const [activeTab, setActiveTab] = useState('responses')
  const [responses, setResponses] = useState<any>(null)
  const [performance, setPerformance] = useState<any>(null)
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

      // Carregar dados de desempenho
      const performancePromise = toast.promise(
        fetch(`/api/admin/candidates/${candidate.id}/performance`, {
          credentials: 'include'
        }).then(res => {
          if (!res.ok) throw new Error('Erro ao carregar dados de desempenho')
          return res.json()
        }),
        {
          pending: 'Carregando dados de desempenho...',
          success: 'Dados de desempenho carregados com sucesso',
          error: 'Erro ao carregar dados de desempenho'
        }
      )

      const [responsesData, performanceData] = await Promise.all([
        responsesPromise,
        performancePromise
      ])

      setResponses(responsesData)
      setPerformance(performanceData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados do candidato')
    } finally {
      setLoading(false)
    }
  }

  if (!candidate.completed) {
    return (
      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
        <h4 className="font-medium text-blue-800">Aguardando Respostas</h4>
        <p className="mt-2 text-blue-700">
          Este candidato ainda não realizou o teste. As respostas serão exibidas após a conclusão da avaliação.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <Tab.Group onChange={(index) => setActiveTab(index === 0 ? 'responses' : 'performance')}>
        <Tab.List className="flex space-x-4 border-b border-secondary-200 mb-6">
          <Tab
            className={({ selected }) =>
              `px-4 py-2 text-sm font-medium focus:outline-none ${
                selected
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700'
              }`
            }
          >
            Respostas
          </Tab>
          <Tab
            className={({ selected }) =>
              `px-4 py-2 text-sm font-medium focus:outline-none ${
                selected
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700'
              }`
            }
          >
            Desempenho
          </Tab>
        </Tab.List>

        <Tab.Panels>
          <Tab.Panel>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-secondary-800 mb-4">Respostas do Candidato</h3>
                  
                  {responses?.responses && responses.responses.length > 0 ? (
                    <div className="space-y-6">
                      {/* Agrupar respostas por etapa */}
                      {(() => {
                        const stageResponses: Record<string, any[]> = {}
                        
                        responses.responses.forEach((response: any) => {
                          const stageName = response.stageName || 'Etapa não identificada'
                          if (!stageResponses[stageName]) {
                            stageResponses[stageName] = []
                          }
                          stageResponses[stageName].push(response)
                        })
                        
                        return Object.entries(stageResponses).map(([stageName, stageResponses]) => (
                          <div key={stageName} className="border border-secondary-200 rounded-lg overflow-hidden mb-6">
                            <div className="bg-secondary-50 px-4 py-3 border-b border-secondary-200">
                              <h4 className="font-medium text-secondary-800">{stageName}</h4>
                            </div>
                            <div className="divide-y divide-secondary-200">
                              {stageResponses.map((response: any, index: number) => (
                                <div key={response.id} className="p-4">
                                  <div className="mb-3">
                                    <p className="font-medium text-secondary-700">
                                      {index + 1}. {response.questionText || 'Pergunta não disponível'}
                                    </p>
                                    {response.categoryName && (
                                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-secondary-100 text-secondary-600 rounded">
                                        {response.categoryName}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="ml-4">
                                    <div className={`p-2 rounded ${
                                      response.isCorrectOption 
                                        ? 'bg-green-50 text-green-700' 
                                        : 'bg-red-50 text-red-700'
                                    }`}>
                                      <p className="text-sm">
                                        <strong>Resposta escolhida:</strong> {response.optionText}
                                      </p>
                                      <p className="text-xs mt-1">
                                        {response.isCorrectOption ? (
                                          <span className="text-green-600">Resposta correta</span>
                                        ) : (
                                          <span className="text-red-600">Resposta incorreta</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
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
          </Tab.Panel>

          <Tab.Panel>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : performance ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Cards de resumo de desempenho */}
                  <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-primary-500">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-secondary-500">Total de Questões</p>
                        <p className="text-xl font-semibold text-secondary-900">{performance.summary.totalQuestions}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-green-500">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-green-100 text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-secondary-500">Respostas Corretas</p>
                        <p className="text-xl font-semibold text-secondary-900">{performance.summary.correctAnswers}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-500">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm text-secondary-500">Taxa de Acerto</p>
                        <p className="text-xl font-semibold text-secondary-900">{performance.summary.accuracy.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desempenho por etapa */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho por Etapa</h3>
                  <div className="space-y-4">
                    {performance.stagePerformance.map((stage: any) => (
                      <div key={stage.stageId} className="border border-secondary-200 rounded-lg p-4">
                        <h4 className="font-medium text-secondary-700 mb-2">{stage.stageName}</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-secondary-500">Total de Questões</p>
                            <p className="font-medium text-secondary-900">{stage.totalQuestions}</p>
                          </div>
                          <div>
                            <p className="text-secondary-500">Respostas Corretas</p>
                            <p className="font-medium text-secondary-900">{stage.correctAnswers}</p>
                          </div>
                          <div>
                            <p className="text-secondary-500">Taxa de Acerto</p>
                            <p className="font-medium text-secondary-900">{stage.accuracy.toFixed(1)}%</p>
                          </div>
                        </div>
                        {/* Barra de progresso */}
                        <div className="mt-3 h-2 bg-secondary-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${stage.accuracy}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tempo de conclusão */}
                {performance.startTime && performance.endTime && (
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Tempo de Conclusão</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-secondary-500">Início</p>
                        <p className="font-medium text-secondary-900">
                          {new Date(performance.startTime).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500">Conclusão</p>
                        <p className="font-medium text-secondary-900">
                          {new Date(performance.endTime).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <p className="text-yellow-700">
                  Não foi possível carregar os dados de desempenho.
                </p>
              </div>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
