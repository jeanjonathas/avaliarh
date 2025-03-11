import type { NextPage } from 'next'
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
import { Bar, Pie, Line, Radar, Doughnut } from 'react-chartjs-2'
import { Rating } from '@mui/material'
import Navbar from '../../components/admin/Navbar'

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

interface Statistics {
  stageStats: {
    id: string
    name: string
    order: number
    correctResponses: number
    totalResponses: number
    successRate: number
  }[]
  expectedSuccessRate: number
  averageSuccessRate: number
  candidateStats: {
    total: number
    completed: number
    approved: number
    rejected: number
    pending: number
  }
  averageStageScores: number[]
}

const Dashboard: NextPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [ratingFilter, setRatingFilter] = useState('ALL')
  const [scoreFilter, setScoreFilter] = useState('ALL')
  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const [editableProfiles, setEditableProfiles] = useState<Record<string, number[]>>({
    'Desenvolvedor Frontend': [85, 70, 65, 80, 75, 60],
    'Desenvolvedor Backend': [80, 85, 60, 65, 75, 70],
    'Analista de Dados': [70, 90, 75, 60, 80, 65],
    'Designer UX/UI': [60, 65, 80, 90, 75, 70],
    'Gerente de Projetos': [70, 75, 85, 65, 70, 90],
    'Analista de QA': [80, 75, 70, 75, 85, 80],
    'DevOps Engineer': [75, 85, 65, 70, 80, 75],
    'Analista de Segurança': [85, 80, 70, 65, 90, 75],
    'Analista de Sistemas': [75, 80, 75, 70, 80, 75],
    'Suporte Técnico': [70, 65, 80, 65, 70, 85],
    'Padrão': [80, 75, 70, 75, 80, 85]
  })
  const [currentProfile, setCurrentProfile] = useState('Padrão')
  const [newProfileName, setNewProfileName] = useState('')
  const [candidateFormData, setCandidateFormData] = useState({
    name: '',
    email: '',
    position: '',
    status: 'PENDING',
    observations: '',
    rating: '0',
  })
  const [trendData, setTrendData] = useState({
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Candidatos Aprovados',
        data: [12, 19, 15, 22, 24, 18],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Candidatos Rejeitados',
        data: [8, 12, 10, 15, 10, 7],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
        fill: true,
      }
    ]
  })
  const [stageDistributionData, setStageDistributionData] = useState({
    labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
    datasets: [
      {
        label: 'Raciocínio Lógico',
        data: [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderWidth: 0,
        borderRadius: 4,
      },
      {
        label: 'Matemática Básica',
        data: [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderWidth: 0,
        borderRadius: 4,
      },
      {
        label: 'Compreensão Verbal',
        data: [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(255, 206, 86, 0.7)',
        borderWidth: 0,
        borderRadius: 4,
      },
      {
        label: 'Aptidão Espacial',
        data: [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderWidth: 0,
        borderRadius: 4,
      },
      {
        label: 'Raciocínio Abstrato',
        data: [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(153, 102, 255, 0.7)',
        borderWidth: 0,
        borderRadius: 4,
      },
      {
        label: 'Tomada de Decisão',
        data: [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(255, 159, 64, 0.7)',
        borderWidth: 0,
        borderRadius: 4,
      }
    ]
  })
  const [idealProfiles, setIdealProfiles] = useState({
    'Desenvolvedor Frontend': [85, 70, 65, 80, 75, 60],
    'Desenvolvedor Backend': [80, 85, 60, 65, 75, 70],
    'Analista de Dados': [70, 90, 75, 60, 80, 65],
    'Designer UX/UI': [60, 65, 80, 90, 75, 70],
    'Gerente de Projetos': [70, 75, 85, 65, 70, 90],
    'Analista de QA': [80, 75, 70, 75, 85, 80],
    'DevOps Engineer': [75, 85, 65, 70, 80, 75],
    'Analista de Segurança': [85, 80, 70, 65, 90, 75],
    'Analista de Sistemas': [75, 80, 75, 70, 80, 75],
    'Suporte Técnico': [70, 65, 80, 65, 70, 85],
    'Padrão': [80, 75, 70, 75, 80, 85]
  })
  const [selectedProfile, setSelectedProfile] = useState('Padrão')
  const [idealProfileData, setIdealProfileData] = useState({
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
        label: 'Candidato',
        data: [0, 0, 0, 0, 0, 0],
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
      },
      {
        label: 'Perfil Ideal',
        data: [80, 75, 70, 75, 80, 85], // Valores ideais para cada etapa (podem ser ajustados)
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(255, 99, 132, 1)',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true
      }
    ]
  })
  const [categorySuccessData, setCategorySuccessData] = useState({
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
        label: 'Taxa de Sucesso (%)',
        data: [0, 0, 0, 0, 0, 0],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  })
  const [realVsExpectedData, setRealVsExpectedData] = useState({
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
        label: 'Taxa Real',
        data: [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Taxa Esperada',
        data: [70, 70, 70, 70, 70, 70],
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  })
  const [overallPerformanceData, setOverallPerformanceData] = useState({
    labels: ['Aprovados', 'Reprovados', 'Pendentes'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 206, 86, 0.7)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 1,
      }
    ]
  })

  useEffect(() => {
    // Inicializar os perfis editáveis quando idealProfiles for definido
    if (Object.keys(idealProfiles).length > 0) {
      setEditableProfiles({...idealProfiles});
    }
  }, [idealProfiles]);

  useEffect(() => {
    // Verificar se o usuário está autenticado
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])
  
  useEffect(() => {
    // Carregar a lista de candidatos
    const fetchCandidates = async () => {
      try {
        setLoading(true)
        console.log('Dashboard: Iniciando carregamento de candidatos...')
        const response = await fetch('/api/admin/candidates')
        
        if (!response.ok) {
          throw new Error(`Erro ao carregar os candidatos: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log(`Dashboard: Candidatos carregados com sucesso. Total: ${data.length}`)
        
        if (Array.isArray(data)) {
          setCandidates(data)
        } else {
          console.error('Dashboard: Dados de candidatos não são um array:', data)
          setCandidates([])
        }
      } catch (error) {
        console.error('Dashboard: Erro ao carregar candidatos:', error)
        setError('Não foi possível carregar os candidatos. Por favor, tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    
    // Carregar estatísticas para os gráficos
    const fetchStatistics = async () => {
      try {
        const response = await fetch('/api/admin/statistics')
        
        if (!response.ok) {
          throw new Error('Erro ao carregar estatísticas')
        }
        
        const data = await response.json()
        setStatistics(data)

        console.log('Estatísticas recebidas:', data);

        // Atualizar dados dos novos gráficos com os dados estatísticos
        if (data && data.stageStats && Array.isArray(data.stageStats)) {
          // Atualizar gráfico de taxa de sucesso por categoria
          setCategorySuccessData(prev => ({
            ...prev,
            datasets: [{
              ...prev.datasets[0],
              data: data.stageStats.map(stage => parseFloat(stage.successRate) || 0)
            }]
          }));

          // Atualizar gráfico de comparação real vs esperado
          setRealVsExpectedData(prev => ({
            ...prev,
            datasets: [
              {
                ...prev.datasets[0],
                data: data.stageStats.map(stage => parseFloat(stage.successRate) || 0)
              },
              {
                ...prev.datasets[1],
                data: Array(6).fill(data.expectedSuccessRate || 70)
              }
            ]
          }));
        }

        // Atualizar gráfico de desempenho geral
        if (data && data.candidateStats) {
          setOverallPerformanceData(prev => ({
            ...prev,
            datasets: [{
              ...prev.datasets[0],
              data: [
                parseInt(data.candidateStats.approved) || 0,
                parseInt(data.candidateStats.rejected) || 0,
                parseInt(data.candidateStats.pending) || 0
              ]
            }]
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
        // Não definir erro global para não bloquear a visualização dos candidatos
      }
    }
    
    if (status === 'authenticated') {
      fetchCandidates()
      fetchStatistics()
    }
  }, [status])
  
  useEffect(() => {
    // Calcular distribuição de pontuação por etapa
    if (candidates.length > 0) {
      // Inicializar arrays para contagem
      const stageCounts = Array(6).fill(0).map(() => Array(5).fill(0));
      
      // Contar candidatos em cada faixa de pontuação por etapa
      candidates.forEach(candidate => {
        if (candidate.stageScores) {
          candidate.stageScores.forEach((score, stageIndex) => {
            if (stageIndex < 6) {
              // Determinar a faixa de pontuação (0-20%, 21-40%, etc.)
              const scoreRange = Math.min(Math.floor(score.percentage / 20), 4);
              stageCounts[stageIndex][scoreRange]++;
            }
          });
        }
      });
      
      // Atualizar dados do gráfico
      const newDatasets = stageDistributionData.datasets.map((dataset, i) => ({
        ...dataset,
        data: i < 6 ? stageCounts[i] : dataset.data
      }));
      
      setStageDistributionData(prevData => ({
        ...prevData,
        datasets: newDatasets
      }));
    }
  }, [candidates]); // Removido stageDistributionData das dependências
  
  // Função para atualizar o gráfico de perfil ideal quando um candidato é selecionado
  useEffect(() => {
    if (selectedCandidate) {
      // Determinar qual perfil ideal usar com base no cargo do candidato
      const candidatePosition = selectedCandidate.position || 'Padrão';
      const profileToUse = idealProfiles[candidatePosition] || idealProfiles['Padrão'];
      
      // Atualizar o gráfico com o perfil ideal correspondente e os dados do candidato
      setIdealProfileData(prevData => {
        const updatedDatasets = [
          {
            ...prevData.datasets[0],
            data: selectedCandidate.stageScores?.map(stage => stage.percentage) || [0, 0, 0, 0, 0, 0]
          },
          {
            ...prevData.datasets[1],
            data: profileToUse
          }
        ];
        
        return {
          ...prevData,
          datasets: updatedDatasets
        };
      });
    }
  }, [selectedCandidate, idealProfiles]); // Removido idealProfileData das dependências
  
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' })
    router.push('/')
  }
  
  const handleViewCandidate = (candidate: Candidate) => {
    window.location.href = `/admin/candidate/${candidate.id}`
  }
  
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-700">Carregando...</p>
        </div>
      </div>
    )
  }
  
  if (status === 'unauthenticated') {
    return null // Será redirecionado pelo useEffect
  }
  
  // Função para filtrar candidatos com base nos critérios selecionados
  const filteredCandidates = candidates.filter(candidate => {
    // Filtro por termo de busca (nome, email ou cargo)
    const searchMatch = searchTerm === '' || 
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (candidate.position && candidate.position.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtro por status
    const statusMatch = statusFilter === 'ALL' || candidate.status === statusFilter;
    
    // Filtro por avaliação
    let ratingMatch = true;
    if (ratingFilter !== 'ALL') {
      if (ratingFilter === 'RATED') {
        ratingMatch = candidate.rating !== null && candidate.rating > 0;
      } else if (ratingFilter === 'UNRATED') {
        ratingMatch = candidate.rating === null || candidate.rating === 0;
      } else if (ratingFilter === 'HIGH') {
        ratingMatch = candidate.rating !== null && candidate.rating >= 4;
      } else if (ratingFilter === 'MEDIUM') {
        ratingMatch = candidate.rating !== null && candidate.rating >= 2.5 && candidate.rating < 4;
      } else if (ratingFilter === 'LOW') {
        ratingMatch = candidate.rating !== null && candidate.rating > 0 && candidate.rating < 2.5;
      }
    }
    
    // Filtro por pontuação
    let scoreMatch = true;
    if (scoreFilter !== 'ALL') {
      if (scoreFilter === 'HIGH') {
        scoreMatch = candidate.score !== undefined && candidate.score >= 80;
      } else if (scoreFilter === 'MEDIUM') {
        scoreMatch = candidate.score !== undefined && candidate.score >= 60 && candidate.score < 80;
      } else if (scoreFilter === 'LOW') {
        scoreMatch = candidate.score !== undefined && candidate.score < 60;
      }
    }
    
    return searchMatch && statusMatch && ratingMatch && scoreMatch;
  });
  
  // Função para exportar candidatos para CSV
  const exportToCSV = () => {
    // Cabeçalhos do CSV
    const headers = [
      'Nome',
      'Email',
      'Cargo',
      'Status',
      'Pontuação Geral',
      'Avaliação',
      'Raciocínio Lógico',
      'Matemática Básica',
      'Compreensão Verbal',
      'Aptidão Espacial',
      'Raciocínio Abstrato',
      'Tomada de Decisão',
      'Notas'
    ];

    // Mapear candidatos para linhas do CSV
    const csvRows = filteredCandidates.map(candidate => {
      // Obter pontuações por etapa (se disponíveis)
      const stageScores = {};
      if (candidate.stageScores) {
        candidate.stageScores.forEach((score, index) => {
          stageScores[index] = score.percentage;
        });
      }

      return [
        candidate.name,
        candidate.email,
        candidate.position || '',
        candidate.status === 'APPROVED' ? 'Aprovado' : 
          candidate.status === 'REJECTED' ? 'Reprovado' : 'Pendente',
        candidate.score !== undefined ? candidate.score : '',
        candidate.rating || '',
        stageScores[0] !== undefined ? stageScores[0] : '',
        stageScores[1] !== undefined ? stageScores[1] : '',
        stageScores[2] !== undefined ? stageScores[2] : '',
        stageScores[3] !== undefined ? stageScores[3] : '',
        stageScores[4] !== undefined ? stageScores[4] : '',
        stageScores[5] !== undefined ? stageScores[5] : '',
        candidate.observations || ''
      ];
    });

    // Combinar cabeçalhos e linhas
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => {
        // Escapar células que contêm vírgulas, aspas ou quebras de linha
        if (cell && (cell.toString().includes(',') || cell.toString().includes('"') || cell.toString().includes('\n'))) {
          return `"${cell.toString().replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(','))
    ].join('\n');

    // Criar um Blob e link para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `candidatos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Dados para o gráfico de radar (desempenho por etapa)
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
        label: 'Desempenho por Etapa (%)',
        data: selectedCandidate?.stageScores?.map(stage => stage.percentage) || [0, 0, 0, 0, 0, 0],
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
      },
    ],
  };

  const radarOptions = {
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
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.raw}%`;
          }
        }
      },
      title: {
        display: true,
        text: 'Desempenho por Etapa',
        font: {
          size: 16
        }
      }
    },
    maintainAspectRatio: false,
  };
  
  // Dados para o gráfico de comparação (candidato vs média)
  const comparisonData = {
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
        label: 'Candidato',
        data: selectedCandidate?.stageScores?.map(stage => stage.percentage) || [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderWidth: 0,
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
      {
        label: 'Média Geral',
        data: statistics?.averageStageScores || [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderWidth: 0,
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      }
    ]
  };

  const comparisonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.raw}%`;
          }
        }
      },
      title: {
        display: true,
        text: 'Desempenho do Candidato vs. Média Geral',
        font: {
          size: 16
        }
      }
    },
  };
  
  // Dados para o gráfico de distribuição de pontuação por etapa
  const stageDistributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.raw} candidatos`;
          }
        }
      },
      title: {
        display: true,
        text: 'Distribuição de Pontuação por Etapa',
        font: {
          size: 16
        }
      }
    },
  };
  
  // Dados para o gráfico de taxa de sucesso por categoria
  const categorySuccessOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Taxa de Sucesso: ${context.raw}%`;
          }
        }
      },
      title: {
        display: true,
        text: 'Taxa de Sucesso por Categoria',
        font: {
          size: 16
        }
      }
    },
  };

  // Dados para o gráfico de comparação real vs esperado
  const realVsExpectedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw}%`;
          }
        }
      },
      title: {
        display: true,
        text: 'Desempenho Real vs. Esperado',
        font: {
          size: 16
        }
      }
    },
  };

  // Dados para o gráfico de desempenho geral
  const overallPerformanceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Removendo animação
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${context.label}: ${value} (${percentage}%)`;
          }
        }
      },
      title: {
        display: true,
        text: 'Distribuição de Candidatos',
        font: {
          size: 16
        }
      }
    },
  };
  
  // Função para calcular a compatibilidade do candidato com o perfil ideal
  const calculateCompatibility = (candidate) => {
    if (!candidate || !candidate.stageScores || candidate.stageScores.length === 0) {
      return 0;
    }
    
    // Determinar qual perfil ideal usar
    const candidatePosition = candidate.position || 'Padrão';
    const profileToUse = idealProfiles[candidatePosition] || idealProfiles['Padrão'];
    
    // Calcular a pontuação de compatibilidade
    let totalDifference = 0;
    let validStages = 0;
    
    candidate.stageScores.forEach((score, index) => {
      if (index < 6 && profileToUse[index] !== undefined) {
        // Calcular a diferença absoluta entre a pontuação do candidato e o perfil ideal
        const difference = Math.abs(score.percentage - profileToUse[index]);
        totalDifference += difference;
        validStages++;
      }
    });
    
    if (validStages === 0) return 0;
    
    // Converter a diferença média em uma pontuação de compatibilidade (100 - diferença média)
    const averageDifference = totalDifference / validStages;
    const compatibilityScore = Math.max(0, 100 - averageDifference);
    
    return compatibilityScore.toFixed(1);
  };

  // Componente para edição de perfis ideais
  const IdealProfileEditor = ({ isOpen, onClose }) => {
    // Função para salvar as alterações nos perfis
    const saveProfiles = () => {
      setIdealProfiles(prevProfiles => ({
        ...prevProfiles,
        ...editableProfiles
      }));
      onClose();
    };
    
    // Função para adicionar um novo perfil
    const addNewProfile = () => {
      if (newProfileName.trim() && !editableProfiles[newProfileName]) {
        setEditableProfiles({
          ...editableProfiles,
          [newProfileName]: [70, 70, 70, 70, 70, 70]
        });
        setCurrentProfile(newProfileName);
        setNewProfileName('');
      }
    };
    
    // Função para excluir um perfil
    const deleteProfile = (profileName) => {
      if (profileName !== 'Padrão') {
        const updatedProfiles = {...editableProfiles};
        delete updatedProfiles[profileName];
        setEditableProfiles(updatedProfiles);
        setCurrentProfile('Padrão');
      }
    };
    
    // Função para atualizar os valores do perfil atual
    const updateProfileValue = (index, value) => {
      const newValue = Math.max(0, Math.min(100, parseInt(value) || 0));
      const updatedProfile = [...editableProfiles[currentProfile]];
      updatedProfile[index] = newValue;
      setEditableProfiles({
        ...editableProfiles,
        [currentProfile]: updatedProfile
      });
    };
    
    return (
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center ${isOpen ? '' : 'hidden'}`}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-secondary-900">Gerenciar Perfis Ideais</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 border-r pr-4">
              <h3 className="font-semibold mb-3">Perfis Disponíveis</h3>
              <div className="space-y-2 mb-4">
                {Object.keys(editableProfiles).map(profile => (
                  <div 
                    key={profile}
                    className={`flex justify-between items-center p-2 rounded cursor-pointer ${currentProfile === profile ? 'bg-secondary-100' : 'hover:bg-gray-50'}`}
                    onClick={() => setCurrentProfile(profile)}
                  >
                    <span>{profile}</span>
                    {profile !== 'Padrão' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProfile(profile);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Adicionar Novo Perfil</h3>
                <div className="flex">
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Nome do cargo"
                    className="flex-1 border rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  />
                  <button
                    onClick={addNewProfile}
                    className="bg-secondary-600 text-white px-3 py-2 rounded-r hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <h3 className="font-semibold mb-3">Editar Perfil: {currentProfile}</h3>
              
              <div className="space-y-4">
                {[
                  'Raciocínio Lógico',
                  'Matemática Básica',
                  'Compreensão Verbal',
                  'Aptidão Espacial',
                  'Raciocínio Abstrato',
                  'Tomada de Decisão'
                ].map((stage, index) => (
                  <div key={stage} className="flex flex-col">
                    <div className="flex justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">{stage}</label>
                      <span className="text-sm text-gray-500">{editableProfiles[currentProfile][index]}%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editableProfiles[currentProfile][index]}
                        onChange={(e) => updateProfileValue(index, e.target.value)}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editableProfiles[currentProfile][index]}
                        onChange={(e) => updateProfileValue(index, e.target.value)}
                        className="w-16 border rounded px-2 py-1 text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="h-80 mt-6">
                <Radar 
                  data={{
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
                        label: currentProfile,
                        data: editableProfiles[currentProfile],
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(255, 99, 132, 1)',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true
                      }
                    ]
                  }}
                  options={{
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
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context: any) {
                            return `${context.dataset.label}: ${context.raw}%`;
                          }
                        }
                      }
                    },
                    maintainAspectRatio: false,
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6 space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
            >
              Cancelar
            </button>
            <button
              onClick={saveProfiles}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary-600 hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Estado para controlar a exibição do editor de perfis
  

  // Dados para o gráfico de tendências
  

  // Opções para o gráfico de tendências
  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    stacked: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.raw}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 50,
        max: 100,
        title: {
          display: true,
          text: 'Valor (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Mês'
        }
      }
    },
  };

  // Componente para o gráfico de tendências
  const renderTrendChart = () => {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-secondary-700">Tendências de Desempenho</h3>
        </div>
        <div className="h-80">
          <Line 
            data={trendData}
            options={trendOptions}
          />
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>Este gráfico mostra a evolução da pontuação média e taxa de aprovação dos candidatos nos últimos 6 meses.</p>
        </div>
      </div>
    );
  };

// Renderização do componente principal
return (
  <div className="min-h-screen bg-secondary-50">
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <Navbar />
    </header>
    
    <main className="container mx-auto px-4 py-8 relative z-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-secondary-900">Dashboard de Avaliação</h1>
        <div className="flex space-x-2">
          <Link href="/admin/candidates" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            Gerenciar Candidatos
          </Link>
          <button
            onClick={exportToCSV}
            className="btn-secondary"
          >
            Exportar Dados
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Filtros de Candidatos */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-secondary-700 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Busca por texto */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome, email ou cargo"
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-secondary-300 rounded-md"
            />
          </div>

          {/* Filtro por Status */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-secondary-300 rounded-md"
            >
              <option value="ALL">Todos</option>
              <option value="APPROVED">Aprovados</option>
              <option value="REJECTED">Reprovados</option>
              <option value="PENDING">Pendentes</option>
            </select>
          </div>

          {/* Filtro por Avaliação */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Avaliação
            </label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-secondary-300 rounded-md"
            >
              <option value="ALL">Todas</option>
              <option value="RATED">Avaliados</option>
              <option value="UNRATED">Não avaliados</option>
              <option value="HIGH">Alta (4-5 estrelas)</option>
              <option value="MEDIUM">Média (2.5-3.5 estrelas)</option>
              <option value="LOW">Baixa (0.5-2 estrelas)</option>
            </select>
          </div>

          {/* Filtro por Pontuação */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Pontuação
            </label>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-secondary-300 rounded-md"
            >
              <option value="ALL">Todas</option>
              <option value="HIGH">Alta (≥ 80%)</option>
              <option value="MEDIUM">Média (60-79%)</option>
              <option value="LOW">Baixa (&lt; 60%)</option>
            </select>
          </div>

          {/* Botão de Limpar Filtros */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setRatingFilter('ALL');
                setScoreFilter('ALL');
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="mt-4 text-sm text-secondary-500">
          {filteredCandidates.length} {filteredCandidates.length === 1 ? 'candidato encontrado' : 'candidatos encontrados'}
        </div>
      </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Cargo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Pontuação
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Situação
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Avaliação
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Compatibilidade
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-secondary-500">
                      Nenhum candidato encontrado
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((candidate, index) => (
                    <tr key={candidate.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-secondary-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-secondary-900">{candidate.name}</div>
                            <div className="text-sm text-secondary-500">{candidate.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-900">{candidate.position || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {candidate.completed ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Completo
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Incompleto
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {candidate.score !== undefined ? `${candidate.score}%` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {candidate.status === 'APPROVED' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Aprovado
                            </span>
                          )}
                          {candidate.status === 'REJECTED' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Reprovado
                            </span>
                          )}
                          {candidate.status === 'PENDING' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Pendente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {candidate.rating ? (
                          <div className="flex text-yellow-500">
                            {[...Array(5)].map((_, i) => {
                              const starValue = i + 1;
                              const ratingValue = candidate.rating;
                              const isHalfStar = ratingValue === starValue - 0.5;
                              const isFullStar = ratingValue >= starValue;
                              
                              return (
                                <div key={i} className="relative">
                                  {/* Estrela completa ou vazia */}
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className={`h-5 w-5 ${isFullStar ? 'text-yellow-500' : 'text-gray-300'}`}
                                    fill="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                  </svg>
                                  
                                  {/* Renderizar meia estrela */}
                                  {isHalfStar && (
                                    <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden">
                                      <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        className="h-5 w-5 text-yellow-500"
                                        fill="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-secondary-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {calculateCompatibility(candidate)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        <button
                          onClick={() => handleViewCandidate(candidate)}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          {renderTrendChart()}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <Bar 
              data={categorySuccessData}
              options={categorySuccessOptions}
            />
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <Bar 
              data={realVsExpectedData}
              options={realVsExpectedOptions}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <Doughnut 
              data={overallPerformanceData}
              options={overallPerformanceOptions}
            />
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-secondary-700">Insights de Desempenho</h3>
            </div>
            <div className="space-y-4">
              {statistics && (
                <>
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-medium text-blue-700 mb-2">Taxa Média de Sucesso</h4>
                    <p className="text-blue-600">
                      A taxa média de sucesso dos candidatos é de <span className="font-bold">{statistics.averageSuccessRate?.toFixed(1)}%</span>, 
                      {statistics.averageSuccessRate > statistics.expectedSuccessRate 
                        ? ' acima da taxa esperada de ' 
                        : ' abaixo da taxa esperada de '}
                      <span className="font-bold">{statistics.expectedSuccessRate}%</span>.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h4 className="font-medium text-green-700 mb-2">Categoria com Melhor Desempenho</h4>
                    {statistics.stageStats && statistics.stageStats.length > 0 && (
                      <p className="text-green-600">
                        {(() => {
                          const bestStage = [...statistics.stageStats].sort((a, b) => b.successRate - a.successRate)[0];
                          return (
                            <>
                              <span className="font-bold">{bestStage.name}</span> é a categoria com melhor desempenho, 
                              com taxa de sucesso de <span className="font-bold">{bestStage.successRate.toFixed(1)}%</span>.
                            </>
                          );
                        })()}
                      </p>
                    )}
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-red-50">
                    <h4 className="font-medium text-red-700 mb-2">Categoria com Maior Desafio</h4>
                    {statistics.stageStats && statistics.stageStats.length > 0 && (
                      <p className="text-red-600">
                        {(() => {
                          const worstStage = [...statistics.stageStats].sort((a, b) => a.successRate - b.successRate)[0];
                          return (
                            <>
                              <span className="font-bold">{worstStage.name}</span> é a categoria com maior dificuldade, 
                              com taxa de sucesso de apenas <span className="font-bold">{worstStage.successRate.toFixed(1)}%</span>.
                            </>
                          );
                        })()}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {showProfileEditor && (
          <IdealProfileEditor 
            isOpen={showProfileEditor} 
            onClose={() => setShowProfileEditor(false)} 
          />
        )}
      </main>
    </div>
  )
}

export default Dashboard
