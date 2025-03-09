import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  RadialLinearScale,
  Filler
} from 'chart.js'
import { Bar, Radar } from 'react-chartjs-2'
import { Rating } from '@mui/material'
import Navbar from '../../../components/admin/Navbar'

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
)

interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  position?: string
  testDate: string
  interviewDate?: string
  completed: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rating?: number
  observations?: string
  infoJobsLink?: string
  socialMediaUrl?: string
  resumeFile?: string
  linkedin?: string
  github?: string
  portfolio?: string
  resumeUrl?: string
  inviteCode?: string
  inviteSent: boolean
  inviteExpires?: string
  inviteAttempts: number
  score?: number
  createdAt: string
  updatedAt: string
  responses?: any[]
  stageScores?: {
    id: string
    name: string
    correct: number
    total: number
    percentage: number
  }[]
}

const CandidateDetails = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = router.query
  
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('performance')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    status: 'PENDING',
    observations: '',
    rating: '0',
  })
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  // Verificar autenticação
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])
  
  // Buscar dados do candidato e lista de candidatos para navegação
  useEffect(() => {
    if (id && status === 'authenticated') {
      fetchCandidate()
      fetchCandidates()
    }
  }, [id, status])
  
  // Atualizar o índice atual quando a lista de candidatos for carregada
  useEffect(() => {
    if (candidates.length > 0 && id) {
      const index = candidates.findIndex(c => c.id === id)
      setCurrentIndex(index)
    }
  }, [candidates, id])
  
  // Buscar dados do candidato específico
  const fetchCandidate = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/candidates/${id}`)
      
      if (!response.ok) {
        throw new Error('Falha ao carregar dados do candidato')
      }
      
      const data = await response.json()
      setCandidate(data)
      
      // Atualizar o formData com os dados do candidato
      setFormData({
        name: data.name || '',
        email: data.email || '',
        position: data.position || '',
        status: data.status || 'PENDING',
        observations: data.observations || '',
        rating: data.rating?.toString() || '0',
      })
      
      setLoading(false)
    } catch (err) {
      setError('Erro ao carregar dados do candidato')
      setLoading(false)
      console.error(err)
    }
  }
  
  // Buscar lista de todos os candidatos para navegação
  const fetchCandidates = async () => {
    try {
      const response = await fetch('/api/admin/candidates')
      
      if (!response.ok) {
        throw new Error('Falha ao carregar lista de candidatos')
      }
      
      const data = await response.json()
      setCandidates(data)
    } catch (err) {
      console.error(err)
    }
  }
  
  // Navegar para o próximo candidato
  const goToNextCandidate = () => {
    if (currentIndex < candidates.length - 1) {
      const nextCandidate = candidates[currentIndex + 1]
      router.push(`/admin/candidate/${nextCandidate.id}`)
    }
  }
  
  // Navegar para o candidato anterior
  const goToPreviousCandidate = () => {
    if (currentIndex > 0) {
      const prevCandidate = candidates[currentIndex - 1]
      router.push(`/admin/candidate/${prevCandidate.id}`)
    }
  }
  
  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  // Salvar alterações no candidato
  const handleSave = async () => {
    try {
      const response = await fetch(`/api/admin/candidates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...candidate,
          name: formData.name,
          email: formData.email,
          position: formData.position,
          status: formData.status,
          observations: formData.observations,
          rating: parseFloat(formData.rating),
        }),
      })
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar candidato')
      }
      
      // Recarregar dados do candidato
      fetchCandidate()
      alert('Candidato atualizado com sucesso!')
    } catch (err) {
      console.error(err)
      alert('Erro ao atualizar candidato')
    }
  }

  const generateNewInvite = async () => {
    try {
      setIsGeneratingInvite(true);
      const response = await fetch(`/api/admin/candidates/generate-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candidateId: candidate.id }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar novo convite');
      }

      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        inviteCode: data.inviteCode,
        inviteExpires: data.inviteExpires,
        inviteSent: false,
        inviteAttempts: 0
      }));

      // Atualiza o candidato com o novo código
      const updatedCandidate = {
        ...candidate,
        inviteCode: data.inviteCode,
        inviteExpires: data.inviteExpires,
        inviteSent: false,
        inviteAttempts: 0
      };
      setCandidates(prev => 
        prev.map(c => c.id === candidate.id ? updatedCandidate : c)
      );
    } catch (error) {
      console.error('Erro ao gerar convite:', error);
      alert('Erro ao gerar novo convite. Por favor, tente novamente.');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  // Dados para o gráfico de radar
  const radarData = {
    labels: [
      'Raciocínio Lógico',
      'Matemática Básica',
      'Compreensão Verbal',
      'Aptidão Espacial',
      'Raciocínio Abstrato',
      'Tomada de Decisão'
    ],
    datasets: [
      {
        label: 'Desempenho do Candidato',
        data: candidate?.stageScores?.map(score => score.percentage) || [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true
      }
    ],
  }
  
  // Opções para o gráfico de radar
  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: {
          stepSize: 20,
          backdropColor: 'transparent',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw}%`;
          }
        }
      }
    },
  }
  
  // Dados para o gráfico de barras
  const barData = {
    labels: [
      'Raciocínio Lógico',
      'Matemática Básica',
      'Compreensão Verbal',
      'Aptidão Espacial',
      'Raciocínio Abstrato',
      'Tomada de Decisão'
    ],
    datasets: [
      {
        label: 'Acertos',
        data: candidate?.stageScores?.map(score => score.correct) || [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
      {
        label: 'Total',
        data: candidate?.stageScores?.map(score => score.total) || [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(200, 200, 200, 0.7)',
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      }
    ]
  }
  
  // Opções para o gráfico de barras
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        ticks: {
          stepSize: 2,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw}`;
          }
        }
      }
    },
  }
  
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-700">Carregando...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-secondary-50 flex justify-center items-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-secondary-800 mb-2">Erro</h2>
          <p className="text-secondary-700">{error}</p>
          <button 
            onClick={() => router.push('/admin/dashboard')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-secondary-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard" className="text-primary-600 hover:text-primary-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Voltar
            </Link>
            <h1 className="text-2xl font-bold text-secondary-800">Detalhes do Candidato</h1>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={goToPreviousCandidate}
              disabled={currentIndex <= 0}
              className={`p-2 rounded-md ${currentIndex <= 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'}`}
              title="Candidato anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="px-3 py-2 bg-white rounded-md shadow-sm text-sm text-secondary-700">
              {currentIndex + 1} de {candidates.length}
            </span>
            <button
              onClick={goToNextCandidate}
              disabled={currentIndex >= candidates.length - 1}
              className={`p-2 rounded-md ${currentIndex >= candidates.length - 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'}`}
              title="Próximo candidato"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {candidate && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  className={`px-6 py-4 font-medium text-sm focus:outline-none transition-colors duration-200 ${
                    activeTab === 'performance'
                      ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                      : 'text-secondary-600 hover:text-primary-500 hover:bg-secondary-50'
                  }`}
                  onClick={() => setActiveTab('performance')}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1h-2a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1h-2a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    Desempenho
                  </div>
                </button>
                <button
                  className={`px-6 py-4 font-medium text-sm focus:outline-none transition-colors duration-200 ${
                    activeTab === 'profile'
                      ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                      : 'text-secondary-600 hover:text-primary-500 hover:bg-secondary-50'
                  }`}
                  onClick={() => setActiveTab('profile')}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Informações Pessoais
                  </div>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {activeTab === 'performance' ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {!candidate.completed ? (
                      // Mensagem quando o candidato ainda não realizou o teste
                      <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                          <h4 className="font-medium text-blue-800">Avaliação Pendente</h4>
                          <p className="mt-2 text-blue-700">
                            O candidato ainda não realizou o teste. Os gráficos de desempenho estarão disponíveis após a conclusão.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Gráfico de Radar - Desempenho por Habilidade */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                          <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho por Habilidade</h3>
                          <div className="h-80">
                            <Radar data={radarData} options={radarOptions} />
                          </div>
                          <div className="mt-4 text-sm text-gray-500">
                            <p>Este gráfico mostra o desempenho do candidato em cada uma das seis etapas de avaliação.</p>
                          </div>
                        </div>
                        
                        {/* Gráfico de Barras - Desempenho por Etapa */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                          <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho por Etapa</h3>
                          <div className="h-80">
                            <Bar data={barData} options={barOptions} />
                          </div>
                          <div className="mt-4 text-sm text-gray-500">
                            <p>Este gráfico mostra o número de respostas corretas e incorretas em cada etapa.</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Tabela de Desempenho Detalhado */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho Detalhado</h3>
                    {!candidate.completed ? (
                      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <p className="text-blue-700">
                          O candidato ainda não realizou o teste. Os dados de desempenho estarão disponíveis após a conclusão.
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
                                    <span className="mr-2">{stage.percentage}%</span>
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
                                  <span className="mr-2">{candidate.score}%</span>
                                  <div className="w-24 bg-secondary-200 rounded-full h-2.5">
                                    <div 
                                      className={`h-2.5 rounded-full ${
                                        candidate.score >= 80 ? 'bg-green-500' : 
                                        candidate.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${candidate.score}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {!candidate.completed ? (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Aguardando Respostas
                                  </span>
                                ) : candidate.score >= 80 ? (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Aprovado
                                  </span>
                                ) : candidate.score >= 60 ? (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                    Consideração
                                  </span>
                                ) : (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                    Reprovado
                                  </span>
                                )}
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
                      ) : candidate.score >= 80 ? (
                        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                          <h4 className="font-medium text-green-800">Candidato Recomendado</h4>
                          <p className="mt-2 text-green-700">
                            Este candidato demonstrou excelente desempenho na avaliação. Recomendamos prosseguir com o processo de contratação.
                          </p>
                        </div>
                      ) : candidate.score >= 60 ? (
                        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                          <h4 className="font-medium text-yellow-800">Candidato para Consideração</h4>
                          <p className="mt-2 text-yellow-700">
                            Este candidato demonstrou desempenho satisfatório. Recomendamos avaliar outros aspectos como experiência e entrevista antes de tomar uma decisão.
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                          <h4 className="font-medium text-red-800">Candidato Não Recomendado</h4>
                          <p className="mt-2 text-red-700">
                            Este candidato não atingiu a pontuação mínima necessária. Recomendamos considerar outros candidatos.
                          </p>
                        </div>
                      )}
                      
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
                      <div className="bg-white p-4 rounded-lg border border-secondary-200">
                        <h3 className="text-lg font-semibold text-secondary-800 mb-3">Informações do Convite</h3>
                        <div className="space-y-3">
                          <div className="bg-white p-3 rounded-md border border-secondary-200">
                            <span className="text-sm text-secondary-600">Código do Convite:</span>
                            <div className="flex items-center justify-between mt-1">
                              <p className="font-medium text-lg text-primary-600">{candidate.inviteCode || 'Não gerado'}</p>
                              <button
                                onClick={() => generateNewInvite()}
                                disabled={isGeneratingInvite}
                                className={`px-3 py-1 text-sm ${
                                  isGeneratingInvite 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                                } rounded`}
                              >
                                {isGeneratingInvite 
                                  ? 'Gerando...' 
                                  : candidate.inviteCode 
                                    ? 'Gerar Novo' 
                                    : 'Gerar Código'
                                }
                              </button>
                            </div>
                            {candidate.inviteExpires && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-secondary-500 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Expira em: {new Date(candidate.inviteExpires).toLocaleDateString('pt-BR')}
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
                            <p className="font-medium">{new Date(candidate.testDate).toLocaleDateString('pt-BR')}</p>
                          </div>
                          
                          {candidate.interviewDate && (
                            <div>
                              <span className="text-sm text-secondary-600">Data da Entrevista:</span>
                              <p className="font-medium">{new Date(candidate.interviewDate).toLocaleDateString('pt-BR')}</p>
                            </div>
                          )}
                          
                          <div>
                            <span className="text-sm text-secondary-600">Status do Teste:</span>
                            <p className="font-medium">{candidate.completed ? 'Completo' : 'Incompleto'}</p>
                          </div>
                          
                          {candidate.score !== undefined && (
                            <div>
                              <span className="text-sm text-secondary-600">Pontuação Geral:</span>
                              <p className="font-medium">{candidate.score.toFixed(1)}%</p>
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
                              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-1H4v1a2 2 0 01-2 2H2a2 2 0 01-2-2V4h.586a1 1 0 01.707-.293l5.414 5.414a1 1 0 01.293.707V8a2 2 0 00-2-2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-5.414-5.414a1 1 0 01.293-.707H4z" clipRule="evenodd" />
                            </svg>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="ml-3 text-secondary-700">Carregando dados do candidato...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-6">
            {error}
          </div>
        )}
      </main>
    </div>
  )
}

export default CandidateDetails