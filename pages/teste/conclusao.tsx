import { NextPage } from 'next'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'

interface CandidateData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  testId?: string;
  instagram?: string;
  photoUrl?: string;
  score?: number;
  multipleChoiceQuestions?: number;
  opinionQuestions?: number;
  accuracyRate?: number;
  observations?: string;
  showResults?: boolean;
  requestPhoto?: boolean;
  rawObservations?: string;
}

interface TestData {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
}

const Conclusao: NextPage = () => {
  const router = useRouter()
  const { candidateId } = router.query
  const [candidateData, setCandidateData] = useState<CandidateData | null>(null)
  const [testData, setTestData] = useState<TestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<CandidateData>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Função para formatar os dados do candidato para exibição
  const formatCandidateData = (data: any) => {
    if (!data) return null;
    
    // Extrair dados de pontuação do campo observations se existirem
    let scoreData = {};
    if (data.observations) {
      try {
        const parsedObservations = JSON.parse(data.observations);
        if (parsedObservations.score !== undefined && 
            parsedObservations.multipleChoiceQuestions !== undefined && 
            parsedObservations.accuracyRate !== undefined) {
          scoreData = {
            score: parsedObservations.score,
            multipleChoiceQuestions: parsedObservations.multipleChoiceQuestions,
            opinionQuestions: parsedObservations.opinionQuestions || 0,
            accuracyRate: parsedObservations.accuracyRate
          };
        }
      } catch (e) {
        console.error('Erro ao analisar observations:', e);
      }
    }
    
    // Usar os campos diretos do banco de dados se disponíveis, caso contrário usar os dados do observations
    return {
      ...data,
      name: data.name || 'Não informado',
      email: data.email || 'Não informado',
      phone: data.phone || 'Não informado',
      position: data.position || 'Não informado',
      instagram: data.instagram || 'Não informado',
      score: data.score !== undefined ? data.score : (scoreData as any).score || 0,
      multipleChoiceQuestions: data.multipleChoiceQuestions !== undefined ? data.multipleChoiceQuestions : (scoreData as any).multipleChoiceQuestions || 0,
      opinionQuestions: data.opinionQuestions !== undefined ? data.opinionQuestions : (scoreData as any).opinionQuestions || 0,
      accuracyRate: data.accuracyRate !== undefined ? data.accuracyRate : (scoreData as any).accuracyRate || 0
    };
  }

  useEffect(() => {
    // Verificar se há dados do candidato e do teste na sessão
    if (typeof window !== 'undefined') {
      const storedCandidateData = sessionStorage.getItem('candidateData')
      const storedTestData = sessionStorage.getItem('testData')
      
      if (storedCandidateData) {
        try {
          const parsedData = JSON.parse(storedCandidateData)
          
          // Não precisamos mais extrair dados do campo observations
          // pois usaremos os campos apropriados do modelo
          console.log('Dados do candidato carregados:', parsedData)
          // Adicionar log detalhado para debug
          console.log('Dados detalhados do candidato:', {
            id: parsedData.id,
            name: parsedData.name,
            email: parsedData.email,
            phone: parsedData.phone,
            position: parsedData.position,
            instagram: parsedData.instagram,
            score: parsedData.score,
            multipleChoiceQuestions: parsedData.multipleChoiceQuestions,
            accuracyRate: parsedData.accuracyRate
          })
          setCandidateData(parsedData)
          setFormData({
            name: parsedData.name || '',
            email: parsedData.email || '',
            phone: parsedData.phone || '',
            position: parsedData.position || '',
            instagram: parsedData.instagram || ''
          })
        } catch (error) {
          console.error('Erro ao carregar dados do candidato:', error)
        }
      }
      
      if (storedTestData) {
        try {
          const parsedData = JSON.parse(storedTestData)
          setTestData(parsedData)
        } catch (error) {
          console.error('Erro ao carregar dados do teste:', error)
        }
      }
      
      setLoading(false)
    }
  }, [])

  const [testMarkedAsCompleted, setTestMarkedAsCompleted] = useState(false)
  const [completionError, setCompletionError] = useState(false)
  
  // Buscar dados do candidato diretamente do banco de dados
  const fetchCandidateData = useCallback(async () => {
    if (candidateId) {
      try {
        console.log(`Buscando dados atualizados do candidato ${candidateId}...`);
        
        const response = await fetch(`/api/candidates/${candidateId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Dados do candidato obtidos da API:', data.candidate);
          
          if (data.candidate) {
            // Formatar os dados do candidato antes de atualizar o estado
            const formattedData = formatCandidateData(data.candidate);
            console.log('Dados formatados do candidato:', formattedData);
            
            // Atualizar os dados do candidato no estado e na sessão
            setCandidateData(formattedData);
            
            // Inicializar o formulário com os dados formatados
            setFormData({
              name: formattedData.name || '',
              email: formattedData.email || '',
              phone: formattedData.phone || '',
              position: formattedData.position || '',
              instagram: formattedData.instagram || ''
            });
            
            // Atualizar os dados na sessão
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('candidateData', JSON.stringify(formattedData));
            }
          }
        } else {
          console.error('Erro ao buscar dados do candidato:', await response.text());
        }
      } catch (error) {
        console.error('Erro ao buscar dados do candidato:', error);
      }
    }
  }, [candidateId]);
  
  // Buscar dados do candidato quando a página carrega
  useEffect(() => {
    fetchCandidateData();
  }, [fetchCandidateData]);

  // Marcar o teste como concluído no banco de dados
  useEffect(() => {
    const markTestAsCompleted = async () => {
      if (!candidateId) return
      
      try {
        console.log(`Marcando teste como concluído para o candidato ${candidateId}...`)
        
        const response = await fetch('/api/candidates/complete-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ candidateId }),
        })
        
        if (response.ok) {
          console.log('Teste marcado como concluído com sucesso!')
          setTestMarkedAsCompleted(true)
          setCompletionError(false)
          
          // Atualizar os dados do candidato com as informações de desempenho
          const data = await response.json();
          console.log('Resposta do complete-test:', data);
          
          if (data.candidate) {
            const updatedCandidateData = {
              ...candidateData,
              score: data.candidate.score,
              multipleChoiceQuestions: data.candidate.multipleChoiceQuestions,
              accuracyRate: data.candidate.accuracyRate,
              completed: true
            };
            
            console.log('Dados atualizados do candidato:', updatedCandidateData);
            setCandidateData(updatedCandidateData);
            
            // Atualizar os dados na sessão
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('candidateData', JSON.stringify(updatedCandidateData));
            }
            
            // Buscar dados atualizados do candidato para garantir que temos os dados mais recentes
            fetchCandidateData();
          }
          
          // Limpar dados de sessão para evitar acesso posterior
          if (typeof window !== 'undefined') {
            // Manter os dados do candidato para exibição, mas marcar como concluído
            const storedCandidateData = sessionStorage.getItem('candidateData')
            if (storedCandidateData) {
              try {
                const parsedData = JSON.parse(storedCandidateData)
                parsedData.completed = true
                sessionStorage.setItem('candidateData', JSON.stringify(parsedData))
              } catch (error) {
                console.error('Erro ao atualizar dados do candidato na sessão:', error)
              }
            }
          }
        } else {
          console.error('Erro ao marcar teste como concluído:', await response.text())
          setCompletionError(true)
          
          // Tentar novamente após 3 segundos
          setTimeout(markTestAsCompleted, 3000)
        }
      } catch (error) {
        console.error('Erro ao marcar teste como concluído:', error)
        setCompletionError(true)
        
        // Tentar novamente após 3 segundos
        setTimeout(markTestAsCompleted, 3000)
      }
    }
    
    if (candidateId && !testMarkedAsCompleted) {
      markTestAsCompleted()
    }
  }, [candidateId, testMarkedAsCompleted, candidateData, fetchCandidateData])

  // Reinicializar formData quando o modo de edição é alterado
  useEffect(() => {
    if (isEditMode && candidateData) {
      console.log('Reinicializando dados do formulário:', candidateData);
      setFormData({
        name: candidateData.name || '',
        email: candidateData.email || '',
        phone: candidateData.phone || '',
        position: candidateData.position || '',
        instagram: candidateData.instagram || ''
      });
    }
  }, [isEditMode, candidateData]);

  // Função para manipular a mudança nos campos do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Debug: Mostrar os dados do candidato no console
  useEffect(() => {
    if (candidateData) {
      console.log('Dados do candidato para exibição:', {
        name: candidateData.name,
        email: candidateData.email,
        phone: candidateData.phone,
        position: candidateData.position,
        instagram: candidateData.instagram
      })
    }
  }, [candidateData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!candidateData?.id) return
    
    setIsSaving(true)
    setSaveSuccess(false)
    
    try {
      const response = await fetch('/api/candidates/update-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateId: candidateData.id,
          ...formData
        }),
      })
      
      if (response.ok) {
        // Atualizar os dados na sessão
        if (typeof window !== 'undefined') {
          const updatedData = { ...candidateData, ...formData }
          sessionStorage.setItem('candidateData', JSON.stringify(updatedData))
          setCandidateData(updatedData)
        }
        
        setSaveSuccess(true)
        setIsEditMode(false)
      } else {
        console.error('Erro ao atualizar dados')
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-lg text-secondary-700">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <header className="flex justify-between items-center mb-12">
          <Link href="/" className="text-2xl font-bold text-primary-700">
            <Image 
              src="/images/logo_horizontal.png"
              alt="Admitto Logo"
              width={180}
              height={54}
              priority
            />
          </Link>
        </header>

        <main className="max-w-3xl mx-auto">
          <div className="card text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-secondary-900 mb-4">Avaliação Concluída!</h1>
            
            {completionError && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg mb-4 max-w-lg mx-auto text-sm">
                Estamos finalizando o registro da sua avaliação. Por favor, aguarde um momento...
              </div>
            )}
            
            {testMarkedAsCompleted && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg mb-4 max-w-lg mx-auto text-sm">
                Sua avaliação foi registrada com sucesso!
              </div>
            )}
            
            {candidateData && (
              <p className="text-xl text-secondary-700 mb-6">
                Obrigado, <span className="font-semibold">{candidateData.name}</span>!
              </p>
            )}
            
            {testData && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6 inline-block mx-auto">
                <h2 className="text-xl font-semibold text-secondary-800 mb-2">
                  Teste: {testData.title}
                </h2>
                {testData.description && (
                  <p className="text-secondary-700">{testData.description}</p>
                )}
              </div>
            )}
            
            <div className="space-y-6 text-secondary-700 max-w-2xl mx-auto">
              <p>
                Sua avaliação foi concluída com sucesso. Agradecemos sua participação no processo seletivo.
              </p>
              
              {/* Seção de desempenho do candidato - só exibir se showResults for true */}
              {(!candidateData || candidateData.showResults !== false) && (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-left">
                  <h3 className="text-lg font-semibold text-secondary-800 mb-4">Seu desempenho</h3>
                  
                  <div className="flex flex-col items-center justify-center mb-4">
                    <div className="relative w-40 h-40 mb-3">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#eee"
                          strokeWidth="3"
                          strokeDasharray="100, 100"
                        />
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={candidateData?.accuracyRate >= 80 ? "#10b981" : 
                                  candidateData?.accuracyRate >= 60 ? "#f59e0b" : "#ef4444"}
                          strokeWidth="3"
                          strokeDasharray={`${(candidateData?.accuracyRate || 0).toFixed(1)}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-3xl font-bold">{(candidateData?.accuracyRate || 0).toFixed(1)}%</span>
                          <p className="text-sm text-gray-500">Acertos</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">
                        Você acertou <span className="font-semibold">{Math.round((candidateData?.accuracyRate || 0) * (candidateData?.multipleChoiceQuestions || 0) / 100)}</span> de <span className="font-semibold">{candidateData?.multipleChoiceQuestions || 0}</span> questões de múltipla escolha
                      </p>
                      {candidateData?.opinionQuestions > 0 && (
                        <p className="text-sm text-gray-600 mb-1">
                          Você também respondeu <span className="font-semibold">{candidateData?.opinionQuestions || 0}</span> questões opinativas
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        Obrigado por participar do nosso processo seletivo!
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Seção de dados de contato */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-left mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-secondary-800">Seus dados de contato</h3>
                  
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Corrigir dados
                    </button>
                  )}
                </div>
                
                {saveSuccess && (
                  <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
                    Seus dados foram atualizados com sucesso!
                  </div>
                )}
                
                {isEditMode ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name || ''}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email || ''}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone || ''}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                        <input
                          type="text"
                          id="position"
                          name="position"
                          value={formData.position || ''}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                        <input
                          type="text"
                          id="instagram"
                          name="instagram"
                          value={formData.instagram || ''}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          placeholder="@seu-usuario"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditMode(false);
                          // Reinicializar o formulário com os dados atuais do candidato
                          if (candidateData) {
                            setFormData({
                              name: candidateData.name || '',
                              email: candidateData.email || '',
                              phone: candidateData.phone || '',
                              position: candidateData.position || '',
                              instagram: candidateData.instagram || ''
                            });
                          }
                          setSaveSuccess(false);
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                        disabled={isSaving}
                      >
                        Cancelar
                      </button>
                      
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded flex items-center"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                            Salvando...
                          </>
                        ) : (
                          'Salvar alterações'
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Nome</p>
                      <p className="font-medium">{candidateData?.name}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{candidateData?.email}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Telefone</p>
                      <p className="font-medium">{candidateData?.phone}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Cargo</p>
                      <p className="font-medium">{candidateData?.position}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Instagram</p>
                      {candidateData?.instagram && candidateData?.instagram !== 'Não informado' ? (
                        <a 
                          href={`https://instagram.com/${candidateData?.instagram.replace('@', '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline font-medium"
                        >
                          {candidateData?.instagram}
                        </a>
                      ) : (
                        <p className="font-medium">Não informado</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-primary-50 p-6 rounded-lg border border-primary-100">
                <h3 className="text-lg font-semibold text-secondary-800 mb-3">O que acontece agora?</h3>
                <ul className="list-disc pl-6 space-y-2 text-left">
                  <li>Nossa equipe de RH irá analisar sua participação no processo.</li>
                  <li>Você será contatado por email ou telefone sobre os próximos passos do processo seletivo.</li>
                  <li>O prazo para retorno é de aproximadamente 5 dias úteis.</li>
                </ul>
              </div>
              
              <p>
                Se tiver alguma dúvida sobre o processo seletivo, entre em contato conosco pelo email <a href="mailto:contato@Admitto.com.br" className="text-primary-600 hover:underline">contato@Admitto.com.br</a>.
              </p>
              
              <div className="pt-6">
                <Link href="/" className="btn-primary">
                  Voltar para a Página Inicial
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Conclusao
