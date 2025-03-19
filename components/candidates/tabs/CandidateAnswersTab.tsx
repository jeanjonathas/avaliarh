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
      console.error('Erro ao carregar dados do candidato:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                selected
                  ? 'bg-white shadow'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              }`
            }
            onClick={() => setActiveTab('responses')}
          >
            Respostas
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                selected
                  ? 'bg-white shadow'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              }`
            }
            onClick={() => setActiveTab('performance')}
          >
            Desempenho
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-2">
          <Tab.Panel>
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
                        const stageGroups: Record<string, any[]> = {}
                        
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
                              {stage.responses.map((response: any) => (
                                <div key={response.id} className="bg-gray-50 p-4 rounded-lg">
                                  <div className="mb-3">
                                    <h4 className="font-medium text-gray-900">
                                      {response.questionText}
                                    </h4>
                                    {response.question?.options && (
                                      <div className="mt-2 space-y-1">
                                        {response.question.options.map((option: any) => (
                                          <div
                                            key={option.id}
                                            className={`p-2 rounded ${
                                              option.id === response.optionId
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
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  
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
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4">
                  {performance && performance.summary ? (
                    performance.showResults === true ? (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Resumo de Desempenho</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

                        {performance.stagePerformance && performance.stagePerformance.length > 0 && (
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Desempenho por Etapa</h3>
                            <div className="space-y-4">
                              {performance.stagePerformance.map((stage: any) => (
                                <div key={stage.stageId} className="bg-white p-4 rounded-lg shadow border">
                                  <h4 className="font-medium text-gray-900 mb-2">{stage.stageName}</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                      <p className="text-sm text-gray-500">Total de Questões</p>
                                      <p className="font-semibold">{stage.totalQuestions}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">Corretas</p>
                                      <p className="font-semibold text-green-600">{stage.correctAnswers}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">Incorretas</p>
                                      <p className="font-semibold text-red-600">{stage.incorrectAnswers}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">Taxa de Acerto</p>
                                      <p className="font-semibold">{stage.accuracy.toFixed(1)}%</p>
                                    </div>
                                  </div>
                                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                      className="bg-blue-600 h-2.5 rounded-full" 
                                      style={{ width: `${stage.accuracy}%` }}
                                    ></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="text-yellow-700">
                          A exibição dos resultados de desempenho não está habilitada para este teste.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                      <p className="text-yellow-700">
                        Não foram encontrados dados de desempenho para este candidato.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
