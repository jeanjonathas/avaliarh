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
      setResponses(responsesData)
    } catch (error) {
      console.error('Erro ao carregar dados do candidato:', error)
    } finally {
      setLoading(false)
    }
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
    </div>
  )
}
