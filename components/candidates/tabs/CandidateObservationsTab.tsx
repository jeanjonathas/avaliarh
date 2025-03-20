import { useState, useEffect } from 'react'
import { Candidate } from '../types'
import { FiSave, FiCheckCircle, FiAlertCircle, FiClock, FiList, FiFileText, FiStar } from 'react-icons/fi'

interface CandidateObservationsTabProps {
  candidate: Candidate
  onUpdate?: () => void
}

export const CandidateObservationsTab = ({ candidate, onUpdate }: CandidateObservationsTabProps) => {
  const [observations, setObservations] = useState(candidate.observations || '')
  const [savedObservations, setSavedObservations] = useState(candidate.observations || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'error'>('saved')
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [timer, setTimer] = useState<number>(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [interviewNotes, setInterviewNotes] = useState<{
    strengths: string[];
    weaknesses: string[];
    questions: string[];
    ratings: Record<string, number>;
  }>({
    strengths: [],
    weaknesses: [],
    questions: [],
    ratings: {
      technicalSkills: 0,
      communication: 0,
      teamwork: 0,
      problemSolving: 0,
      culturalFit: 0
    }
  })

  // Carregar as observações e notas de entrevista existentes
  useEffect(() => {
    const fetchObservations = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/candidates/${candidate.id}/observations`, {
          method: 'GET',
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setObservations(data.observations || '')
          setSavedObservations(data.observations || '')
          
          // Carregar as notas de entrevista se existirem
          if (data.interviewNotes) {
            try {
              const parsedNotes = typeof data.interviewNotes === 'string' 
                ? JSON.parse(data.interviewNotes) 
                : data.interviewNotes
                
              setInterviewNotes({
                strengths: parsedNotes.strengths || [],
                weaknesses: parsedNotes.weaknesses || [],
                questions: parsedNotes.questions || [],
                ratings: parsedNotes.ratings || {
                  technicalSkills: 0,
                  communication: 0,
                  teamwork: 0,
                  problemSolving: 0,
                  culturalFit: 0
                }
              })
            } catch (e) {
              console.error('Erro ao analisar as notas de entrevista:', e)
            }
          }
        } else {
          // Se o endpoint retornar erro, apenas use os dados iniciais
          console.warn('Não foi possível carregar as observações do candidato')
        }
      } catch (error) {
        console.error('Erro ao carregar observações:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchObservations()
  }, [candidate.id])

  // Templates de observações para diferentes tipos de entrevistas
  const observationTemplates = [
    {
      id: 'technical',
      name: 'Entrevista Técnica',
      template: `# Entrevista Técnica - ${candidate.name}

## Conhecimentos Técnicos
- 

## Experiência Prática
- 

## Resolução de Problemas
- 

## Pontos Fortes
- 

## Áreas para Desenvolvimento
- 

## Perguntas Adicionais
- 

## Conclusão
- 
`
    },
    {
      id: 'behavioral',
      name: 'Entrevista Comportamental',
      template: `# Entrevista Comportamental - ${candidate.name}

## Comunicação
- 

## Trabalho em Equipe
- 

## Adaptabilidade
- 

## Resolução de Conflitos
- 

## Motivação e Alinhamento com Valores
- 

## Perguntas Adicionais
- 

## Conclusão
- 
`
    },
    {
      id: 'hr',
      name: 'Entrevista de RH',
      template: `# Entrevista de RH - ${candidate.name}

## Expectativas Salariais
- 

## Disponibilidade
- 

## Histórico Profissional
- 

## Motivação para a Vaga
- 

## Perguntas do Candidato
- 

## Próximos Passos
- 

## Conclusão
- 
`
    }
  ]

  // Iniciar/parar o timer
  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning)
  }

  // Resetar o timer
  const resetTimer = () => {
    setTimer(0)
    setIsTimerRunning(false)
  }

  // Atualizar o timer a cada segundo
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prevTimer => prevTimer + 1)
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning])

  // Formatar o tempo do timer
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Adicionar item à lista (forças, fraquezas, perguntas)
  const addListItem = (list: 'strengths' | 'weaknesses' | 'questions', item: string) => {
    if (!item.trim()) return
    
    setInterviewNotes(prev => ({
      ...prev,
      [list]: [...prev[list], item]
    }))
  }

  // Remover item da lista
  const removeListItem = (list: 'strengths' | 'weaknesses' | 'questions', index: number) => {
    setInterviewNotes(prev => ({
      ...prev,
      [list]: prev[list].filter((_, i) => i !== index)
    }))
  }

  // Atualizar avaliação
  const updateRating = (category: string, value: number) => {
    setInterviewNotes(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [category]: value
      }
    }))
  }

  // Aplicar template de observação
  const applyTemplate = (templateId: string) => {
    const template = observationTemplates.find(t => t.id === templateId)
    if (template) {
      // Confirmar antes de substituir o conteúdo atual
      if (observations && observations !== savedObservations) {
        if (!confirm('Você tem alterações não salvas. Deseja substituir o conteúdo atual?')) {
          return
        }
      }
      setObservations(template.template)
      setActiveTemplate(templateId)
      setSaveStatus('unsaved')
    }
  }

  // Salvar observações
  const handleSaveObservations = async () => {
    try {
      setIsSaving(true)
      setSaveStatus('unsaved')
      
      const response = await fetch(`/api/admin/candidates/${candidate.id}/observations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          observations,
          interviewNotes
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar observações')
      }

      setSavedObservations(observations)
      setSaveStatus('saved')
      
      // Mostrar mensagem de sucesso temporária
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed top-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded shadow-md z-50'
      successMessage.textContent = 'Observações salvas com sucesso!'
      document.body.appendChild(successMessage)
      
      setTimeout(() => {
        document.body.removeChild(successMessage)
      }, 3000)
      
      onUpdate?.()
    } catch (error) {
      console.error('Erro ao atualizar observações:', error)
      setSaveStatus('error')
      
      // Mostrar mensagem de erro temporária
      const errorMessage = document.createElement('div')
      errorMessage.className = 'fixed top-4 right-4 bg-red-100 text-red-800 px-4 py-2 rounded shadow-md z-50'
      errorMessage.textContent = 'Erro ao salvar observações. Tente novamente.'
      document.body.appendChild(errorMessage)
      
      setTimeout(() => {
        document.body.removeChild(errorMessage)
      }, 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // Verificar se há alterações não salvas
  useEffect(() => {
    if (observations !== savedObservations) {
      setSaveStatus('unsaved')
    } else {
      setSaveStatus('saved')
    }
  }, [observations, savedObservations])

  // Adicionar as notas estruturadas às observações
  const appendStructuredNotes = () => {
    const structuredNotes = `
## Notas Estruturadas da Entrevista

### Pontos Fortes
${interviewNotes.strengths.map(item => `- ${item}`).join('\n')}

### Pontos a Melhorar
${interviewNotes.weaknesses.map(item => `- ${item}`).join('\n')}

### Perguntas Realizadas
${interviewNotes.questions.map(item => `- ${item}`).join('\n')}

### Avaliações
- Habilidades Técnicas: ${interviewNotes.ratings.technicalSkills}/5
- Comunicação: ${interviewNotes.ratings.communication}/5
- Trabalho em Equipe: ${interviewNotes.ratings.teamwork}/5
- Resolução de Problemas: ${interviewNotes.ratings.problemSolving}/5
- Adequação Cultural: ${interviewNotes.ratings.culturalFit}/5

### Tempo de Entrevista
${formatTime(timer)}
`
    setObservations(prev => prev + structuredNotes)
    setSaveStatus('unsaved')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Barra de ferramentas superior */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTimer}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isTimerRunning ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
            >
              <FiClock className="inline mr-1" />
              {isTimerRunning ? 'Pausar' : 'Iniciar'} Timer
            </button>
            <button
              onClick={resetTimer}
              className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700"
            >
              Resetar
            </button>
            <span className="text-lg font-mono bg-gray-100 px-3 py-1 rounded">
              {formatTime(timer)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Templates:</span>
            {observationTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTemplate === template.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {template.name}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <button
              onClick={handleSaveObservations}
              disabled={isSaving || saveStatus === 'saved'}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                saveStatus === 'error'
                  ? 'bg-red-100 text-red-700'
                  : saveStatus === 'unsaved'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {saveStatus === 'error' ? (
                <FiAlertCircle className="mr-1" />
              ) : saveStatus === 'unsaved' ? (
                <FiSave className="mr-1" />
              ) : (
                <FiCheckCircle className="mr-1" />
              )}
              {isSaving
                ? 'Salvando...'
                : saveStatus === 'error'
                ? 'Erro ao salvar'
                : saveStatus === 'unsaved'
                ? 'Salvar alterações'
                : 'Salvo'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Área principal de observações */}
        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-700 mb-3 flex items-center">
              <FiFileText className="mr-2" /> Observações da Entrevista
            </h2>
            <textarea
              className="w-full p-3 border rounded-md min-h-[400px] font-mono text-sm"
              placeholder="Adicione observações detalhadas sobre o candidato..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />
          </div>
        </div>

        {/* Painel lateral com ferramentas */}
        <div className="space-y-4">
          {/* Pontos fortes */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-md font-medium text-gray-700 mb-3 flex items-center">
              <FiList className="mr-2" /> Pontos Fortes
            </h2>
            <div className="flex mb-2">
              <input
                type="text"
                className="flex-grow p-2 border rounded-l-md text-sm"
                placeholder="Adicionar ponto forte..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addListItem('strengths', e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
              />
              <button
                className="bg-green-100 text-green-700 px-3 py-2 rounded-r-md"
                onClick={(e) => {
                  const input = e.currentTarget.previousSibling as HTMLInputElement
                  addListItem('strengths', input.value)
                  input.value = ''
                }}
              >
                +
              </button>
            </div>
            <ul className="space-y-1 max-h-[150px] overflow-y-auto">
              {interviewNotes.strengths.map((item, index) => (
                <li key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                  <span>{item}</span>
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeListItem('strengths', index)}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Pontos a melhorar */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-md font-medium text-gray-700 mb-3 flex items-center">
              <FiList className="mr-2" /> Pontos a Melhorar
            </h2>
            <div className="flex mb-2">
              <input
                type="text"
                className="flex-grow p-2 border rounded-l-md text-sm"
                placeholder="Adicionar ponto a melhorar..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addListItem('weaknesses', e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
              />
              <button
                className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-r-md"
                onClick={(e) => {
                  const input = e.currentTarget.previousSibling as HTMLInputElement
                  addListItem('weaknesses', input.value)
                  input.value = ''
                }}
              >
                +
              </button>
            </div>
            <ul className="space-y-1 max-h-[150px] overflow-y-auto">
              {interviewNotes.weaknesses.map((item, index) => (
                <li key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                  <span>{item}</span>
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeListItem('weaknesses', index)}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Perguntas realizadas */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-md font-medium text-gray-700 mb-3 flex items-center">
              <FiList className="mr-2" /> Perguntas Realizadas
            </h2>
            <div className="flex mb-2">
              <input
                type="text"
                className="flex-grow p-2 border rounded-l-md text-sm"
                placeholder="Adicionar pergunta..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addListItem('questions', e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
              />
              <button
                className="bg-blue-100 text-blue-700 px-3 py-2 rounded-r-md"
                onClick={(e) => {
                  const input = e.currentTarget.previousSibling as HTMLInputElement
                  addListItem('questions', input.value)
                  input.value = ''
                }}
              >
                +
              </button>
            </div>
            <ul className="space-y-1 max-h-[150px] overflow-y-auto">
              {interviewNotes.questions.map((item, index) => (
                <li key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                  <span>{item}</span>
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeListItem('questions', index)}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Avaliações */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-md font-medium text-gray-700 mb-3 flex items-center">
              <FiStar className="mr-2" /> Avaliações
            </h2>
            <div className="space-y-3">
              {Object.entries({
                technicalSkills: 'Habilidades Técnicas',
                communication: 'Comunicação',
                teamwork: 'Trabalho em Equipe',
                problemSolving: 'Resolução de Problemas',
                culturalFit: 'Adequação Cultural'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center">
                  <span className="text-sm w-40">{label}:</span>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map(value => (
                      <button
                        key={value}
                        className={`w-8 h-8 rounded-full ${
                          interviewNotes.ratings[key as keyof typeof interviewNotes.ratings] >= value
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                        onClick={() => updateRating(key, value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botão para adicionar notas estruturadas */}
          <button
            onClick={appendStructuredNotes}
            className="w-full bg-primary-100 text-primary-700 px-4 py-3 rounded-md font-medium"
          >
            Adicionar Notas Estruturadas ao Texto
          </button>
        </div>
      </div>
    </div>
  )
}
